<?php

namespace App\Http\Requests;

use App\Models\MonthlyBill;
use Illuminate\Foundation\Http\FormRequest;

class StoreMonthlyBillRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', MonthlyBill::class) ?? false;
    }

    public function rules(): array
    {
        $currentYear = (int) date('Y');

        return [
            'month' => ['required', 'integer', 'min:1', 'max:12'],
            'year' => ['required', 'integer', 'min:2020', 'max:'.($currentYear + 1)],
            'total_bill' => ['required', 'numeric', 'min:0.01', 'max:99999999.99'],
            'bill_image' => ['nullable', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'total_bill.min' => 'The total bill amount must be greater than zero.',
            'bill_image.max' => 'The bill image must not exceed 5MB.',
        ];
    }
}
