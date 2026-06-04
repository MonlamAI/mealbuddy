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
import { useLanguage, LanguageSwitcher, toTibetanDigits, getDishDescriptionKey } from '@/components/providers/language-provider';
import Header from '@/components/header';

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
  const { t, language } = useLanguage();
  const [attendance, setAttendance] = useState<"yes" | "no" | null>(null);
  const [isDeadlineMet, setIsDeadlineMet] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [user, setUser] = useState<{ name: string; role?: string } | null>(null);
  const [todayMeal, setTodayMeal] = useState<{ title: string, image: string } | null>(null);
  const [lunchDayId, setLunchDayId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown Logic
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const deadline = new Date();
      deadline.setHours(10, 0, 0, 0);

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

    return () => {
      clearInterval(timer);
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

      <Header user={user} onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        router.push('/');
      }} />

      <main className="max-w-5xl mx-auto pt-32 pb-12 px-6">

        {/* Header Section */}
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-3">{t('lunch_at_work')}</h1>
            <p className="text-lg text-gray-500 font-medium">
              {t('confirm_attendance_for')} <span className="text-gray-900">{t('fallback_menu_date')}</span>
            </p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-sm flex flex-col items-center md:items-end w-fit mx-auto md:mx-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('voting_deadline')}</span>
            <span className={`text-xl font-black ${isDeadlineMet ? 'text-red-500' : 'text-[#2E5A88]'}`}>
              {isDeadlineMet ? t('closed') : (language === 'bo' ? toTibetanDigits(timeLeft) : timeLeft)}
            </span>
          </div>
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
                  <span className="text-xs font-bold text-[#2E5A88] uppercase tracking-widest">{t('todays_special')}</span>
                </div>
              </div>

              <div className="p-10">
                <h2 className="text-3xl font-bold mb-4">{t(todayMeal?.title || DAILY_MENU.dishName)}</h2>
                <p className="text-gray-500 leading-relaxed text-lg mb-8">
                  {t(getDishDescriptionKey(todayMeal?.title || DAILY_MENU.dishName))}
                </p>

                <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                  <Info className="text-gray-400 shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {t('meal_details_info')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Voting Side Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm sticky top-32">
              <h3 className="text-xl font-bold mb-6">{t('will_you_join')}</h3>

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
                    <span className="text-lg font-bold">{t('vote_yes')}</span>
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
                    <span className="text-lg font-bold">{t('vote_no')}</span>
                  </div>
                </button>
              </div>

              {/* Deadline Status */}
              <div className="mt-10 pt-8 border-t border-gray-50 flex flex-col items-center gap-4">
                {isDeadlineMet ? (
                  <div className="bg-red-50 text-red-600 px-6 py-3 rounded-full flex items-center gap-2 text-sm font-bold animate-pulse">
                    <Clock size={10} /> {t('voting_locked')}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest text-center">
                    {t('response_cutoff')}
                  </p>
                )}

                <AnimatePresence>
                  {attendance && !isDeadlineMet && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[#2E5A88] text-sm font-bold flex items-center gap-2"
                    >
                      <Check size={10} /> {t('vote_recorded')}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Quick Stats Mini-Card */}
            <div className="bg-[#1F2A44] rounded-[2rem] p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-blue-200/60 text-xs font-black uppercase tracking-widest mb-2">{t('team_participation')}</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold">{language === 'bo' ? toTibetanDigits('84%') : '84%'}</span>
                  <span className="text-blue-300/50 text-sm mb-1 font-bold">{t('joined_so_far')}</span>
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