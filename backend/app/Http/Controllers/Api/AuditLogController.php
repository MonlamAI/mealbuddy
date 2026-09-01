<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MonthlyBill;
use Illuminate\Http\JsonResponse;
use Spatie\Activitylog\Models\Activity;

class AuditLogController extends Controller
{
    public function __construct()
    {
        // Require accountant role or admin
    }

    public function monthlyBillLogs(MonthlyBill $monthlyBill): JsonResponse
    {
        $this->authorize('view', $monthlyBill);

        // Get logs for the MonthlyBill itself
        $billLogs = Activity::where('subject_type', MonthlyBill::class)
            ->where('subject_id', $monthlyBill->id)
            ->with('causer')
            ->get();

        // Get logs for the related UserMonthlyBills
        $userBillIds = $monthlyBill->userBills()->pluck('id');
        
        $userBillLogs = Activity::where('subject_type', 'App\Models\UserMonthlyBill')
            ->whereIn('subject_id', $userBillIds)
            ->with(['causer', 'subject.user'])
            ->get();

        $allLogs = $billLogs->concat($userBillLogs)->sortByDesc('created_at')->values();

        $formattedLogs = $allLogs->map(function ($log) {
            $subjectName = $log->subject_type === MonthlyBill::class
                ? 'Monthly Bill'
                : 'User Bill (' . ($log->subject->user->name ?? 'Unknown') . ')';

            return [
                'id' => $log->id,
                'description' => $log->description,
                'event' => $log->event,
                'subject' => $subjectName,
                'causer' => $log->causer ? $log->causer->name : 'System',
                'properties' => $log->properties,
                'created_at' => $log->created_at,
            ];
        });

        return response()->json([
            'data' => $formattedLogs,
        ]);
    }
}
