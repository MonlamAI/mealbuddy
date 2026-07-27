<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class WeeklyMenuResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $imageUrl = $this->image_url;

        if ($imageUrl !== null && $imageUrl !== '') {
            if (!str_starts_with($imageUrl, 'http://') && !str_starts_with($imageUrl, 'https://') && !str_starts_with($imageUrl, 'data:')) {
                $disk = config('filesystems.default', 'public');
                $storage = Storage::disk($disk);

                try {
                    $imageUrl = $storage->url($imageUrl);
                } catch (\Throwable $e) {
                    // ignore
                }
            }
        }

        return [
            'id' => $this->id,
            'weekday' => $this->weekday,
            'title' => $this->title,
            'image_url' => $imageUrl,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
