"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
          : authError.message);
        return;
      }

      window.location.href = '/';
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#2D2D2D] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#A68A64] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#8E9B8E] rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo + Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex bg-white/10 p-5 rounded-3xl backdrop-blur-md border border-white/20 mb-5 shadow-2xl">
            <img
              src="/logo%20vainilla%20y%20descanso.png"
              alt="Vainilla y Descanso"
              className="h-14 w-auto object-contain brightness-0 invert opacity-90"
            />
          </div>
          <p className="text-[11px] text-white/40 font-bold uppercase tracking-[0.3em]">
            Lobby Concierge — CRM Hotelero
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white shadow-lg shadow-[#A68A64]/20">
              <Lock size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Iniciar Sesión</h1>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                Acceso Autorizado
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@vainillaydescanso.com"
                  required
                  autoFocus
                  className="w-full bg-white/10 border border-white/10 rounded-2xl py-3.5 pl-11 pr-5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#A68A64]/60 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/10 border border-white/10 rounded-2xl py-3.5 pl-11 pr-12 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#A68A64]/60 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium"
              >
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#A68A64] text-white rounded-2xl text-sm font-bold tracking-widest uppercase hover:bg-[#8E7554] transition-all shadow-xl shadow-[#A68A64]/30 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/20 mt-6 font-bold uppercase tracking-widest">
          Studio Kuali — Vainilla & Descanso v1.0
        </p>
      </motion.div>
    </div>
  );
}
