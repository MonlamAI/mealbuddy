<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Services\WebPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    protected WebPushService $webPushService;

    public function __construct(WebPushService $webPushService)
    {
        $this->webPushService = $webPushService;
    }

    /**
     * Return public VAPID key to the frontend so it can create a subscription.
     */
    public function getVapidPublicKey(): JsonResponse
    {
        $rawKey = config('services.webpush.vapid_public_key', env('VAPID_PUBLIC_KEY'));
        $publicKey = $rawKey ? trim($rawKey, " \"'") : null;

        return response()->json([
            'vapid_public_key' => $publicKey,
        ]);
    }

    /**
     * Store or update a user's push subscription.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys.p256dh' => 'nullable|string',
            'keys.auth' => 'nullable|string',
            'content_encoding' => 'nullable|string',
            'locale' => 'nullable|string|in:bo,en',
        ]);

        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        try {
            $subscription = PushSubscription::updateOrCreate(
                ['endpoint' => $request->input('endpoint')],
                [
                    'user_id' => $user->id,
                    'public_key' => $request->input('keys.p256dh'),
                    'auth_token' => $request->input('keys.auth'),
                    'content_encoding' => $request->input('content_encoding', 'aes128gcm'),
                    'locale' => $request->input('locale', 'bo'),
                ]
            );

            return response()->json([
                'message' => 'Push subscription saved successfully.',
                'subscription' => $subscription,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('[PushSubscription] Store error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to save push subscription: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove a user's push subscription (unsubscribe).
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        $deleted = $request->user()->pushSubscriptions()
            ->where('endpoint', $request->input('endpoint'))
            ->delete();

        return response()->json([
            'message' => 'Push subscription removed successfully.',
            'deleted' => $deleted,
        ]);
    }

    /**
     * Trigger a test push notification to the current user.
     */
    public function test(Request $request): JsonResponse
    {
        $user = $request->user();
        $subs = $user->pushSubscriptions;

        if ($subs->isEmpty()) {
            return response()->json([
                'error' => 'No active push subscriptions found for this user.',
            ], 404);
        }

        $locale = $request->input('locale', $subs->first()->locale ?? 'bo');

        $payload = $locale === 'en' ? [
            'title' => '🍽️ MealBuddy — Lunch Reminder',
            'body' => 'You’re in for lunch today! If you’re not joining, tap here to let us know before 10:00 AM.',
            'url' => '/vote',
        ] : [
            'title' => '🍽️ ཟས་མཐུན་ལས་རོགས། - ཉིན་གུང་གི་དྲན་སྐུལ།',
            'body' => 'ཁྱེད་རང་དེ་རིང་ཉིན་གུང་ལ་མཉམ་ཞུགས་བྱེད་ཀྱི་ཡོད་དམ། གལ་ཏེ་མཉམ་ཞུགས་བྱེད་ཀྱི་མེད་ན་ཆུ་ཚོད་ ༡༠:༠༠ སྔོན་ལ་འདིར་ཐེངས་ཤིག་བསྣུན་ནས་ང་ཚོར་ཤེས་སུ་འཇུག་རོགས།',
            'url' => '/vote',
        ];

        $results = $this->webPushService->sendToUsers([$user], $payload);

        return response()->json([
            'message' => 'Test notification processed.',
            'results' => $results,
        ]);
    }
}
