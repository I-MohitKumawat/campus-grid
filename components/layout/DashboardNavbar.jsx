'use client';

/**
 * components/layout/DashboardNavbar.jsx
 *
 * Premium dashboard top navigation bar for CampusGrid.
 * Matches the capsule navigation layout design.
 * Excludes the search option as requested.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Search, 
  Terminal, 
  ClipboardCheck, 
  Tv, 
  Calendar, 
  Users, 
  ChevronDown,
  LogOut,
  User,
  Settings
} from 'lucide-react';

export default function DashboardNavbar({ user, onLogout }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Capsule Navigation Items
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Explore', href: '/dashboard/explore', icon: Search },
    { name: 'Projects', href: '/dashboard/projects', icon: Terminal },
    { name: 'Tasks', href: '/dashboard/tasks', icon: ClipboardCheck },
    { name: 'Rooms', href: '/dashboard/rooms', icon: Tv },
    { name: 'Events', href: '/dashboard/events', icon: Calendar },
    { name: 'Clubs', href: '/dashboard/clubs', icon: Users },
  ];

  return (
    <header className="w-full bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 h-20 border-b border-zinc-900/60 flex items-center justify-between">
      {/* 1. Left Section: Logo */}
      <Link href="/" className="flex items-center gap-2.5 group shrink-0">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-accent to-violet-500 shadow-md shadow-accent/25 transition-all duration-300 group-hover:scale-105">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </div>
        <span className="font-display text-xl font-bold tracking-tight text-white">
          Campus<span className="bg-gradient-to-r from-accent to-violet-500 bg-clip-text text-transparent">Grid</span>
        </span>
      </Link>

      {/* 2. Center Section: Glassmorphic Capsule Menu */}
      <nav className="hidden lg:flex items-center rounded-full border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md p-1.5 shadow-inner">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            // The item is active if the current pathname matches its href
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20 shadow-md shadow-violet-500/5'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850/50 border border-transparent'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-violet-400' : 'text-zinc-400 group-hover:text-white'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 3. Right Section: Profile Dropdown Capsule */}
      <div className="relative shrink-0">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 rounded-full border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all p-1.5 pl-1.5 pr-4 cursor-pointer outline-none select-none text-left"
        >
          {/* User Avatar */}
          <div className="relative h-8 w-8 rounded-full overflow-hidden border border-zinc-700 bg-zinc-800 shadow-inner shrink-0">
            {/* If username starts with 'arjun', use arjun dev portrait */}
            {user?.username === 'arjun' ? (
              <img 
                src="/images/arjun.png" 
                alt="Arjun Dev" 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center font-bold text-xs text-white uppercase bg-gradient-to-tr from-accent to-violet-500">
                {user?.username?.charAt(0) || 'U'}
              </div>
            )}
          </div>

          {/* User Text Details */}
          <div className="hidden sm:flex flex-col pr-1">
            <span className="text-xs font-bold text-zinc-100 tracking-wide">
              {user?.username === 'arjun' ? 'Arjun Dev' : user?.full_name || user?.username || 'User Profile'}
            </span>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-0.5">
              {user?.role || 'Student'}
            </span>
          </div>

          <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <>
            {/* Click-outside backdrop overlay */}
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setDropdownOpen(false)}
            />
            
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl p-2 shadow-2xl z-40 animate-scaleUp">
              <div className="px-3 py-2 border-b border-zinc-800/60 mb-1">
                <p className="text-xs text-zinc-500">Signed in as</p>
                <p className="text-xs font-bold text-zinc-200 truncate mt-0.5">{user?.email || 'user@college.ac.in'}</p>
              </div>

              <Link
                href="/dashboard/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </Link>

              <Link
                href="/dashboard/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-350 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer mt-1"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
