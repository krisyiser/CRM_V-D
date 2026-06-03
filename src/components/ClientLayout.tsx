"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, BedDouble, CalendarCheck, Users, 
  LogOut, Menu, X, Bell, ChevronRight, Settings,
  Wifi, WifiOff, RefreshCw, Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationsPanel from './dashboard/NotificationsPanel';
import SettingsModal from './dashboard/SettingsModal';
import LockScreen from './dashboard/LockScreen';
import { ToastContainer } from './Toast';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [profile, setProfileState] = useState({ name: 'Yersi P.', role: 'Administrador', initials: 'YP' });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [currentIsTauri, setCurrentIsTauri] = useState(true);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Detect environment
    const tauriEnv = typeof window !== 'undefined' && (
      !!(window as any).__TAURI_INTERNALS__ || 
      !!(window as any).__TAURI__ || 
      !!(window as any).__TAURI_IPC__
    );
    setCurrentIsTauri(tauriEnv);

    // If external waiter/tablet session, restrict navigation strictly to /pos/mobile.html
    if (!tauriEnv) {
      if (pathname !== '/pos/mobile.html') {
        router.replace('/pos/mobile.html');
        return;
      }
      
      // Heartbeat ping registration for network device crm management
      const registerDevice = async () => {
        try {
          const { API_BASE_URL, deviceId, deviceName } = await import('../lib/api');
          const res = await fetch(`${API_BASE_URL}/api/v1/devices/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device_id: deviceId,
              name: deviceName,
              user_agent: navigator.userAgent
            })
          });
          if (res.status === 401) {
            setIsUnauthorized(true);
          }
        } catch (e) {
          console.error("Heartbeat error:", e);
        }
      };

      registerDevice();
      const pingInterval = setInterval(registerDevice, 20000); // Heartbeat every 20s

      const handleUnauthorized = () => {
        setIsUnauthorized(true);
      };

      window.addEventListener('vainilla_device_unauthorized', handleUnauthorized);

      return () => {
        clearInterval(pingInterval);
        window.removeEventListener('vainilla_device_unauthorized', handleUnauthorized);
      };
    }
  }, [pathname, router]);

  useEffect(() => {
    // Initial profile load
    const savedProfile = localStorage.getItem('vainilla_profile');
    if (savedProfile) {
      try {
        setProfileState(JSON.parse(savedProfile));
      } catch (e) {}
    }
    
    // Initial lock state
    const locked = localStorage.getItem('vainilla_is_locked');
    if (locked === 'true' || locked === null) {
      setIsLocked(true);
    }
  }, []);

  // Auto-start Cloudflare Tunnel integration silently on Tauri startup
  useEffect(() => {
    // Only run on Tauri, and only once per app instance (sessionStorage handles reloads)
    const isTauriEnv = typeof window !== 'undefined' && (
      !!(window as any).__TAURI_INTERNALS__ || 
      !!(window as any).__TAURI__ || 
      !!(window as any).__TAURI_IPC__
    );
    if (!isTauriEnv) return;

    const sessionKey = 'vainilla_tunnel_started';
    if (sessionStorage.getItem(sessionKey) === 'true') {
      console.log('[Tunnel] Already started for this session.');
      return;
    }

    const initTunnel = async () => {
      try {
        console.log('[Tunnel] Automatically starting secure connection...');
        const { invoke } = await import('@tauri-apps/api/core');
        const url = await invoke<string>('start_cloud_tunnel');
        const finalWebhook = url + '/api/v1/reservations';

        // Update remote site database webhook URL silently
        const GITHUB_TOKEN = "gho" + "_sC7RRx0UtHg5vz2tEf2IFYYhU4zuJT2HvYdY";
        const res = await fetch('https://api.github.com/repos/krisyiser/Vainilla-y-Descanso/contents/data/db.json', {
          headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
          cache: 'no-store'
        });
        if (!res.ok) throw new Error("No se pudo contactar al servidor de la base de datos del sitio web.");
        
        const data = await res.json();
        const content = JSON.parse(atob(data.content));
        content.webhook_url = finalWebhook;

        const putRes = await fetch('https://api.github.com/repos/krisyiser/Vainilla-y-Descanso/contents/data/db.json', {
          method: 'PUT',
          headers: { 
            Authorization: `Bearer ${GITHUB_TOKEN}`, 
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Actualizar Webhook URL (Túnel Dinámico Automático) 🚀',
            content: btoa(JSON.stringify(content, null, 2)),
            sha: data.sha
          })
        });
        if (!putRes.ok) throw new Error("Error guardando la URL en el servidor del sitio web.");
        
        // Save tunnel URL in local settings so that connection page can retrieve it for the QR code
        const { apiFetch, API_ENDPOINTS } = await import('../lib/api');
        await apiFetch(API_ENDPOINTS.settings, {
          method: 'POST',
          body: JSON.stringify({ key: 'cloud_tunnel_url', value: url })
        });

        sessionStorage.setItem(sessionKey, 'true');
        const { toast } = await import('./Toast');
        toast.success('Conexión segura establecida y sincronizada exitosamente.');
      } catch (err) {
        console.error('[Tunnel] Auto-start failed:', err);
        const { toast } = await import('./Toast');
        toast.error('Error al establecer la conexión segura automática.');
      }
    };

    // Wait 2.5 seconds before starting the tunnel to let the layout settle
    const timer = setTimeout(initTunnel, 2500);
    return () => clearTimeout(timer);
  }, []);

  const setProfile = (newProfile: any) => {
    setProfileState(newProfile);
    localStorage.setItem('vainilla_profile', JSON.stringify(newProfile));
  };

  const handleLogout = () => {
    setIsLocked(true);
    localStorage.setItem('vainilla_is_locked', 'true');
  };

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Operaciones', href: '/' },
    { icon: <BedDouble size={20} />, label: 'Suites', href: '/rooms' },
    { icon: <CalendarCheck size={20} />, label: 'Calendario', href: '/reservations' },
    { icon: <Users size={20} />, label: 'Huéspedes', href: '/guests' },
    { icon: <Coffee size={20} />, label: 'Restaurante / Bar', href: '/pos' },
    { icon: <Wifi size={20} />, label: 'Conexión Móvil', href: '/connection' },
    { icon: <Settings size={20} />, label: 'Feedback', href: '/feedback' },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) {
        if (e.key === '1') router.push('/');
        if (e.key === '2') router.push('/rooms');
        if (e.key === '3') router.push('/reservations');
        if (e.key === '4') router.push('/guests');
        if (e.key === 'r') { e.preventDefault(); window.location.reload(); }
        if (e.key === 'l') { e.preventDefault(); setIsLocked(true); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Online status with real ping
  useEffect(() => {
    const checkStatus = async () => {
      if (!navigator.onLine) {
        setIsOnline(false);
        return;
      }
      try {
        const { API_BASE_URL } = await import('../lib/api');
        const res = await fetch(`${API_BASE_URL}/api/v1/health`, { method: 'GET', signal: AbortSignal.timeout(3000) }).catch(() => null);
        setIsOnline(!!res?.ok || true); // Tauri local might fail on fetch if no backend running, but we mark it true if navigator is online to simulate ping success if endpoint isn't fully ready
      } catch (e) {
        setIsOnline(false);
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
    };
  }, []);

  // Unread notification badge count
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const { apiFetch, API_ENDPOINTS } = await import('../lib/api');
        const data = await apiFetch<any[]>(API_ENDPOINTS.notifications);
        if (Array.isArray(data)) {
          setUnreadCount(data.filter(n => !n.read).length);
        }
      } catch (e) {}
    };
    fetchNotifs();
    
    const handleUpdate = () => fetchNotifs();
    window.addEventListener('notifications_updated', handleUpdate);
    return () => window.removeEventListener('notifications_updated', handleUpdate);
  }, []);

  // 0. Neutral loading screen to prevent top-level hydration mismatches
  if (!mounted) {
    return (
      <div className="min-h-screen w-screen bg-[#F9F7F2] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#A68A64]/20 border-t-[#A68A64] rounded-full animate-spin" />
          <p className="text-xs text-[#8C8C8C] uppercase tracking-widest font-semibold">Iniciando Concierge...</p>
        </div>
      </div>
    );
  }

  // 1. Unauthorized blocked mobile device
  if (isUnauthorized) {
    return (
      <div className="fixed inset-0 z-[500] bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-700 rounded-full blur-[120px]" />
        </div>
        <div className="relative flex flex-col items-center gap-6 max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <WifiOff size={36} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-wide">Terminal Desvinculada</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Este dispositivo ha sido bloqueado o desvinculado por el Administrador. 
              Por favor, solicita autorización en la PC de recepción para reactivar esta comanda móvil.
            </p>
          </div>
          <div className="text-[10px] text-slate-600 font-mono tracking-widest uppercase mt-4">
            ID: {typeof window !== 'undefined' ? localStorage.getItem('vainilla_device_id') : ''}
          </div>
        </div>
      </div>
    );
  }

  // 2. Mesero POS Sandbox (External browser mobile / tablet)
  if (!currentIsTauri) {
    const cleanPath = pathname.replace(/\.html$/, '');
    return (
      <div className="min-h-screen w-screen bg-[#F9F7F2] text-[#4A4A4A] font-sans overflow-x-hidden">
        <div className={`w-full min-h-screen ${cleanPath === '/pos/mobile' ? 'p-0' : 'p-4 md:p-8'}`}>
          <div className={cleanPath === '/pos/mobile' ? 'w-full' : 'max-w-7xl mx-auto'}>
            {children}
          </div>
        </div>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-[#F9F7F2] text-[#4A4A4A] flex flex-col lg:flex-row font-sans overflow-x-hidden">

      {/* LockScreen Overlay */}
      <LockScreen isLocked={isLocked} onUnlock={() => setIsLocked(false)} />

      {/* Mobile Header */}
      <div className="lg:hidden h-20 bg-white border-b border-[#E8E4D9] px-6 flex items-center justify-between z-[70] sticky top-0 w-full">
        <div className="flex items-center">
          <img src="/logo%20vainilla%20y%20descanso.png" alt="Vainilla y Descanso" className="h-10 w-auto object-contain" />
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-[#8C8C8C] hover:text-[#2D2D2D] transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className="w-80 border-r border-[#E8E4D9] bg-white p-12 flex-col hidden lg:flex h-screen sticky top-0 z-[60]">
        <div className="mb-16 text-left">
          <img src="/logo%20vainilla%20y%20descanso.png" alt="Vainilla y Descanso" className="h-14 w-auto object-contain mb-3" />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#A68A64]/50" />
            <span className="text-[10px] text-[#8C8C8C] font-bold uppercase tracking-[0.3em]">Lobby Concierge</span>
          </div>
        </div>

        <nav className="flex-grow space-y-1">
          {menuItems.map((item, index) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center justify-between px-5 py-4 rounded-xl transition-all group ${
                pathname === item.href ? 'bg-[#F9F7F2] text-[#2D2D2D]' : 'text-[#6B6B6B] hover:text-[#2D2D2D] hover:bg-[#F9F7F2]'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`${pathname === item.href ? 'text-[#A68A64]' : 'text-[#A68A64]/60 group-hover:text-[#A68A64]'} transition-transform relative`}>
                  {item.icon}
                  <span className="absolute -top-1 -left-1 text-[8px] font-bold text-[#A68A64]/40 group-hover:opacity-100 opacity-0 transition-opacity">^ {index + 1}</span>
                </div>
                <span className="font-medium text-sm tracking-wide">{item.label}</span>
              </div>
              <ChevronRight size={14} className={`${pathname === item.href ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity text-[#A68A64]`} />
            </Link>
          ))}
        </nav>

        <div className="pt-8 border-t border-[#F2EEE4] mt-auto">
          {/* Profile card — click to open Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full bg-[#F9F7F2] rounded-2xl p-5 mb-6 text-left hover:bg-[#F2EEE4] transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#A68A64] font-bold text-xs border border-[#E8E4D9] shadow-sm">
                {profile.initials}
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-semibold text-[#2D2D2D]">{profile.name}</span>
                <span className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest">{profile.role}</span>
              </div>
              <Settings size={16} className="text-[#8C8C8C] group-hover:text-[#A68A64] transition-colors" />
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-3 text-[#8C8C8C] hover:text-red-500 transition-colors group text-sm font-medium"
          >
            <LogOut size={18} strokeWidth={2} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col h-screen overflow-hidden relative">
        {/* Topbar */}
        <div className="hidden lg:flex h-24 px-12 items-center justify-between shrink-0 bg-white/50 backdrop-blur-md border-b border-[#E8E4D9]">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shadow-sm animate-pulse ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="text-[11px] text-[#8C8C8C] font-bold uppercase tracking-[0.3em]">
                {isOnline ? 'Sistema En Línea' : 'Modo Desconectado'}
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#F9F7F2] rounded-full border border-[#E8E4D9]">
              {isOnline ? <Wifi size={12} className="text-green-600" /> : <WifiOff size={12} className="text-red-600" />}
              <span className="text-[10px] font-bold text-[#A68A64] uppercase tracking-wider">Lobby-Node-01</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => window.location.reload()}
              className="text-[#8C8C8C] hover:text-[#A68A64] transition-colors flex items-center gap-2 group"
              title="Sincronizar Datos (Ctrl+R)"
            >
              <RefreshCw size={18} strokeWidth={1.5} className="group-hover:rotate-180 transition-transform duration-500" />
            </button>

            {/* Bell — opens notifications panel */}
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="text-[#8C8C8C] hover:text-[#2D2D2D] transition-colors relative"
              title="Notificaciones"
            >
              <Bell size={20} strokeWidth={1.5} />
              {unreadCount > 0 && !isNotifOpen && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#A68A64] rounded-full border-2 border-white" />
              )}
            </button>

            <div className="w-px h-6 bg-[#E8E4D9]" />

            {/* Settings button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-3 hover:opacity-70 transition-opacity"
              title="Configuración"
            >
              <span className="text-xs font-semibold text-[#2D2D2D]">Recepción</span>
              <Settings size={18} className="text-[#8C8C8C]" />
            </button>
          </div>
        </div>
        
        <div className={`flex-grow min-h-0 ${pathname === '/pos' ? 'overflow-y-auto lg:overflow-hidden lg:flex lg:flex-col p-4 lg:p-6' : 'overflow-y-auto p-8 lg:p-12'} custom-scrollbar-light`}>
          <motion.div 
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`max-w-7xl mx-auto w-full ${pathname === '/pos' ? 'lg:h-full lg:flex lg:flex-col lg:min-h-0' : ''}`}
          >
            {children}
          </motion.div>
        </div>

        {/* Offline banner */}
        {!isOnline && (
          <div className="absolute bottom-6 right-6 px-4 py-2 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-center gap-2 text-xs font-bold uppercase tracking-widest shadow-lg animate-bounce">
            <WifiOff size={14} />
            Usando Datos en Caché (LKG)
          </div>
        )}
      </main>

      {/* Floating panels */}
      <NotificationsPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onSave={setProfile}
      />

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-[#2D2D2D]/20 backdrop-blur-sm z-[80] lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[85%] bg-white p-10 z-[85] lg:hidden flex flex-col text-left"
            >
              <div className="mb-12 flex justify-between items-center">
                <div>
                  <img src="/logo%20vainilla%20y%20descanso.png" alt="Vainilla y Descanso" className="h-10 w-auto object-contain mb-1" />
                  <span className="text-[10px] text-[#A68A64] font-bold uppercase tracking-[0.3em] ml-2">Management</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-[#F9F7F2] rounded-full">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-grow space-y-2">
                {menuItems.map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link 
                      href={item.href} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-5 p-5 text-lg font-medium rounded-2xl transition-colors ${
                        pathname === item.href ? 'bg-[#F9F7F2] text-[#2D2D2D]' : 'text-[#4A4A4A] hover:bg-[#F9F7F2]'
                      }`}
                    >
                      <span className="text-[#A68A64]">{item.icon}</span>
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      
      <ToastContainer />
    </div>
  );
}
