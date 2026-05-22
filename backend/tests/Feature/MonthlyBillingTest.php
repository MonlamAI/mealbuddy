<?php

use App\Models\LunchDay;
use App\Models\LunchOrder;
use App\Models\MonthlyBill;
use App\Models\User;
use App\Models\WeeklyMenu;
use App\Services\MonthlyBillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('bills');
    config(['filesystems.bills_disk' => 'bills']);

    // Create accountant as inactive so they are not counted/billed for lunch plates
    $this->accountant = User::factory()->create(['role' => 'accountant', 'is_active' => false, 'created_at' => '2026-04-01 00:00:00']);
    $this->employee = User::factory()->create(['role' => 'employee', 'created_at' => '2026-04-01 00:00:00']);
    $this->otherEmployee = User::factory()->create(['role' => 'employee', 'created_at' => '2026-04-01 00:00:00']);

    $menu = WeeklyMenu::create([
        'weekday' => 'mon',
        'title' => 'Test Meal',
    ]);

    $lunchDay = LunchDay::create([
        'lunch_date' => '2026-04-07',
        'weekly_menu_id' => $menu->id,
    ]);

    LunchOrder::create([
        'lunch_day_id' => $lunchDay->id,
        'user_id' => $this->employee->id,
        'status' => 'opted_in',
    ]);

    LunchOrder::create([
        'lunch_day_id' => $lunchDay->id,
        'user_id' => $this->otherEmployee->id,
        'status' => 'opted_in',
    ]);

    $secondDay = LunchDay::create([
        'lunch_date' => '2026-04-08',
        'weekly_menu_id' => $menu->id,
    ]);

    // Both employees opt out on the second day, so they each have exactly 1 joined plate
    LunchOrder::create([
        'lunch_day_id' => $secondDay->id,
        'user_id' => $this->employee->id,
        'status' => 'opted_out',
    ]);

    LunchOrder::create([
        'lunch_day_id' => $secondDay->id,
        'user_id' => $this->otherEmployee->id,
        'status' => 'opted_out',
    ]);
});

it('calculates plate cost and user dues on the backend', function () {
    $service = app(MonthlyBillingService::class);

    $bill = $service->createMonthlyBill(
        month: 4,
        year: 2026,
        totalBill: 18000,
        uploadedBy: $this->accountant->id,
    );

    expect($bill->total_plates)->toBe(2)
        ->and((float) $bill->plate_cost)->toBe(9000.0);

    $employeeBill = $bill->userBills->firstWhere('user_id', $this->employee->id);
    expect($employeeBill->joined_count)->toBe(1)
        ->and((float) $employeeBill->amount_due)->toBe(9000.0);

    $otherBill = $bill->userBills->firstWhere('user_id', $this->otherEmployee->id);
    expect($otherBill->joined_count)->toBe(1)
        ->and((float) $otherBill->amount_due)->toBe(9000.0);
});

it('allows accountants to create monthly bills via api', function () {
    $response = $this->actingAs($this->accountant, 'sanctum')
        ->post('/api/v1/monthly-bills', [
            'month' => 4,
            'year' => 2026,
            'total_bill' => 18000,
            'bill_image' => UploadedFile::fake()->image('bill.jpg'),
            'notes' => 'April office lunch bill',
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.total_plates', 2)
        ->assertJsonPath('data.plate_cost', 9000);

    expect(MonthlyBill::count())->toBe(1);
    Storage::disk('bills')->assertExists(MonthlyBill::first()->bill_image);
});

it('prevents chefs from creating monthly bills', function () {
    $chef = User::factory()->create(['role' => 'chef']);
    $this->actingAs($chef, 'sanctum')
        ->post('/api/v1/monthly-bills', [
            'month' => 4,
            'year' => 2026,
            'total_bill' => 18000,
        ])
        ->assertForbidden();
});

it('prevents employees from creating monthly bills', function () {
    $this->actingAs($this->employee, 'sanctum')
        ->post('/api/v1/monthly-bills', [
            'month' => 4,
            'year' => 2026,
            'total_bill' => 18000,
        ])
        ->assertForbidden();
});

it('returns empty billing history when user has no bills', function () {
    $this->actingAs($this->employee, 'sanctum')
        ->getJson('/api/v1/user/monthly-bills')
        ->assertOk()
        ->assertJsonPath('current', null)
        ->assertJsonPath('history', [])
        ->assertJsonPath('meta.total', 0);
});

it('returns authenticated user billing history', function () {
    $service = app(MonthlyBillingService::class);
    $service->createMonthlyBill(4, 2026, 18000, $this->accountant->id);

    $response = $this->actingAs($this->employee, 'sanctum')
        ->getJson('/api/v1/user/monthly-bills');

    $response->assertOk()
        ->assertJsonPath('history.0.joined_count', 1)
        ->assertJsonPath('history.0.amount_due', 9000)
        ->assertJsonPath('history.0.payment_status', 'unpaid');
});

it('rejects bill creation when no joined plates exist', function () {
    // Delete all lunch days so that total lunch days is 0, leading to 0 total joined plates
    LunchDay::query()->delete();

    $this->actingAs($this->accountant, 'sanctum')
        ->post('/api/v1/monthly-bills', [
            'month' => 4,
            'year' => 2026,
            'total_bill' => 18000,
        ])
        ->assertUnprocessable()
        ->assertJsonPath('message', 'No joined lunch plates found for this month.');
});
