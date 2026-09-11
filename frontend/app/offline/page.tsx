'use client';

import React from 'react';
import { WifiOff, RefreshCw, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

export default function OfflinePage() {
  const { t } = useLanguage();

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 text-center">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-5">
          <WifiOff className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          {t('you_are_offline')}
        </h1>

        <p className="text-muted-foreground text-sm sm:text-base mb-6 leading-relaxed">
          {t('internet_connection_unavailable')}
        </p>

        <p className="text-xs text-muted-foreground/80 mb-6">
          {t('offline_reconnect_prompt')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={handleRetry}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('try_again')}</span>
          </button>
          <button
            onClick={handleGoBack}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-secondary text-secondary-foreground font-medium hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('back_to_website')}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
