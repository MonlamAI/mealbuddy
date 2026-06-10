"use client";

import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UserBillingPanel from '@/components/billing/user-billing-panel';
import AccountantBillingPanel from '@/components/billing/accountant-billing-panel';
import { useLanguage } from '@/components/providers/language-provider';

export default function BillingPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [user, setUser] = useState<{ name: string; email: string; role?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse user data", e);
            }
        }
        setLoading(false);
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <p className="text-slate-400 dark:text-slate-300 font-medium animate-pulse">{t('setting_table')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <Header user={user} onLogout={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/');
            }} onNavigateHome={() => router.push('/')} />

            <main className="max-w-4xl mx-auto px-4 pt-28 pb-20">
                <button 
                    onClick={() => router.push('/user_dashboard')}
                    className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium mb-8 transition-colors cursor-pointer"
                >
                    <ArrowLeft size={20} />
                    {t('back_to_dashboard') || 'Back to Dashboard'}
                </button>

                <div className="w-full">
                    {user?.role === 'accountant' ? (
                        <AccountantBillingPanel />
                    ) : (
                        <UserBillingPanel />
                    )}
                </div>
            </main>
        </div>
    );
}
