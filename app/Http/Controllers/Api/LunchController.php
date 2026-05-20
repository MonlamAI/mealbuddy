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

    //  CORE FEATURE: Poll before 4PM
    public function poll(Request $request)
    {
        $now = Carbon::now();

        if ($now->hour >= 16) {
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
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        $totalLunchEaten = LunchOrder::where('user_id', $userId)
            ->where('status', 'opted_in')
            ->count();

        $joinedThisMonth = LunchOrder::where('user_id', $userId)
            ->where('status', 'opted_in')
            ->join('lunch_days', 'lunch_orders.lunch_day_id', '=', 'lunch_days.id')
            ->whereMonth('lunch_days.lunch_date', $currentMonth)
            ->whereYear('lunch_days.lunch_date', $currentYear)
            ->count();

        $skippedThisMonth = LunchOrder::where('user_id', $userId)
            ->where('status', 'opted_out')
            ->join('lunch_days', 'lunch_orders.lunch_day_id', '=', 'lunch_days.id')
            ->whereMonth('lunch_days.lunch_date', $currentMonth)
            ->whereYear('lunch_days.lunch_date', $currentYear)
            ->count();

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
            'status' => $order ? $order->status : null,
            'is_deadline_met' => Carbon::now()->hour >= 16
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
        $employees = User::where('role', 'employee')->where('is_active', true)->get();
        $totalEmployees = $employees->count();

        // Calculate today's stats and participation details
        $joined = 0;
        $skipped = 0;
        $employeeDetails = [];

        if ($lunchDay) {
            $orders = LunchOrder::where('lunch_day_id', $lunchDay->id)->get()->keyBy('user_id');
            foreach ($employees as $emp) {
                $order = $orders->get($emp->id);
                $status = 'no_response';
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
                    'status' => 'no_response',
                    'votedAt' => '--:--'
                ];
            }
        }

        // Weekly joining (last 5 days)
        $chartData = [];
        for ($i = 4; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $dayName = $date->format('D'); // Mon, Tue
            
            $dayRecord = LunchDay::where('lunch_date', $date->format('Y-m-d'))->first();
            $count = 0;
            if ($dayRecord) {
                $count = LunchOrder::where('lunch_day_id', $dayRecord->id)->where('status', 'opted_in')->count();
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
}