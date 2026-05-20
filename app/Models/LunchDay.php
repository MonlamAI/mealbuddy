<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LunchDay extends Model
{
    protected $fillable = [
        'lunch_date',
        'weekly_menu_id',
        'notes',
    ];

    public function menu()
    {
        return $this->belongsTo(WeeklyMenu::class, 'weekly_menu_id');
    }

    public function orders()
    {
        return $this->hasMany(LunchOrder::class);
    }

    public function optedInOrders()
    {
        return $this->hasMany(LunchOrder::class)
            ->where('status', 'opted_in');
    }
}