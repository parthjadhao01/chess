'use client';

import { SocketProvider } from "@/app/socket-provider";
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Users,
  Radio,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Crown,
  Activity,
  Bell,
  Search,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  {
    label: 'Play with AI Coach',
    href: '/ai-coach',
    icon: Brain,
    description: 'Train with Claude',
    badge: 'NEW',
  },
  {
    label: 'Play Online',
    href: '/play',
    icon: Users,
    description: 'Match with players',
    badge: null,
  },
  {
    label: 'Live Matches',
    href: '/live',
    icon: Radio,
    description: 'Watch & spectate',
    badge: 'LIVE',
  },
  {
    label: 'AI Analysis',
    href: '/analyze',
    icon: BarChart3,
    description: 'Review your games',
    badge: null,
  },
];

const bottomNavItems = [{ label: 'Settings', href: '/settings', icon: Settings }];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const currentLabel =
    navItems.find((item) => isActive(item.href))?.label ?? 'Overview';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-[#111] border-r border-[#222] flex flex-col transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-16'
        } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div
          className={`h-16 flex items-center border-b border-[#222] ${isSidebarOpen ? 'px-4' : 'px-3 justify-center'}`}
        >
          <Link href="/play" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center flex-shrink-0">
              <span className="text-[#0a0a0a] text-lg font-bold">♔</span>
            </div>
            {isSidebarOpen && (
              <span className="font-semibold tracking-tight text-sm">chess-ai</span>
            )}
          </Link>
          {isSidebarOpen && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden ml-auto text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="relative">
                  <item.icon
                    className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-white/30 group-hover:text-white/60'}`}
                  />
                  {item.badge === 'LIVE' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>

                {isSidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.badge === 'LIVE'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/20 truncate">{item.description}</p>
                  </div>
                )}

                {isSidebarOpen && active && (
                  <ChevronRight className="w-4 h-4 text-white/20" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-[#222] p-3 space-y-1">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive(item.href)
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}

          {/* Profile Section */}
          <div className="relative mt-2">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all ${
                isProfileOpen ? 'bg-white/5' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-[#0a0a0a]">PJ</span>
              </div>

              {isSidebarOpen && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-white truncate">Parth Jadhav</p>
                  <p className="text-xs text-white/30 truncate">parth@chess-ai.com</p>
                </div>
              )}

              {isSidebarOpen && (
                <ChevronRight
                  className={`w-4 h-4 text-white/20 transition-transform ${isProfileOpen ? 'rotate-90' : ''}`}
                />
              )}
            </button>

            <AnimatePresence>
              {isProfileOpen && isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-xl border border-[#222] bg-[#1a1a1a] shadow-xl"
                >
                  <div className="px-3 py-2 mb-2 border-b border-[#222]">
                    <p className="text-sm font-medium text-white">Parth Jadhav</p>
                    <p className="text-xs text-white/30">parth@chess-ai.com</p>
                  </div>

                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    Profile
                  </Link>

                  <button
                    onClick={() => console.log('Logging out...')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#222] border border-[#333] items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          <ChevronRight
            className={`w-3 h-3 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[#222] bg-[#0a0a0a]/80 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden md:flex items-center gap-2 text-sm text-white/30">
              <Link href="/play" className="hover:text-white transition-colors">
                Dashboard
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/60">{currentLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111] border border-[#222] text-sm text-white/30 hover:border-[#333] transition-colors">
              <Search className="w-4 h-4" />
              <span className="text-xs">Search...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-mono">⌘K</kbd>
            </div>

            <button className="relative p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
            </button>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111] border border-[#222]">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-white/60">1,240 online</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <SocketProvider>{children}</SocketProvider>
        </main>
      </div>
    </div>
  );
}
