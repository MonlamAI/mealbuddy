"use client";

import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    Calendar,
    Utensils,
    History,
    ChevronRight,
    TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip
} from 'recharts';
import { useLanguage } from '@/components/providers/language-provider';
import { useTheme } from '@/components/providers/theme-provider';
import Header from '@/components/header';

// --- Types ---

interface UserStats {
    joinedThisMonth: number;
    skippedThisMonth: number;
    totalLunchEaten: number;
    lastVoteStatus: 'joining' | 'skipped' | 'none';
}

// --- Shared Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white dark:bg-[#272727] border border-slate-100 dark:border-[#323232] rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 text-slate-800 dark:text-[#F5F5F5] ${className}`}
    >
        {children}
    </motion.div>
);

// --- Main Page Component ---

export default function UserDashboard() {
    const { resolvedTheme } = useTheme();
    const router = useRouter();
    const { t } = useLanguage();
    const [user, setUser] = useState<{ name: string; email: string; role?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    // Real Stats
    const [stats, setStats] = useState<UserStats>({
        joinedThisMonth: 0,
        skippedThisMonth: 0,
        totalLunchEaten: 0,
        lastVoteStatus: 'none'
    });

    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        // 1. Check Auth
        const savedUser = localStorage.getItem('user');
        if (savedUser) setUser(JSON.parse(savedUser));

        // Fetch Recent Activity
        const fetchActivity = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/user/activity?limit=3`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setRecentActivity(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Failed to fetch activity", error);
            }
        };
        fetchActivity();

        // Fetch User Stats
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/user/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(prev => ({ ...prev, ...data }));
                }
            } catch (error) {
                console.error("Failed to fetch stats", error);
            }
        };
        fetchStats();

        // Fake Loading to show a nice entrance
        setTimeout(() => setLoading(false), 800);
    }, []);

    const chartData = [
        { name: t('joined'), value: stats.joinedThisMonth, color: '#2E5A88' },
        { name: t('skipped'), value: stats.skippedThisMonth, color: '#f43f5e' },
    ];

    if (loading) return <LoadingState />;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            {/* Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-400/5 dark:bg-blue-400/[0.02] blur-[100px]" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-emerald-400/5 dark:bg-emerald-400/[0.02] blur-[100px]" />
            </div>

            <Header user={user} onLogout={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/');
            }} onNavigateHome={() => router.push('/')} />

            <main className="relative z-10 max-w-6xl mx-auto px-4 pt-28 pb-20">

                {/* Welcome Section */}
                <section className="mb-10">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
                            {t('greeting')}, {user?.name?.split(' ')[0] || 'Member'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">{t('user_dashboard_desc')}</p>
                    </motion.div>
                </section>

                {/* Main Unified Dashboard Summary Card */}
                <GlassCard className="p-8 md:p-10">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 dark:text-[#F5F5F5]">{t('dashboard_summary')}</h2>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* LEFT COLUMN - Stats Cards & Monthly Summary */}
                        <div className="lg:col-span-7 flex flex-col gap-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Total Meals Eaten */}
                                <div className="p-6 bg-white dark:bg-[#202020] border border-slate-100 dark:border-[#323232] rounded-3xl shadow-sm flex flex-col">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center mb-4">
                                        <Utensils size={20} />
                                    </div>
                                    <h4 className="text-3xl font-black text-slate-900 dark:text-[#F5F5F5] mb-1">{stats.totalLunchEaten}</h4>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-300">{t('total_meals_eaten')}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">{t('since_joined')}</p>
                                </div>

                                {/* Current Month */}
                                <div className="p-6 bg-white dark:bg-[#202020] border border-slate-100 dark:border-[#323232] rounded-3xl shadow-sm flex flex-col">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center mb-4">
                                        <Calendar size={20} />
                                    </div>
                                    <h4 className="text-3xl font-black text-slate-900 dark:text-[#F5F5F5] mb-1">{stats.joinedThisMonth + stats.skippedThisMonth}</h4>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-300">{t('current_month')}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">{t('days_tracked')}</p>
                                </div>
                            </div>

                            {/* Monthly Summary */}
                            <div className="p-6 bg-white dark:bg-[#202020] border border-slate-100 dark:border-[#323232] rounded-3xl shadow-sm flex-1 flex flex-col justify-between min-h-[320px]">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-[#F5F5F5] flex items-center gap-2 mb-4">
                                    <TrendingUp size={20} className="text-blue-600" />
                                    {t('monthly_summary')}
                                </h3>

                                <div className="h-44 w-full relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                innerRadius={55}
                                                outerRadius={70}
                                                paddingAngle={6}
                                                dataKey="value"
                                                cornerRadius={8}
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{
                                                    borderRadius: '16px',
                                                    border: resolvedTheme === 'dark' ? '1px solid #323232' : 'none',
                                                    backgroundColor: resolvedTheme === 'dark' ? '#202020' : '#ffffff',
                                                    color: resolvedTheme === 'dark' ? '#F5F5F5' : '#1F2A44',
                                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <div className="text-center p-3 rounded-2xl bg-blue-50/50 dark:bg-[#202020]/50 border border-blue-100/50 dark:border-[#323232]/50">
                                        <p className="text-xl font-bold text-blue-600 dark:text-[#D7E8F4]">{stats.joinedThisMonth}</p>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('joined')}</p>
                                    </div>
                                    <div className="text-center p-3 rounded-2xl bg-rose-50/50 dark:bg-[#202020]/50 border border-rose-100/50 dark:border-[#323232]/50">
                                        <p className="text-xl font-bold text-rose-500">{stats.skippedThisMonth}</p>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('skipped')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN - Recent Activity & Billing Button */}
                        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
                            {/* Recent Activity */}
                            <div className="p-6 bg-white dark:bg-[#202020] border border-slate-100 dark:border-[#323232] rounded-3xl shadow-sm flex-1 flex flex-col min-h-[350px]">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-[#F5F5F5] text-lg">
                                        <History size={18} className="text-slate-500" />
                                        {t('recent_activity')}
                                    </h3>
                                    <button onClick={() => router.push('/user_dashboard/history')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                                        {t('view_all')}
                                    </button>
                                </div>

                                <div className="space-y-4 flex-1">
                                    {recentActivity.length > 0 ? recentActivity.map((activity) => (
                                        <div key={activity.id} className="flex items-center justify-between group cursor-pointer" onClick={() => router.push('/user_dashboard/history')}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activity.status === 'opted_in' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-500 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40'}`}>
                                                    {activity.status === 'opted_in' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{activity.status === 'opted_in' ? t('im_joining') : t('skip_today')}</p>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-400">
                                                        {new Date(activity.lunch_day.lunch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-300" />
                                        </div>
                                    )) : (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('no_recent_activity')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Redirect Button */}
                            <button
                                onClick={() => router.push('/user_dashboard/billing')}
                                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/10 text-center flex items-center justify-center text-sm"
                            >
                                {t('view_monthly_lunch_billing')}
                            </button>
                        </div>
                    </div>
                </GlassCard>

            </main>
        </div>
    );
}

// --- Loading State Component ---

function LoadingState() {
    const { t } = useLanguage();
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center">
            <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/20"
            >
                <Utensils size={24} />
            </motion.div>
            <p className="text-slate-400 dark:text-slate-300 font-medium animate-pulse">{t('setting_table')}</p>
        </div>
    );
}