<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserMonthlyBillResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'joined_count' => $this->joined_count,
            'amount_due' => (float) $this->amount_due,
            'payment_status' => $this->payment_status,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'department' => $this->user->department,
            ]),
            'monthly_bill' => $this->whenLoaded('monthlyBill', fn () => [
                'id' => $this->monthlyBill->id,
                'month' => $this->monthlyBill->month,
                'year' => $this->monthlyBill->year,
                'plate_cost' => (float) $this->monthlyBill->plate_cost,
                'total_bill' => (float) $this->monthlyBill->total_bill,
                'total_plates' => $this->monthlyBill->total_plates,
            ]),
        ];
    }
}
