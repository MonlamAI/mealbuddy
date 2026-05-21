<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class MonthlyBill extends Model
{
    protected $fillable = [
        'month',
        'year',
        'total_bill',
        'total_plates',
        'plate_cost',
        'bill_image',
        'notes',
        'uploaded_by',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'month' => 'integer',
            'year' => 'integer',
            'total_bill' => 'decimal:2',
            'total_plates' => 'integer',
            'plate_cost' => 'decimal:4',
        ];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function userBills(): HasMany
    {
        return $this->hasMany(UserMonthlyBill::class);
    }

    public function getBillImageUrlAttribute(): ?string
    {
        if (! $this->bill_image) {
            return null;
        }

        $disk = config('filesystems.bills_disk', 'bills');

        $storage = Storage::disk($disk);
        $visibility = config("filesystems.disks.{$disk}.visibility", 'private');

        if ($visibility !== 'public') {
            try {
                return $storage->temporaryUrl($this->bill_image, now()->addHour());
            } catch (\Throwable) {
                // Fall through when temporary URLs are unsupported (e.g. local disk).
            }
        }

        return $storage->url($this->bill_image);
    }
}
