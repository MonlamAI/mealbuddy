<?php

namespace App\Http\Requests;

use App\Models\UserMonthlyBill;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserBillPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('updatePayment', UserMonthlyBill::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'payment_status' => ['required', Rule::in(['paid', 'unpaid'])],
        ];
    }
}
