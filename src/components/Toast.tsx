"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const toast = {
  success: (msg: string) => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('app_toast', { detail: { msg, type: 'success' }}));
  },
  error: (msg: string) => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('app_toast', { detail: { msg, type: 'error' }}));
  },
  info: (msg: string) => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('app_toast', { detail: { msg, type: 'info' }}));
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const handler = (e: any) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, ...e.detail }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    window.addEventListener('app_toast', handler);
    return () => window.removeEventListener('app_toast', handler);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div 
            key={t.id} 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.8 }} 
            className={`px-5 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-semibold pointer-events-auto bg-white backdrop-blur-xl ${
              t.type === 'error' ? 'text-red-500 border-red-100 shadow-red-500/10' : 
              t.type === 'success' ? 'text-[#8E9B8E] border-[#8E9B8E]/30 shadow-[#8E9B8E]/10' : 
              'text-[#A68A64] border-[#E8E4D9] shadow-[#A68A64]/10'
            }`}
          >
            {t.type === 'error' && <AlertCircle size={18} />}
            {t.type === 'success' && <CheckCircle2 size={18} />}
            {t.type === 'info' && <Info size={18} />}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
