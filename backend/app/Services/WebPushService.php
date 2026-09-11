<?php

namespace App\Services;

use App\Models\PushSubscription;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Illuminate\Support\Facades\Log;

class WebPushService
{
    protected ?WebPush $webPush = null;

    public function __construct()
    {
        $publicKey = config('services.webpush.vapid_public_key', env('VAPID_PUBLIC_KEY'));
        $privateKey = config('services.webpush.vapid_private_key', env('VAPID_PRIVATE_KEY'));
        $subject = config('services.webpush.vapid_subject', env('VAPID_SUBJECT', 'mailto:admin@monlam.ai'));

        if ($publicKey && $privateKey) {
            try {
                $auth = [
                    'VAPID' => [
                        'subject' => trim($subject),
                        'publicKey' => trim($publicKey),
                        'privateKey' => trim($privateKey),
                    ],
                ];
                $this->webPush = new WebPush($auth);
                $this->webPush->setReuseVAPIDHeaders(true);
            } catch (\Throwable $e) {
                Log::error('[WebPush] Initialization failed: ' . $e->getMessage());
                $this->webPush = null;
            }
        }
    }

    public function isConfigured(): bool
    {
        return $this->webPush !== null;
    }

    /**
     * Send notification to a specific push subscription record.
     */
    public function sendToSubscription(PushSubscription $sub, array $payload): bool
    {
        if (! $this->isConfigured()) {
            Log::warning('[WebPush] VAPID keys not configured.');
            return false;
        }

        try {
            $subscription = Subscription::create([
                'endpoint' => $sub->endpoint,
                'publicKey' => $sub->public_key,
                'authToken' => $sub->auth_token,
                'contentEncoding' => $sub->content_encoding ?: 'aes128gcm',
            ]);

            $jsonPayload = json_encode($payload);
            $report = $this->webPush->sendOneNotification($subscription, $jsonPayload);

            if ($report->isSuccess()) {
                return true;
            }

            Log::info("[WebPush] Notification failed for user {$sub->user_id}: {$report->getReason()}");

            // If subscription is expired or unsubscribed (404/410 Gone), prune from database
            if ($report->isSubscriptionExpired()) {
                Log::info("[WebPush] Pruning expired subscription {$sub->id}");
                $sub->delete();
            }

            return false;
        } catch (\Throwable $e) {
            Log::error("[WebPush] Exception sending push to subscription {$sub->id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send notification to all subscriptions of a collection of users or query.
     */
    public function sendToUsers($users, array $payload): array
    {
        $sentCount = 0;
        $failedCount = 0;

        foreach ($users as $user) {
            foreach ($user->pushSubscriptions as $sub) {
                if ($this->sendToSubscription($sub, $payload)) {
                    $sentCount++;
                } else {
                    $failedCount++;
                }
            }
        }

        return [
            'sent' => $sentCount,
            'failed' => $failedCount,
        ];
    }
}
