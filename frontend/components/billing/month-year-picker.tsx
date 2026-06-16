"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel } from '@/lib/billing';
import { useLanguage, toTibetanDigits } from '@/components/providers/language-provider';

interface MonthYearPickerProps {
  selectedMonth: number;
  selectedYear: number;
  onChange: (month: number, year: number) => void;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
}

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

export default function MonthYearPicker({
  selectedMonth,
  selectedYear,
  onChange,
  className = '',
  buttonClassName = '',
  placeholder,
}: MonthYearPickerProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedYear);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep picker year in sync with prop when selectedYear changes
  useEffect(() => {
    setPickerYear(selectedYear);
  }, [selectedYear]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPickerYear((prev) => prev - 1);
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPickerYear((prev) => prev + 1);
  };

  const handleMonthSelect = (month: number) => {
    onChange(month, pickerYear);
    setIsOpen(false);
  };

  const formatMonthYear = (month: number, year: number) => {
    if (language === 'bo') {
      return `ཕྱི་ཟླ་ ${toTibetanDigits(month)} པ་ལོ་ ${toTibetanDigits(year)}`;
    }
    return monthLabel(month, year);
  };

  const currentLabel = placeholder || formatMonthYear(selectedMonth, selectedYear);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 bg-white dark:bg-[#202020] hover:bg-slate-50 dark:hover:bg-[#272727] border border-slate-200 dark:border-[#323232] text-slate-900 dark:text-[#F5F5F5] rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20 dark:focus:ring-[#D7E8F4]/20 shadow-sm cursor-pointer ${buttonClassName || 'px-4 py-2.5 text-sm'
          }`}
      >
        <Calendar size={16} className="text-[#2E5A88] dark:text-[#D7E8F4]" />
        <span>{currentLabel}</span>
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 z-50 w-64 bg-white dark:bg-[#1C1C1C] border border-slate-100 dark:border-[#323232] rounded-2xl shadow-xl p-4 focus:outline-none"
          >
            {/* Year Selector Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-[#272727] pb-3">
              <button
                type="button"
                onClick={handlePrevYear}
                className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#272727] border border-slate-100 dark:border-[#272727] text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-bold text-slate-800 dark:text-[#F5F5F5] text-sm select-none">
                {language === 'bo' ? toTibetanDigits(pickerYear) : pickerYear}
              </span>
              <button
                type="button"
                onClick={handleNextYear}
                className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#272727] border border-slate-100 dark:border-[#272727] text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Months Grid */}
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((m) => {
                const isSelected = selectedMonth === m.value && selectedYear === pickerYear;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => handleMonthSelect(m.value)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${isSelected
                      ? 'bg-[#2E5A88] dark:bg-[#D7E8F4] text-white dark:text-[#1C1C1C] shadow-sm font-extrabold'
                      : 'hover:bg-slate-50 dark:hover:bg-[#272727] text-slate-600 dark:text-slate-400'
                      }`}
                  >
                    {language === 'bo' ? `ཟླ་བ་ ${toTibetanDigits(m.value)} ` : m.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
