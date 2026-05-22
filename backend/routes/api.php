<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BroadcastController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\LunchController;
use App\Http\Controllers\Api\MenuController;
use App\Http\Controllers\Api\MonthlyBillController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1');

    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:5,1');

    /*
    |--------------------------------------------------------------------------
    | Public Routes
    |--------------------------------------------------------------------------
    */

    Route::get('/weekly-menus', [MenuController::class, 'index']);

    /*
    |--------------------------------------------------------------------------
    | Protected Routes
    |--------------------------------------------------------------------------
    */

    Route::middleware('auth:sanctum')->group(function () {

        // Auth User
        Route::get('/user', [AuthController::class, 'user']);

        Route::post('/logout', [AuthController::class, 'logout']);

        Route::put('/weekly-menus/{weekday}', [MenuController::class, 'update']);

        /*
        |--------------------------------------------------------------------------
        | Lunch System
        |--------------------------------------------------------------------------
        */

        Route::get('/lunch-days', [LunchController::class, 'index']);
        Route::post('/lunch-days', [LunchController::class, 'store']);
        Route::get('/chef/dashboard', [LunchController::class, 'chefDashboardData']);

        /*
        |--------------------------------------------------------------------------
        | Poll System
        |--------------------------------------------------------------------------
        */

        Route::post('/poll', [LunchController::class, 'poll']);

        /*
        |--------------------------------------------------------------------------
        | Monthly Summary
        |--------------------------------------------------------------------------
        */

        Route::get('/monthly-summary', [LunchController::class, 'monthlySummary']);

        Route::get('/user/activity', [LunchController::class, 'userActivity']);
        Route::get('/user/stats', [LunchController::class, 'userStats']);
        Route::get('/today-poll', [LunchController::class, 'todayPoll']);

        /*
        |--------------------------------------------------------------------------
        | Broadcasts
        |--------------------------------------------------------------------------
        */

        Route::get('/broadcasts', [BroadcastController::class, 'index']);
        Route::post('/broadcasts', [BroadcastController::class, 'store']);
        Route::post('/broadcasts/{id}/read', [BroadcastController::class, 'markAsRead']);

        /*
        |--------------------------------------------------------------------------
        | Expenses
        |--------------------------------------------------------------------------
        */

        Route::post('/expenses', [ExpenseController::class, 'store']);

        /*
        |--------------------------------------------------------------------------
        | Monthly Billing
        |--------------------------------------------------------------------------
        */

        Route::get('/user/monthly-bills', [MonthlyBillController::class, 'userBills']);

        Route::get('/monthly-bills', [MonthlyBillController::class, 'index']);
        Route::post('/monthly-bills', [MonthlyBillController::class, 'store']);
        Route::get('/monthly-bills/{monthlyBill}', [MonthlyBillController::class, 'show']);
        Route::patch('/monthly-bills/{monthlyBill}/user-bills/{userMonthlyBill}', [MonthlyBillController::class, 'updatePayment']);
    });
});
