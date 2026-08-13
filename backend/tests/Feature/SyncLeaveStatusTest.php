<?php

use App\Models\User;
use App\Models\WeeklyMenu;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

afterEach(function () {
    Carbon::setTestNow();
});

test('leave records are matched by email', function () {
    Carbon::setTestNow('2026-08-17 08:00:00');
    config()->set('services.leave_tracker.api_key', 'test-key');

    $user = User::factory()->create([
        'name' => 'Local User',
        'email' => 'user@example.com',
    ]);
    WeeklyMenu::create([
        'weekday' => 'mon',
        'title' => 'Monday Lunch',
    ]);

    Http::fake([
        '*' => Http::response([
            'employees' => [[
                'name' => 'Different Portal Name',
                'email' => 'user@example.com',
                'start_date' => '2026-08-17',
                'end_date' => '2026-08-17',
            ]],
        ]),
    ]);

    $this->artisan('lunch:sync-leaves')->assertSuccessful();

    $this->assertDatabaseHas('lunch_orders', [
        'user_id' => $user->id,
        'status' => 'opted_out',
    ]);
});

test('leave records are not matched by name', function () {
    Carbon::setTestNow('2026-08-17 08:00:00');
    config()->set('services.leave_tracker.api_key', 'test-key');

    $user = User::factory()->create([
        'name' => 'Matching Name',
        'email' => 'local@example.com',
    ]);

    Http::fake([
        '*' => Http::response([
            'employees' => [[
                'name' => 'Matching Name',
                'email' => 'different@example.com',
                'start_date' => '2026-08-17',
                'end_date' => '2026-08-17',
            ]],
        ]),
    ]);

    $this->artisan('lunch:sync-leaves')
        ->expectsOutput('Could not find user with email: different@example.com in the local database.')
        ->assertSuccessful();

    $this->assertDatabaseMissing('lunch_orders', [
        'user_id' => $user->id,
    ]);
});
