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
    CheckCheck
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
    ResponsiveContainer
} from 'recharts';
import { useToast } from '@/components/providers/toast-provider';
import { apiUrl, authHeaders } from '@/lib/api-url';
import { useLanguage, LanguageSwitcher } from '@/components/providers/language-provider';

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
        className={`bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 ${className}`}
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
    const router = useRouter();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [user, setUser] = useState<{ name: string } | null>(null);
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
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-[120px] animate-pulse" />
            </div>

            <Header user={user} onLogout={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                router.push('/');
            }} onNavigateHome={() => router.push('/')} />



            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">

                {/* Hero Section */}
                <section className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-3">
                            {t('chef_greeting')} <span className="inline-block animate-bounce"></span>
                        </h1>

                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-4 rounded-3xl border border-blue-100 shadow-xl shadow-blue-500/5 flex items-center gap-4"
                    >
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 overflow-hidden">
                            {todayMeal.image ? (
                                <img src={todayMeal.image} className="w-full h-full object-cover" />
                            ) : (
                                <Utensils size={24} />
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">{t('todays_special')}</p>
                            <p className="text-lg font-bold text-slate-800">{t(todayMeal.title || '')}</p>
                        </div>
                    </motion.div>
                </section>

                {/* Stats Grid */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        label={t('total_employees')}
                        value={data?.totalEmployees || 0}
                        icon={<Users className="text-blue-600" />}
                        delay={0.1}
                    />
                    <StatCard
                        label={t('joined_lunch')}
                        value={data?.joined || 0}
                        icon={<CheckCircle2 className="text-emerald-600" />}
                        delay={0.2}

                    />
                    <StatCard
                        label={t('skipped_lunch')}
                        value={data?.skipped || 0}
                        icon={<XCircle className="text-rose-600" />}
                        delay={0.3}
                    />
                    <StatCard
                        label={t('participation_rate')}
                        value={`${Math.round(((data?.joined || 0) / (data?.totalEmployees || 1)) * 100)}%`}
                        icon={<TrendingUp className="text-amber-600" />}
                        delay={0.4}
                    />
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main List Section */}
                    <div className="lg:col-span-2 space-y-8">
                        <GlassCard className="p-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <h3 className="text-xl font-bold">{t('participation_details')}</h3>
                                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
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
                                                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${activeFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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

                        {/* Chef Personal Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Left Side: Today's Vote & Stats Box */}
                            <div className="space-y-6">
                                {/* Vote Card */}
                                <GlassCard className="p-6">
                                    <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                                        <Utensils size={18} className="text-blue-600" />
                                        {t('will_you_join')}
                                    </h3>

                                    {todayPoll.is_deadline_met ? (
                                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3 w-full">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                <Calendar className="text-blue-500" size={20} />
                                            </div>
                                            <p className="text-sm font-medium text-slate-500">
                                                {t('voting_locked')}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex gap-3">
                                            <button
                                                disabled={isSubmittingVote || !todayPoll.lunch_day_id}
                                                onClick={() => handleChefVote('yes')}
                                                className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${todayPoll.status === 'opted_in'
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25'
                                                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                                    }`}
                                            >
                                                <CheckCircle2 size={16} />
                                                {t('vote_yes')}
                                            </button>
                                            <button
                                                disabled={isSubmittingVote || !todayPoll.lunch_day_id}
                                                onClick={() => handleChefVote('no')}
                                                className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${todayPoll.status === 'opted_out'
                                                        ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/25'
                                                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                                    }`}
                                            >
                                                <XCircle size={16} />
                                                {t('vote_no')}
                                            </button>
                                        </div>
                                    )}
                                </GlassCard>

                                {/* Personal Stats Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between h-36">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                            <Utensils size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-black text-slate-900 leading-none mb-1">{personalStats.totalLunchEaten}</h4>
                                            <p className="text-xs font-bold text-slate-700 leading-none">{t('total_meals_eaten')}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{t('since_joined')}</p>
                                        </div>
                                    </div>

                                    <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col justify-between h-36">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                            <Calendar size={18} />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-black text-slate-900 leading-none mb-1">{personalStats.joinedThisMonth + personalStats.skippedThisMonth}</h4>
                                            <p className="text-xs font-bold text-slate-700 leading-none">{t('current_month')}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{t('days_tracked')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Recent Activity Card */}
                            <GlassCard className="p-6 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                                        <Clock size={18} className="text-slate-500" />
                                        {t('recent_activity')}
                                    </h3>

                                    <div className="space-y-4">
                                        {recentActivity.length > 0 ? (
                                            recentActivity.map((activity: any) => (
                                                <div key={activity.id} className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activity.status === 'opted_in' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                                        {activity.status === 'opted_in' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">{activity.status === 'opted_in' ? t('im_joining') : t('skip_today')}</p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {new Date(activity.lunch_day.lunch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6">
                                                <p className="text-sm text-slate-500">{t('no_recent_activity')}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
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
                                    className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-100 transition-all text-sm font-medium flex flex-col items-center gap-2"
                                >
                                    <Bell size={20} />
                                    {t('broadcast')}
                                </button>
                                <button className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-100 transition-all text-sm font-medium flex flex-col items-center gap-2">
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
                            className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
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
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">{t('message_to_users')}</label>
                                        <textarea
                                            value={broadcastMessage}
                                            onChange={(e) => setBroadcastMessage(e.target.value)}
                                            placeholder={t('broadcast_placeholder')}
                                            rows={4}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium resize-none"
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

function Header({ user, onLogout, onNavigateHome }: { user: any; onLogout: () => void; onNavigateHome: () => void }) {
    const { t } = useLanguage();
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const fetchBroadcasts = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/broadcasts`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setBroadcasts(Array.isArray(data) ? data : []);
                }
            } catch (e) { }
        };
        fetchBroadcasts();
        const interval = setInterval(fetchBroadcasts, 60000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = broadcasts.filter(b => !b.is_read).length;

    const handleMarkAsRead = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            setBroadcasts(prev => prev.map(b => b.id === id ? { ...b, is_read: true } : b));

            await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/broadcasts/${id}/read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    };

    return (
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={onNavigateHome}>
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <ChefHat size={24} />
                    </div>
                    <span className="text-xl font-black tracking-tight text-slate-800">MealBuddy<span className="text-blue-600">.</span></span>
                </div>

                <div className="flex items-center gap-4">
                    <LanguageSwitcher />

                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors relative"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                            )}
                        </button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
                                >
                                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800">{t('notifications')}</h3>
                                        {unreadCount > 0 && (
                                            <span className="text-xs font-semibold bg-blue-100 text-blue-600 px-2 py-1 rounded-lg">{unreadCount} {t('new_badge')}</span>
                                        )}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto p-2">
                                        {broadcasts.length > 0 ? broadcasts.map((b) => (
                                            <div key={b.id} className={`p-3 rounded-xl transition-colors mb-1 ${b.is_read ? 'opacity-70 hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'}`}>
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                                                        <ChefHat size={16} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-slate-800 font-medium leading-snug">{b.message}</p>
                                                        <p className="text-[10px] text-slate-400 mt-1">
                                                            {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Chef {b.user?.name?.split(' ')[0] || 'Andre'}
                                                        </p>
                                                    </div>
                                                    {!b.is_read && (
                                                        <button
                                                            onClick={(e) => handleMarkAsRead(e, b.id)}
                                                            className="text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                                                            title="Mark as read"
                                                        >
                                                            <CheckCheck size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-6 text-center text-slate-500 text-sm">
                                                {t('no_notifications')}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 mx-2" />

                    <div className="flex items-center gap-3 pl-2">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-800 leading-none">{user?.name || 'Chef Andre'}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Executive Chef</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border-2 border-white shadow-sm overflow-hidden">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Andre'}`} alt="Chef" />
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

function StatCard({ label, value, icon, delay, trend }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <GlassCard className="p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 border border-slate-100 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <h4 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h4>
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
            className="group flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all"
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                    {initials}
                </div>
                <div>
                    <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{employee.name}</p>
                    <p className="text-xs text-slate-400">{employee.department}</p>
                </div>
            </div>

            <div className="flex flex-col items-end gap-1">
                <Badge status={employee.status} />
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    {t('voted_at', { time: employee.votedAt })}
                </span>
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
            <h4 className="text-lg font-bold text-slate-800">{t('no_responses_yet')}</h4>
            <p className="text-slate-500 max-w-xs text-sm">{t('no_responses_desc')}</p>
        </motion.div>
    );
}

function LoadingState() {
    const { t } = useLanguage();
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
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