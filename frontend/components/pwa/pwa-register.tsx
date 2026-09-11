'use client';

import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

export function PwaRegister() {
  const { t } = useLanguage();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // 1. If an updated worker is already waiting
        if (registration.waiting) {
          waitingWorkerRef.current = registration.waiting;
          setUpdateAvailable(true);
        }

        // 2. Listen for new workers entering the waiting state
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (
              installingWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New update installed and ready to be activated by user
              waitingWorkerRef.current = installingWorker;
              setUpdateAvailable(true);
            }
          });
        });
      } catch (err) {
        // Graceful error logging without spamming production
        if (process.env.NODE_ENV === 'development') {
          console.debug('[PWA] Service worker registration omitted or failed:', err);
        }
      }
    };

    // Register after initial window load for fast first paint
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorkerRef.current) {
      waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 p-4 rounded-xl bg-card border border-border shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <p className="text-xs sm:text-sm font-medium text-foreground truncate">
          {t('new_version_available')}
        </p>
      </div>

      <button
        onClick={handleUpdate}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
      >
        <RefreshCw className="w-3 h-3" />
        <span>{t('refresh')}</span>
      </button>
    </div>
  );
}
