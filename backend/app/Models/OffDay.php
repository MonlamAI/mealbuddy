<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OffDay extends Model
{
    protected $fillable = ['off_date', 'reason'];
}
