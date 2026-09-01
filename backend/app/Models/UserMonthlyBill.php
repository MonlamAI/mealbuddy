<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class UserMonthlyBill extends Model
{
    use LogsActivity;
    protected $fillable = [
        'monthly_bill_id',
        'user_id',
        'joined_count',
        'amount_due',
        'payment_status',
        'paid_at',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    protected function casts(): array
    {
        return [
            'joined_count' => 'integer',
            'amount_due' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public function monthlyBill(): BelongsTo
    {
        return $this->belongsTo(MonthlyBill::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
