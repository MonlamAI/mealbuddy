<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DishSuggestionVote extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'dish_suggestion_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function suggestion(): BelongsTo
    {
        return $this->belongsTo(DishSuggestion::class, 'dish_suggestion_id');
    }
}
