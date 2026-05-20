<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WeeklyMenu extends Model
{
    protected $table = 'weekly_menus';

    protected $fillable = [
        'weekday',
        'title',
        'image_url',
    ];

    public function lunchDays()
    {
        return $this->hasMany(LunchDay::class);
    }
}
