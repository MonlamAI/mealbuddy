<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Broadcast;
use Illuminate\Http\Request;
use Carbon\Carbon;
use DB;

class BroadcastController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        // Get active broadcasts from the last 24 hours
        $broadcasts = Broadcast::with('user:id,name,role')
            ->where('created_at', '>=', Carbon::now()->subHours(24))
            ->orderBy('created_at', 'desc')
            ->get();

        // Get read broadcast IDs for this user
        $readIds = DB::table('broadcast_reads')
            ->where('user_id', $userId)
            ->whereIn('broadcast_id', $broadcasts->pluck('id'))
            ->pluck('broadcast_id')
            ->toArray();

        // Attach is_read flag
        $broadcasts->transform(function ($b) use ($readIds) {
            $b->is_read = in_array($b->id, $readIds);
            return $b;
        });

        return response()->json($broadcasts);
    }

    public function store(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:1000',
            'type' => 'nullable|string|max:50'
        ]);

        $broadcast = Broadcast::create([
            'message' => $request->message,
            'type' => $request->type ?? 'info',
            'user_id' => $request->user()->id,
        ]);

        return response()->json($broadcast, 201);
    }

    public function markAsRead(Request $request, $id)
    {
        DB::table('broadcast_reads')->updateOrInsert(
            ['user_id' => $request->user()->id, 'broadcast_id' => $id],
            ['created_at' => Carbon::now(), 'updated_at' => Carbon::now()]
        );
        return response()->json(['success' => true]);
    }
}
