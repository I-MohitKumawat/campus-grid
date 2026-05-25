'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function FloatingIcon({
  icon: Icon,
  className = '',
  color = 'blue',
}) {
  // Color theme maps with premium colored shadows in light mode & glow in dark mode
  const colorClasses = {
    blue: 'bg-blue-50/80 border-blue-200/50 text-blue-600 shadow-[0_8px_20px_rgba(59,130,246,0.12)] hover:shadow-[0_12px_28px_rgba(59,130,246,0.22)] dark:bg-blue-950/35 dark:border-blue-500/30 dark:text-blue-400 dark:shadow-[0_0_15px_rgba(59,130,246,0.12)]',
    purple: 'bg-purple-50/80 border-purple-200/50 text-purple-600 shadow-[0_8px_20px_rgba(168,85,247,0.12)] hover:shadow-[0_12px_28px_rgba(168,85,247,0.22)] dark:bg-purple-950/35 dark:border-purple-500/30 dark:text-purple-400 dark:shadow-[0_0_15px_rgba(168,85,247,0.12)]',
    orange: 'bg-amber-50/80 border-amber-200/50 text-amber-600 shadow-[0_8px_20px_rgba(245,158,11,0.12)] hover:shadow-[0_12px_28px_rgba(245,158,11,0.22)] dark:bg-amber-950/35 dark:border-amber-500/30 dark:text-amber-400 dark:shadow-[0_0_15px_rgba(245,158,11,0.12)]',
    green: 'bg-emerald-50/80 border-emerald-200/50 text-emerald-600 shadow-[0_8px_20px_rgba(16,185,129,0.12)] hover:shadow-[0_12px_28px_rgba(16,185,129,0.22)] dark:bg-emerald-950/35 dark:border-emerald-500/30 dark:text-emerald-400 dark:shadow-[0_0_15px_rgba(16,185,129,0.12)]',
  };

  const selectedColorClass = colorClasses[color] || colorClasses.blue;

  return (
    <motion.div
      whileHover={{ scale: 1.15 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      className={`absolute flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition-[background-color,border-color,text-color,box-shadow] duration-300 cursor-pointer ${selectedColorClass} ${className}`}
    >
      {Icon && <Icon className="h-5 w-5" />}
    </motion.div>
  );
}
