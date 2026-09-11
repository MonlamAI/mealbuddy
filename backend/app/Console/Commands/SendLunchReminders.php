<?php

namespace App\Console\Commands;

use App\Models\LunchDay;
use App\Models\LunchOrder;
use App\Models\OffDay;
use App\Models\User;
use App\Services\WebPushService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendLunchReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'lunch:send-reminders {--force : Send reminder even if weekend or holiday}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send 9:00 AM lunch voting reminder to employees who have not opted out';

    /**
     * Execute the console command.
     */
    public function handle(WebPushService $webPushService): int
    {
        $today = Carbon::today();
        $isForce = $this->option('force');

        if (! $isForce) {
            // 1. Skip on weekends
            if ($today->isWeekend()) {
                $this->info('Today is a weekend. Skipping lunch reminder.');
                return Command::SUCCESS;
            }

            // 2. Skip on registered holidays/off-days
            if (OffDay::whereDate('date', $today)->exists()) {
                $this->info('Today is an official holiday/off-day. Skipping lunch reminder.');
                return Command::SUCCESS;
            }
        }

        // 3. Find today's lunch day record to check if any users already opted out
        $lunchDay = LunchDay::whereDate('lunch_date', $today)->first();
        $optedOutUserIds = [];

        if ($lunchDay) {
            $optedOutUserIds = LunchOrder::where('lunch_day_id', $lunchDay->id)
                ->where('status', 'opted_out')
                ->pluck('user_id')
                ->toArray();
        }

        // 4. Query active employees who have push subscriptions and have NOT opted out
        $users = User::where('role', 'employee')
            ->where('is_active', true)
            ->whereNotIn('id', $optedOutUserIds)
            ->whereHas('pushSubscriptions')
            ->with('pushSubscriptions')
            ->get();

        if ($users->isEmpty()) {
            $this->info('No eligible employees with push subscriptions found to notify.');
            return Command::SUCCESS;
        }

        $this->info("Sending lunch reminders to {$users->count()} employees...");

        $sentCount = 0;
        $failedCount = 0;

        foreach ($users as $user) {
            foreach ($user->pushSubscriptions as $sub) {
                $locale = $sub->locale ?? 'bo';

                $payload = $locale === 'en' ? [
                    'title' => '🍽️ MealBuddy — Lunch Reminder',
                    'body' => 'You’re in for lunch today! If you’re not joining, tap here to let us know before 10:00 AM.',
                    'url' => '/vote',
                ] : [
                    'title' => '🍽️ ཟས་མཐུན་ལས་རོགས། - ཉིན་གུང་གི་དྲན་སྐུལ།',
                    'body' => 'ཁྱེད་རང་དེ་རིང་ཉིན་གུང་ལ་མཉམ་ཞུགས་བྱེད་ཀྱི་ཡོད་དམ། གལ་ཏེ་མཉམ་ཞུགས་བྱེད་ཀྱི་མེད་ན་ཆུ་ཚོད་ ༡༠:༠༠ སྔོན་ལ་འདིར་ཐེངས་ཤིག་བསྣུན་ནས་ང་ཚོར་ཤེས་སུ་འཇུག་རོགས།',
                    'url' => '/vote',
                ];

                if ($webPushService->sendToSubscription($sub, $payload)) {
                    $sentCount++;
                } else {
                    $failedCount++;
                }
            }
        }

        $this->info("Reminders dispatched: {$sentCount} sent, {$failedCount} failed.");

        return Command::SUCCESS;
    }
}
