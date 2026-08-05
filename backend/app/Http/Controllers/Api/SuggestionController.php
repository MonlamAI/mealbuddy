<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DishSuggestion;
use App\Models\DishSuggestionVote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SuggestionController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $suggestions = DishSuggestion::with('user:id,name,name_bo,nickname,nickname_bo')
            ->orderByRaw("CASE WHEN status = 'pending' THEN 1 ELSE 0 END DESC")
            ->orderBy('upvotes_count', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        $userVotes = DishSuggestionVote::where('user_id', $userId)
            ->pluck('dish_suggestion_id')
            ->toArray();

        $result = $suggestions->map(function ($suggestion) use ($userVotes) {
            $suggestion->has_voted = in_array($suggestion->id, $userVotes);
            return $suggestion;
        });

        return response()->json($result);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $suggestion = DishSuggestion::create([
            'user_id' => $request->user()->id,
            'title' => $request->title,
            'description' => $request->description,
            'status' => 'pending',
            'upvotes_count' => 1, // Author gets an automatic upvote
        ]);

        // Auto-vote for the author
        DishSuggestionVote::create([
            'user_id' => $request->user()->id,
            'dish_suggestion_id' => $suggestion->id,
        ]);

        return response()->json($suggestion->load('user:id,name,name_bo,nickname,nickname_bo'), 201);
    }

    public function toggleVote(Request $request, $id)
    {
        $suggestion = DishSuggestion::findOrFail($id);
        $userId = $request->user()->id;

        $existingVote = DishSuggestionVote::where('user_id', $userId)
            ->where('dish_suggestion_id', $suggestion->id)
            ->first();

        DB::transaction(function () use ($existingVote, $suggestion, $userId) {
            if ($existingVote) {
                $existingVote->delete();
                $suggestion->decrement('upvotes_count');
            } else {
                DishSuggestionVote::create([
                    'user_id' => $userId,
                    'dish_suggestion_id' => $suggestion->id,
                ]);
                $suggestion->increment('upvotes_count');
            }
        });

        return response()->json([
            'message' => $existingVote ? 'Vote removed' : 'Vote added',
            'upvotes_count' => $suggestion->fresh()->upvotes_count,
            'has_voted' => !$existingVote,
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        if (!in_array($request->user()->role, ['chef', 'admin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'status' => 'required|in:pending,approved,rejected,won',
        ]);

        $suggestion = DishSuggestion::findOrFail($id);
        $suggestion->update([
            'status' => $request->status,
        ]);

        return response()->json($suggestion);
    }

    public function destroy(Request $request, $id)
    {
        $suggestion = DishSuggestion::findOrFail($id);

        if ($request->user()->id !== $suggestion->user_id && !in_array($request->user()->role, ['chef', 'admin'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $suggestion->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
