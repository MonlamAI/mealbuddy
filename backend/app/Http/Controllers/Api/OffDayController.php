<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class OffDayController extends Controller
{
    public function index()
    {
        return response()->json(\App\Models\OffDay::orderBy('off_date', 'asc')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'off_date' => 'required|date|unique:off_days,off_date',
            'reason' => 'required|string|max:255',
        ]);

        $offDay = \App\Models\OffDay::create($request->all());

        return response()->json([
            'message' => 'Off day added successfully',
            'data' => $offDay,
        ], 201);
    }

    public function destroy(string $id)
    {
        $offDay = \App\Models\OffDay::find($id);
        
        if (!$offDay) {
            return response()->json(['message' => 'Off day not found'], 404);
        }

        $offDay->delete();

        return response()->json(['message' => 'Off day deleted successfully']);
    }
}
