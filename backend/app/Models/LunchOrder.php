<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LunchOrder extends Model
{
    protected $guarded = [];
    public function user()
{
    return $this->belongsTo(User::class);
}

public function lunchDay()
{
    return $this->belongsTo(LunchDay::class);
}
}
