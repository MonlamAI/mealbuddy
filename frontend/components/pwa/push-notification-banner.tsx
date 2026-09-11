'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';
import { useToast } from '@/components/providers/toast-provider';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  getCurrentPushSubscription,
  subscribeToPushNotifications,
} from '@/lib/push-notifications';

const DISMISS_STORAGE_KEY = 'mealbuddy_push_prompt_dismissed_at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function PushNotificationBanner() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only prompt for logged-in users on supported browsers
    if (typeof window === 'undefined') return;

    const user = localStorage.getItem('user');
    if (!user) return;

    if (!isPushNotificationSupported()) return;

    const permission = getNotificationPermission();
    if (permission === 'denied') return;

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      if (diff < DISMISS_COOLDOWN_MS) {
        return;
      }
    }

    // Check if user is already subscribed
    getCurrentPushSubscription().then((sub) => {
      if (!sub) {
        // Small delay to let page load cleanly first
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
    } catch {}
  };

  const handleEnable = async () => {
    setLoading(true);
    const result = await subscribeToPushNotifications();
    setLoading(false);

    if (result.success) {
      showToast(t('push_enabled_success'), 'success');
      setIsVisible(false);
    } else {
      showToast(result.error || t('push_permission_denied'), 'error');
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      aria-label={t('push_reminders_title')}
      className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 sm:p-5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-5 h-5 animate-bounce" />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-1.5 mb-1">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">
              {t('push_reminders_title')}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('push_reminders_desc')}
          </p>

          <div className="flex items-center gap-2 mt-3.5">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>{t('saving')}</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('push_enable_button')}</span>
                </>
              )}
            </button>

            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl transition-colors cursor-pointer"
            >
              {t('dismiss')}
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          aria-label={t('dismiss')}
          className="absolute top-3.5 right-3.5 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
