"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, KeyRound, Loader2, ShieldCheck, Delete } from 'lucide-react';

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
    <div className="min-h-screen bg-[#2D2D2D] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Ambient glow background */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#A68A64] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#8E9B8E] rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/20 mb-3 shadow-2xl">
            <img
              src="/logo%20vainilla%20y%20descanso.png"
              alt="Vainilla y Descanso"
              className="h-12 w-auto object-contain brightness-0 invert opacity-95"
            />
          </div>
          <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-[0.3em]">
            Lobby Concierge & POS — CRM Hotelero
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-[36px] p-6 sm:p-8 shadow-2xl text-left">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white shadow-lg shadow-[#A68A64]/20">
              <ShieldCheck size={20} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Acceso al Sistema</h1>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                Identificación de Usuario & PIN
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Quick User Selector Pills */}
            <div>
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1.5 block">
                Seleccionar Usuario
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUsername('admin')}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                    username === 'admin'
                      ? 'bg-[#A68A64] border-[#A68A64] text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <User size={14} /> Administrador
                </button>
                <button
                  type="button"
                  onClick={() => setUsername('recepcion')}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                    username === 'recepcion'
                      ? 'bg-[#A68A64] border-[#A68A64] text-white shadow-lg'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <User size={14} /> Recepción
                </button>
              </div>
            </div>

            {/* Custom Username Input if needed */}
            <div className="relative">
              <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Usuario o Correo..."
                required
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A68A64]/60 transition-all font-medium"
              />
            </div>

            {/* PIN Code / Password Field */}
            <div>
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1.5 block">
                Código de Acceso / PIN
              </label>
              <div className="relative">
                <KeyRound size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="password"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Introduce tu PIN..."
                  required
                  maxLength={10}
                  className="w-full bg-white/10 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-center tracking-[0.4em] font-mono text-base text-white placeholder:text-white/20 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-[#A68A64]/60 transition-all"
                />
              </div>
            </div>

            {/* Touch Keypad for Tablet & Mobile Quick Access */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="py-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl font-mono text-lg font-bold text-white transition-all active:scale-95 shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCode('')}
                className="py-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl font-bold text-[10px] uppercase text-white/50 hover:text-white transition-all active:scale-95"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="py-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl font-mono text-lg font-bold text-white transition-all active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleKeypadDelete}
                className="py-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl text-white/50 hover:text-white flex items-center justify-center transition-all active:scale-95"
              >
                <Delete size={18} />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 font-medium text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !code}
              className="w-full py-3.5 bg-[#A68A64] text-white rounded-2xl text-xs font-bold tracking-widest uppercase hover:bg-[#8F7554] transition-all shadow-xl shadow-[#A68A64]/30 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Validando PIN...</span>
                </>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-white/30 mt-5 font-bold uppercase tracking-widest">
          PIN por defecto: Admin (1234) | Recepción (4321)
        </p>
      </motion.div>
    </div>
  );
}
