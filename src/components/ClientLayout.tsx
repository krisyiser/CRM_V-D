"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BedDouble, CalendarDays, Users,
  UtensilsCrossed, MessageSquare, Settings, Bell,
  ChevronLeft, LogOut, Loader2, Monitor, Smartphone, Tablet
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/types';
import { apiFetch, API } from '@/lib/api';
import { useDeviceType } from '@/hooks/useDeviceType';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  shortcut: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'ops',    label: 'Operaciones',   path: '/',              icon: <LayoutDashboard size={20} />, shortcut: '1' },
  { id: 'rooms',  label: 'Suites',        path: '/rooms',         icon: <BedDouble size={20} />,       shortcut: '2' },
  { id: 'cal',    label: 'Calendario',    path: '/reservations',  icon: <CalendarDays size={20} />,    shortcut: '3' },
  { id: 'guests', label: 'Huéspedes',     path: '/guests',        icon: <Users size={20} />,           shortcut: '4' },
  { id: 'pos',    label: 'Punto de Venta', path: '/pos',          icon: <UtensilsCrossed size={20} />, shortcut: '5' },
  { id: 'feed',   label: 'Feedback',      path: '/feedback',      icon: <MessageSquare size={20} />,   shortcut: '6' },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const device = useDeviceType();

  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', role: 'Administrador', initials: 'VD' });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ready, setReady] = useState(false);



  // Auto-collapse sidebar on Tablet devices
  useEffect(() => {
    if (device.isTablet) {
      setCollapsed(true);
    }
  }, [device.isTablet]);

  // Fetch user session & strictly enforce authentication and RBAC
  useEffect(() => {
    if (pathname === '/login') {
      setReady(true);
      return;
    }

    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          const user = data.user;
          const role = user.role || 'Administrador';

          // RBAC client-side route guard: Recepción role cannot access /guests, /rooms, /feedback
          if (role === 'Recepción' && ['/guests', '/rooms', '/feedback'].some(p => pathname === p || pathname.startsWith(`${p}/`))) {
            router.replace('/');
            return;
          }

          setProfile({
            name: user.name || user.username || 'Admin',
            email: user.email || '',
            role,
            initials: user.initials || 'AD'
          });
          setReady(true);
        } else {
          // STRICT REDIRECT: User has no valid session -> FORCE /login
          window.location.href = '/login';
        }
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, [pathname, router]);

  // Filter NAV_ITEMS based on user role
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (profile.role === 'Recepción') {
      return ['/', '/reservations', '/pos'].includes(item.path);
    }
    return true;
  });

  const loadNotifications = useCallback(() => {
    apiFetch<Notification[]>(API.notifications)
      .then(data => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Fetch notifications
  useEffect(() => {
    loadNotifications();
    window.addEventListener('notifications_updated', loadNotifications);
    return () => window.removeEventListener('notifications_updated', loadNotifications);
  }, [loadNotifications]);

  const unread = notifications.filter(n => !n.read).length;

  // Keyboard shortcuts (active when on PC Desktop)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const item = visibleNavItems.find(n => n.shortcut === e.key);
        if (item) {
          e.preventDefault();
          router.push(item.path);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router, visibleNavItems]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  }, []);


  // Login page renders standalone (no sidebar shell) - Render immediately with zero delay
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center">
        <Loader2 size={32} className="text-[#A68A64] animate-spin" />
      </div>
    );
  }


  return (
    <div className="flex h-screen bg-[#F9F7F2] overflow-hidden">
      {/* Sidebar for PC Desktop & Tablet */}
      {!device.isMobile && (
        <motion.aside
          animate={{ width: collapsed ? 80 : 280 }}
          transition={{ type: 'spring', damping: 28, stiffness: 200 }}
          className="bg-white border-r border-[#E8E4D9] flex flex-col shrink-0 z-30 relative"
        >
          {/* Brand */}
          <div className="p-6 border-b border-[#E8E4D9] flex items-center gap-3 min-h-[80px]">
            <div className="w-10 h-10 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-[#A68A64]/20 shrink-0">
              V&D
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="overflow-hidden text-left"
                >
                  <h1 className="text-sm font-semibold text-[#2D2D2D] whitespace-nowrap">Vainilla & Descanso</h1>
                  <p className="text-[9px] text-[#A68A64] font-bold uppercase tracking-widest">
                    {profile.role === 'Recepción' ? 'Recepción & POS' : 'Lobby Concierge'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar-light">
            {visibleNavItems.map(item => {
              const active = pathname === item.path;
              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.path)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95 ${
                    active
                      ? 'bg-[#A68A64] text-white shadow-lg shadow-[#A68A64]/20'
                      : 'text-[#8C8C8C] hover:bg-[#F9F7F2] hover:text-[#2D2D2D]'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </nav>


          {/* Bottom Controls */}
          <div className="p-3 border-t border-[#E8E4D9] space-y-1">
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[#8C8C8C] hover:bg-[#F9F7F2] hover:text-[#2D2D2D] transition-all"
              title={collapsed ? 'Configuración' : undefined}
            >
              <Settings size={20} className="shrink-0" />
              {!collapsed && <span>Configuración</span>}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-[#8C8C8C] hover:bg-red-50 hover:text-red-500 transition-all"
              title={collapsed ? 'Cerrar Sesión' : undefined}
            >
              <LogOut size={20} className="shrink-0" />
              {!collapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-[#E8E4D9] rounded-full flex items-center justify-center text-[#8C8C8C] hover:text-[#2D2D2D] shadow-sm transition-colors z-40"
          >
            <ChevronLeft size={12} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </motion.aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
        {/* Top Header with Device Indicator Badge */}
        <header className="h-[64px] md:h-[72px] bg-white border-b border-[#E8E4D9] px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {device.isMobile && (
              <div className="w-8 h-8 rounded-xl bg-[#A68A64] flex items-center justify-center text-white font-bold text-xs shadow-md">
                V&D
              </div>
            )}

            {/* Dynamic Device Mode Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F9F7F2] border border-[#E8E4D9] rounded-xl text-[10px] font-bold text-[#A68A64] uppercase tracking-wider">
              {device.isDesktop ? (
                <>
                  <Monitor size={12} /> Mode: PC Desktop
                </>
              ) : device.isTablet ? (
                <>
                  <Tablet size={12} /> Mode: Tablet Touch
                </>
              ) : (
                <>
                  <Smartphone size={12} /> Mode: Mobile App
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Notifications Bell */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl text-[#8C8C8C] hover:bg-[#F9F7F2] hover:text-[#2D2D2D] transition-colors active:scale-95"
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>

            {/* Profile */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowSettings(true)}>
              <div className="w-9 h-9 rounded-xl bg-[#A68A64] flex items-center justify-center text-white text-xs font-bold shadow-md shadow-[#A68A64]/20">
                {profile.initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-[#2D2D2D]">{profile.name}</p>
                <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest">{profile.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar-light">
          {children}
        </div>
      </main>

      {/* Mobile & Tablet Fixed Bottom Touch Bar */}
      {device.isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-[#E8E4D9] z-50 flex items-center justify-around px-1 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          {visibleNavItems.map(item => {
            const active = pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center justify-center flex-1 h-12 rounded-xl transition-all active:scale-90 px-0.5 ${
                  active ? 'text-[#A68A64] font-bold' : 'text-[#8C8C8C]'
                }`}
              >
                <span className={`transition-transform ${active ? 'scale-110' : ''}`}>{item.icon}</span>
                <span className="text-[8px] sm:text-[9px] font-bold tracking-tight mt-0.5 truncate max-w-full">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}



      {/* Modals & Panels */}
      {showNotifications && (
        <NotificationsPanelWrapper
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {showSettings && (
        <SettingsModalWrapper
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          profile={profile}
          onSave={(p) => setProfile(prev => ({ ...prev, ...p }))}
        />
      )}
    </div>
  );
}

function NotificationsPanelWrapper(props: { isOpen: boolean; onClose: () => void }) {
  const [Mod, setMod] = useState<React.ComponentType<{ isOpen: boolean; onClose: () => void }> | null>(null);

  useEffect(() => {
    import('./dashboard/NotificationsPanel').then(m => setMod(() => m.default));
  }, []);

  if (!Mod) return null;
  return <Mod isOpen={props.isOpen} onClose={props.onClose} />;
}

function SettingsModalWrapper(props: {
  isOpen: boolean;
  onClose: () => void;
  profile: { name: string; initials: string };
  onSave: (p: { name: string; role: string; initials: string }) => void;
}) {
  const [Mod, setMod] = useState<React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
    profile: { name: string; role: string; initials: string };
    onSave: (p: { name: string; role: string; initials: string }) => void;
  }> | null>(null);

  useEffect(() => {
    import('./dashboard/SettingsModal').then(m => setMod(() => m.default));
  }, []);

  if (!Mod) return null;
  return <Mod isOpen={props.isOpen} onClose={props.onClose} profile={{ ...props.profile, role: 'Administrador' }} onSave={props.onSave} />;
}
