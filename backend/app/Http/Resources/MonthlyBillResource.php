<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MonthlyBillResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'month' => $this->month,
            'year' => $this->year,
            'total_bill' => (float) $this->total_bill,
            'total_plates' => $this->total_plates,
            'plate_cost' => (float) $this->plate_cost,
            'bill_image_url' => $this->bill_image_url,
            'notes' => $this->notes,
            'status' => $this->status,
            'uploaded_by' => $this->whenLoaded('uploader', fn () => [
                'id' => $this->uploader->id,
                'name' => $this->uploader->name,
            ]),
            'user_bills' => UserMonthlyBillResource::collection($this->whenLoaded('userBills')),
            'payment_statistics' => $this->when(
                isset($this->payment_statistics),
                $this->payment_statistics
            ),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
