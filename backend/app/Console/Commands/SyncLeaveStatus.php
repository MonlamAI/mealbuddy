<?php

namespace App\Console\Commands;

use App\Models\LunchDay;
use App\Models\LunchOrder;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class SyncLeaveStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'lunch:sync-leaves';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch leave status from the Leave Tracker API and opt-out users on leave today.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $todayCarbon = Carbon::today();
        $today = $todayCarbon->toDateString();
        $endDateStr = $todayCarbon->copy()->addDays(30)->toDateString();
        
        $this->info("Starting leave sync from {$today} to {$endDateStr}...");

        $apiKey = config('services.leave_tracker.api_key');
        $baseUrl = config('services.leave_tracker.url');
        $baseUrl = strtok($baseUrl, '?'); // Remove any existing query params
        $url = $baseUrl . '?start_date=' . $today . '&end_date=' . $endDateStr;

        if (!$apiKey) {
            $this->error('Leave Tracker API key is not configured.');
            return Command::FAILURE;
        }

        try {
            // Added timeout and retry mechanisms for network resilience
            $response = Http::withHeaders([
                'X-API-Key' => $apiKey,
                'Accept' => 'application/json',
            ])
            ->timeout(10)
            ->retry(3, 1000)
            ->get($url);

            if ($response->failed()) {
                $this->error("Failed to fetch leave data. HTTP Status: {$response->status()}");
                Log::error("Leave Tracker API Error: " . $response->body());
                $this->sendFailureAlert("Leave Tracker API Error: HTTP {$response->status()} - " . $response->body());
                return Command::FAILURE;
            }

            $data = $response->json();
            
            if (!isset($data['employees']) || !is_array($data['employees'])) {
                $this->error('Invalid response format from Leave Tracker API.');
                $this->sendFailureAlert('Invalid response format from Leave Tracker API.');
                return Command::FAILURE;
            }

            $employeesOnLeave = $data['employees'];
            $this->info("Found " . count($employeesOnLeave) . " employees on leave.");

            // Pre-fetch users to avoid N+1 queries
            $emails = array_filter(array_column($employeesOnLeave, 'email'));
            $names = array_filter(array_column($employeesOnLeave, 'name'));
            
            $users = User::whereIn('email', $emails)
                         ->orWhereIn('name', $names)
                         ->get();
                         
            $usersByEmail = $users->keyBy('email');
            $usersByName = $users->keyBy('name');

            $optedOutCount = 0;

            // Cache for lunch days to avoid redundant DB queries in the loop
            $lunchDaysCache = [];
            $menusCache = \App\Models\WeeklyMenu::all()->keyBy('weekday');

            // Use a transaction to ensure data integrity
            DB::transaction(function () use ($employeesOnLeave, $usersByEmail, $usersByName, &$optedOutCount, $todayCarbon, &$lunchDaysCache, $menusCache) {
                foreach ($employeesOnLeave as $employeeData) {
                    $name = $employeeData['name'] ?? null;
                    $email = $employeeData['email'] ?? null;
                    
                    if (!$name && !$email) {
                        continue;
                    }

                    $user = null;

                    // Memory lookup instead of DB query
                    if ($email && $usersByEmail->has($email)) {
                        $user = $usersByEmail->get($email);
                    } elseif ($name && $usersByName->has($name)) {
                        $user = $usersByName->get($name);
                    }

                    if (!$user) {
                        $identifier = $email ?? $name;
                        $this->warn("Could not find user with identifier: {$identifier} in the local database.");
                        continue;
                    }

                    $startDate = Carbon::parse($employeeData['start_date'] ?? $todayCarbon->toDateString());
                    $endDate = Carbon::parse($employeeData['end_date'] ?? $todayCarbon->toDateString());
                    
                    // Loop through each date of the leave
                    $currentDate = $startDate->copy();
                    while ($currentDate->lte($endDate)) {
                        // Only process dates today or in the future
                        if ($currentDate->gte($todayCarbon)) {
                            $dateStr = $currentDate->toDateString();
                            $weekday = strtolower($currentDate->format('D'));
                            
                            // Skip weekends
                            if ($weekday !== 'sat' && $weekday !== 'sun') {
                                if (!isset($lunchDaysCache[$dateStr])) {
                                    $menu = $menusCache->get($weekday);
                                    
                                    $lunchDaysCache[$dateStr] = LunchDay::firstOrCreate(
                                        ['lunch_date' => $dateStr],
                                        ['weekly_menu_id' => $menu ? $menu->id : null]
                                    );
                                }
                                
                                $lunchDay = $lunchDaysCache[$dateStr];

                                // Opt out the user
                                LunchOrder::updateOrCreate(
                                    [
                                        'lunch_day_id' => $lunchDay->id,
                                        'user_id' => $user->id,
                                    ],
                                    [
                                        'status' => 'opted_out',
                                    ]
                                );
                                
                                $optedOutCount++;
                                // Only log verbosely to avoid cluttering cron logs
                                $this->info("Opted out user {$user->name} for lunch on {$dateStr}.", 'v');
                            }
                        }
                        $currentDate->addDay();
                    }
                }
            });

            $this->info("Leave sync completed successfully. {$optedOutCount} opt-out operations performed.");
            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("An error occurred: " . $e->getMessage());
            Log::error("Leave Tracker Sync Error: " . $e->getMessage());
            $this->sendFailureAlert("Leave Tracker Sync Exception: " . $e->getMessage());
            return Command::FAILURE;
        }
    }

    /**
     * Send an urgent alert to all Chefs and Admins when the sync fails.
     */
    protected function sendFailureAlert($errorMessage)
    {
        $admins = User::whereIn('role', ['admin', 'chef'])->get();
        
        foreach ($admins as $admin) {
            try {
                \Illuminate\Support\Facades\Mail::raw(
                    "CRITICAL ALERT: The automated Leave Sync has failed today.\n\n" .
                    "Error Details: {$errorMessage}\n\n" .
                    "Please manually check the HR system and opt-out absent employees to ensure they are not billed for lunch today.",
                    function ($message) use ($admin) {
                        $message->to($admin->email)
                                ->subject('⚠️ [URGENT] Meal Buddy - Leave Sync Failed!');
                    }
                );
            } catch (\Exception $e) {
                Log::error("Failed to send alert email to {$admin->email}: " . $e->getMessage());
            }
        }
    }
}
