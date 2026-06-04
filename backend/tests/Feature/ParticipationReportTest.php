<?php

use App\Models\LunchDay;
use App\Models\LunchOrder;
use App\Models\User;
use App\Models\WeeklyMenu;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create accountant
    $this->accountant = User::factory()->create([
        'role' => 'accountant',
        'is_active' => true,
        'created_at' => '2026-04-01 00:00:00'
    ]);

    // Create employee
    $this->employee = User::factory()->create([
        'role' => 'employee',
        'is_active' => true,
        'created_at' => '2026-04-01 00:00:00'
    ]);

    // Create chef
    $this->chef = User::factory()->create([
        'role' => 'chef',
        'is_active' => true,
        'created_at' => '2026-04-01 00:00:00'
    ]);

    /**
     * FIX: Make test deterministic
     * Previously it was "Test Meal" but assertion expected "Chicken Curry Rice"
     */
    $this->menu = WeeklyMenu::firstOrCreate(
        ['weekday' => 'mon'],
        ['title' => 'Chicken Curry Rice']
    );

    $this->lunchDay = LunchDay::create([
        'lunch_date' => '2026-04-07',
        'weekly_menu_id' => $this->menu->id,
    ]);

    // Employee opts in
    LunchOrder::create([
        'lunch_day_id' => $this->lunchDay->id,
        'user_id' => $this->employee->id,
        'status' => 'opted_in',
    ]);

    // Chef opts out
    LunchOrder::create([
        'lunch_day_id' => $this->lunchDay->id,
        'user_id' => $this->chef->id,
        'status' => 'opted_out',
    ]);
});

it('allows accountant to retrieve daily participation report', function () {
    $response = $this->actingAs($this->accountant, 'sanctum')
        ->getJson('/api/v1/accountant/participation-report?type=daily&date=2026-04-07');

    $response->assertOk()
        ->assertJsonPath('date', '2026-04-07')
        ->assertJsonPath('has_menu', true)
        ->assertJsonPath('menu_title', 'Chicken Curry Rice');

    $users = $response->json('users');
    expect(count($users))->toBe(3);

    $empData = collect($users)->firstWhere('id', $this->employee->id);
    expect($empData['status'])->toBe('joining');

    $chefData = collect($users)->firstWhere('id', $this->chef->id);
    expect($chefData['status'])->toBe('skipped');
});

it('allows accountant to retrieve weekly participation report', function () {
    $response = $this->actingAs($this->accountant, 'sanctum')
        ->getJson('/api/v1/accountant/participation-report?type=weekly&date=2026-04-07');

    $response->assertOk()
        ->assertJsonPath('week_start', '2026-04-06')
        ->assertJsonPath('week_end', '2026-04-10');

    $users = $response->json('users');

    $empData = collect($users)->firstWhere('id', $this->employee->id);
    expect($empData['days']['2026-04-07'])->toBe('joining');

    $chefData = collect($users)->firstWhere('id', $this->chef->id);
    expect($chefData['days']['2026-04-07'])->toBe('skipped');
});

it('allows accountant to retrieve monthly participation report', function () {
    $response = $this->actingAs($this->accountant, 'sanctum')
        ->getJson('/api/v1/accountant/participation-report?type=monthly&month=4&year=2026');

    $response->assertOk()
        ->assertJsonPath('month', 4)
        ->assertJsonPath('year', 2026);

    $users = $response->json('users');

    $empData = collect($users)->firstWhere('id', $this->employee->id);
    expect($empData['joined_count'])->toBe(1);
    expect($empData['skipped_count'])->toBe(0);

    $chefData = collect($users)->firstWhere('id', $this->chef->id);
    expect($chefData['joined_count'])->toBe(0);
    expect($chefData['skipped_count'])->toBe(1);
});

it('denies access to employees', function () {
    $this->actingAs($this->employee, 'sanctum')
        ->getJson('/api/v1/accountant/participation-report?type=daily&date=2026-04-07')
        ->assertForbidden();
});