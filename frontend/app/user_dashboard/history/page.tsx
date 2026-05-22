"use client";

import React, { useState, useEffect } from 'react';
import Header from '@/components/header';
import {
    History,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Calendar,
    Utensils
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function ActivityHistoryPage() {
    const router = useRouter();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('token');
                // Check if user is logged in
                if (!token) {
                    router.push('/login');
                    return;
                }
                
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/v1/user/activity`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    setHistory(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Failed to fetch history", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [router]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            <Header />
            <div className="max-w-4xl mx-auto px-4 pt-28 pb-20">
                <button 
                    onClick={() => router.push('/user_dashboard')}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium mb-8 transition-colors"
                >
                    <ArrowLeft size={20} />
                    Back to Dashboard
                </button>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 md:p-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <History size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Activity History</h1>
                            <p className="text-slate-500">A complete record of your meal participations</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <Utensils size={40} className="animate-pulse mb-4 text-blue-300" />
                            <p className="font-medium">Loading history...</p>
                        </div>
                    ) : history.length > 0 ? (
                        <div className="space-y-4">
                            {history.map((activity, index) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    key={activity.id} 
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-md hover:shadow-blue-500/5 transition-all bg-slate-50/50"
                                >
                                    <div className="flex items-center gap-5 mb-4 sm:mb-0">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${activity.status === 'opted_in' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {activity.status === 'opted_in' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-slate-800">
                                                {activity.status === 'opted_in' ? 'Joined Lunch' : 'Skipped Lunch'}
                                            </p>
                                            <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mt-1">
                                                <Utensils size={14} />
                                                {activity.lunch_day?.menu?.title || 'Unknown Menu'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-fit">
                                        <Calendar size={16} className="text-blue-500" />
                                        <span className="text-sm font-bold">
                                            {new Date(activity.lunch_day.lunch_date).toLocaleDateString('en-US', { 
                                                weekday: 'long', 
                                                month: 'long', 
                                                day: 'numeric', 
                                                year: 'numeric' 
                                            })}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                            <History size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-slate-700 mb-2">No History Found</h3>
                            <p className="text-slate-500">You haven't participated in any meals yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
