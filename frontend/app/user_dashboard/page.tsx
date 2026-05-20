"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    CheckCircle2,
    XCircle,
    Calendar,
    Clock,
    Utensils,
    Bell,
    LogOut,
    User as UserIcon,
    History,
    ChevronRight,
    TrendingUp,
    Loader2,
    Home,
    ChefHat,
    CheckCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip
} from 'recharts';

// --- Types ---

interface UserStats {
    joinedThisMonth: number;
    skippedThisMonth: number;
    totalLunchEaten: number;
    lastVoteStatus: 'joining' | 'skipped' | 'none';
}

interface Meal {
    name: string;
    description: string;
    image: string;
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
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);
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
            name: menuEntry.title,
            description: "Chef's special for the day.",
            image: menuEntry.image_url || null
        } : {
            name: "Menu not set",
            description: "Chef hasn't decided yet.",
            image: null
        };
    }, [currentTime, isAfterCutoff, weeklyMenu]);

    const chartData = [
        { name: 'Joined', value: stats.joinedThisMonth, color: '#2E5A88' },
        { name: 'Skipped', value: stats.skippedThisMonth, color: '#f43f5e' },
    ];

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
                            Hey, {user?.name?.split(' ')[0] || 'Member'}
                        </h1>
                        <p className="text-slate-500">Track your meals and see what's cooking next.</p>
                    </motion.div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

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
                                    {isAfterCutoff ? "Tomorrow's Menu" : "Today's Lunch"}
                                </div>
                                {isAfterCutoff && (
                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                        <Clock size={14} /> 10 AM Cutoff passed
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
                                            <button className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all flex items-center gap-2">
                                                <CheckCircle2 size={20} /> I'm Joining
                                            </button>
                                            <button className="px-8 py-3 bg-white text-slate-600 border border-slate-200 font-bold rounded-2xl hover:bg-slate-50 transition-all">
                                                Skip Today
                                            </button>
                                        </>
                                    ) : (
                                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3 w-full">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                <Calendar className="text-blue-500" size={20} />
                                            </div>
                                            <p className="text-sm font-medium text-slate-500">
                                                Voting for today is closed. Check back tomorrow morning!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassCard>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <StatCard
                                label="Total Meals Eaten"
                                value={stats.totalLunchEaten}
                                icon={<Utensils className="text-emerald-600" />}
                                subtext="Since you joined MealBuddy"
                            />
                            <StatCard
                                label="Current Month"
                                value={stats.joinedThisMonth + stats.skippedThisMonth}
                                icon={<Calendar className="text-blue-600" />}
                                subtext="Total working days tracked"
                            />
                        </div>
                    </div>

                    {/* RIGHT: Stats & History */}
                    <div className="lg:col-span-5 space-y-6">
                        <GlassCard className="p-8">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-600" />
                                Monthly Summary
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
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Joined</p>
                                </div>
                                <div className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <p className="text-2xl font-bold text-rose-500">{stats.skippedThisMonth}</p>
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Skipped</p>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold flex items-center gap-2">
                                    <History size={18} />
                                    Recent Activity
                                </h3>
                                <button onClick={() => router.push('/user_dashboard/history')} className="text-xs font-bold text-blue-600 hover:underline">View All</button>
                            </div>

                            <div className="space-y-4">
                                {recentActivity.length > 0 ? recentActivity.map((activity) => (
                                    <div key={activity.id} className="flex items-center justify-between group cursor-pointer" onClick={() => router.push('/user_dashboard/history')}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activity.status === 'opted_in' ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100' : 'bg-rose-50 text-rose-500 group-hover:bg-rose-100'}`}>
                                                {activity.status === 'opted_in' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{activity.status === 'opted_in' ? 'Joined Lunch' : 'Skipped Lunch'}</p>
                                                <p className="text-[10px] text-slate-400">
                                                    {new Date(activity.lunch_day.lunch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-300" />
                                    </div>
                                )) : (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-slate-500">No recent activity.</p>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>

                </div>
            </main>
        </div>
    );
}

// --- Sub-components ---

function Header({ user, onLogout, onNavigateHome }: { user: any; onLogout: () => void; onNavigateHome: () => void }) {
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
            <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer group" onClick={onNavigateHome}>
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <Utensils size={22} />
                    </div>
                    <span className="text-xl font-black tracking-tight text-slate-800">MealBuddy<span className="text-blue-600">.</span></span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onNavigateHome}
                        className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <Home size={18} />
                        <span className="hidden md:inline">Home</span>
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors relative"
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
                                        <h3 className="font-bold text-slate-800">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <span className="text-xs font-semibold bg-blue-100 text-blue-600 px-2 py-1 rounded-lg">{unreadCount} New</span>
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
                                                No recent notifications
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-100 mx-2" />
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-800 leading-none">{user?.name || 'Member'}</p>
                            <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">Employee</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Member'}`} alt="User" />
                        </div>
                        <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors" title="Logout">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}

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
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
            <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/20"
            >
                <Utensils size={24} />
            </motion.div>
            <p className="text-slate-400 font-medium animate-pulse">Setting the table...</p>
        </div>
    );
}