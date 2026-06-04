<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LunchDay;
use App\Models\LunchOrder;
use App\Models\WeeklyMenu;
use App\Models\User;
use Carbon\Carbon;
use DB;

class LunchController extends Controller
{
    // Get all lunch days
    public function index()
    {
        return LunchDay::with('menu')->latest()->get();
    }

    // Create lunch day
    public function store(Request $request)
    {
        return LunchDay::create([
            'lunch_date' => $request->lunch_date,
            'weekly_menu_id' => $request->weekly_menu_id
        ]);
    }

    //  CORE FEATURE: Poll before 10AM
    public function poll(Request $request)
    {
        $now = Carbon::now();

        if ($now->hour >= 10) {
            return response()->json(['error' => 'Polling closed'], 403);
        }

        return LunchOrder::updateOrCreate(
            [
                'lunch_day_id' => $request->lunch_day_id,
                'user_id' => $request->user()->id,
            ],
            [
                'status' => $request->status
            ]
        );
    }

    //  Monthly billing
    public function monthlySummary(Request $request)
    {
        $month = $request->month;

        return DB::table('lunch_orders')
            ->join('lunch_days', 'lunch_days.id', '=', 'lunch_orders.lunch_day_id')
            ->select(
                'user_id',
                DB::raw("COUNT(*) FILTER (WHERE status='opted_in') as total_meals")
            )
            ->whereMonth('lunch_days.lunch_date', $month)
            ->groupBy('user_id')
            ->get();
    }

    // User activity history
    public function userActivity(Request $request)
    {
        $limit = $request->query('limit');
        
        $query = LunchOrder::with(['lunchDay', 'lunchDay.menu'])
            ->where('user_id', $request->user()->id)
            ->join('lunch_days', 'lunch_orders.lunch_day_id', '=', 'lunch_days.id')
            ->orderBy('lunch_days.lunch_date', 'desc')
            ->select('lunch_orders.*');
            
        if ($limit) {
            return $query->take($limit)->get();
        }
        
        return $query->get();
    }

    // User statistics
    public function userStats(Request $request)
    {
        $userId = $request->user()->id;
        $userCreatedAt = Carbon::parse($request->user()->created_at)->startOfDay();
        $userRegisterDate = $userCreatedAt->toDateString();
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        // Count of explicitly opted_out orders ever
        $totalSkipped = LunchOrder::where('user_id', $userId)
            ->where('status', 'opted_out')
            ->count();

        // Total lunch days ever on or after registration date
        $totalLunchDays = LunchDay::where('lunch_date', '>=', $userRegisterDate)->count();

        // Default 'Yes': joined = total days - skipped days
        $totalLunchEaten = max(0, $totalLunchDays - $totalSkipped);

        // Count of explicitly opted_out orders this month
        $skippedThisMonth = LunchOrder::where('user_id', $userId)
            ->where('status', 'opted_out')
            ->join('lunch_days', 'lunch_orders.lunch_day_id', '=', 'lunch_days.id')
            ->whereMonth('lunch_days.lunch_date', $currentMonth)
            ->whereYear('lunch_days.lunch_date', $currentYear)
            ->count();

        // Total lunch days this month on or after registration date
        $lunchDaysThisMonth = LunchDay::whereMonth('lunch_date', $currentMonth)
            ->whereYear('lunch_date', $currentYear)
            ->where('lunch_date', '>=', $userRegisterDate)
            ->count();

        // Default 'Yes' for this month
        $joinedThisMonth = max(0, $lunchDaysThisMonth - $skippedThisMonth);

        return response()->json([
            'totalLunchEaten' => $totalLunchEaten,
            'joinedThisMonth' => $joinedThisMonth,
            'skippedThisMonth' => $skippedThisMonth,
        ]);
    }

    // Get today's poll status for the user
    public function todayPoll(Request $request)
    {
        $today = Carbon::today();
        $weekday = strtolower($today->format('D'));
        
        // If it's a weekend, fallback to Monday or return no menu
        if ($weekday === 'sat' || $weekday === 'sun') {
            $weekday = 'mon';
        }

        $menu = WeeklyMenu::where('weekday', $weekday)->first();

        if (!$menu) {
            return response()->json(['error' => 'No menu found for today'], 404);
        }

        $lunchDay = LunchDay::firstOrCreate(
            ['lunch_date' => $today->format('Y-m-d')],
            ['weekly_menu_id' => $menu->id]
        );

        $order = LunchOrder::where('lunch_day_id', $lunchDay->id)
            ->where('user_id', $request->user()->id)
            ->first();

        return response()->json([
            'lunch_day_id' => $lunchDay->id,
            'menu' => $menu,
            'status' => $order ? $order->status : 'opted_in', // default to opted_in
            'is_deadline_met' => Carbon::now()->hour >= 10
        ]);
    }

    // Chef Dashboard Data
    public function chefDashboardData(Request $request)
    {
        // Require chef or admin role
        if ($request->user()->role !== 'chef' && $request->user()->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $today = Carbon::today();
        $weekday = strtolower($today->format('D'));
        
        if ($weekday === 'sat' || $weekday === 'sun') {
            $weekday = 'mon'; // fallback to Monday for UI demonstration on weekends
        }

        // Today's Meal
        $menu = WeeklyMenu::where('weekday', $weekday)->first();
        $todayMeal = $menu ? $menu->title : 'Not set';

        // Get or Create LunchDay
        $lunchDay = null;
        if ($menu) {
            $lunchDay = LunchDay::firstOrCreate(
                ['lunch_date' => $today->format('Y-m-d')],
                ['weekly_menu_id' => $menu->id]
            );
        }

        // Get employees
        $employees = User::whereIn('role', ['employee', 'chef', 'accountant'])->where('is_active', true)->get();
        $totalEmployees = $employees->count();

        // Calculate today's stats and participation details
        $joined = 0;
        $skipped = 0;
        $employeeDetails = [];

        if ($lunchDay) {
            $orders = LunchOrder::where('lunch_day_id', $lunchDay->id)->get()->keyBy('user_id');
            foreach ($employees as $emp) {
                $order = $orders->get($emp->id);
                $status = 'joining'; // default to joining
                $votedAt = '--:--';
                
                if ($order) {
                    if ($order->status === 'opted_in') {
                        $status = 'joining';
                        $joined++;
                    } else if ($order->status === 'opted_out') {
                        $status = 'skipped';
                        $skipped++;
                    }
                    $votedAt = $order->updated_at->format('g:i A');
                } else {
                    $joined++;
                }
                
                $employeeDetails[] = [
                    'id' => $emp->id,
                    'name' => $emp->name,
                    'department' => $emp->department ?? 'General',
                    'status' => $status,
                    'votedAt' => $votedAt
                ];
            }
        } else {
            foreach ($employees as $emp) {
                $employeeDetails[] = [
                    'id' => $emp->id,
                    'name' => $emp->name,
                    'department' => $emp->department ?? 'General',
                    'status' => 'joining', // default to joining
                    'votedAt' => '--:--'
                ];
                $joined++;
            }
        }

        // Weekly joining (last 5 days)
        $chartData = [];
        $totalEmployeesCount = User::whereIn('role', ['employee', 'chef', 'accountant'])->where('is_active', true)->count();
        
        for ($i = 4; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $dayName = $date->format('D'); // Mon, Tue
            
            $dayRecord = LunchDay::where('lunch_date', $date->format('Y-m-d'))->first();
            $count = 0;
            if ($dayRecord) {
                $optedOutCount = LunchOrder::where('lunch_day_id', $dayRecord->id)->where('status', 'opted_out')->count();
                $count = max(0, $totalEmployeesCount - $optedOutCount);
            } else {
                // If the day has no record, everyone is counted as opted_in by default
                $count = $totalEmployeesCount;
            }
            
            $chartData[] = [
                'day' => $dayName,
                'count' => $count
            ];
        }

        return response()->json([
            'dashboardData' => [
                'todayMeal' => $todayMeal,
                'totalEmployees' => $totalEmployees,
                'joined' => $joined,
                'skipped' => $skipped,
                'employees' => $employeeDetails
            ],
            'chartData' => $chartData
        ]);
    }

    // Accountant Participation Report (Daily, Weekly, Monthly)
    public function participationReport(Request $request)
    {
        // Require accountant or admin role
        if ($request->user()->role !== 'accountant' && $request->user()->role !== 'admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $type = $request->query('type', 'daily'); // daily, weekly, monthly
        $dateStr = $request->query('date', Carbon::today()->toDateString());
        $month = (int) $request->query('month', Carbon::today()->month);
        $year = (int) $request->query('year', Carbon::today()->year);

        $activeUsers = User::where('is_active', true)
            ->whereIn('role', ['employee', 'chef', 'accountant'])
            ->get();

        if ($type === 'daily') {
            $parsedDate = Carbon::parse($dateStr);
            $dayRecord = LunchDay::with('menu')->where('lunch_date', $parsedDate->toDateString())->first();
            
            $usersData = [];
            foreach ($activeUsers as $user) {
                $userRegisterDate = Carbon::parse($user->created_at)->toDateString();
                
                if ($parsedDate->toDateString() < $userRegisterDate) {
                    $status = 'not_registered';
                    $votedAt = '--:--';
                } else {
                    $status = 'joining'; // default
                    $votedAt = '--:--';
                    
                    if ($dayRecord) {
                        $order = LunchOrder::where('lunch_day_id', $dayRecord->id)
                            ->where('user_id', $user->id)
                            ->first();
                            
                        if ($order) {
                            if ($order->status === 'opted_in') {
                                $status = 'joining';
                            } else if ($order->status === 'opted_out') {
                                $status = 'skipped';
                            }
                            $votedAt = $order->updated_at->format('g:i A');
                        }
                    }
                }
                
                $usersData[] = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'department' => $user->department ?? 'General',
                    'status' => $status,
                    'voted_at' => $votedAt
                ];
            }
            
            return response()->json([
                'date' => $parsedDate->toDateString(),
                'has_menu' => $dayRecord ? true : false,
                'menu_title' => $dayRecord && $dayRecord->menu ? $dayRecord->menu->title : null,
                'users' => $usersData
            ]);
            
        } elseif ($type === 'weekly') {
            $parsedDate = Carbon::parse($dateStr);
            $monday = $parsedDate->copy()->startOfWeek(Carbon::MONDAY);
            
            // Get 5 weekdays
            $weekdays = [];
            for ($i = 0; $i < 5; $i++) {
                $weekdays[] = $monday->copy()->addDays($i)->toDateString();
            }
            
            // Get lunch days for these weekdays
            $dayRecords = LunchDay::with('menu')
                ->whereIn('lunch_date', $weekdays)
                ->get()
                ->keyBy('lunch_date');
                
            $lunchDayIds = $dayRecords->pluck('id');
            $orders = LunchOrder::whereIn('lunch_day_id', $lunchDayIds)
                ->get()
                ->groupBy('lunch_day_id');
                
            $usersData = [];
            foreach ($activeUsers as $user) {
                $userRegisterDate = Carbon::parse($user->created_at)->toDateString();
                
                $userDays = [];
                $userJoinedCount = 0;
                $userSkippedCount = 0;
                
                foreach ($weekdays as $day) {
                    if ($day < $userRegisterDate) {
                        $userDays[$day] = 'not_registered';
                    } else {
                        $status = 'joining'; // default
                        $dayRecord = $dayRecords->get($day);
                        
                        if ($dayRecord) {
                            $dayOrders = $orders->get($dayRecord->id);
                            $order = $dayOrders ? $dayOrders->firstWhere('user_id', $user->id) : null;
                            
                            if ($order) {
                                if ($order->status === 'opted_in') {
                                    $status = 'joining';
                                    $userJoinedCount++;
                                } else if ($order->status === 'opted_out') {
                                    $status = 'skipped';
                                    $userSkippedCount++;
                                }
                            } else {
                                $userJoinedCount++; // default to joining
                            }
                        } else {
                            $userJoinedCount++; // default to joining if no record yet
                        }
                        
                        $userDays[$day] = $status;
                    }
                }
                
                $usersData[] = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'department' => $user->department ?? 'General',
                    'days' => $userDays,
                    'joined_count' => $userJoinedCount,
                    'skipped_count' => $userSkippedCount
                ];
            }
            
            $daysMeta = [];
            foreach ($weekdays as $day) {
                $dayRecord = $dayRecords->get($day);
                $daysMeta[] = [
                    'date' => $day,
                    'has_menu' => $dayRecord ? true : false,
                    'menu_title' => $dayRecord && $dayRecord->menu ? $dayRecord->menu->title : null,
                ];
            }
            
            return response()->json([
                'week_start' => $monday->toDateString(),
                'week_end' => $monday->copy()->addDays(4)->toDateString(),
                'days' => $daysMeta,
                'users' => $usersData
            ]);
            
        } elseif ($type === 'monthly') {
            // Get all lunch days in month
            $lunchDays = LunchDay::whereMonth('lunch_date', $month)
                ->whereYear('lunch_date', $year)
                ->get()
                ->keyBy('lunch_date');
                
            $lunchDayIds = $lunchDays->pluck('id');
            
            $optedOutOrders = LunchOrder::whereIn('lunch_day_id', $lunchDayIds)
                ->where('status', 'opted_out')
                ->get()
                ->groupBy('user_id');
                
            $usersData = [];
            foreach ($activeUsers as $user) {
                $userRegisterDate = Carbon::parse($user->created_at)->toDateString();
                
                // Count lunch days in month on or after user registration
                $userEligibleDays = $lunchDays->filter(function ($day) use ($userRegisterDate) {
                    return $day->lunch_date >= $userRegisterDate;
                });
                
                $totalEligibleCount = $userEligibleDays->count();
                $userOptedOutCount = $optedOutOrders->get($user->id)?->count() ?? 0;
                $joinedCount = max(0, $totalEligibleCount - $userOptedOutCount);
                
                $usersData[] = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'department' => $user->department ?? 'General',
                    'total_eligible_days' => $totalEligibleCount,
                    'joined_count' => $joinedCount,
                    'skipped_count' => $userOptedOutCount
                ];
            }
            
            return response()->json([
                'month' => $month,
                'year' => $year,
                'total_lunch_days' => $lunchDays->count(),
                'users' => $usersData
            ]);
        }
        
        return response()->json(['error' => 'Invalid report type'], 400);
    }
}