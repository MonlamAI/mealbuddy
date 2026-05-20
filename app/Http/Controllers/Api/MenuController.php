<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WeeklyMenu;

use Illuminate\Http\Request;

class MenuController extends Controller
{
    public function index()
    {
        return WeeklyMenu::orderByRaw("CASE 
            WHEN weekday = 'mon' THEN 1 
            WHEN weekday = 'tue' THEN 2 
            WHEN weekday = 'wed' THEN 3 
            WHEN weekday = 'thu' THEN 4 
            WHEN weekday = 'fri' THEN 5 
            ELSE 6 END")->get();
    }

    public function update(Request $request, $weekday)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'image_url' => 'nullable|string',
        ]);

        $menu = WeeklyMenu::where('weekday', $weekday)->firstOrFail();
        $menu->update([
            'title' => $request->title,
            'image_url' => $request->image_url,
        ]);

        return response()->json($menu);
    }
}