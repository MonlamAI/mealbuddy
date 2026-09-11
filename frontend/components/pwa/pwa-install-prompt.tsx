'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/components/providers/language-provider';

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STORAGE_KEY = 'mealbuddy_pwa_dismissed';

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface WindowWithMSStream extends Window {
  MSStream?: unknown;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const emptySubscribe = () => () => {};

function getIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function getIsIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua) && !(window as WindowWithMSStream).MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

function getIsDismissedFromStorage(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const dismissedTime = localStorage.getItem(STORAGE_KEY);
    if (dismissedTime) {
      const timeElapsed = Date.now() - parseInt(dismissedTime, 10);
      return timeElapsed < DISMISS_DURATION_MS;
    }
  } catch {
    return false;
  }
  return false;
}

export function PwaInstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [manuallyDismissed, setManuallyDismissed] = useState<boolean>(false);

  const isStandalone = useSyncExternalStore(emptySubscribe, getIsStandalone, () => false);
  const isIosSafari = useSyncExternalStore(emptySubscribe, getIsIosSafari, () => false);
  const isDismissedStored = useSyncExternalStore(
    emptySubscribe,
    getIsDismissedFromStorage,
    () => true
  );

  useEffect(() => {
    if (isStandalone || isDismissedStored) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone, isDismissedStored]);

  const handleDismiss = () => {
    setManuallyDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setManuallyDismissed(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('[PWA] Error during installation prompt:', err);
    }
  };

  if (isStandalone || isDismissedStored || manuallyDismissed) {
    return null;
  }

  // Case A: Chromium / Android / Desktop with install event available
  if (deferredPrompt) {
    return (
      <div
        role="region"
        aria-label={t('install_mealbuddy')}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-card border border-border rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#2E5A88] flex items-center justify-center text-white shrink-0 shadow-sm overflow-hidden p-1.5">
            <Image
              src="/icons/icon-192x192.png"
              alt="MealBuddy"
              width={36}
              height={36}
              className="rounded-lg object-contain"
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {t('install_mealbuddy')}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {t('install_app_desc')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#2E5A88] text-white hover:bg-[#244669] transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('add_to_home_screen')}</span>
          </button>
          <button
            onClick={handleDismiss}
            aria-label={t('dismiss')}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Case B: iOS Safari guidance
  if (isIosSafari) {
    return (
      <div
        role="region"
        aria-label={t('install_mealbuddy')}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-card border border-border rounded-2xl p-4 shadow-xl flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2E5A88] flex items-center justify-center text-white shrink-0 shadow-sm overflow-hidden p-1.5">
              <Image
                src="/icons/icon-192x192.png"
                alt="MealBuddy"
                width={32}
                height={32}
                className="rounded-lg object-contain"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {t('install_mealbuddy')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('install_app_desc')}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label={t('dismiss')}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/60 text-secondary-foreground text-xs">
          <Share2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{t('install_instructions_ios')}</span>
          <PlusSquare className="w-4 h-4 text-muted-foreground shrink-0 ml-auto" />
        </div>
      </div>
    );
  }

  return null;
}
