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
  ChevronLeft,
  Circle,
  User,
  LogOut,
  Bell,
  ChefHat,
  CheckCheck,
  Lock
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
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    const getFormattedTodayDate = () => {
      const date = new Date();
      if (language === 'bo') {
        const tibetanWeekdays = [
          'གཟའ་ཉི་མ།', // Sunday
          'གཟའ་ཟླ་བ།', // Monday
          'གཟའ་མིག་དམར།', // Tuesday
          'གཟའ་ལྷག་པ།', // Wednesday
          'གཟའ་ཕུར་བུ།', // Thursday
          'གཟའ་པ་སངས།', // Friday
          'གཟའ་སྤེན་པ།' // Saturday
        ];
        const weekday = tibetanWeekdays[date.getDay()];
        const month = toTibetanDigits(date.getMonth() + 1);
        const day = toTibetanDigits(date.getDate());
        return `${weekday} ཕྱི་ཟླ་ ${month} པའི་ཚེས་ ${day}`;
      } else {
        const weekday = date.toLocaleString('en-US', { weekday: 'long' });
        const month = date.toLocaleString('en-US', { month: 'long' });
        const day = date.getDate();

        let suffix = 'th';
        if (day === 1 || day === 21 || day === 31) suffix = 'st';
        else if (day === 2 || day === 22) suffix = 'nd';
        else if (day === 3 || day === 23) suffix = 'rd';

        return `${weekday}, ${month} ${day}${suffix}`;
      }
    };
    setFormattedDate(getFormattedTodayDate());
  }, [language]);

  // Calendar States
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth() + 1);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isCalendarSubmitting, setIsCalendarSubmitting] = useState(false);

  // Fetch Calendar Data
  const fetchCalendar = async (year: number, month: number) => {
    setIsCalendarLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/calendar-poll?year=${year}&month=${month}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCalendarDays(data.days);
      }
    } catch (err) {
      console.error("Failed to fetch calendar data:", err);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  // Load Calendar on month/year change
  useEffect(() => {
    fetchCalendar(calendarYear, calendarMonth);
  }, [calendarYear, calendarMonth]);

  // Toggle single day
  const handleToggleDay = async (day: any) => {
    if (day.is_locked || day.is_weekend || isCalendarSubmitting) return;

    setIsCalendarSubmitting(true);
    const nextStatus = day.status === 'opted_in' ? 'opted_out' : 'opted_in';
    setCalendarDays(prev => prev.map(d => d.date === day.date ? { ...d, status: nextStatus } : d));

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/calendar-poll/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dates: [day.date],
          status: nextStatus
        })
      });
      if (!res.ok) {
        throw new Error("Failed to toggle status");
      }
      const todayStr = new Date().toISOString().split('T')[0];
      if (day.date === todayStr) {
        setAttendance(nextStatus === 'opted_in' ? 'yes' : 'no');
      }
    } catch (err) {
      console.error(err);
      // Revert state
      setCalendarDays(prev => prev.map(d => d.date === day.date ? { ...d, status: day.status } : d));
    } finally {
      setIsCalendarSubmitting(false);
    }
  };

  // Submit batch votes
  const handleBatchVote = async (dates: string[], status: 'opted_in' | 'opted_out') => {
    if (dates.length === 0 || isCalendarSubmitting) return;

    setIsCalendarSubmitting(true);
    setCalendarDays(prev => prev.map(d => dates.includes(d.date) ? { ...d, status } : d));

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/calendar-poll/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dates,
          status
        })
      });
      if (!res.ok) {
        throw new Error("Failed to run batch updates");
      }
      const todayStr = new Date().toISOString().split('T')[0];
      if (dates.includes(todayStr)) {
        setAttendance(status === 'opted_in' ? 'yes' : 'no');
      }
    } catch (err) {
      console.error(err);
      fetchCalendar(calendarYear, calendarMonth);
    } finally {
      setIsCalendarSubmitting(false);
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    let nextMonth = calendarMonth - 1;
    let nextYear = calendarYear;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setCalendarMonth(nextMonth);
    setCalendarYear(nextYear);
  };

  const handleNextMonth = () => {
    let nextMonth = calendarMonth + 1;
    let nextYear = calendarYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setCalendarMonth(nextMonth);
    setCalendarYear(nextYear);
  };

  const getMonthName = (monthNum: number, lang: string) => {
    const date = new Date(2026, monthNum - 1, 1);
    if (lang === 'bo') {
      return `ཕྱི་ཟླ་ ${toTibetanDigits(monthNum)} པ།`;
    }
    return date.toLocaleString('en-US', { month: 'long' });
  };

  // Helper to chunk days into weekly rows for grid
  const chunkIntoWeeks = (days: any[]) => {
    const weeks: any[][] = [];
    if (days.length === 0) return weeks;

    const dayOfWeekMap: Record<string, number> = {
      'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4, 'sat': 5, 'sun': 6
    };

    const firstDayOfWeek = days[0].day_of_week;
    const paddingCount = dayOfWeekMap[firstDayOfWeek] ?? 0;

    let currentWeek: any[] = [];
    for (let i = 0; i < paddingCount; i++) {
      currentWeek.push(null);
    }

    days.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const getUnlockedWeekdaysInWeek = (week: any[]) => {
    return week
      .filter(d => d !== null && !d.is_weekend && !d.is_locked)
      .map(d => d.date);
  };

  const getUnlockedWeekdaysInMonth = () => {
    return calendarDays
      .filter(d => !d.is_weekend && !d.is_locked)
      .map(d => d.date);
  };

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
      fetchCalendar(calendarYear, calendarMonth);
    } catch (err) {
      console.error(err);
      // Revert on failure could be implemented here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-[#2E5A88]/10">

      <Header user={user} onLogout={() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        router.push('/');
      }} />

      <main className="max-w-5xl mx-auto pt-28 pb-12 px-4 sm:px-6">

        {/* Header Section */}
        <div className="mb-6 sm:mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end md:justify-between gap-6">

          <div className="bg-card border border-border rounded-2xl px-4 py-2 sm:px-6 sm:py-4 shadow-sm flex flex-col items-center md:items-end w-fit mx-auto md:mx-0 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('voting_deadline')}</span>
            <span className={`text-lg sm:text-xl font-black ${isDeadlineMet ? 'text-red-500' : 'text-[#2E5A88] dark:text-[#D7E8F4]'}`}>
              {isDeadlineMet ? t('closed') : (language === 'bo' ? toTibetanDigits(timeLeft) : timeLeft)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">

          {/* Main Content Card */}
          <div className="lg:col-span-7">
            <div className="bg-card rounded-2xl sm:rounded-[2rem] border border-border shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-gray-200/50">
              <div className="aspect-[16/9] relative overflow-hidden">
                <img
                  src={todayMeal?.image || DAILY_MENU.image}
                  alt="Lunch"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-white/90 dark:bg-[#202020]/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm border border-white/50 dark:border-[#323232]">
                  <span className="text-[10px] sm:text-xs font-bold text-[#2E5A88] dark:text-[#D7E8F4] uppercase tracking-widest">{t('todays_special')}</span>
                </div>
              </div>

              <div className="p-4 sm:p-8 md:p-10">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">{t(todayMeal?.title || DAILY_MENU.dishName)}</h2>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm sm:text-base md:text-lg mb-6 sm:mb-8">
                  {t(getDishDescriptionKey(todayMeal?.title || DAILY_MENU.dishName))}
                </p>

                <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gray-50 dark:bg-[#202020] rounded-xl sm:rounded-2xl border border-gray-100 dark:border-[#323232]">
                  <Info className="text-gray-400 shrink-0 mt-0.5" size={18} />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {t('meal_details_info')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Voting Side Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 border border-border shadow-sm sticky top-32">
              <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">{t('will_you_join')}</h3>

              <div className="space-y-3 sm:space-y-4">
                <button
                  disabled={isDeadlineMet || isSubmitting || !lunchDayId}
                  onClick={() => submitVote("yes")}
                  className={`w-full group relative flex items-center justify-between p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${attendance === "yes"
                    ? "border-[#2E5A88] dark:border-[#D7E8F4] bg-[#2E5A88]/5 dark:bg-[#D7E8F4]/5"
                    : "border-gray-100 dark:border-[#323232] hover:border-gray-200 dark:hover:border-border"
                    } ${isDeadlineMet ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`p-2 rounded-lg transition-colors ${attendance === 'yes' ? 'bg-[#2E5A88] dark:bg-[#D7E8F4] text-white dark:text-[#1C1C1C]' : 'bg-gray-100 dark:bg-[#202020] text-gray-400 dark:text-slate-400'}`}>
                      <Check size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-base sm:text-lg font-bold">{t('vote_yes')}</span>
                  </div>
                  {attendance === "yes" && (
                    <motion.div layoutId="check" className="text-[#2E5A88] dark:text-[#D7E8F4]">
                      <Circle size={10} fill="currentColor" />
                    </motion.div>
                  )}
                </button>

                <button
                  disabled={isDeadlineMet || isSubmitting || !lunchDayId}
                  onClick={() => submitVote("no")}
                  className={`w-full group flex items-center justify-between p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${attendance === "no"
                    ? "border-red-500 bg-red-50 dark:bg-red-950/15"
                    : "border-gray-100 dark:border-[#323232] hover:border-gray-200 dark:hover:border-border"
                    } ${isDeadlineMet ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`p-2 rounded-lg transition-colors ${attendance === 'no' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-[#202020] text-gray-400 dark:text-slate-400'}`}>
                      <X size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-base sm:text-lg font-bold">{t('vote_no')}</span>
                  </div>
                </button>
              </div>                {/* Deadline Status */}
              <div className="mt-6 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-50 dark:border-[#323232] flex flex-col items-center gap-4">
                {isDeadlineMet ? (
                  <div className="bg-red-50 dark:bg-red-950/20 text-red-600 px-6 py-3 rounded-full flex items-center gap-2 text-sm font-bold animate-pulse">
                    <Clock size={10} /> {t('voting_locked')}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-slate-400 font-bold uppercase tracking-widest text-center">
                    {t('response_cutoff')}
                  </p>
                )}

                <AnimatePresence>
                  {attendance && !isDeadlineMet && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[#2E5A88] dark:text-[#D7E8F4] text-sm font-bold flex items-center gap-2"
                    >
                      <Check size={10} /> {t('vote_recorded')}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="mt-8 sm:mt-12 bg-card rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-border shadow-sm transition-all hover:shadow-xl hover:shadow-gray-200/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 sm:mb-8 pb-6 border-b border-border">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-black flex items-center gap-3">
                <CalendarDays className="text-[#2E5A88] dark:text-[#D7E8F4]" size={22} />
                {t('plan_your_meals')}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Month Selector */}
              <div className="flex items-center bg-gray-100 dark:bg-[#202020] rounded-xl p-1 border dark:border-[#323232]">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-white dark:hover:bg-[#272727] rounded-lg transition-colors text-gray-600 dark:text-slate-300 hover:text-[#2E5A88] cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 sm:px-4 font-bold text-xs sm:text-sm min-w-[90px] sm:min-w-[120px] text-center text-slate-800 dark:text-slate-200">
                  {getMonthName(calendarMonth, language)} {calendarYear}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-white dark:hover:bg-[#272727] rounded-lg transition-colors text-gray-600 dark:text-slate-300 hover:text-[#2E5A88] cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Month Bulk Actions */}
              {getUnlockedWeekdaysInMonth().length > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    disabled={isCalendarSubmitting}
                    onClick={() => handleBatchVote(getUnlockedWeekdaysInMonth(), 'opted_out')}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors border border-red-200/40 dark:border-red-900/40 cursor-pointer disabled:opacity-50"
                  >
                    {t('opt_out_month')}
                  </button>
                  <button
                    disabled={isCalendarSubmitting}
                    onClick={() => handleBatchVote(getUnlockedWeekdaysInMonth(), 'opted_in')}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-bold text-green-600 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-colors border border-green-200/40 dark:border-green-900/40 cursor-pointer disabled:opacity-50"
                  >
                    {t('opt_in_month')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[768px]">
              {/* Grid Header */}
              <div className="grid grid-cols-8 gap-3 mb-4 text-center font-bold text-xs uppercase tracking-widest text-gray-400 dark:text-slate-500">
                <div>{t('Mon')}</div>
                <div>{t('Tue')}</div>
                <div>{t('Wed')}</div>
                <div>{t('Thu')}</div>
                <div>{t('Fri')}</div>
                <div className="text-gray-300 dark:text-slate-600">{language === 'bo' ? 'སྤེན་པ།' : 'Sat'}</div>
                <div className="text-gray-300 dark:text-slate-600">{language === 'bo' ? 'ཉི་མ།' : 'Sun'}</div>
                <div className="text-[#2E5A88] dark:text-[#D7E8F4]">{language === 'bo' ? 'བྱ་སྤྱོད།' : 'Bulk'}</div>
              </div>

              {/* Grid Body */}
              {isCalendarLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-[#2E5A88] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-bold text-gray-500">{t('sizzling_data')}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {chunkIntoWeeks(calendarDays).map((week, weekIndex) => {
                    const unlockedWeekdays = getUnlockedWeekdaysInWeek(week);
                    return (
                      <div key={weekIndex} className="grid grid-cols-8 gap-3 items-stretch">
                        {week.map((day, dayIndex) => {
                          if (!day) {
                            return <div key={dayIndex} className="rounded-2xl bg-gray-50/30 dark:bg-[#202020]/20 border border-dashed border-gray-100 dark:border-[#323232]" />;
                          }

                          if (day.is_weekend) {
                            return (
                              <div
                                key={dayIndex}
                                className="p-4 rounded-2xl bg-gray-50/50 dark:bg-[#202020]/30 border border-gray-100/60 dark:border-[#323232]/50 flex flex-col items-center justify-center text-gray-300 dark:text-slate-600 font-medium h-24"
                              >
                                <span className="text-sm font-bold opacity-60">
                                  {language === 'bo' ? toTibetanDigits(parseInt(day.date.split('-')[2], 10)) : parseInt(day.date.split('-')[2], 10)}
                                </span>
                                <span className="text-[10px] font-black uppercase mt-1 tracking-wider opacity-40">
                                  {language === 'bo' ? 'གཟའ་མཇུག' : 'WKND'}
                                </span>
                              </div>
                            );
                          }

                          const isJoining = day.status === 'opted_in';
                          const dayNum = parseInt(day.date.split('-')[2], 10);
                          const formattedDayNum = language === 'bo' ? toTibetanDigits(dayNum) : dayNum;

                          return (
                            <div
                              key={dayIndex}
                              onClick={() => handleToggleDay(day)}
                              className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center transition-all duration-300 h-24 select-none relative group ${day.is_locked
                                ? 'opacity-80 bg-gray-50 dark:bg-[#202020]/75 border-gray-200 dark:border-[#323232] cursor-not-allowed'
                                : isJoining
                                  ? 'bg-green-50/40 dark:bg-green-950/10 border-green-500/20 dark:border-green-900/30 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-500 cursor-pointer'
                                  : 'bg-red-50/30 dark:bg-red-950/10 border-red-500/20 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500 cursor-pointer'
                                }`}
                            >
                              {/* Day Number and Lock Indicator */}
                              <div className="w-full flex items-center justify-between">
                                <span className={`text-sm font-black ${day.is_locked ? 'text-gray-400 dark:text-slate-500' : isJoining ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                                  }`}>
                                  {formattedDayNum}
                                </span>
                                {day.is_locked && (
                                  <Lock size={12} className="text-gray-400 dark:text-slate-500 shrink-0" />
                                )}
                              </div>

                              {/* Menu / Dish Name */}
                              <div className="w-full truncate text-[10px] font-bold text-gray-400 dark:text-slate-500 px-1 mt-1 group-hover:text-gray-600 dark:group-hover:text-slate-300 transition-colors">
                                {day.menu ? t(day.menu.title) : t('menu_not_set')}
                              </div>

                              {/* Status Badge */}
                              <div className="mt-2 flex items-center gap-1.5">
                                {isJoining ? (
                                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${day.is_locked ? 'bg-gray-100 dark:bg-[#202020] text-gray-500 dark:text-slate-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    }`}>
                                    <Check size={10} strokeWidth={3} />
                                    <span className="hidden sm:inline">{t('legend_joining')}</span>
                                  </span>
                                ) : (
                                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${day.is_locked ? 'bg-gray-100 dark:bg-[#202020] text-gray-500 dark:text-slate-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    }`}>
                                    <X size={10} strokeWidth={3} />
                                    <span className="hidden sm:inline">{t('legend_skipped')}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Week Action Column */}
                        <div className="flex flex-col justify-center gap-1 px-2 border-l border-gray-100 dark:border-[#323232]">
                          {unlockedWeekdays.length > 0 ? (
                            <>
                              <button
                                disabled={isCalendarSubmitting}
                                onClick={() => handleBatchVote(unlockedWeekdays, 'opted_out')}
                                className="w-full py-1 text-[10px] font-black text-center text-red-600 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-red-200/20 dark:border-red-900/40 cursor-pointer disabled:opacity-50"
                                title="Skip Whole Week"
                              >
                                {t('skip_week')}
                              </button>
                              <button
                                disabled={isCalendarSubmitting}
                                onClick={() => handleBatchVote(unlockedWeekdays, 'opted_in')}
                                className="w-full py-1 text-[10px] font-black text-center text-green-600 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors border border-green-200/20 dark:border-green-900/40 cursor-pointer disabled:opacity-50"
                                title="Join Whole Week"
                              >
                                {t('join_week')}
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-gray-300 dark:text-slate-600 text-center uppercase tracking-wider">
                              {language === 'bo' ? 'ཟིན་ཟིན།' : 'Locked'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}