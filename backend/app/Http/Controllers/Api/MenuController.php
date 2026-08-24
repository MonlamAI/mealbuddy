<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WeeklyMenu;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MenuController extends Controller
{
    private function menuDisk(): string
    {
        return 'public';
    }



    public function index()
    {
        $order = ['mon' => 1, 'tue' => 2, 'wed' => 3, 'thu' => 4, 'fri' => 5];

        $menus = WeeklyMenu::all()
            ->sortBy(fn (WeeklyMenu $menu) => $order[(string) $menu->weekday] ?? 99)
            ->values();

        return \App\Http\Resources\WeeklyMenuResource::collection($menus)->resolve();
    }

    public function update(Request $request, string $weekday): JsonResponse
    {
        if (! in_array($request->user()->role, ['chef', 'admin', 'super_admin'], true)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'image' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ]);

        $menu = WeeklyMenu::where('weekday', $weekday)->firstOrFail();
        $disk = $this->menuDisk();

        $updates = ['title' => $request->title];

        if ($request->hasFile('image')) {
            $previous = $menu->getRawOriginal('image_url');
            if ($previous && ! str_starts_with($previous, 'http') && ! str_starts_with($previous, 'data:')) {
                Storage::disk($disk)->delete($previous);
            }

            $updates['image_url'] = $request->file('image')->store('weekly-menus', $disk);
        }

        $menu->update($updates);

        return response()->json(new \App\Http\Resources\WeeklyMenuResource($menu->fresh()));
    }
}
