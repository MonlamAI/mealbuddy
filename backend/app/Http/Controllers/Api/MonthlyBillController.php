<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMonthlyBillRequest;
use App\Http\Requests\UpdateUserBillPaymentRequest;
use App\Http\Resources\MonthlyBillResource;
use App\Http\Resources\UserMonthlyBillResource;
use App\Models\MonthlyBill;
use App\Models\UserMonthlyBill;
use App\Services\MonthlyBillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MonthlyBillController extends Controller
{
    public function __construct(
        private readonly MonthlyBillingService $billingService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', MonthlyBill::class);

        $query = MonthlyBill::query()
            ->with('uploader:id,name')
            ->withCount([
                'userBills as paid_users_count' => fn ($q) => $q->where('payment_status', 'paid'),
                'userBills as unpaid_users_count' => fn ($q) => $q->where('payment_status', 'unpaid'),
            ])
            ->orderByDesc('year')
            ->orderByDesc('month');

        if ($request->filled('month')) {
            $query->where('month', (int) $request->month);
        }

        if ($request->filled('year')) {
            $query->where('year', (int) $request->year);
        }

        $bills = $query->paginate($request->integer('per_page', 12));

        return response()->json([
            'data' => MonthlyBillResource::collection($bills->items()),
            'meta' => [
                'current_page' => $bills->currentPage(),
                'last_page' => $bills->lastPage(),
                'per_page' => $bills->perPage(),
                'total' => $bills->total(),
            ],
        ]);
    }

    public function store(StoreMonthlyBillRequest $request): JsonResponse
    {
        try {
            $monthlyBill = $this->billingService->createMonthlyBill(
                month: (int) $request->month,
                year: (int) $request->year,
                totalBill: (float) $request->total_bill,
                uploadedBy: $request->user()->id,
                billImage: $request->file('bill_image'),
                notes: $request->notes,
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $monthlyBill->payment_statistics = $this->billingService->paymentStatistics($monthlyBill);

        return response()->json([
            'message' => 'Monthly bill generated successfully.',
            'data' => new MonthlyBillResource($monthlyBill),
        ], 201);
    }

    public function show(MonthlyBill $monthlyBill): JsonResponse
    {
        $this->authorize('view', $monthlyBill);

        $monthlyBill->load([
            'uploader:id,name,email',
            'userBills' => fn ($q) => $q->with('user:id,name,name_bo,nickname,nickname_bo,email,department')->orderByDesc('amount_due'),
        ]);

        $monthlyBill->payment_statistics = $this->billingService->paymentStatistics($monthlyBill);

        return response()->json([
            'data' => new MonthlyBillResource($monthlyBill),
        ]);
    }

    public function userBills(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $perPage = $request->integer('per_page', 12);
        $page = max(1, $request->integer('page', 1));

        $allBills = UserMonthlyBill::query()
            ->where('user_id', $userId)
            ->with(['monthlyBill:id,month,year,total_bill,total_plates,plate_cost,status,created_at'])
            ->get()
            ->filter(fn (UserMonthlyBill $bill) => $bill->monthlyBill !== null)
            ->when(
                $request->filled('month') && $request->filled('year'),
                fn ($collection) => $collection->filter(
                    fn (UserMonthlyBill $bill) => $bill->monthlyBill->month === (int) $request->month
                        && $bill->monthlyBill->year === (int) $request->year
                )
            )
            ->sortByDesc(
                fn (UserMonthlyBill $bill) => ($bill->monthlyBill->year * 100) + $bill->monthlyBill->month
            )
            ->values();

        $total = $allBills->count();
        $items = $allBills->slice(($page - 1) * $perPage, $perPage)->values();

        $current = $allBills->first(
            fn (UserMonthlyBill $bill) => $bill->monthlyBill->month === (int) now()->format('n')
                && $bill->monthlyBill->year === (int) now()->format('Y')
        );

        return response()->json([
            'current' => $current ? new UserMonthlyBillResource($current) : null,
            'history' => UserMonthlyBillResource::collection($items),
            'meta' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    public function updatePayment(
        UpdateUserBillPaymentRequest $request,
        MonthlyBill $monthlyBill,
        UserMonthlyBill $userMonthlyBill,
    ): JsonResponse {
        $this->authorize('updatePayment', $userMonthlyBill);

        if ($userMonthlyBill->monthly_bill_id !== $monthlyBill->id) {
            return response()->json(['message' => 'User bill does not belong to this monthly bill.'], 404);
        }

        $updated = $this->billingService->updatePaymentStatus(
            $userMonthlyBill,
            $request->payment_status,
        );

        return response()->json([
            'message' => 'Payment status updated.',
            'data' => new UserMonthlyBillResource($updated),
        ]);
    }

    public function destroy(MonthlyBill $monthlyBill): JsonResponse
    {
        $this->authorize('delete', $monthlyBill);

        $this->billingService->deleteMonthlyBill($monthlyBill);

        return response()->json([
            'message' => 'Monthly bill deleted successfully.',
        ]);
    }
}
