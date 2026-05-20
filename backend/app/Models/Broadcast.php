<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Broadcast extends Model
{
    protected $fillable = ['message', 'type', 'user_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
