'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Users2, 
  Landmark, 
  Trophy, 
  Target 
} from 'lucide-react';
import FloatingIcon from './FloatingIcon';

// Custom SVG Github icon to bypass missing lucide-react brand icons in locked mirror environment
const Github = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export default function ProfileCard({ animated = true }) {
  const shouldAnimate = animated;

  return (
    <div className="relative flex items-center justify-center h-[520px] w-full max-w-[500px] mx-auto overflow-visible select-none">
      
      {/* Background Subtle Gradient Glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03),transparent_70%)] pointer-events-none" />

      {/* Main Developer Profile Card */}
      <motion.div
        whileHover={shouldAnimate ? { scale: 1.02 } : {}}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative w-full max-w-[340px] rounded-[30px] border border-zinc-200 bg-white p-3.5 shadow-[0_15px_40px_rgba(79,70,229,0.07),0_3px_12px_rgba(79,70,229,0.03)] transition-[background-color,border-color,box-shadow] duration-300 hover:shadow-[0_30px_60px_rgba(79,70,229,0.18)] hover:border-accent/30 dark:border-zinc-800/80 dark:bg-gradient-to-b dark:from-zinc-950 dark:to-zinc-900 dark:backdrop-blur-md dark:shadow-[0_0_30px_rgba(124,58,237,0.06)] dark:hover:shadow-[0_0_40px_rgba(124,58,237,0.15)] overflow-visible group z-0"
      >
        {/* Top: Large Portrait-Style Image Slot */}
        <div className="relative w-full h-[270px] rounded-[22px] overflow-hidden flex flex-col justify-center items-center border border-zinc-200/50 dark:border-zinc-800/40 shadow-inner">
          <img 
            src="/images/arjun.png" 
            alt="Arjun Dev" 
            className="w-full h-full object-cover"
          />

          {/* Bottom Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />
        </div>

        {/* Middle: Name & Role Title with Small Verified Icon */}
        <div className="mt-5 px-2 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-2xl font-extrabold tracking-tight text-brand dark:text-zinc-50 leading-none">
              Arjun Dev
            </h3>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shrink-0 shadow-sm" title="Verified Student">
              <Check className="h-3 w-3 stroke-[4.5]" />
            </div>
          </div>
          <p className="text-xs font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
            Full Stack Developer
          </p>
        </div>

        {/* Bottom Section: Skills */}
        <div className="mt-5 px-2 border-t border-zinc-100/10 pt-4 dark:border-zinc-800/40">
          <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
            Skills
          </p>
          <div className="flex items-center gap-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
              <Github className="h-4.5 w-4.5" />
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-xs font-extrabold text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 font-mono">
              js
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-xs font-extrabold text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 font-mono">
              ts
            </span>
            <span className="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold bg-zinc-100 text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
              More
            </span>
          </div>
        </div>

      </motion.div>

      {/* Orbiting Floating Icons */}
      <FloatingIcon
        icon={Users2}
        className="top-12 left-10 z-10"
        color="blue"
        animated={shouldAnimate}
      />
      <FloatingIcon
        icon={Landmark}
        className="top-28 right-8 z-10"
        color="purple"
        animated={shouldAnimate}
      />
      <FloatingIcon
        icon={Trophy}
        className="top-56 left-12 z-10"
        color="orange"
        animated={shouldAnimate}
      />
      <FloatingIcon
        icon={Target}
        className="bottom-20 right-10 z-10"
        color="green"
        animated={shouldAnimate}
      />
    </div>
  );
}
