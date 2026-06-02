"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, BedDouble, CalendarCheck, LogIn, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

import { API_ENDPOINTS, apiFetch } from '../../lib/api';

const iconMap: Record<string, React.ReactNode> = {
  checkin: <LogIn size={16} />,
  checkout: <BedDouble size={16} />,
  alert: <AlertTriangle size={16} />,
  ok: <CheckCircle2 size={16} />,
  info: <CheckCircle2 size={16} />,
};

const colorMap: Record<string, string> = {
  checkin: 'bg-[#A68A64]/10 text-[#A68A64]',
  checkout: 'bg-[#C2A88D]/10 text-[#C2A88D]',
  alert: 'bg-red-50 text-red-400',
  ok: 'bg-[#8E9B8E]/10 text-[#8E9B8E]',
  info: 'bg-blue-50 text-blue-400',
};

export default function NotificationsPanel({ isOpen, onClose }: Props) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (isOpen) {
      const loadNotifications = async () => {
        setLoading(true);
        try {
          const data = await apiFetch<any[]>(API_ENDPOINTS.notifications);
          setNotifications(data);
        } catch (error) {
          console.error("Error loading notifications:", error);
        } finally {
          setLoading(false);
        }
      };
      loadNotifications();
    }
  }, [isOpen]);

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    window.dispatchEvent(new Event('notifications_updated'));
    try {
      await apiFetch(API_ENDPOINTS.notifications, { method: 'PATCH', body: JSON.stringify({ action: 'mark_all_read' }) });
    } catch (e) {
      console.error(e);
    }
  };
  
  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    window.dispatchEvent(new Event('notifications_updated'));
    try {
      await apiFetch(API_ENDPOINTS.notifications, { method: 'PATCH', body: JSON.stringify({ id, read: true }) });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110]"
          />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed top-28 right-12 z-[120] w-[400px] bg-white rounded-[28px] border border-[#E8E4D9] shadow-2xl shadow-[#A68A64]/10 overflow-hidden"
          >
            <div className="p-6 border-b border-[#F2EEE4] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#A68A64] flex items-center justify-center text-white shadow-lg shadow-[#A68A64]/20">
                  <Bell size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2D2D2D]">Notificaciones</p>
                  {unreadCount > 0 && (
                    <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest">{unreadCount} sin leer</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-[#8C8C8C] font-bold uppercase tracking-widest transition-colors"
                  >
                    Marcar leídas
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[#F9F7F2] flex items-center justify-center text-[#8C8C8C] hover:text-red-400 transition-colors border border-[#E8E4D9]"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[420px] custom-scrollbar-light divide-y divide-[#F2EEE4]">
              {loading ? (
                <div className="p-8 text-center text-[#8C8C8C] text-xs">Cargando notificaciones...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-[#8C8C8C] text-xs">No hay notificaciones nuevas</div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={`flex gap-4 p-5 cursor-pointer transition-colors hover:bg-[#F9F7F2] ${!notif.read ? 'bg-[#A68A64]/5' : ''}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${colorMap[notif.type] || colorMap.info}`}>
                      {iconMap[notif.type] || iconMap.info}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${!notif.read ? 'text-[#2D2D2D]' : 'text-[#6B6B6B]'}`}>{notif.title}</p>
                        {!notif.read && <span className="w-2 h-2 rounded-full bg-[#A68A64] shrink-0" />}
                      </div>
                      <p className="text-xs text-[#8C8C8C] mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-2">{notif.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[#F2EEE4] bg-[#F9F7F2] text-center">
              <p className="text-[10px] text-[#8C8C8C] font-bold uppercase tracking-widest">
                Central de Mensajería Vainilla
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
