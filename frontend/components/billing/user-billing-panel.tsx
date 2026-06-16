"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Utensils, IndianRupee, Loader2, History, CheckCircle2, XCircle } from 'lucide-react';
import {
  fetchUserBilling,
  formatCurrency,
  monthLabel,
  UserBillingResponse,
  UserMonthlyBill,
} from '@/lib/billing';
import { useLanguage, toTibetanDigits } from '@/components/providers/language-provider';

const formatPrice = (amount: number, language: string) => {
  const formatted = formatCurrency(amount);
  return language === 'bo' ? toTibetanDigits(formatted) : formatted;
};

const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white/80 dark:bg-[#272727]/80 backdrop-blur-xl border border-slate-100 dark:border-[#323232] rounded-3xl shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all text-slate-800 dark:text-[#F5F5F5] ${className}`}
  >
    {children}
  </motion.div>
);

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const paid = status === 'paid';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${paid ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
        }`}
    >
      {paid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {paid ? t('paid') : t('unpaid')}
    </span>
  );
}

function BillingRow({ item }: { item: UserMonthlyBill }) {
  const { t, language } = useLanguage();
  const mb = item.monthly_bill;
  if (!mb) return null;

  const formatMonthYear = (month: number, year: number) => {
    if (language === 'bo') {
      return `ཕྱི་ཟླ་ ${toTibetanDigits(month)} པ་ལོ་ ${toTibetanDigits(year)}`;
    }
    return monthLabel(month, year);
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-[#202020] border border-transparent hover:border-slate-100 dark:hover:border-[#323232] transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <Receipt size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-[#F5F5F5]">{formatMonthYear(mb.month, mb.year)}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-400">{t('meals_joined_count', { count: item.joined_count })}</p>
        </div>
      </div>
      <div className="text-right flex flex-col items-end gap-1">
        <p className="text-sm font-bold text-slate-900 dark:text-[#F5F5F5]">{formatPrice(item.amount_due, language)}</p>
        <StatusBadge status={item.payment_status} />
      </div>
    </div>
  );
}

export default function UserBillingPanel() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<UserBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const formatMonthYear = (month: number, year: number) => {
    if (language === 'bo') {
      return `ཕྱི་ཟླ་ ${toTibetanDigits(month)} པ་ལོ་ ${toTibetanDigits(year)}`;
    }
    return monthLabel(month, year);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetchUserBilling()
      .then(setData)
      .catch((err) => {
        console.error(err);
        setData({
          current: null,
          history: [],
          meta: { current_page: 1, last_page: 1, per_page: 12, total: 0 },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const current = data?.current;
  const history = data?.history ?? [];

  if (loading) {
    return (
      <GlassCard className="p-8 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="animate-spin text-[#2E5A88]" size={20} />
        {t('loading_billing')}
      </GlassCard>
    );
  }

  const display = current ?? history[0];

  return (
    <div className="space-y-6">
      <GlassCard className="p-8 border-2 border-blue-50/80 dark:border-[#323232]/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/40 dark:from-blue-900/10 to-transparent rounded-bl-full pointer-events-none" />
        <div className="flex items-center gap-2 mb-6">
          <Receipt className="text-[#2E5A88] dark:text-[#D7E8F4]" size={22} />
          <h3 className="text-xl font-bold">{t('monthly_lunch_billing')}</h3>
        </div>

        {display && display.monthly_bill ? (
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202020] border border-slate-100 dark:border-[#323232]">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-2">
                <Utensils size={14} /> {t('meals_joined')}
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5]">{language === 'bo' ? toTibetanDigits(display.joined_count) : display.joined_count}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202020] border border-slate-100 dark:border-[#323232]">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase mb-2">
                <IndianRupee size={14} /> {t('cost_per_plate')}
              </div>
              <p className="text-2xl font-bold text-[#2E5A88] dark:text-[#D7E8F4]">
                {formatPrice(display.monthly_bill.plate_cost, language)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#2E5A88] dark:bg-[#202020] border dark:border-[#323232] text-white col-span-2 shadow-lg shadow-[#2E5A88]/10 dark:shadow-none">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-80 mb-1">{t('total_due')}</p>
                  <p className="text-3xl font-black text-white dark:text-[#F5F5F5]">{formatPrice(display.amount_due, language)}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {formatMonthYear(display.monthly_bill.month, display.monthly_bill.year)}
                  </p>
                </div>
                <StatusBadge status={display.payment_status} />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500">
            <p className="font-medium">{t('no_billing_this_month')}</p>
            <p className="text-sm mt-1">{t('accountant_upload_info')}</p>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="font-bold flex items-center gap-2 mb-4">
          <History size={18} className="text-[#2E5A88]" />
          {t('billing_history')}
        </h3>
        <div className="space-y-1">
          {history.length > 0 ? (
            history.map((item) => <BillingRow key={item.id} item={item} />)
          ) : (
            <p className="text-sm text-slate-500 text-center py-6">{t('no_previous_billing')}</p>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
