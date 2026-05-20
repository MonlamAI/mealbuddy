'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Utensils, Users, ClipboardList, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [menu, setMenu] = useState<{ id: number; weekday: string; title: string; image_url?: string }[]>([]);
  // State to hold user data
  const [user, setUser] = useState<{ name: string; role?: string } | null>(null);

  const WEEKDAY_LABELS = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
  ];

  useEffect(() => {
    // 1. Load Menu
    async function loadMenu() {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
      try {
        const res = await fetch(`${base}/v1/weekly-menus`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();
        setMenu(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading menus:', error);
      }
    }

    // 2. Check for logged in user
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }

    loadMenu();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.refresh();
  };

  const handleLoginClick = () => {
    router.push('/login');
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#1F2A44]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-[#2E5A88] font-bold text-xl cursor-pointer" onClick={() => router.push('/')}>
            <Utensils size={24} />
            <span>MealBuddy</span>
          </div>

          <div className="flex items-center gap-6">
            {user ? (
              /* LOGGED IN STATE */
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
                  <div className="w-8 h-8 bg-[#2E5A88]/10 rounded-full flex items-center justify-center text-[#2E5A88]">
                    <User size={16} />
                  </div>
                  <span>{user.name}</span>
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
              /* LOGGED OUT STATE */
              <button
                onClick={handleLoginClick}
                className="flex items-center gap-2 bg-[#2E5A88] text-white px-6 py-3 rounded-full hover:bg-[#1F2A44] transition-colors font-bold"
              >
                <User size={20} /> Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Lunch at work
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto mb-10 text-xl leading-relaxed">
            The smartest way for teams to vote on meals, and eliminate food waste.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => user ? router.push('/vote') : router.push('/login')}
              className="bg-[#2E5A88] text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-[#1F2A44] hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              {user ? 'Vote Now' : 'Join your team'}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center justify-center gap-2 px-10 py-4 rounded-full border-2 border-gray-200 font-bold text-lg hover:bg-white hover:border-[#2E5A88] transition-all"
            >
              Dashboard <ArrowRight size={20} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* WEEKLY MENU PREVIEW */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="relative overflow-hidden bg-[#f5f5f6] rounded-[3rem] p-10 md:p-16 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#2E5A88] blur-[100px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#2E5A88]/10 blur-[100px] rounded-full" />

          <div className="relative z-10">
            <div className="mb-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">This Week’s Lunch Plan</h2>
              <p className="text-[#2e5a88] max-w-xl mx-auto">Fresh meals prepared daily by our expert chefs. Vote before 4 PM to join!</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
              {WEEKDAY_LABELS.map(({ key, label }) => {
                const meal = menu.find((item) => item.weekday === key);
                return (
                  <motion.div
                    key={key}
                    whileHover={{ y: -10 }}
                    className="bg-white/50 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-6 text-center transition-all hover:bg-white/10 group cursor-pointer"
                  >
                    <p className="font-black text-blue-400 mb-4 uppercase tracking-[0.2em] text-[10px]">{label}</p>

                    <div className="relative w-full aspect-square mb-5 rounded-3xl overflow-hidden bg-white/5 border border-white/5 shadow-inner">
                      {meal?.image_url ? (
                        <img
                          src={meal.image_url}
                          alt={label}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10">
                          <Utensils size={48} strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1F2A44]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <h3 className="text-[#2e5a88] font-bold text-sm leading-tight group-hover:text-blue-300 transition-colors">
                      {meal?.title ?? 'Menu coming soon'}
                    </h3>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-16">How MealBuddy Works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: ClipboardList,
                title: 'MasterChef Plans Menu',
                desc: 'Daily chef-curated meals are added to the weekly dashboard.',
              },
              {
                icon: Users,
                title: 'Employees Vote',
                desc: 'Team members confirm their lunch before the 10 AM cutoff.',
              },
              {
                icon: Utensils,
                title: 'Cook Smart',
                desc: 'Chef prepares exactly what is needed. Zero waste.',
              },
            ].map((item, i) => (
              <div key={i} className="relative p-8 rounded-3xl hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100">
                <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-2xl bg-[#F0F4F8] text-[#2E5A88] mb-6">
                  <item.icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="bg-[#2E5A88] rounded-[3rem] p-12 md:p-20 text-center text-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />

            <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10">
              Ready to join your team's lunch hour?
            </h2>
            <p className="mb-10 text-blue-100 text-lg max-w-xl mx-auto relative z-10">
              Join your office workspace today and never wonder "what's for lunch" again.
            </p>
            <button
              onClick={handleLoginClick}
              className="bg-white text-[#2E5A88] px-12 py-5 rounded-full font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105 relative z-10"
            >
              Get Started Now
            </button>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-12 border-t border-gray-100 text-center text-gray-400 text-sm">
        <p>© 2026 MealBuddy. All rights reserved.</p>
      </footer>
    </main>
  );
}
