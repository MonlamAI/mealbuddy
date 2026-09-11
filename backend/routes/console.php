<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;

Schedule::command('lunch:sync-leaves')->dailyAt('09:00');
Schedule::command('lunch:send-reminders')->weekdays()->at('09:00');
