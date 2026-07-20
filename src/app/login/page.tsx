"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, KeyRound, Loader2, ShieldCheck, Delete } from 'lucide-react';


export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Código o usuario incorrecto.');
        return;
      }

      window.location.href = '/';
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (code.length < 6) {
      setCode(prev => prev + digit);
    }
  };

  const handleKeypadDelete = () => {
    setCode(prev => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-[#2D2D2D] flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-y-auto select-none py-6">
      {/* Ambient glow background */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-[#A68A64] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-80 h-64 sm:h-80 bg-[#8E9B8E] rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-sm sm:max-w-md my-auto"
      >
        {/* Brand Header */}
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-flex bg-white/10 p-3 sm:p-4 rounded-2xl sm:rounded-3xl backdrop-blur-md border border-white/20 mb-2 sm:mb-3 shadow-xl">
            <img
              src="/logo%20vainilla%20y%20descanso.png"
              alt="Vainilla y Descanso"
              className="h-9 sm:h-12 w-auto object-contain brightness-0 invert opacity-95"
            />
          </div>
          <p className="text-[9px] sm:text-[10px] text-[#A68A64] font-bold uppercase tracking-[0.25em]">
            Lobby Concierge & POS — CRM Hotelero
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-[28px] sm:rounded-[36px] p-4 sm:p-7 shadow-2xl text-left">
          <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#A68A64] flex items-center justify-center text-white shadow-md">
              <ShieldCheck size={18} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white leading-tight">Acceso al Sistema</h1>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                Identificación de Usuario & PIN
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
            {/* Quick User Selector Pills */}
            <div>
              <label className="text-[8px] sm:text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1 block">
                Seleccionar Usuario
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setUsername('admin')}
                  className={`py-2 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold transition-all border flex items-center justify-center gap-1.5 active:scale-95 ${
                    username === 'admin'
                      ? 'bg-[#A68A64] border-[#A68A64] text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <User size={13} /> Admin
                </button>
                <button
                  type="button"
                  onClick={() => setUsername('recepcion')}
                  className={`py-2 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold transition-all border flex items-center justify-center gap-1.5 active:scale-95 ${
                    username === 'recepcion'
                      ? 'bg-[#A68A64] border-[#A68A64] text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <User size={13} /> Recepción
                </button>
              </div>
            </div>

            {/* Username Field */}
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Usuario o Correo..."
                required
                className="w-full bg-white/10 border border-white/10 rounded-xl sm:rounded-2xl py-2.5 pl-10 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A68A64]/60 transition-all font-medium"
              />
            </div>

            {/* PIN Code / Password Field */}
            <div>
              <label className="text-[8px] sm:text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1 block">
                Código de Acceso / PIN
              </label>
              <div className="relative">
                <KeyRound size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="password"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="PIN..."
                  required
                  maxLength={10}
                  className="w-full bg-white/10 border border-white/10 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-10 pr-3 text-center tracking-[0.3em] font-mono text-sm sm:text-base text-white placeholder:text-white/20 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[#A68A64]/60 transition-all"
                />
              </div>
            </div>

            {/* Touch Keypad Grid - Optimized compact heights for mobile */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-0.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="py-2.5 sm:py-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl sm:rounded-2xl font-mono text-base sm:text-lg font-bold text-white transition-all active:scale-95 shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCode('')}
                className="py-2.5 sm:py-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl sm:rounded-2xl font-bold text-[9px] sm:text-[10px] uppercase text-white/50 hover:text-white transition-all active:scale-95"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-2.5 sm:py-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl sm:rounded-2xl font-mono text-base sm:text-lg font-bold text-white transition-all active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadDelete}
                className="py-2.5 sm:py-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl sm:rounded-2xl text-white/50 hover:text-white flex items-center justify-center transition-all active:scale-95"
              >
                <Delete size={16} />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 font-medium text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !code}
              className="w-full py-3 sm:py-3.5 bg-[#A68A64] text-white rounded-xl sm:rounded-2xl text-xs font-bold tracking-widest uppercase hover:bg-[#8F7554] transition-all shadow-lg shadow-[#A68A64]/30 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[9px] sm:text-[10px] text-white/30 mt-3 sm:mt-5 font-bold uppercase tracking-widest">
          PIN por defecto: Admin (1234) | Recepción (4321)
        </p>
      </motion.div>
    </div>
  );
}
