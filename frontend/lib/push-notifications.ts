import { apiUrl, authHeaders } from "@/lib/api-url";

/**
 * Convert a base64 string to a Uint8Array for PushManager subscription.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if Web Push notifications are supported in the current browser/environment.
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Get current notification permission status.
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Get the current active PushSubscription if already subscribed.
 */
export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error("Failed to get push subscription:", error);
    return null;
  }
}

/**
 * Fetch the VAPID Public Key from backend or fallback to env variable.
 */
export async function getVapidPublicKey(): Promise<string> {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  }

  const res = await fetch(apiUrl("/v1/push/vapid-key"), {
    credentials: "include",
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Failed to fetch VAPID key (${res.status})`);
  }

  const data = await res.json();
  return data.vapid_public_key;
}

/**
 * Subscribe the current user / browser to Web Push notifications.
 */
export async function subscribeToPushNotifications(): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: "Push notifications are not supported by this browser." };
  }

  try {
    // 1. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        success: false,
        error:
          permission === "denied"
            ? "Notification permission was denied. Please allow notifications in your browser settings."
            : "Notification permission was dismissed.",
      };
    }

    // 2. Wait for Service Worker registration
    const registration = await navigator.serviceWorker.ready;
    if (!registration) {
      return { success: false, error: "Service worker is not ready." };
    }

    // 3. Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      return { success: false, error: "VAPID public key is missing." };
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // 4. Subscribe to PushManager
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
    }

    // 5. Send subscription to Laravel backend using standard apiUrl + authHeaders
    const jsonSub = subscription.toJSON();
    const currentLocale =
      typeof window !== "undefined"
        ? localStorage.getItem("mealbuddy_lang") || "bo"
        : "bo";

    const res = await fetch(apiUrl("/v1/push-subscriptions"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: jsonSub.keys?.p256dh || null,
          auth: jsonSub.keys?.auth || null,
        },
        locale: currentLocale === "en" ? "en" : "bo",
        content_encoding:
          (PushManager as unknown as { supportedContentEncodings?: string[] })
            ?.supportedContentEncodings?.[0] || "aes128gcm",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `Failed to save push subscription (${res.status})`);
    }

    return { success: true, subscription };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to subscribe to push notifications.";
    console.error("Push subscription error:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Unsubscribe the current user / browser from Web Push notifications.
 */
export async function unsubscribeFromPushNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return { success: true };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Remove from backend first
      try {
        await fetch(apiUrl("/v1/push-subscriptions"), {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      } catch (err) {
        console.warn("Failed to remove push subscription on backend:", err);
      }

      // Unsubscribe locally
      await subscription.unsubscribe();
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to unsubscribe.";
    console.error("Push unsubscribe error:", err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Send a test push notification to verify the setup.
 */
export async function triggerTestPushNotification(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const currentLocale =
      typeof window !== "undefined"
        ? localStorage.getItem("mealbuddy_lang") || "bo"
        : "bo";

    const res = await fetch(apiUrl("/v1/push-subscriptions/test"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        locale: currentLocale === "en" ? "en" : "bo",
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || `Failed to send test push (${res.status})`);
    }

    return {
      success: true,
      message: data.message || "Test push notification sent!",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send test push notification.";
    return { success: false, error: errorMsg };
  }
}
