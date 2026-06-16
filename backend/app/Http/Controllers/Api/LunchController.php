<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LunchDay;
use App\Models\LunchOrder;
use App\Models\User;
use App\Models\WeeklyMenu;
use Carbon\Carbon;
use DB;
use Illuminate\Http\Request;

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
            'weekly_menu_id' => $request->weekly_menu_id,
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
                'status' => $request->status,
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
        $userId = $request->user()->id;
        $limit = $request->query('limit');
        $today = Carbon::today()->toDateString();
        $userRegisterDate = $request->user()->getEffectiveLunchStartDate();

        $daysQuery = LunchDay::with(['menu', 'orders' => function ($q) use ($userId) {
            $q->where('user_id', $userId);
        }])
        ->where('lunch_date', '>=', $userRegisterDate)
        ->where('lunch_date', '<=', $today)
        ->orderBy('lunch_date', 'desc');

        if ($limit) {
            $days = $daysQuery->take($limit)->get();
        } else {
            $days = $daysQuery->get();
        }

        $activities = $days->map(function ($day) use ($userId) {
            $order = $day->orders->first();
            return [
                'id' => $order ? $order->id : 'v-' . $day->id,
                'user_id' => $userId,
                'lunch_day_id' => $day->id,
                'status' => $order ? $order->status : 'opted_in',
                'created_at' => $order ? $order->created_at?->toIso8601String() : $day->created_at?->toIso8601String(),
                'updated_at' => $order ? $order->updated_at?->toIso8601String() : $day->updated_at?->toIso8601String(),
                'lunch_day' => [
                    'id' => $day->id,
                    'lunch_date' => $day->lunch_date,
                    'weekly_menu_id' => $day->weekly_menu_id,
                    'notes' => $day->notes,
                    'created_at' => $day->created_at?->toIso8601String(),
                    'updated_at' => $day->updated_at?->toIso8601String(),
                    'menu' => $day->menu ? [
                        'id' => $day->menu->id,
                        'title' => $day->menu->title,
                        'description' => $day->menu->description,
                        'image_url' => $day->menu->image_url,
                        'weekday' => $day->menu->weekday,
                        'created_at' => $day->menu->created_at?->toIso8601String(),
                        'updated_at' => $day->menu->updated_at?->toIso8601String(),
                    ] : null,
                ],
            ];
        });

        return response()->json($activities);
    }

    // User statistics
    public function userStats(Request $request)
    {
        $userId = $request->user()->id;
        $userRegisterDate = $request->user()->getEffectiveLunchStartDate();
        $today = Carbon::today()->toDateString();
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        // Total lunch days ever on or after registration date up to today
        $totalLunchDays = LunchDay::where('lunch_date', '>=', $userRegisterDate)
            ->where('lunch_date', '<=', $today)
            ->count();

        // Count of explicitly opted_out orders ever up to today
        $totalSkipped = LunchOrder::where('user_id', $userId)
            ->where('status', 'opted_out')
            ->join('lunch_days', 'lunch_orders.lunch_day_id', '=', 'lunch_days.id')
            ->where('lunch_days.lunch_date', '>=', $userRegisterDate)
            ->where('lunch_days.lunch_date', '<=', $today)
            ->count();

        // Default 'Yes': joined = total days - skipped days
        $totalLunchEaten = max(0, $totalLunchDays - $totalSkipped);

        // Total lunch days this month on or after registration date up to today
        $lunchDaysThisMonth = LunchDay::whereMonth('lunch_date', $currentMonth)
            ->whereYear('lunch_date', $currentYear)
            ->where('lunch_date', '>=', $userRegisterDate)
            ->where('lunch_date', '<=', $today)
            ->count();

        // Count of explicitly opted_out orders this month up to today
        $skippedThisMonth = LunchOrder::where('user_id', $userId)
            ->where('status', 'opted_out')
            ->join('lunch_days', 'lunch_orders.lunch_day_id', '=', 'lunch_days.id')
            ->whereMonth('lunch_days.lunch_date', $currentMonth)
            ->whereYear('lunch_days.lunch_date', $currentYear)
            ->where('lunch_days.lunch_date', '>=', $userRegisterDate)
            ->where('lunch_days.lunch_date', '<=', $today)
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

        if (! $menu) {
            return response()->json(['error' => 'No menu found for today'], 404);
        }

        $lunchDay = LunchDay::firstOrCreate(
            ['lunch_date' => $today->format('Y-m-d')],
            ['weekly_menu_id' => $menu->id]
        );

        $order = LunchOrder::where('lunch_day_id', $lunchDay->id)
            ->where('user_id', $request->user()->id)
            ->first();

        $effectiveStartDate = $request->user()->getEffectiveLunchStartDate();
        $defaultStatus = $today->toDateString() < $effectiveStartDate ? 'opted_out' : 'opted_in';

        return response()->json([
            'lunch_day_id' => $lunchDay->id,
            'menu' => $menu,
            'status' => $order ? $order->status : $defaultStatus,
            'is_deadline_met' => Carbon::now()->hour >= 10,
        ]);
    }

    // Get calendar poll data for the user
    public function calendarPoll(Request $request)
    {
        $year = (int) $request->query('year', Carbon::now()->year);
        $month = (int) $request->query('month', Carbon::now()->month);

        $startDate = Carbon::createFromDate($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $today = Carbon::today();

        $effectiveStartDate = $request->user()->getEffectiveLunchStartDate();

        // Fetch all lunch days in this month
        $lunchDays = LunchDay::with('menu')
            ->whereBetween('lunch_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->get()
            ->keyBy('lunch_date');

        // Fetch user's orders for these lunch days
        $lunchDayIds = $lunchDays->pluck('id');
        $orders = LunchOrder::whereIn('lunch_day_id', $lunchDayIds)
            ->where('user_id', $request->user()->id)
            ->get()
            ->keyBy('lunch_day_id');

        // Fetch all weekly menus
        $menus = WeeklyMenu::all()->keyBy('weekday');

        $days = [];
        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate)) {
            $dateStr = $currentDate->toDateString();
            $weekday = strtolower($currentDate->format('D'));
            $isWeekend = ($weekday === 'sat' || $weekday === 'sun');

            $dayMenu = null;
            $status = null;
            $lunchDayId = null;

            if (! $isWeekend) {
                $menu = $menus->get($weekday);
                $dayMenu = $menu ? [
                    'id' => $menu->id,
                    'title' => $menu->title,
                ] : null;

                $lunchDay = $lunchDays->get($dateStr);
                if ($lunchDay) {
                    $lunchDayId = $lunchDay->id;
                    $order = $orders->get($lunchDay->id);
                    $status = $order ? $order->status : null;
                }

                if (! $status) {
                    $status = $dateStr < $effectiveStartDate ? 'opted_out' : 'opted_in';
                }
            }

            $isPast = $currentDate->lt($today);
            $isToday = $currentDate->eq($today);
            $isLocked = $isPast || ($isToday && Carbon::now()->hour >= 10);

            $days[] = [
                'date' => $dateStr,
                'day_of_week' => $weekday,
                'is_weekend' => $isWeekend,
                'menu' => $dayMenu,
                'status' => $status,
                'lunch_day_id' => $lunchDayId,
                'is_past' => $isPast,
                'is_today' => $isToday,
                'is_locked' => $isLocked,
            ];

            $currentDate = $currentDate->addDay();
        }

        return response()->json([
            'year' => $year,
            'month' => $month,
            'days' => $days,
        ]);
    }

    // Submit batch votes for user
    public function batchPoll(Request $request)
    {
        $request->validate([
            'dates' => 'required|array',
            'dates.*' => 'required|date_format:Y-m-d',
            'status' => 'required|in:opted_in,opted_out',
        ]);

        $dates = $request->dates;
        $status = $request->status;
        $user = $request->user();
        $today = Carbon::today();

        // Load menus for day-of-week lookups
        $menus = WeeklyMenu::all()->keyBy('weekday');

        $updatedOrders = [];

        foreach ($dates as $dateStr) {
            $date = Carbon::parse($dateStr);

            // Check validation: Cannot vote on past dates
            if ($date->lt($today)) {
                continue; // Skip past dates
            }

            // If today, check if it's past 10 AM
            if ($date->eq($today) && Carbon::now()->hour >= 10) {
                continue; // Skip today if deadline met
            }

            $weekday = strtolower($date->format('D'));
            if ($weekday === 'sat' || $weekday === 'sun') {
                continue; // Skip weekends
            }

            $menu = $menus->get($weekday);
            if (! $menu) {
                continue; // Skip if no menu defined for this weekday
            }

            // Get or create LunchDay
            $lunchDay = LunchDay::firstOrCreate(
                ['lunch_date' => $dateStr],
                ['weekly_menu_id' => $menu->id]
            );

            // Update or create order
            $order = LunchOrder::updateOrCreate(
                [
                    'lunch_day_id' => $lunchDay->id,
                    'user_id' => $user->id,
                ],
                [
                    'status' => $status,
                ]
            );

            $updatedOrders[] = [
                'date' => $dateStr,
                'status' => $order->status,
            ];
        }

        return response()->json([
            'message' => 'Votes updated successfully',
            'updated' => $updatedOrders,
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
                    } elseif ($order->status === 'opted_out') {
                        $status = 'skipped';
                        $skipped++;
                    }
                    $votedAt = $order->updated_at->format('g:i A');
                } else {
                    $effectiveStartDate = $emp->getEffectiveLunchStartDate();
                    if ($today->toDateString() < $effectiveStartDate) {
                        $status = 'skipped';
                        $skipped++;
                    } else {
                        $status = 'joining';
                        $joined++;
                    }
                }

                $employeeDetails[] = [
                    'id' => $emp->id,
                    'name' => $emp->name,
                    'name_bo' => $emp->name_bo,
                    'nickname' => $emp->nickname,
                    'nickname_bo' => $emp->nickname_bo,
                    'department' => $emp->department ?? 'General',
                    'status' => $status,
                    'votedAt' => $votedAt,
                ];
            }
        } else {
            foreach ($employees as $emp) {
                $effectiveStartDate = $emp->getEffectiveLunchStartDate();
                if ($today->toDateString() < $effectiveStartDate) {
                    $status = 'skipped';
                    $skipped++;
                } else {
                    $status = 'joining';
                    $joined++;
                }

                $employeeDetails[] = [
                    'id' => $emp->id,
                    'name' => $emp->name,
                    'name_bo' => $emp->name_bo,
                    'nickname' => $emp->nickname,
                    'nickname_bo' => $emp->nickname_bo,
                    'department' => $emp->department ?? 'General',
                    'status' => $status,
                    'votedAt' => '--:--',
                ];
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
                'count' => $count,
            ];
        }

        return response()->json([
            'dashboardData' => [
                'todayMeal' => $todayMeal,
                'totalEmployees' => $totalEmployees,
                'joined' => $joined,
                'skipped' => $skipped,
                'employees' => $employeeDetails,
            ],
            'chartData' => $chartData,
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
                $userRegisterDate = $user->getEffectiveLunchStartDate();

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
                            } elseif ($order->status === 'opted_out') {
                                $status = 'skipped';
                            }
                            $votedAt = $order->updated_at->format('g:i A');
                        }
                    }
                }

                $usersData[] = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'name_bo' => $user->name_bo,
                    'nickname' => $user->nickname,
                    'nickname_bo' => $user->nickname_bo,
                    'role' => $user->role,
                    'department' => $user->department ?? 'General',
                    'status' => $status,
                    'voted_at' => $votedAt,
                ];
            }

            return response()->json([
                'date' => $parsedDate->toDateString(),
                'has_menu' => $dayRecord ? true : false,
                'menu_title' => $dayRecord && $dayRecord->menu ? $dayRecord->menu->title : null,
                'users' => $usersData,
            ]);

        } elseif ($type === 'weekly') {
            $parsedDate = Carbon::parse($dateStr);
            $monday = $parsedDate->copy()->startOfWeek(Carbon::MONDAY);
            $today = Carbon::today()->toDateString();

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
                $userRegisterDate = $user->getEffectiveLunchStartDate();

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
                                    if ($day <= $today) {
                                        $userJoinedCount++;
                                    }
                                } elseif ($order->status === 'opted_out') {
                                    $status = 'skipped';
                                    if ($day <= $today) {
                                        $userSkippedCount++;
                                    }
                                }
                            } else {
                                if ($day <= $today) {
                                    $userJoinedCount++; // default to joining
                                }
                            }
                        } else {
                            if ($day <= $today) {
                                $userJoinedCount++; // default to joining if no record yet
                            }
                        }

                        if ($day > $today) {
                            $status = null;
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
                    'skipped_count' => $userSkippedCount,
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
                'users' => $usersData,
            ]);

        } elseif ($type === 'monthly') {
            $today = Carbon::today()->toDateString();
            // Get all lunch days in month up to today
            $lunchDays = LunchDay::whereMonth('lunch_date', $month)
                ->whereYear('lunch_date', $year)
                ->where('lunch_date', '<=', $today)
                ->get()
                ->keyBy('lunch_date');

            $lunchDayIds = $lunchDays->pluck('id');

            $optedOutOrders = LunchOrder::whereIn('lunch_day_id', $lunchDayIds)
                ->where('status', 'opted_out')
                ->get()
                ->groupBy('user_id');

            $usersData = [];
            foreach ($activeUsers as $user) {
                $userRegisterDate = $user->getEffectiveLunchStartDate();

                // Count lunch days in month on or after user registration and on or before today
                $userEligibleDays = $lunchDays->filter(function ($day) use ($userRegisterDate, $today) {
                    return $day->lunch_date >= $userRegisterDate && $day->lunch_date <= $today;
                });

                $totalEligibleCount = $userEligibleDays->count();
                $userEligibleDayIds = $userEligibleDays->pluck('id');
                $userOptedOutCount = $optedOutOrders->get($user->id)
                    ?->filter(fn ($order) => $userEligibleDayIds->contains($order->lunch_day_id))
                    ?->count() ?? 0;
                $joinedCount = max(0, $totalEligibleCount - $userOptedOutCount);

                $usersData[] = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'department' => $user->department ?? 'General',
                    'total_eligible_days' => $totalEligibleCount,
                    'joined_count' => $joinedCount,
                    'skipped_count' => $userOptedOutCount,
                ];
            }

            return response()->json([
                'month' => $month,
                'year' => $year,
                'total_lunch_days' => $lunchDays->count(),
                'users' => $usersData,
            ]);
        }

        return response()->json(['error' => 'Invalid report type'], 400);
    }
}
