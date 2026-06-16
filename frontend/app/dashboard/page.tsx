"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import {
    Users,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Search,
    Bell,
    LogOut,
    ChefHat,
    Clock,
    Utensils,
    Calendar,
    Filter,
    ArrowUpRight,
    Loader2,
    Home,
    X,
    Camera,
    UploadCloud,
    CheckCheck,
    ChevronRight,
    History
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    motion,
    AnimatePresence,
    useScroll,
    useTransform
} from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useToast } from '@/components/providers/toast-provider';
import { apiUrl, authHeaders } from '@/lib/api-url';
import { useLanguage, LanguageSwitcher } from '@/components/providers/language-provider';
import { useTheme, ThemeSwitcher } from '@/components/providers/theme-provider';
import Header from '@/components/header';

// --- Types ---

type ParticipationStatus = 'joining' | 'skipped' | 'no_response';

interface Employee {
    id: number;
    name: string;
    department: string;
    status: ParticipationStatus;
    votedAt: string;
}

interface DashboardData {
    todayMeal: string;
    totalEmployees: number;
    joined: number;
    skipped: number;
    employees: Employee[];
}


// --- Shared Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className={`bg-white dark:bg-[#272727] border border-slate-100 dark:border-[#323232] rounded-3xl shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 text-slate-800 dark:text-[#F5F5F5] ${className}`}
    >
        {children}
    </motion.div>
);

const Badge = ({ status }: { status: ParticipationStatus }) => {
    const { t } = useLanguage();
    if (status === 'no_response') {
        return (
            <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit bg-slate-50 text-slate-500 border border-slate-200">
                <Clock size={14} /> {t('waiting_filter')}
            </span>
        );
    }
    const isJoining = status === 'joining';
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit ${isJoining ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
            }`}>
            {isJoining ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {isJoining ? t('joined') : t('skipped')}
        </span>
    );
};

// --- Main Page Component ---

export default function ChefDashboard() {
    const { resolvedTheme } = useTheme();
    const router = useRouter();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [user, setUser] = useState<{
        name: string;
        role?: string;
        name_bo?: string;
        nickname?: string;
        nickname_bo?: string;
        avatar_url?: string;
    } | null>(null);
    const [data, setData] = useState<DashboardData | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<'all' | ParticipationStatus>('all');

    // --- Weekly Menu State ---
    const [weeklyMenu, setWeeklyMenu] = useState<any[]>([]);

    // --- Broadcast State ---
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // --- Chef Personal Stats & Voting State ---
    const [personalStats, setPersonalStats] = useState<any>({
        totalLunchEaten: 0,
        joinedThisMonth: 0,
        skippedThisMonth: 0
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [todayPoll, setTodayPoll] = useState<any>({
        status: 'opted_in',
        lunch_day_id: null,
        is_deadline_met: false
    });
    const [isSubmittingVote, setIsSubmittingVote] = useState(false);

    // Simulation of API Fetch
    useEffect(() => {
        let userObj: { name: string; role?: string } | null = null;
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                userObj = JSON.parse(savedUser);
                setUser(userObj);
            } catch (e) {
                console.error("Failed to parse user data");
            }
        }

        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        // Strict Client-Side Route Guard: block access for non-chef roles.
        // Keep loading = true to avoid showing a flash of restricted content.
        if (!userObj || userObj.role !== 'chef') {
            if (userObj) {
                router.push('/user_dashboard');
            } else {
                router.push('/login');
            }
            return;
        }

        const fetchData = async () => {
            try {
                const headers = authHeaders();

                const [menuRes, dashRes, statsRes, activityRes, todayPollRes] = await Promise.all([
                    fetch(apiUrl('/v1/weekly-menus'), { cache: 'no-store' }),
                    fetch(apiUrl('/v1/chef/dashboard'), { headers }),
                    fetch(apiUrl('/v1/user/stats'), { headers }),
                    fetch(apiUrl('/v1/user/activity?limit=3'), { headers }),
                    fetch(apiUrl('/v1/today-poll'), { headers })
                ]);

                if (menuRes.ok) {
                    const menuData = await menuRes.json();
                    setWeeklyMenu(menuData);
                }

                if (dashRes.ok) {
                    const payload = await dashRes.json();
                    setData(payload.dashboardData);
                    setChartData(payload.chartData);
                }

                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setPersonalStats(statsData);
                }

                if (activityRes.ok) {
                    const activityData = await activityRes.json();
                    setRecentActivity(Array.isArray(activityData) ? activityData : []);
                }

                if (todayPollRes.ok) {
                    const todayPollData = await todayPollRes.json();
                    setTodayPoll({
                        status: todayPollData.status || 'opted_in',
                        lunch_day_id: todayPollData.lunch_day_id || null,
                        is_deadline_met: todayPollData.is_deadline_met || false
                    });
                }
            } catch (error) {
                console.error("Error fetching dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleChefVote = async (choice: 'yes' | 'no') => {
        if (todayPoll.is_deadline_met || !todayPoll.lunch_day_id || isSubmittingVote) return;

        setIsSubmittingVote(true);
        const status = choice === 'yes' ? 'opted_in' : 'opted_out';

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(apiUrl('/v1/poll'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    lunch_day_id: todayPoll.lunch_day_id,
                    status: status
                })
            });

            if (res.ok) {
                showToast(t('vote_recorded'));

                // Refresh chef stats, activity, and checklist
                const headers = authHeaders();
                const [dashRes, statsRes, activityRes, todayPollRes] = await Promise.all([
                    fetch(apiUrl('/v1/chef/dashboard'), { headers }),
                    fetch(apiUrl('/v1/user/stats'), { headers }),
                    fetch(apiUrl('/v1/user/activity?limit=3'), { headers }),
                    fetch(apiUrl('/v1/today-poll'), { headers })
                ]);

                if (dashRes.ok) {
                    const payload = await dashRes.json();
                    setData(payload.dashboardData);
                }
                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setPersonalStats(statsData);
                }
                if (activityRes.ok) {
                    const activityData = await activityRes.json();
                    setRecentActivity(Array.isArray(activityData) ? activityData : []);
                }
                if (todayPollRes.ok) {
                    const todayPollData = await todayPollRes.json();
                    setTodayPoll({
                        status: todayPollData.status || 'opted_in',
                        lunch_day_id: todayPollData.lunch_day_id || null,
                        is_deadline_met: todayPollData.is_deadline_met || false
                    });
                }
            } else {
                showToast('Failed to submit vote', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error recording vote', 'error');
        } finally {
            setIsSubmittingVote(false);
        }
    };



    const handleBroadcast = async () => {
        if (!broadcastMessage.trim()) return;
        setIsBroadcasting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(apiUrl('/v1/broadcasts'), {
                method: 'POST',
                headers: {
                    ...authHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: broadcastMessage, type: 'info' })
            });

            if (res.ok) {
                setIsBroadcastModalOpen(false);
                setBroadcastMessage("");
            }
        } catch (error) {
            console.error("Error sending broadcast", error);
        } finally {
            setIsBroadcasting(false);
        }
    };

    const todayMeal = useMemo(() => {
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const todayIndex = new Date().getDay();
        const todayKey = (todayIndex === 0 || todayIndex === 6) ? 'mon' : days[todayIndex];
        const todayEntry = weeklyMenu.find(m => m.weekday === todayKey);
        return todayEntry ? { title: todayEntry.title, image: todayEntry.image_url } : { title: data?.todayMeal, image: null };
    }, [weeklyMenu, data]);

    const filteredEmployees = useMemo(() => {
        if (!data) return [];
        return data.employees.filter(emp => {
            const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = activeFilter === 'all' || emp.status === activeFilter;
            return matchesSearch && matchesFilter;
        });
    }, [data, searchQuery, activeFilter]);

    if (loading) return <LoadingState />;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 dark:bg-blue-400/5 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 dark:bg-indigo-400/5 blur-[120px] animate-pulse" />
            </div>

            <Header user={user} onLogout={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/');
            }} onNavigateHome={() => router.push('/')} />



            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">

                {/* Hero Section */}
                <section className="mb-6 sm:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >

                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full md:w-auto bg-white dark:bg-card p-4 rounded-3xl border border-blue-100 dark:border-[#323232] shadow-xl shadow-blue-300/20 flex items-center gap-4"
                    >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 dark:bg-[#202020] rounded-2xl flex items-center justify-center text-blue-600 overflow-hidden shrink-0">
                            {todayMeal.image ? (
                                <img src={todayMeal.image} className="w-full h-full object-cover" />
                            ) : (
                                <Utensils size={20} className="sm:w-6 sm:h-6" />
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-blue-500">{t('todays_special')}</p>
                            <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-[#F5F5F5]">{t(todayMeal.title || '')}</p>
                        </div>
                    </motion.div>
                </section>

                {/* Stats Grid */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-12 ">
                    <StatCard
                        label={t('total_employees')}
                        value={data?.totalEmployees || 0}
                        icon={<Users className="text-blue-600 dark:text-blue-400" size={20} />}
                        delay={0.1}
                    />
                    <StatCard
                        label={t('joined_lunch')}
                        value={data?.joined || 0}
                        icon={<CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} />}
                        delay={0.2}
                    />
                    <StatCard
                        label={t('skipped_lunch')}
                        value={data?.skipped || 0}
                        icon={<XCircle className="text-rose-600 dark:text-rose-400" size={20} />}
                        delay={0.3}
                    />
                    <StatCard
                        label={t('participation_rate')}
                        value={`${Math.round(((data?.joined || 0) / (data?.totalEmployees || 1)) * 100)}%`}
                        icon={<TrendingUp className="text-amber-600 dark:text-amber-400" size={20} />}
                        delay={0.4}
                    />
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main List Section */}
                    <div className="lg:col-span-2 space-y-8">
                        <GlassCard className="p-4 sm:p-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                                <h3 className="text-lg sm:text-xl font-bold">{t('participation_details')}</h3>
                                <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-[#202020] p-1 rounded-2xl border border-slate-100 dark:border-[#323232] w-full sm:w-auto">
                                    {['all', 'joining', 'skipped', 'no_response'].map((f) => {
                                        const getFilterLabel = (filterVal: string) => {
                                            if (filterVal === 'all') return t('all_filter');
                                            if (filterVal === 'joining') return t('joined');
                                            if (filterVal === 'skipped') return t('skipped');
                                            if (filterVal === 'no_response') return t('waiting_filter');
                                            return filterVal;
                                        };
                                        return (
                                            <button
                                                key={f}
                                                onClick={() => setActiveFilter(f as any)}
                                                className={`flex-1 sm:flex-none text-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-medium capitalize transition-all cursor-pointer ${activeFilter === f ? 'bg-white dark:bg-[#272727] text-blue-600 dark:text-[#D7E8F4] shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-[#F5F5F5]'
                                                    }`}
                                            >
                                                {getFilterLabel(f)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder={t('search_placeholder')}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#202020] border border-slate-100 dark:border-[#323232] text-slate-800 dark:text-[#F5F5F5] rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                <AnimatePresence mode='popLayout'>
                                    {filteredEmployees.length > 0 ? (
                                        filteredEmployees.map((emp) => (
                                            <EmployeeRow key={emp.id} employee={emp} />
                                        ))
                                    ) : (
                                        <EmptyState />
                                    )}
                                </AnimatePresence>
                            </div>
                        </GlassCard>

                        {/* Chef Personal Section (Dashboard Summary) */}
                        <GlassCard className="p-4 sm:p-8 md:p-10">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-[#F5F5F5] mb-6">{t('dashboard_summary')}</h2>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                {/* LEFT COLUMN - Stats Cards & Monthly Summary */}
                                <div className="md:col-span-7 flex flex-col gap-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {/* Total Meals Eaten */}
                                        <div className="p-6 bg-white dark:bg-[#202020] border border-slate-100 dark:border-[#323232] rounded-3xl shadow-sm flex flex-col">
                                            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center mb-4">
                                                <Utensils size={20} />
                                            </div>
                                            <h4 className="text-3xl font-black text-slate-900 dark:text-[#F5F5F5] mb-1">{personalStats.totalLunchEaten}</h4>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-300">{t('total_meals_eaten')}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">{t('since_joined')}</p>
                                        </div>

                                        {/* Current Month */}
                                        <div className="p-6 bg-white dark:bg-[#202020] border border-slate-100 dark:border-[#323232] rounded-3xl shadow-sm flex flex-col">
                                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center mb-4">
                                                <Calendar size={20} />
                                            </div>
                                            <h4 className="text-3xl font-black text-slate-900 dark:text-[#F5F5F5] mb-1">{personalStats.joinedThisMonth + personalStats.skippedThisMonth}</h4>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-300">{t('current_month')}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">{t('days_tracked')}</p>
                                        </div>
                                    </div>

                                    {/* Monthly Summary */}
                                    <div className="p-6 bg-white dark:bg-[#202020] border border-slate-100 dark:border-[#323232] rounded-3xl shadow-sm flex-1 flex flex-col justify-between min-h-[300px]">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-[#F5F5F5] flex items-center gap-2 mb-4">
                                            <TrendingUp size={20} className="text-blue-600" />
                                            {t('monthly_summary')}
                                        </h3>

                                        <div className="h-44 w-full relative flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: t('joined'), value: personalStats.joinedThisMonth, color: '#2E5A88' },
                                                            { name: t('skipped'), value: personalStats.skippedThisMonth, color: '#f43f5e' },
                                                        ]}
                                                        innerRadius={55}
                                                        outerRadius={70}
                                                        paddingAngle={6}
                                                        dataKey="value"
                                                        cornerRadius={8}
                                                    >
                                                        {[
                                                            { name: t('joined'), value: personalStats.joinedThisMonth, color: '#2E5A88' },
                                                            { name: t('skipped'), value: personalStats.skippedThisMonth, color: '#f43f5e' },
                                                        ].map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
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
                                                <p className="text-xl font-bold text-blue-600 dark:text-[#D7E8F4]">{personalStats.joinedThisMonth}</p>
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('joined')}</p>
                                            </div>
                                            <div className="text-center p-3 rounded-2xl bg-rose-50/50 dark:bg-[#202020]/50 border border-rose-100/50 dark:border-[#323232]/50">
                                                <p className="text-xl font-bold text-rose-500">{personalStats.skippedThisMonth}</p>
                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('skipped')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT COLUMN - Recent Activity & Billing Button */}
                                <div className="md:col-span-5 flex flex-col justify-between gap-6">
                                    {/* Recent Activity */}
                                    <div className="p-6 bg-white dark:bg-[#202020] border border-slate-100 dark:border-[#323232] rounded-3xl shadow-sm flex-1 flex flex-col min-h-[320px]">
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
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activity.status === 'opted_in' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 group-hover:bg-emerald-100' : 'bg-rose-50 dark:bg-rose-950/30 text-rose-500 group-hover:bg-rose-100'}`}>
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
                    </div>

                    {/* Sidebar Panel */}
                    <div className="space-y-6">
                        <GlassCard className="p-8 bg-blue-600 text-white border-none overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <ChefHat size={120} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Clock size={20} />
                                    {t('prep_timeline')}
                                </h3>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2 opacity-80">
                                            <span>{t('total_plates_needed')}</span>
                                            <span className="font-bold">{data?.joined}</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: '72%' }}
                                                className="h-full bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                                        <p className="text-xs uppercase tracking-widest opacity-70 mb-1">{t('response_cutoff_label')}</p>
                                        <p className="text-2xl font-black">{t('response_cutoff_time')}</p>

                                    </div>


                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h4 className="font-bold mb-4">{t('quick_actions')}</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsBroadcastModalOpen(true)}
                                    className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202020] hover:bg-blue-50 dark:hover:bg-[#272727] hover:text-blue-600 border border-slate-100 dark:border-[#323232] transition-all text-sm font-medium flex flex-col items-center gap-2 cursor-pointer"
                                >
                                    <Bell size={20} />
                                    {t('broadcast')}
                                </button>
                                <button className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202020] hover:bg-blue-50 dark:hover:bg-[#272727] hover:text-blue-600 border border-slate-100 dark:border-[#323232] transition-all text-sm font-medium flex flex-col items-center gap-2 cursor-pointer">
                                    <Filter size={20} />
                                    {t('csv_export')}
                                </button>
                            </div>
                        </GlassCard>
                    </div>

                </div>
            </main>



            {/* --- Broadcast Modal --- */}
            <AnimatePresence>
                {isBroadcastModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsBroadcastModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-[#202020] rounded-[32px] shadow-2xl border dark:border-[#323232] overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                        <Bell className="text-blue-600" />
                                        {t('send_broadcast')}
                                    </h2>
                                    <button onClick={() => setIsBroadcastModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('message_to_users')}</label>
                                        <textarea
                                            value={broadcastMessage}
                                            onChange={(e) => setBroadcastMessage(e.target.value)}
                                            placeholder={t('broadcast_placeholder')}
                                            rows={4}
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-[#272727] border border-slate-200 dark:border-[#323232] rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium resize-none text-slate-800 dark:text-[#F5F5F5]"
                                        />
                                    </div>

                                    <button
                                        onClick={handleBroadcast}
                                        disabled={isBroadcasting || !broadcastMessage.trim()}
                                        className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isBroadcasting ? <Loader2 className="animate-spin" size={20} /> : t('send_broadcast')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Sub-components ---



function StatCard({ label, value, icon, delay, trend }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <GlassCard className="p-4 sm:p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 dark:bg-[#202020] rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                <div className="relative z-10">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#202020] flex items-center justify-center mb-3 sm:mb-4 border border-slate-100 dark:border-[#323232] group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium mb-1.5 leading-relaxed py-0.5">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <h4 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F5F5F5] tracking-tight leading-relaxed py-1">{value}</h4>
                    </div>
                    {trend && (
                        <p className="text-[10px] font-bold text-emerald-500 mt-2 uppercase tracking-wider">{trend}</p>
                    )}
                </div>
            </GlassCard>
        </motion.div>
    );
}

function EmployeeRow({ employee }: { employee: Employee }) {
    const { t } = useLanguage();
    const initials = employee.name.split(' ').map(n => n[0]).join('');

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group flex items-center justify-between p-3 sm:p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#202020] border border-transparent hover:border-slate-100 dark:hover:border-[#323232] transition-all"
        >
            <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 dark:bg-[#202020] text-blue-600 dark:text-[#D7E8F4] flex items-center justify-center font-bold text-xs sm:text-sm border border-blue-100 dark:border-[#323232] shrink-0">
                    {initials}
                </div>
                <div>
                    <p className="font-bold text-sm sm:text-base text-slate-800 dark:text-[#F5F5F5] group-hover:text-blue-600 transition-colors">{employee.name}</p>
                    {employee.department && employee.department.toLowerCase() !== 'general' && (
                        <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-400">{employee.department}</p>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-end gap-1">
                <Badge status={employee.status} />
            </div>
        </motion.div>
    );
}

function EmptyState() {
    const { t } = useLanguage();
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 flex flex-col items-center justify-center text-center"
        >
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="text-slate-300" size={32} />
            </div>
            <h4 className="text-lg font-bold text-slate-500">{t('no_responses_yet')}</h4>
            <p className="text-slate-500 max-w-xs text-sm">{t('no_responses_desc')}</p>
        </motion.div>
    );
}

function LoadingState() {
    const { t } = useLanguage();
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            <motion.div
                animate={{
                    rotate: 360,
                    scale: [1, 1.1, 1]
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-500/20"
            >
                <ChefHat size={32} />
            </motion.div>

            <div className="w-64 space-y-4">
                <div className="h-4 bg-slate-200 rounded-full w-3/4 mx-auto animate-pulse" />
                <div className="h-2 bg-slate-100 rounded-full w-full animate-pulse" />

                <div className="grid grid-cols-2 gap-4 mt-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-white rounded-3xl border border-slate-100 animate-pulse" />
                    ))}
                </div>
            </div>
            <div className="mt-8 flex items-center gap-2 text-slate-400 font-medium">
                <Loader2 className="animate-spin" size={18} />
                {t('sizzling_data')}
            </div>
        </div>
    );
}