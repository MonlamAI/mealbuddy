<?php

use App\Models\LunchDay;
use App\Models\LunchOrder;
use App\Models\User;
use App\Models\WeeklyMenu;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guest cannot access calendar poll endpoints', function () {
    $response = $this->getJson('/api/v1/calendar-poll');
    $response->assertStatus(401);

    $responseBatch = $this->postJson('/api/v1/calendar-poll/batch', [
        'dates' => ['2026-06-10'],
        'status' => 'opted_out',
    ]);
    $responseBatch->assertStatus(401);
});

test('authenticated user can fetch calendar poll status', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    // Create a weekly menu for Monday
    $menu = WeeklyMenu::firstOrCreate(
        ['weekday' => 'mon'],
        ['title' => 'Chicken Curry Rice']
    );

    // Create a lunch day on a specific Monday (e.g. 2026-06-08)
    $lunchDay = LunchDay::create([
        'lunch_date' => '2026-06-08',
        'weekly_menu_id' => $menu->id,
    ]);

    // Create a user order for that day
    LunchOrder::create([
        'lunch_day_id' => $lunchDay->id,
        'user_id' => $user->id,
        'status' => 'opted_out',
    ]);

    $response = $this->getJson('/api/v1/calendar-poll?year=2026&month=6');
    $response->assertOk();

    // Verify response structure and data
    $response->assertJsonStructure([
        'year',
        'month',
        'days' => [
            '*' => [
                'date',
                'day_of_week',
                'is_weekend',
                'menu',
                'status',
                'lunch_day_id',
                'is_past',
                'is_today',
                'is_locked',
            ],
        ],
    ]);

    // Check if the specific day is in the response and has correct values
    $days = $response->json('days');
    $mondayDay = collect($days)->firstWhere('date', '2026-06-08');

    expect($mondayDay)->not->toBeNull();
    expect($mondayDay['status'])->toBe('opted_out');
    expect($mondayDay['menu']['title'])->toBe('Chicken Curry Rice');
});

test('authenticated user can batch vote for future dates', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    // Set Carbon time to a specific Monday at 9:00 AM
    Carbon::setTestNow(Carbon::parse('2026-06-08 09:00:00'));

    // Create menus for Mon and Tue
    $menuMon = WeeklyMenu::firstOrCreate(['weekday' => 'mon'], ['title' => 'Chicken Curry Rice']);
    $menuTue = WeeklyMenu::firstOrCreate(['weekday' => 'tue'], ['title' => 'Shahi Paneer Rice']);

    // Send batch vote for today (Monday) and tomorrow (Tuesday)
    $response = $this->postJson('/api/v1/calendar-poll/batch', [
        'dates' => ['2026-06-08', '2026-06-09'],
        'status' => 'opted_out',
    ]);

    $response->assertOk();

    // Verify database entries
    $dayMon = LunchDay::where('lunch_date', '2026-06-08')->first();
    $dayTue = LunchDay::where('lunch_date', '2026-06-09')->first();

    expect($dayMon)->not->toBeNull();
    expect($dayTue)->not->toBeNull();

    $orderMon = LunchOrder::where('lunch_day_id', $dayMon->id)->where('user_id', $user->id)->first();
    $orderTue = LunchOrder::where('lunch_day_id', $dayTue->id)->where('user_id', $user->id)->first();

    expect($orderMon->status)->toBe('opted_out');
    expect($orderTue->status)->toBe('opted_out');

    Carbon::setTestNow(); // Reset Carbon time
});

test('cannot batch vote for past dates or today after 10 AM', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    // Set Carbon time to Tuesday 2026-06-09 at 11:00 AM
    Carbon::setTestNow(Carbon::parse('2026-06-09 11:00:00'));

    // Create weekly menus
    WeeklyMenu::firstOrCreate(['weekday' => 'mon'], ['title' => 'Chicken Curry Rice']);
    WeeklyMenu::firstOrCreate(['weekday' => 'tue'], ['title' => 'Shahi Paneer Rice']);

    // Attempt to batch vote to opt out of Monday (past) and Tuesday (today, after 10 AM)
    $response = $this->postJson('/api/v1/calendar-poll/batch', [
        'dates' => ['2026-06-08', '2026-06-09'],
        'status' => 'opted_out',
    ]);

    $response->assertOk();

    // Verify no orders were created/updated for past dates / today after 10 AM
    $dayMon = LunchDay::where('lunch_date', '2026-06-08')->first();
    $dayTue = LunchDay::where('lunch_date', '2026-06-09')->first();

    if ($dayMon) {
        $orderMon = LunchOrder::where('lunch_day_id', $dayMon->id)->where('user_id', $user->id)->first();
        expect($orderMon)->toBeNull();
    }
    if ($dayTue) {
        $orderTue = LunchOrder::where('lunch_day_id', $dayTue->id)->where('user_id', $user->id)->first();
        expect($orderTue)->toBeNull();
    }

    Carbon::setTestNow(); // Reset Carbon time
});
