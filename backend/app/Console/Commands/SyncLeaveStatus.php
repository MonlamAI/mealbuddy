<?php

namespace App\Console\Commands;

use App\Models\LunchDay;
use App\Models\LunchOrder;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
        $today = Carbon::today()->toDateString();
        
        $this->info("Starting leave sync for {$today}...");

        $apiKey = config('services.leave_tracker.api_key');
        $url = config('services.leave_tracker.url');

        if (!$apiKey) {
            $this->error('Leave Tracker API key is not configured.');
            return Command::FAILURE;
        }

        try {
            $response = Http::withHeaders([
                'X-API-Key' => $apiKey,
                'Accept' => 'application/json',
            ])->get($url);

            if ($response->failed()) {
                $this->error("Failed to fetch leave data. HTTP Status: {$response->status()}");
                Log::error("Leave Tracker API Error: " . $response->body());
                return Command::FAILURE;
            }

            $data = $response->json();
            
            if (!isset($data['employees']) || !is_array($data['employees'])) {
                $this->error('Invalid response format from Leave Tracker API.');
                return Command::FAILURE;
            }

            $employeesOnLeave = $data['employees'];
            $this->info("Found " . count($employeesOnLeave) . " employees on leave.");

            // Check if there is a lunch day for today
            $lunchDay = LunchDay::where('lunch_date', $today)->first();

            if (!$lunchDay) {
                $this->warn("No LunchDay created for today ({$today}). Leaves will not be synced to lunch orders.");
                return Command::SUCCESS;
            }

            $optedOutCount = 0;

            foreach ($employeesOnLeave as $employeeData) {
                $name = $employeeData['name'] ?? null;
                
                if (!$name) {
                    continue;
                }

                // Try to find the user by name
                $user = User::where('name', $name)->first();

                if (!$user) {
                    $this->warn("Could not find user with name: {$name} in the local database.");
                    continue;
                }

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
                $this->info("Opted out user {$user->name} for today's lunch.");
            }

            $this->info("Leave sync completed successfully. {$optedOutCount} users opted out.");
            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("An error occurred: " . $e->getMessage());
            Log::error("Leave Tracker Sync Error: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
