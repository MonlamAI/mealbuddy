"use client";

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/providers/language-provider';
import Header from '@/components/header';
import { MessageSquare, ThumbsUp, Plus, ChefHat, Check, X, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function SuggestionsPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(storedUser));
        fetchSuggestions();
    }, []);

    const fetchSuggestions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/suggestions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data);
            }
        } catch (error) {
            console.error("Failed to fetch suggestions", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpvote = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            // Optimistic update
            setSuggestions(prev => prev.map(s => {
                if (s.id === id) {
                    const isVoting = !s.has_voted;
                    return {
                        ...s,
                        has_voted: isVoting,
                        upvotes_count: s.upvotes_count + (isVoting ? 1 : -1)
                    };
                }
                return s;
            }));

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/suggestions/${id}/vote`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                // Revert on error
                fetchSuggestions();
            }
        } catch (error) {
            console.error("Failed to vote", error);
            fetchSuggestions();
        }
    };

    const handleStatusChange = async (id: number, status: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/suggestions/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchSuggestions();
            }
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this suggestion?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/suggestions/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                setSuggestions(prev => prev.filter(s => s.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete suggestion", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/suggestions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, description })
            });
            if (res.ok) {
                const newSuggestion = await res.json();
                newSuggestion.has_voted = true; // Auto-voted on backend
                setSuggestions(prev => [newSuggestion, ...prev].sort((a, b) => b.upvotes_count - a.upvotes_count));
                setShowModal(false);
                setTitle('');
                setDescription('');
            }
        } catch (error) {
            console.error("Failed to submit suggestion", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">{t('status_approved')}</span>;
            case 'rejected': return <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-md text-xs font-bold">{t('status_rejected')}</span>;
            case 'won': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1"><Award size={12}/> {t('status_won')}</span>;
            default: return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-bold">{t('status_pending')}</span>;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#151515] flex flex-col items-center justify-center">
                <ChefHat className="animate-bounce text-blue-500 mb-4" size={48} />
                <p className="text-slate-500 font-medium">{t('setting_table')}</p>
            </div>
        );
    }

    const isChefOrAdmin = user?.role === 'chef' || user?.role === 'admin';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#151515] pb-24">
            <Header user={user} />

            <main className="max-w-4xl mx-auto px-4 pt-28">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                            <MessageSquare className="text-blue-500" />
                            {t('suggestions_board')}
                        </h1>
                        <p className="text-slate-500 mt-1">Vote for your favorite dishes to add to the menu!</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">{t('suggest_dish')}</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suggestions.length === 0 ? (
                        <div className="text-center p-12 bg-white dark:bg-[#1C1C1C] rounded-3xl border border-slate-100 dark:border-[#2A2A2A]">
                            <ChefHat size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">{t('no_suggestions')}</h3>
                        </div>
                    ) : (
                        suggestions.map((suggestion) => (
                            <motion.div
                                key={suggestion.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-5 rounded-2xl border transition-all ${
                                    suggestion.status === 'won' 
                                        ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50' 
                                        : 'bg-white dark:bg-[#1C1C1C] border-slate-100 dark:border-[#2A2A2A]'
                                }`}
                            >
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{suggestion.title}</h3>
                                            {getStatusBadge(suggestion.status)}
                                        </div>
                                        {suggestion.description && (
                                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">{suggestion.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <img
                                                src={suggestion.user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${suggestion.user.name}`}
                                                className="w-5 h-5 rounded-full bg-slate-100"
                                                alt=""
                                            />
                                            <span>{t('submitted_by', { name: suggestion.user.name })}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-2 border-l border-slate-100 dark:border-[#333] pl-4">
                                        <button
                                            onClick={() => handleUpvote(suggestion.id)}
                                            className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${
                                                suggestion.has_voted
                                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border border-blue-200 dark:border-blue-800'
                                                    : 'bg-slate-50 dark:bg-[#252525] text-slate-500 border border-transparent hover:bg-slate-100 dark:hover:bg-[#333]'
                                            }`}
                                        >
                                            <ThumbsUp size={20} className={suggestion.has_voted ? 'fill-current mb-1' : 'mb-1'} />
                                            <span className="font-bold text-sm leading-none">{suggestion.upvotes_count}</span>
                                        </button>
                                        
                                        <div className="flex flex-wrap justify-center gap-1 mt-1 max-w-full">
                                            {isChefOrAdmin && suggestion.status === 'pending' && (
                                                <button onClick={() => handleStatusChange(suggestion.id, 'won')} title={t('mark_winner')} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg">
                                                    <Award size={16} />
                                                </button>
                                            )}
                                            {isChefOrAdmin && suggestion.status === 'pending' && (
                                                <button onClick={() => handleStatusChange(suggestion.id, 'rejected')} title={t('mark_rejected')} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg">
                                                    <X size={16} />
                                                </button>
                                            )}
                                            {(user?.id === suggestion.user_id || isChefOrAdmin) && (
                                                <button onClick={() => handleDelete(suggestion.id)} title="Delete" className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </main>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setShowModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white dark:bg-[#1C1C1C] rounded-3xl w-full max-w-md relative z-10 overflow-hidden shadow-2xl border border-slate-100 dark:border-[#333]"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-[#333] flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('suggest_dish')}</h2>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('suggestion_title')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#333] rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white font-medium"
                                        placeholder="e.g. Spicy Chicken Momos"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('suggestion_desc')}</label>
                                    <textarea
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#151515] border border-slate-200 dark:border-[#333] rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-slate-800 dark:text-white min-h-[100px]"
                                        placeholder="e.g. Everyone loves momos, and it's been a while since we had them!"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors mt-2"
                                >
                                    {isSubmitting ? '...' : t('submit_suggestion')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
