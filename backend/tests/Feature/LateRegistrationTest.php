<?php

use App\Models\LunchDay;
use App\Models\User;
use App\Models\WeeklyMenu;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Set a consistent current time for the tests (e.g., Thursday, 2026-06-04)
    Carbon::setTestNow(Carbon::parse('2026-06-04 11:30:00'));

    $this->menu = WeeklyMenu::firstOrCreate(
        ['weekday' => 'thu'],
        ['title' => 'Thursday Special']
    );

    $this->lunchDay = LunchDay::firstOrCreate(
        ['lunch_date' => '2026-06-04'],
        ['weekly_menu_id' => $this->menu->id]
    );
});

afterEach(function () {
    Carbon::setTestNow();
});

it('calculates the correct effective lunch start date', function () {
    // User created before 10 AM
    $earlyUser = User::factory()->create([
        'created_at' => '2026-06-04 09:59:00',
    ]);
    expect($earlyUser->getEffectiveLunchStartDate())->toBe('2026-06-04');

    // User created at 10:00 AM
    $cutoffUser = User::factory()->create([
        'created_at' => '2026-06-04 10:00:00',
    ]);
    expect($cutoffUser->getEffectiveLunchStartDate())->toBe('2026-06-05');

    // User created after 10 AM
    $lateUser = User::factory()->create([
        'created_at' => '2026-06-04 14:30:00',
    ]);
    expect($lateUser->getEffectiveLunchStartDate())->toBe('2026-06-05');
});

it('defaults poll status to opted_out for late registrations today', function () {
    // Set test time to 10:30 AM so deadline is met
    Carbon::setTestNow(Carbon::parse('2026-06-04 10:30:00'));

    $lateUser = User::factory()->create([
        'role' => 'employee',
        'created_at' => '2026-06-04 10:15:00',
    ]);

    $response = $this->actingAs($lateUser, 'sanctum')
        ->getJson('/api/v1/today-poll');

    $response->assertOk()
        ->assertJsonPath('status', 'opted_out')
        ->assertJsonPath('is_deadline_met', true);
});

it('defaults poll status to opted_in for early registrations today', function () {
    // Set test time to 09:30 AM so deadline is not met
    Carbon::setTestNow(Carbon::parse('2026-06-04 09:30:00'));

    $earlyUser = User::factory()->create([
        'role' => 'employee',
        'created_at' => '2026-06-04 09:15:00',
    ]);

    $response = $this->actingAs($earlyUser, 'sanctum')
        ->getJson('/api/v1/today-poll');

    $response->assertOk()
        ->assertJsonPath('status', 'opted_in')
        ->assertJsonPath('is_deadline_met', false);
});

it('does not count today in stats for late registered users', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-04 11:30:00'));

    $lateUser = User::factory()->create([
        'role' => 'employee',
        'created_at' => '2026-06-04 11:00:00',
    ]);

    $response = $this->actingAs($lateUser, 'sanctum')
        ->getJson('/api/v1/user/stats');

    $response->assertOk()
        ->assertJsonPath('totalLunchEaten', 0)
        ->assertJsonPath('joinedThisMonth', 0);
});

it('reports late user registration status as not_registered today', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-04 11:30:00'));

    $accountant = User::factory()->create(['role' => 'accountant']);
    $lateUser = User::factory()->create([
        'role' => 'employee',
        'created_at' => '2026-06-04 11:00:00',
    ]);

    // Daily report for today
    $response = $this->actingAs($accountant, 'sanctum')
        ->getJson('/api/v1/accountant/participation-report?type=daily&date=2026-06-04');

    $response->assertOk();
    $users = $response->json('users');
    $userData = collect($users)->firstWhere('id', $lateUser->id);
    expect($userData['status'])->toBe('not_registered');
});

it('excludes today from user activity for late registered users', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-04 11:30:00'));

    $lateUser = User::factory()->create([
        'role' => 'employee',
        'created_at' => '2026-06-04 11:00:00', // start date tomorrow 2026-06-05
    ]);

    // Create an order for today
    \App\Models\LunchOrder::create([
        'lunch_day_id' => $this->lunchDay->id,
        'user_id' => $lateUser->id,
        'status' => 'opted_out',
    ]);

    $response = $this->actingAs($lateUser, 'sanctum')
        ->getJson('/api/v1/user/activity');

    $response->assertOk();
    // Since today is before their effective start date (tomorrow), their activity feed should be empty.
});

it('includes today in user activity with default opted_in status for early registered users when no order exists', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-04 09:30:00'));

    $earlyUser = User::factory()->create([
        'role' => 'employee',
        'created_at' => '2026-06-04 09:00:00', // start date today 2026-06-04
    ]);

    $response = $this->actingAs($earlyUser, 'sanctum')
        ->getJson('/api/v1/user/activity');

    $response->assertOk();
    $data = $response->json();
    expect($data)->toHaveCount(1);
    expect($data[0]['status'])->toBe('opted_in');
    expect($data[0]['lunch_day']['lunch_date'])->toBe('2026-06-04');
});

it('excludes days before registration from monthly report calculations', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-04 11:30:00'));

    $accountant = User::factory()->create(['role' => 'accountant']);
    $lateUser = User::factory()->create([
        'role' => 'employee',
        'created_at' => '2026-06-04 11:00:00', // start date tomorrow 2026-06-05
    ]);

    // Create an order for today (prior to start date)
    \App\Models\LunchOrder::create([
        'lunch_day_id' => $this->lunchDay->id,
        'user_id' => $lateUser->id,
        'status' => 'opted_out',
    ]);

    $response = $this->actingAs($accountant, 'sanctum')
        ->getJson('/api/v1/accountant/participation-report?type=monthly&month=6&year=2026');

    $response->assertOk();
    $users = $response->json('users');
    $userData = collect($users)->firstWhere('id', $lateUser->id);
    
    // Total eligible days for this month (which only has lunch day 2026-06-04 in DB so far) should be 0 because 2026-06-04 < 2026-06-05.
    expect($userData['total_eligible_days'])->toBe(0);
    expect($userData['joined_count'])->toBe(0);
    expect($userData['skipped_count'])->toBe(0);
});

it('excludes days before registration from monthly billing plate counts', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-04 11:30:00'));

    $lateUser = User::factory()->create([
        'role' => 'employee',
        'created_at' => '2026-06-04 11:00:00', // start date tomorrow 2026-06-05
    ]);

    // Create an order for today (prior to start date)
    \App\Models\LunchOrder::create([
        'lunch_day_id' => $this->lunchDay->id,
        'user_id' => $lateUser->id,
        'status' => 'opted_out',
    ]);

    $service = app(\App\Services\MonthlyBillingService::class);
    $counts = $service->countJoinedPlatesByUser(6, 2026);
    $userData = $counts->firstWhere('user_id', $lateUser->id);

    expect($userData->joined_count)->toBe(0);
});

it('excludes future days from weekly participation counts', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-04 11:30:00')); // Thursday

    $accountant = User::factory()->create(['role' => 'accountant']);
    $lateUser = User::factory()->create([
        'role' => 'employee',
        'created_at' => '2026-06-04 11:00:00', // start date tomorrow 2026-06-05 (Friday)
    ]);

    // Create a future lunch day for Friday 2026-06-05
    $fridayMenu = WeeklyMenu::firstOrCreate(
        ['weekday' => 'fri'],
        ['title' => 'Friday Feast']
    );
    LunchDay::firstOrCreate(
        ['lunch_date' => '2026-06-05'],
        ['weekly_menu_id' => $fridayMenu->id]
    );

    $response = $this->actingAs($accountant, 'sanctum')
        ->getJson('/api/v1/accountant/participation-report?type=weekly&date=2026-06-04');

    $response->assertOk();
    $users = $response->json('users');
    $userData = collect($users)->firstWhere('id', $lateUser->id);

    // Mon, Tue, Wed, Thu are before registration start date (tomorrow), so they are marked as 'not_registered'.
    // Friday is on/after start date, but since today is Thursday, Friday is in the future.
    // Therefore, its status is null (blank) and it should NOT be counted in joined_count.
    expect($userData['joined_count'])->toBe(0);
    expect($userData['skipped_count'])->toBe(0);
    expect($userData['days']['2026-06-05'])->toBeNull();
});

it('excludes future lunch days from monthly participation report total_lunch_days count', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-04 11:30:00')); // Thursday

    $accountant = User::factory()->create(['role' => 'accountant']);

    // Create a future lunch day for Friday 2026-06-05
    $fridayMenu = WeeklyMenu::firstOrCreate(
        ['weekday' => 'fri'],
        ['title' => 'Friday Feast']
    );
    LunchDay::firstOrCreate(
        ['lunch_date' => '2026-06-05'],
        ['weekly_menu_id' => $fridayMenu->id]
    );

    $response = $this->actingAs($accountant, 'sanctum')
        ->getJson('/api/v1/accountant/participation-report?type=monthly&month=6&year=2026');

    $response->assertOk();
    // There is 1 past lunch day (2026-06-04) and 1 future lunch day (2026-06-05).
    // total_lunch_days should only count the past/current day (1), not the future one.
    expect($response->json('total_lunch_days'))->toBe(1);
});
