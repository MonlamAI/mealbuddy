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
        return config('filesystems.bills_disk', 'bills');
    }

    private function resolveMenuImageUrl(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://') || str_starts_with($value, 'data:')) {
            return $value;
        }

        $disk = $this->menuDisk();
        $storage = Storage::disk($disk);

        if ($storage->exists($value)) {
            try {
                return $storage->url($value);
            } catch (\Throwable) {
                //
            }
        }

        return $value;
    }

    private function formatMenu(WeeklyMenu $menu): WeeklyMenu
    {
        $menu->image_url = $this->resolveMenuImageUrl($menu->getRawOriginal('image_url'));

        return $menu;
    }

    public function index()
    {
        $order = ['mon' => 1, 'tue' => 2, 'wed' => 3, 'thu' => 4, 'fri' => 5];

        return WeeklyMenu::all()
            ->sortBy(fn (WeeklyMenu $menu) => $order[(string) $menu->weekday] ?? 99)
            ->values()
            ->map(fn (WeeklyMenu $menu) => $this->formatMenu($menu))
            ->values();
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

        return response()->json($this->formatMenu($menu->fresh()));
    }
}
