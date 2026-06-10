<?php

namespace App\Services;

use App\Models\MonthlyBill;
use App\Models\User;
use App\Models\UserMonthlyBill;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class MonthlyBillingService
{
    public function countJoinedPlatesByUser(int $month, int $year): Collection
    {
        $today = now()->toDateString();

        // Get all lunch days in the specified month with their dates on or before today
        $lunchDays = DB::table('lunch_days')
            ->whereMonth('lunch_date', $month)
            ->whereYear('lunch_date', $year)
            ->where('lunch_date', '<=', $today)
            ->get(['id', 'lunch_date']);

        $lunchDayIds = $lunchDays->pluck('id');

        // Get all opted_out orders for each active user in the specified month
        $optedOutOrders = DB::table('lunch_orders')
            ->whereIn('lunch_day_id', $lunchDayIds)
            ->where('status', 'opted_out')
            ->get()
            ->groupBy('user_id');

        $activeUsers = User::where('is_active', true)
            ->whereIn('role', ['employee', 'chef', 'accountant'])
            ->get();

        $results = collect();
        foreach ($activeUsers as $user) {
            $userRegisterDate = $user->getEffectiveLunchStartDate();

            // Filter lunch days in the month that are on or after the user's registration date
            $userLunchDays = $lunchDays->filter(function ($day) use ($userRegisterDate) {
                return $day->lunch_date >= $userRegisterDate;
            });
            $userLunchDaysCount = $userLunchDays->count();

            $userEligibleDayIds = $userLunchDays->pluck('id');
            $optedOutCount = $optedOutOrders->get($user->id)
                ?->filter(fn ($order) => $userEligibleDayIds->contains($order->lunch_day_id))
                ?->count() ?? 0;

            $joinedCount = max(0, $userLunchDaysCount - $optedOutCount);

            $results->push((object) [
                'user_id' => $user->id,
                'joined_count' => $joinedCount,
            ]);
        }

        return $results;
    }

    public function totalJoinedPlates(int $month, int $year): int
    {
        return $this->countJoinedPlatesByUser($month, $year)->sum('joined_count');
    }

    public function calculatePlateCost(float $totalBill, int $totalPlates): float
    {
        return round($totalBill / $totalPlates, 4);
    }

    public function calculateAmountDue(int $joinedCount, float $plateCost): float
    {
        return round($joinedCount * $plateCost, 2);
    }

    public function storeBillImage(UploadedFile $file): string
    {
        $disk = config('filesystems.bills_disk', 'bills');

        return $file->store('monthly-bills', $disk);
    }

    public function deleteBillImage(?string $path): void
    {
        if (! $path) {
            return;
        }

        $disk = config('filesystems.bills_disk', 'bills');
        Storage::disk($disk)->delete($path);
    }

    public function createMonthlyBill(
        int $month,
        int $year,
        float $totalBill,
        int $uploadedBy,
        ?UploadedFile $billImage = null,
        ?string $notes = null,
    ): MonthlyBill {
        if (MonthlyBill::where('month', $month)->where('year', $year)->exists()) {
            throw new \InvalidArgumentException('A monthly bill already exists for this period.');
        }

        $totalPlates = $this->totalJoinedPlates($month, $year);

        if ($totalPlates === 0) {
            throw new \InvalidArgumentException('No joined lunch plates found for this month.');
        }

        $plateCost = $this->calculatePlateCost($totalBill, $totalPlates);
        $participation = $this->countJoinedPlatesByUser($month, $year)->keyBy('user_id');

        return DB::transaction(function () use (
            $month,
            $year,
            $totalBill,
            $totalPlates,
            $plateCost,
            $uploadedBy,
            $billImage,
            $notes,
            $participation,
        ) {
            $billImagePath = $billImage ? $this->storeBillImage($billImage) : null;

            $monthlyBill = MonthlyBill::create([
                'month' => $month,
                'year' => $year,
                'total_bill' => $totalBill,
                'total_plates' => $totalPlates,
                'plate_cost' => $plateCost,
                'bill_image' => $billImagePath,
                'notes' => $notes,
                'uploaded_by' => $uploadedBy,
                'status' => 'finalized',
            ]);

            $activeUsers = User::where('is_active', true)
                ->whereIn('role', ['employee', 'chef', 'accountant'])
                ->get(['id']);

            foreach ($activeUsers as $user) {
                $joinedCount = (int) ($participation->get($user->id)?->joined_count ?? 0);

                UserMonthlyBill::create([
                    'monthly_bill_id' => $monthlyBill->id,
                    'user_id' => $user->id,
                    'joined_count' => $joinedCount,
                    'amount_due' => $this->calculateAmountDue($joinedCount, $plateCost),
                    'payment_status' => 'unpaid',
                ]);
            }

            return $monthlyBill->load([
                'uploader:id,name,email',
                'userBills.user:id,name,email,department',
            ]);
        });
    }

    public function deleteMonthlyBill(MonthlyBill $monthlyBill): void
    {
        DB::transaction(function () use ($monthlyBill) {
            if ($monthlyBill->bill_image) {
                $this->deleteBillImage($monthlyBill->bill_image);
            }
            $monthlyBill->delete();
        });
    }


    public function paymentStatistics(MonthlyBill $monthlyBill): array
    {
        $stats = UserMonthlyBill::where('monthly_bill_id', $monthlyBill->id)
            ->selectRaw("
                COUNT(*) as total_users,
                SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_users,
                SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) as unpaid_users,
                SUM(CASE WHEN payment_status = 'paid' THEN amount_due ELSE 0 END) as total_collected,
                SUM(amount_due) as total_due
            ")
            ->first();

        return [
            'total_users' => (int) $stats->total_users,
            'paid_users' => (int) $stats->paid_users,
            'unpaid_users' => (int) $stats->unpaid_users,
            'total_collected' => round((float) $stats->total_collected, 2),
            'total_due' => round((float) $stats->total_due, 2),
        ];
    }

    public function updatePaymentStatus(UserMonthlyBill $userBill, string $paymentStatus): UserMonthlyBill
    {
        $userBill->update([
            'payment_status' => $paymentStatus,
            'paid_at' => $paymentStatus === 'paid' ? now() : null,
        ]);

        return $userBill->fresh(['user:id,name,email,department']);
    }
}
