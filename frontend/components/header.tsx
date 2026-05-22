"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Utensils,
    Bell,
    ChefHat,
    CheckCheck,
    LogOut,
    User,
    Menu,
    X
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage, LanguageSwitcher } from '@/components/providers/language-provider';

interface HeaderProps {
    user?: any;
    onLogout?: () => void;
    onNavigateHome?: () => void;
}

export default function Header({ user, onLogout, onNavigateHome }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useLanguage();

    const [currentUser, setCurrentUser] = useState<any>(user || null);
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [randomRole, setRandomRole] = useState("Foodie");

    const sidebarRef = useRef<HTMLDivElement>(null);
    const headerHeight = 80; // Maps directly to h-20 height calculation (80px)

    // Close sidebar on route change
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    // Hydrate user from localStorage if not provided via props
    useEffect(() => {
        if (user) {
            setCurrentUser(user);
        } else {
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                try {
                    setCurrentUser(JSON.parse(savedUser));
                } catch (e) {
                    console.error("Failed to parse user data in Header", e);
                }
            } else {
                setCurrentUser(null);
            }
        }
    }, [user]);

    // Hydrate broadcasts/notifications if user is logged in
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

        if (currentUser) {
            fetchBroadcasts();
            const interval = setInterval(fetchBroadcasts, 60000);
            return () => clearInterval(interval);
        } else {
            setBroadcasts([]);
        }
    }, [currentUser]);

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

    const roles = [
        "Hungry Human", "Snack Boss", "Lunch Legend", "Noodle Ninja", "Burger Beast",
        "Pizza Pirate", "Fries Fanatic", "Taco Titan", "Coffee Commander", "Midnight Snacker",
        "Food Explorer", "Meal Hunter", "Curry Crusher", "Dumpling Detective", "Spice Specialist",
        "Taste Tester", "The Hungry One", "Office Foodie", "Kitchen Raider", "Momo Master",
        "Chaotic Eater", "Biryani Boss", "Cookie Collector", "Samosa Samurai", "Diet Starts Tomorrow",
        "Professional Snacker", "Fork Fighter", "Cheese Champion", "Rice Warrior", "The Last Slice",
        "Soup Sorcerer", "Caffeine Addict", "Lunch Break Hero", "Calories Don’t Count", "Snack Engineer"
    ];

    useEffect(() => {
        if (currentUser) {
            let idNum = 0;
            if (typeof currentUser.id === 'number') {
                idNum = currentUser.id;
            } else if (typeof currentUser.id === 'string') {
                idNum = parseInt(currentUser.id, 10) || 0;
            }

            if (idNum > 0) {
                const index = (idNum - 1) % roles.length;
                setRandomRole(roles[index]);
            } else {
                const identifier = currentUser.email || currentUser.name || "Member";
                let hash = 0;
                for (let i = 0; i < identifier.length; i++) {
                    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
                }
                const index = Math.abs(hash) % roles.length;
                setRandomRole(roles[index]);
            }
        } else {
            setRandomRole("Foodie");
        }
    }, [currentUser]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentUser(null);
        setIsSidebarOpen(false);
        if (onLogout) {
            onLogout();
        } else {
            router.push('/');
            router.refresh();
        }
    };

    const handleNavigateHome = () => {
        if (onNavigateHome) {
            onNavigateHome();
        } else {
            router.push('/');
        }
    };

    const handleProfileClick = () => {
        if (currentUser.role === 'chef') {
            router.push('/dashboard');
        } else {
            router.push('/user_dashboard');
        }
    };

    return (
        <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 h-20">
            <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">

                {/* Logo / Title */}
                <div className="flex items-center gap-2 cursor-pointer group" onClick={handleNavigateHome}>
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <Utensils size={22} />
                    </div>
                    <span className="text-xl font-black tracking-tight text-slate-800">{t('app_title')}</span>
                </div>

                {/* ================= DESKTOP VIEW ================= */}
                <div className="hidden md:flex items-center gap-3">
                    {/* Desktop Notifications Dropdown */}
                    {currentUser && (
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
                                            <h3 className="font-bold text-slate-800">{t('notifications')}</h3>
                                            {unreadCount > 0 && (
                                                <span className="text-xs font-semibold bg-blue-100 text-blue-600 px-2 py-1 rounded-lg">
                                                    {unreadCount} {t('new_badge')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto p-2">
                                            {broadcasts.length > 0 ? broadcasts.map((b) => (
                                                <div key={b.id} className={`p-3 rounded-xl transition-colors mb-1 ${b.is_read ? 'opacity-70 hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'}`}>
                                                    <div className="flex gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                                                            <ChefHat size={16} />
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <p className="text-sm text-slate-800 font-medium leading-snug">{b.message}</p>
                                                            <p className="text-[10px] text-slate-400 mt-1">
                                                                {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Chef {b.user?.name?.split(' ')[0] || 'Andre'}
                                                            </p>
                                                        </div>
                                                        {!b.is_read && (
                                                            <button
                                                                onClick={(e) => handleMarkAsRead(e, b.id)}
                                                                className="text-slate-400 hover:text-blue-600 transition-colors shrink-0"
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
                    )}

                    <div className="h-8 w-[1px] bg-slate-100 mx-2" />
                    <LanguageSwitcher />
                    <div className="h-8 w-[1px] bg-slate-100 mx-2" />

                    {currentUser ? (
                        <div className="flex items-center gap-3">
                            <div className="text-right cursor-pointer" onClick={handleProfileClick}>
                                <p className="text-sm font-bold text-slate-800 leading-none">{currentUser.name}</p>
                                <p className="inline-block text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold uppercase mt-1 tracking-wider border border-blue-100">
                                    {currentUser.role === 'chef'
                                        ? t('role_chef')
                                        : (currentUser.role === 'accountant' ? t('role_accountant') : randomRole)}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-50 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center cursor-pointer" onClick={handleProfileClick}>
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name || 'Member'}`} alt="User" />
                            </div>
                            <button onClick={handleLogout} className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors" title={t('logout')}>
                                <LogOut size={20} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => router.push('/login')}
                            className="flex items-center gap-2 bg-[#2E5A88] text-white px-5 py-2.5 rounded-full hover:bg-[#1F2A44] transition-colors font-bold text-sm"
                        >
                            <User size={16} /> {t('sign_in')}
                        </button>
                    )}
                </div>

                {/* ================= MOBILE TARGETS (BELL + HAMBURGER) ================= */}
                <div className="flex md:hidden items-center gap-1">
                    {/* Mobile Notification Trigger */}
                    {currentUser && (
                        <button
                            onClick={() => {
                                setIsDropdownOpen(!isDropdownOpen);
                                setIsSidebarOpen(false); // Dropdowns close sidebars safely
                            }}
                            className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors relative"
                        >
                            <Bell size={22} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                            )}
                        </button>
                    )}

                    {/* Mobile Hamburger Menu Icon Button */}
                    <button
                        onClick={() => {
                            setIsSidebarOpen(!isSidebarOpen);
                            setIsDropdownOpen(false); // Sidebars close dropdowns safely
                        }}
                        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors relative z-[2001]"
                    >
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* ================= MOBILE NOTIFICATIONS PANEL CONTROLLER ================= */}
            <AnimatePresence>
                {isDropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 right-0 mx-4 mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 md:hidden"
                    >
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-sm">{t('notifications')}</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md">
                                    {unreadCount} {t('new_badge')}
                                </span>
                            )}
                        </div>
                        <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                            {broadcasts.length > 0 ? broadcasts.map((b) => (
                                <div key={b.id} className={`p-2.5 rounded-xl transition-colors ${b.is_read ? 'opacity-70 bg-white' : 'bg-blue-50/40'}`}>
                                    <div className="flex gap-2.5 items-start">
                                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                            <ChefHat size={14} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-xs text-slate-800 font-medium leading-tight">{b.message}</p>
                                        </div>
                                        {!b.is_read && (
                                            <button onClick={(e) => handleMarkAsRead(e, b.id)} className="text-blue-600 shrink-0">
                                                <CheckCheck size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="p-4 text-center text-slate-400 text-xs">
                                    {t('no_notifications')}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ================= MEALBUDDY MOBILE SIDEBAR CONTEXT ================= */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        {/* Overlay Backdrop - Placed exactly at base of Header height */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="
                                fixed inset-0
                                bg-black/60 backdrop-blur-sm
                                z-[1500]
                                md:hidden
                            "
                            style={{ top: `${headerHeight}px` }}
                            onClick={() => setIsSidebarOpen(false)}
                            aria-hidden="true"
                        />

                        {/* Slide-out Sidebar Panel - Rendered dynamically via standard responsive view parameters */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            className="
                                fixed right-0 bottom-0
                                w-[85vw] max-w-[340px]
                                bg-white/95 backdrop-blur-xl
                                border-l border-slate-200
                                shadow-2xl
                                z-[2000]
                                flex flex-col
                                p-6
                                md:hidden
                                rounded-l-3xl
                            "
                            style={{
                                top: `${headerHeight}px`,
                                height: `calc(100dvh - ${headerHeight}px)`
                            }}
                            ref={sidebarRef}
                        >
                            {/* Navigation Context Links area */}
                            <nav className="flex flex-col gap-4 mb-6">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Navigation</span>
                                <button
                                    onClick={() => { router.push('/'); setIsSidebarOpen(false); }}
                                    className="text-left text-[#1F2A44] hover:bg-slate-50 transition-colors py-2.5 px-3 rounded-xl text-base font-semibold"
                                >
                                    Home
                                </button>
                            </nav>

                            {/* Options Area (Language selector switcher module) */}
                            <div className="mb-6 pt-6 border-t border-[#1F2A44]/10">
                                <div className="flex flex-col gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Settings</span>
                                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                                        <span className="text-xs font-medium text-slate-600">Language</span>
                                        <LanguageSwitcher />
                                    </div>
                                </div>
                            </div>

                            {/* Authentication and Profile State Controller Actions */}
                            <div className="flex flex-col gap-4 mt-auto w-full">
                                {currentUser ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                handleProfileClick();
                                                setIsSidebarOpen(false);
                                            }}
                                            className="w-full bg-slate-50 border border-slate-100 text-slate-800 cursor-pointer py-3 rounded-xl text-center hover:bg-slate-100 transition-colors flex items-center justify-center gap-3 font-bold text-sm"
                                        >
                                            <div className="w-7 h-7 rounded-full bg-blue-50 border border-white overflow-hidden shrink-0 flex items-center justify-center">
                                                <img
                                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name || 'Member'}`}
                                                    alt="User Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <span className="truncate max-w-[150px]">{currentUser.name}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="w-full bg-[#2E5A88] text-white cursor-pointer py-3 rounded-xl text-center font-bold text-sm hover:bg-[#1F2A44] transition-colors flex items-center justify-center gap-2"
                                        >
                                            <LogOut size={16} /> {t('logout')}
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            router.push('/login');
                                            setIsSidebarOpen(false);
                                        }}
                                        className="w-full bg-[#2E5A88] text-white cursor-pointer py-3 rounded-xl text-center hover:bg-[#1F2A44] transition-colors font-bold text-sm shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <User size={16} /> {t('sign_in')}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
}