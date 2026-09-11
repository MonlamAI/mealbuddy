'use client';

import React, { useEffect, useState, useRef, useSyncExternalStore } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function NetworkStatusIndicator() {
  const { t } = useLanguage();
  const isOnline = useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineSnapshot,
    getServerSnapshot
  );
  const [showRestoredBanner, setShowRestoredBanner] = useState<boolean>(false);
  const prevOnlineRef = useRef<boolean>(true);

  useEffect(() => {
    if (!prevOnlineRef.current && isOnline) {
      // Transitioned from offline to online
      setShowRestoredBanner(true);
      const timer = setTimeout(() => {
        setShowRestoredBanner(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  // Normal online state: render nothing
  if (isOnline && !showRestoredBanner) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-22 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300"
    >
      {!isOnline ? (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 text-white dark:bg-amber-600/90 shadow-md backdrop-blur-sm text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>{t('you_are_offline')}</span>
        </div>
      ) : showRestoredBanner ? (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-600/90 text-white dark:bg-emerald-500/90 shadow-md backdrop-blur-sm text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200">
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span>{t('back_online')}</span>
        </div>
      ) : null}
    </div>
  );
}
