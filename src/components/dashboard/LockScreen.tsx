"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface Props {
  isLocked: boolean;
  onUnlock: () => void;
}

export default function LockScreen({ isLocked, onUnlock }: Props) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);
  const CORRECT_PIN = typeof window !== 'undefined' ? (localStorage.getItem('vainilla_pin') || '1234') : '1234';

  const handleUnlock = () => {
    if (pin === CORRECT_PIN) {
      setError(false);
      setPin('');
      localStorage.setItem('vainilla_is_locked', 'false');
      onUnlock();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-[#2D2D2D]/95 backdrop-blur-xl flex flex-col items-center justify-center"
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#A68A64] rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#8E9B8E] rounded-full blur-[120px]" />
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative flex flex-col items-center gap-8"
          >
            <motion.div
              animate={error ? { x: [-8, 8, -8, 8, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={`w-24 h-24 rounded-[32px] flex items-center justify-center shadow-2xl ${error ? 'bg-red-500' : 'bg-[#A68A64]'} transition-colors`}
            >
              <Lock size={36} className="text-white" strokeWidth={1.5} />
            </motion.div>

            <div className="text-center flex flex-col items-center">
              <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/20 mb-3 shadow-xl">
                <img src="/logo%20vainilla%20y%20descanso.png" alt="Vainilla y Descanso" className="h-12 w-auto object-contain brightness-0 invert opacity-90" />
              </div>
              <p className="text-[11px] text-white/40 font-bold uppercase tracking-[0.3em]">Pantalla Bloqueada</p>
            </div>

            <div className="text-center">
              <ClockDisplay />
            </div>

            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
              <div className="relative w-full">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  placeholder="Ingresa tu PIN"
                  maxLength={8}
                  autoFocus
                  className={`w-full bg-white/10 border ${error ? 'border-red-400' : 'border-white/20'} rounded-2xl py-4 px-6 text-center text-white text-lg tracking-[0.5em] placeholder:text-white/30 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[#A68A64]/60 transition-all`}
                />
                <button
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-xs font-bold uppercase tracking-widest"
                >
                  PIN incorrecto. Inténtalo de nuevo.
                </motion.p>
              )}

              <button
                onClick={handleUnlock}
                className="w-full py-4 bg-[#A68A64] text-white rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-[#8E7554] transition-all shadow-xl shadow-[#A68A64]/30 active:scale-95"
              >
                Desbloquear
              </button>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">PIN por defecto: 1234</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ClockDisplay() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <p className="text-6xl font-heading font-light text-white/90 tabular-nums">
        {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-sm text-white/50 mt-2 capitalize">
        {now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </>
  );
}
