"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Check,
  X,
  Info,
  CalendarDays,
  ChevronRight,
  Circle,
  User,
  LogOut,
  Bell,
  ChefHat,
  CheckCheck
} from "lucide-react";
import { useRouter } from "next/navigation";

// Mock Data - In production, this would come from a `useQuery` hook
const DAILY_MENU = {
  id: "menu_123",
  date: "Tuesday, May 13th",
  dishName: "Shahi Paneer with Jeera Rice",
  description: "A rich, creamy north-Indian curry paired with aromatic basmati rice and fresh cucumber salad.",
  image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=1200",
};

export default function LunchVotePage() {
  const router = useRouter();
  const [attendance, setAttendance] = useState<"yes" | "no" | null>(null);
  const [isDeadlineMet, setIsDeadlineMet] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [user, setUser] = useState<{ name: string; role?: string } | null>(null);
  const [todayMeal, setTodayMeal] = useState<{title: string, image: string} | null>(null);
  const [lunchDayId, setLunchDayId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Countdown Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const deadline = new Date();
      deadline.setHours(16, 0, 0, 0);

      const diff = deadline.getTime() - now.getTime();
      if (diff <= 0) {
        setIsDeadlineMet(true);
        setTimeLeft("00:00:00");
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    }, 1000);
    // Fetch Today's Poll Status
    const fetchTodayPoll = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return; // Wait for auth check to redirect

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/today-poll`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.menu) {
            setTodayMeal({
              title: data.menu.title,
              image: data.menu.image_url || DAILY_MENU.image
            });
          }
          if (data.lunch_day_id) {
            setLunchDayId(data.lunch_day_id);
          }
          if (data.status) {
            setAttendance(data.status === 'opted_in' ? 'yes' : 'no');
          }
          if (data.is_deadline_met) {
             setIsDeadlineMet(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch today's poll:", err);
      }
    };
    fetchTodayPoll();

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
    const bInterval = setInterval(fetchBroadcasts, 60000);

    return () => {
      clearInterval(timer);
      clearInterval(bInterval);
    };
  }, []);

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
        console.error("Failed to parse user data");
      }
    }
  }, [router]);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/');
  };

  const submitVote = async (choice: "yes" | "no") => {
    if (isDeadlineMet || !lunchDayId || isSubmitting) return;

    setIsSubmitting(true);
    setAttendance(choice); // Optimistic update

    try {
      const token = localStorage.getItem('token');
      const status = choice === 'yes' ? 'opted_in' : 'opted_out';
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/poll`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          lunch_day_id: lunchDayId,
          status: status
        })
      });

      if (!res.ok) {
        throw new Error('Failed to submit vote');
      }
    } catch (err) {
      console.error(err);
      // Revert on failure could be implemented here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-[#1F2A44] selection:bg-[#2E5A88]/10">

      {/* Top Navigation Bar */}
      <nav className="h-20 bg-white border-b border-gray-100 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
          <div className="bg-[#2E5A88] p-2 rounded-lg text-white">
            <CalendarDays size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">MealBuddy</span>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Voting Deadline</span>
            <span className={`text-sm font-bold ${isDeadlineMet ? 'text-red-500' : 'text-[#2E5A88]'}`}>
              {isDeadlineMet ? "Closed" : timeLeft}
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>

              <AnimatePresence>
                  {isDropdownOpen && (
                      <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                      >
                          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                              <h3 className="font-bold text-gray-800 text-sm">Notifications</h3>
                              {unreadCount > 0 && (
                                  <span className="text-xs font-semibold bg-[#2E5A88]/10 text-[#2E5A88] px-2 py-1 rounded-lg">{unreadCount} New</span>
                              )}
                          </div>
                          <div className="max-h-80 overflow-y-auto p-2 text-left">
                              {broadcasts.length > 0 ? broadcasts.map((b) => (
                                  <div key={b.id} className={`p-3 rounded-xl transition-colors mb-1 ${b.is_read ? 'opacity-70 hover:bg-gray-50' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                      <div className="flex gap-3">
                                          <div className="w-8 h-8 rounded-full bg-[#2E5A88]/10 text-[#2E5A88] flex items-center justify-center shrink-0 mt-1">
                                              <ChefHat size={16} />
                                          </div>
                                          <div className="flex-1">
                                              <p className="text-sm text-gray-800 font-medium leading-snug">{b.message}</p>
                                              <p className="text-[10px] text-gray-400 mt-1">
                                                  {new Date(b.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • Chef {b.user?.name?.split(' ')[0] || 'Andre'}
                                              </p>
                                          </div>
                                          {!b.is_read && (
                                              <button 
                                                  onClick={(e) => handleMarkAsRead(e, b.id)}
                                                  className="text-gray-400 hover:text-[#2E5A88] transition-colors shrink-0" 
                                                  title="Mark as read"
                                              >
                                                  <CheckCheck size={18} />
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              )) : (
                                  <div className="p-6 text-center text-gray-500 text-sm">
                                      No recent notifications
                                  </div>
                              )}
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
            </div>

            {user ? (
              <div className="flex items-center gap-4">
                <div 
                  className="flex items-center gap-2 text-[#1F2A44] font-medium cursor-pointer hover:text-[#2E5A88] transition-colors"
                  onClick={() => {
                    if (user?.role === 'chef') {
                      router.push('/dashboard');
                    } else {
                      router.push('/user_dashboard');
                    }
                  }}
                >
                  <div className="w-10 h-10 bg-[#2E5A88]/10 rounded-full flex items-center justify-center text-[#2E5A88] border-2 border-white shadow-sm">
                    <User size={18} />
                  </div>
                  <span className="hidden sm:inline">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="flex items-center gap-2 bg-[#2E5A88] text-white px-5 py-2.5 rounded-full hover:bg-[#1F2A44] transition-colors font-bold text-sm"
              >
                <User size={16} /> Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-12 px-6">

        {/* Header Section */}
        <div className="mb-12 text-center md:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Lunch at work</h1>
          <p className="text-lg text-gray-500 font-medium">
            Confirm your attendance for <span className="text-gray-900">{DAILY_MENU.date}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Main Content Card */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-gray-200/50">
              <div className="aspect-[16/9] relative overflow-hidden">
                <img
                  src={todayMeal?.image || DAILY_MENU.image}
                  alt="Lunch"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-white/50">
                  <span className="text-xs font-bold text-[#2E5A88] uppercase tracking-widest">Today&apos;s Special</span>
                </div>
              </div>

              <div className="p-10">
                <h2 className="text-3xl font-bold mb-4">{todayMeal?.title || DAILY_MENU.dishName}</h2>
                <p className="text-gray-500 leading-relaxed text-lg mb-8">
                  {DAILY_MENU.description}
                </p>

                <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <Info className="text-gray-400 shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Meal includes steamed rice, cucumber raita, and seasonal dessert. All ingredients are locally sourced.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Voting Side Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm sticky top-32">
              <h3 className="text-xl font-bold mb-6">Will you join us?</h3>

              <div className="space-y-4">
                <button
                  disabled={isDeadlineMet || isSubmitting || !lunchDayId}
                  onClick={() => submitVote("yes")}
                  className={`w-full group relative flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300 ${attendance === "yes"
                      ? "border-[#2E5A88] bg-[#2E5A88]/5"
                      : "border-gray-100 hover:border-gray-200"
                    } ${isDeadlineMet ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg transition-colors ${attendance === 'yes' ? 'bg-[#2E5A88] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <Check size={20} />
                    </div>
                    <span className="text-lg font-bold">Yes, I&apos;ll be there</span>
                  </div>
                  {attendance === "yes" && (
                    <motion.div layoutId="check" className="text-[#2E5A88]">
                      <Circle size={12} fill="currentColor" />
                    </motion.div>
                  )}
                </button>

                <button
                  disabled={isDeadlineMet || isSubmitting || !lunchDayId}
                  onClick={() => submitVote("no")}
                  className={`w-full group flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300 ${attendance === "no"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-100 hover:border-gray-200"
                    } ${isDeadlineMet ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg transition-colors ${attendance === 'no' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      <X size={20} />
                    </div>
                    <span className="text-lg font-bold">No, skip today</span>
                  </div>
                </button>
              </div>

              {/* Deadline Status */}
              <div className="mt-10 pt-8 border-t border-gray-50 flex flex-col items-center gap-4">
                {isDeadlineMet ? (
                  <div className="bg-red-50 text-red-600 px-6 py-3 rounded-full flex items-center gap-2 text-sm font-bold animate-pulse">
                    <Clock size={16} /> Voting is now locked
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest text-center">
                    Response required by 4:00 PM
                  </p>
                )}

                <AnimatePresence>
                  {attendance && !isDeadlineMet && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[#2E5A88] text-sm font-bold flex items-center gap-2"
                    >
                      <Check size={16} /> Vote recorded successfully
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Quick Stats Mini-Card */}
            <div className="bg-[#1F2A44] rounded-[2rem] p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-blue-200/60 text-xs font-black uppercase tracking-widest mb-2">Team Participation</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold">84%</span>
                  <span className="text-blue-300/50 text-sm mb-1 font-bold">joined so far</span>
                </div>
              </div>
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}