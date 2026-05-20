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
    if (status === 'no_response') {
        return (
            <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit bg-slate-50 text-slate-500 border border-slate-200">
                <Clock size={14} /> Waiting
            </span>
        );
    }
    const isJoining = status === 'joining';
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit ${isJoining ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
            }`}>
            {isJoining ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {isJoining ? 'Joining' : 'Skipped'}
        </span>
    );
};

// --- Main Page Component ---

export default function ChefDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<{ name: string } | null>(null);
    const [data, setData] = useState<DashboardData | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<'all' | ParticipationStatus>('all');

    // --- Edit Menu State ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newMealName, setNewMealName] = useState("");
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedWeekday, setSelectedWeekday] = useState('mon');
    const [weeklyMenu, setWeeklyMenu] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Broadcast State ---
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // Simulation of API Fetch
    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse user data");
            }
        }

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    router.push('/login');
                    return;
                }

                const menuRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/weekly-menus`, { cache: 'no-store' });
                if (menuRes.ok) {
                    const menuData = await menuRes.json();
                    setWeeklyMenu(menuData);
                }

                const dashRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/chef/dashboard`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (dashRes.ok) {
                    const payload = await dashRes.json();
                    setData(payload.dashboardData);
                    setChartData(payload.chartData);
                }
            } catch (error) {
                console.error("Error fetching dashboard data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateMenu = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/weekly-menus/${selectedWeekday}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newMealName,
                    image_url: previewImage
                })
            });

            if (res.ok) {
                const updatedItem = await res.json();
                setWeeklyMenu(prev => prev.map(item => item.weekday === selectedWeekday ? updatedItem : item));

                // If it matches current dashboard view (simplified today check)
                if (data) {
                    setData({ ...data, todayMeal: newMealName });
                }

                setIsEditModalOpen(false);
            }
        } catch (error) {
            console.error("Error updating menu", error);
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastMessage.trim()) return;
        setIsBroadcasting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/broadcasts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
                            Good Morning, Chef <span className="inline-block animate-bounce"></span>
                        </h1>
                        <p className="text-lg text-slate-500 max-w-md">
                            Here’s today’s lunch participation overview. You have {data?.joined} plates to prepare.
                        </p>
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
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Today's Special</p>
                            <p className="text-lg font-bold text-slate-800">{todayMeal.title}</p>
                        </div>
                    </motion.div>
                </section>

                {/* Stats Grid */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        label="Total Employees"
                        value={data?.totalEmployees || 0}
                        icon={<Users className="text-blue-600" />}
                        delay={0.1}
                    />
                    <StatCard
                        label="Joined Lunch"
                        value={data?.joined || 0}
                        icon={<CheckCircle2 className="text-emerald-600" />}
                        delay={0.2}

                    />
                    <StatCard
                        label="Skipped Lunch"
                        value={data?.skipped || 0}
                        icon={<XCircle className="text-rose-600" />}
                        delay={0.3}
                    />
                    <StatCard
                        label="Participation Rate"
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
                                <h3 className="text-xl font-bold">Participation Details</h3>
                                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                                    {['all', 'joining', 'skipped', 'no_response'].map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setActiveFilter(f as any)}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${activeFilter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            {f === 'no_response' ? 'waiting' : f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by employee name..."
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

                        {/* Trends Chart */}
                        <GlassCard className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold">Weekly Joining</h3>
                                    <p className="text-sm text-slate-500">Participation over the last 5 days</p>
                                </div>
                                <Calendar className="text-slate-400" size={20} />
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2E5A88" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#2E5A88" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                        <YAxis hide />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#2E5A88"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorCount)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
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
                                    Prep Timeline
                                </h3>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-sm mb-2 opacity-80">
                                            <span>Total Plates Needed</span>
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
                                        <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Response Cutoff</p>
                                        <p className="text-2xl font-black">10:00 AM</p>

                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => {
                                                const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                                                const todayIndex = new Date().getDay();
                                                const today = (todayIndex === 0 || todayIndex === 6) ? 'mon' : days[todayIndex];

                                                setSelectedWeekday(today);
                                                const existing = weeklyMenu.find(m => m.weekday === today);
                                                if (existing) {
                                                    setNewMealName(existing.title);
                                                    setPreviewImage(existing.image_url);
                                                } else {
                                                    setNewMealName(data?.todayMeal || "");
                                                }
                                                setIsEditModalOpen(true);
                                            }}
                                            className="w-full py-3 bg-white text-blue-600 font-bold rounded-2xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            Edit Weekly Menu
                                            <ArrowUpRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        <GlassCard className="p-6">
                            <h4 className="font-bold mb-4">Quick Actions</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setIsBroadcastModalOpen(true)}
                                    className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-100 transition-all text-sm font-medium flex flex-col items-center gap-2"
                                >
                                    <Bell size={20} />
                                    Broadcast
                                </button>
                                <button className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-100 transition-all text-sm font-medium flex flex-col items-center gap-2">
                                    <Filter size={20} />
                                    CSV Export
                                </button>
                            </div>
                        </GlassCard>
                    </div>

                </div>
            </main>

            {/* --- Edit Menu Modal --- */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsEditModalOpen(false)}
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
                                    <h2 className="text-2xl font-bold text-slate-800">Edit Weekly Menu</h2>
                                    <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Weekday Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-3">Target Day</label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {['mon', 'tue', 'wed', 'thu', 'fri'].map((day) => (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedWeekday(day);
                                                        const existing = weeklyMenu.find(m => m.weekday === day);
                                                        if (existing) {
                                                            setNewMealName(existing.title);
                                                            setPreviewImage(existing.image_url);
                                                        }
                                                    }}
                                                    className={`py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${selectedWeekday === day
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Image Upload Area */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Dish Photo</label>
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="relative h-48 w-full rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all overflow-hidden group"
                                        >
                                            {previewImage ? (
                                                <>
                                                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <Camera className="text-white" size={32} />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center p-6">
                                                    <UploadCloud className="mx-auto text-slate-300 mb-2" size={40} />
                                                    <p className="text-sm font-medium text-slate-500">Click to upload food image</p>
                                                    <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                    </div>

                                    {/* Dish Name Input */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Dish Name</label>
                                        <input
                                            type="text"
                                            value={newMealName}
                                            onChange={(e) => setNewMealName(e.target.value)}
                                            placeholder="e.g. Italian Pasta Primavera"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                                        />
                                    </div>

                                    <button
                                        onClick={handleUpdateMenu}
                                        className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                                        Send Broadcast
                                    </h2>
                                    <button onClick={() => setIsBroadcastModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Message to Users</label>
                                        <textarea
                                            value={broadcastMessage}
                                            onChange={(e) => setBroadcastMessage(e.target.value)}
                                            placeholder="e.g. Lunch is delayed by 15 mins today!"
                                            rows={4}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium resize-none"
                                        />
                                    </div>

                                    <button
                                        onClick={handleBroadcast}
                                        disabled={isBroadcasting || !broadcastMessage.trim()}
                                        className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isBroadcasting ? <Loader2 className="animate-spin" size={20} /> : "Send Broadcast"}
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
            } catch (e) {}
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
                                                            {new Date(b.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Chef {b.user?.name?.split(' ')[0] || 'Andre'}
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
                    Voted at {employee.votedAt}
                </span>
            </div>
        </motion.div>
    );
}

function EmptyState() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 flex flex-col items-center justify-center text-center"
        >
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Users className="text-slate-300" size={32} />
            </div>
            <h4 className="text-lg font-bold text-slate-800">No responses yet</h4>
            <p className="text-slate-500 max-w-xs text-sm">Waiting for employees to cast their votes for today's lunch.</p>
        </motion.div>
    );
}

function LoadingState() {
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
                Sizzling the data...
            </div>
        </div>
    );
}