"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2,
    XCircle,
    Calendar,
    Clock,
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
import UserBillingPanel from '@/components/billing/user-billing-panel';
import AccountantBillingPanel from '@/components/billing/accountant-billing-panel';
import { useLanguage, getDishDescriptionKey } from '@/components/providers/language-provider';
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
        className={`bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 ${className}`}
    >
        {children}
    </motion.div>
);

// --- Main Page Component ---

export default function UserDashboard() {
    const router = useRouter();
    const { t } = useLanguage();
    const [user, setUser] = useState<{ name: string; email: string; role?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Real Stats
    const [stats, setStats] = useState<UserStats>({
        joinedThisMonth: 0,
        skippedThisMonth: 0,
        totalLunchEaten: 0,
        lastVoteStatus: 'none'
    });

    const [weeklyMenu, setWeeklyMenu] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        // 1. Check Auth
        const savedUser = localStorage.getItem('user');
        if (savedUser) setUser(JSON.parse(savedUser));

        // 2. Fetch Menu
        const fetchMenu = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/weekly-menus`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setWeeklyMenu(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Failed to fetch menu", error);
            }
        };
        fetchMenu();

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

        // 3. Clock for 10 AM logic
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);

        // 3. Fake Loading
        setTimeout(() => setLoading(false), 1200);

        return () => clearInterval(timer);
    }, []);

    // Time Logic
    const isAfterCutoff = useMemo(() => {
        const cutoffTime = new Date();
        cutoffTime.setHours(10, 0, 0, 0);
        return currentTime > cutoffTime;
    }, [currentTime]);

    const activeMeal = useMemo(() => {
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        let targetIndex = currentTime.getDay();

        if (isAfterCutoff) {
            targetIndex = (targetIndex + 1) % 7;
        }

        if (targetIndex === 0 || targetIndex === 6) targetIndex = 1;

        const targetKey = days[targetIndex];
        const menuEntry = weeklyMenu.find(m => m.weekday === targetKey);

        return menuEntry ? {
            name: t(menuEntry.title),
            description: t(getDishDescriptionKey(menuEntry.title)),
            image: menuEntry.image_url || null
        } : {
            name: t('menu_not_set'),
            description: t('chef_not_decided'),
            image: null
        };
    }, [currentTime, isAfterCutoff, weeklyMenu]);

    const chartData = [
        { name: t('joined'), value: stats.joinedThisMonth, color: '#2E5A88' },
        { name: t('skipped'), value: stats.skippedThisMonth, color: '#f43f5e' },
    ];

    const monthlySummaryElement = (
        <GlassCard className="p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                {t('monthly_summary')}
            </h3>

            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={8}
                            dataKey="value"
                            cornerRadius={10}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <RechartsTooltip
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-2xl font-bold text-blue-600">{stats.joinedThisMonth}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase">{t('joined')}</p>
                </div>
                <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-2xl font-bold text-rose-500">{stats.skippedThisMonth}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase">{t('skipped')}</p>
                </div>
            </div>
        </GlassCard>
    );

    const recentActivityElement = (
        <GlassCard className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold flex items-center gap-2">
                    <History size={18} />
                    {t('recent_activity')}
                </h3>
                <button onClick={() => router.push('/user_dashboard/history')} className="text-xs font-bold text-blue-600 hover:underline">{t('view_all')}</button>
            </div>

            <div className="space-y-4">
                {recentActivity.length > 0 ? recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between group cursor-pointer" onClick={() => router.push('/user_dashboard/history')}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activity.status === 'opted_in' ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100' : 'bg-rose-50 text-rose-500 group-hover:bg-rose-100'}`}>
                                {activity.status === 'opted_in' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">{activity.status === 'opted_in' ? t('im_joining') : t('skip_today')}</p>
                                <p className="text-[10px] text-slate-400">
                                    {new Date(activity.lunch_day.lunch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-300" />
                    </div>
                )) : (
                    <div className="text-center py-4">
                        <p className="text-sm text-slate-500">{t('no_recent_activity')}</p>
                    </div>
                )}
            </div>
        </GlassCard>
    );

    if (loading) return <LoadingState />;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            {/* Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-blue-400/5 blur-[100px]" />
                <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] rounded-full bg-emerald-400/5 blur-[100px]" />
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
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-2">
                            {t('greeting')}, {user?.name?.split(' ')[0] || 'Member'}
                        </h1>
                        <p className="text-slate-500">{t('user_dashboard_desc')}</p>
                    </motion.div>
                </section>

                {/* Main Upper Split Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">

                    {/* LEFT: Meal Card (Priority) */}
                    <div className="lg:col-span-7 space-y-6">
                        <GlassCard className="p-8 border-2 border-blue-50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-40 group-hover:scale-110 transition-transform duration-500 w-32 h-32 md:w-48 md:h-48">
                                {activeMeal.image ? (
                                    <img src={activeMeal.image} alt={activeMeal.name} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <div className="text-6xl text-center w-full h-full flex items-center justify-center">🍛</div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 mb-6">
                                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${isAfterCutoff ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {isAfterCutoff ? t('tomorrows_menu') : t('todays_lunch')}
                                </div>
                                {isAfterCutoff && (
                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                        <Clock size={14} /> {t('cutoff_passed')}
                                    </span>
                                )}
                            </div>

                            <div className="relative z-10">
                                <h2 className="text-4xl font-black text-slate-900 mb-4">{activeMeal.name}</h2>
                                <p className="text-slate-600 text-lg leading-relaxed max-w-md mb-8">
                                    {activeMeal.description}
                                </p>

                                <div className="flex flex-wrap gap-4">
                                    {!isAfterCutoff ? (
                                        <>
                                            <button
                                                onClick={() => router.push('/vote')}
                                                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center gap-2"
                                            >
                                                <CheckCircle2 size={20} /> {t('im_joining')}
                                            </button>
                                            <button
                                                onClick={() => router.push('/vote')}
                                                className="px-8 py-3 bg-white text-slate-600 border border-slate-200 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                                            >
                                                {t('skip_today')}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3 w-full">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                <Calendar className="text-blue-500" size={20} />
                                            </div>
                                            <p className="text-sm font-medium text-slate-500">
                                                {t('voting_closed')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassCard>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <StatCard
                                label={t('total_meals_eaten')}
                                value={stats.totalLunchEaten}
                                icon={<Utensils className="text-emerald-600" />}
                                subtext={t('since_joined')}
                            />
                            <StatCard
                                label={t('current_month')}
                                value={stats.joinedThisMonth + stats.skippedThisMonth}
                                icon={<Calendar className="text-blue-600" />}
                                subtext={t('days_tracked')}
                            />
                        </div>
                    </div>

                    {/* RIGHT: Stats Breakdown & History Logs */}
                    <div className="lg:col-span-5 space-y-6">
                        {monthlySummaryElement}
                        {recentActivityElement}
                    </div>

                </div>

                {/* ================= CENTER ALIGNED LUNCH BILLING AREA ================= */}
                <div className="w-full flex justify-center mt-12">
                    <div className="w-full max-w-3xl">
                        {user?.role === 'accountant' ? (
                            <AccountantBillingPanel />
                        ) : (
                            <UserBillingPanel />
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}

// --- Sub-components ---

function StatCard({ label, value, icon, subtext }: any) {
    return (
        <GlassCard className="p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                {icon}
            </div>
            <h4 className="text-3xl font-bold text-slate-900 mb-1">{value}</h4>
            <p className="text-sm font-bold text-slate-800">{label}</p>
            <p className="text-xs text-slate-400 mt-1">{subtext}</p>
        </GlassCard>
    );
}

function LoadingState() {
    const { t } = useLanguage();
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
            <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/20"
            >
                <Utensils size={24} />
            </motion.div>
            <p className="text-slate-400 font-medium animate-pulse">{t('setting_table')}</p>
        </div>
    );
}