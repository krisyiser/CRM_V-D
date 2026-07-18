"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, User, Save, Monitor, Keyboard, Shield } from 'lucide-react';
import { API, apiFetch } from '@/lib/api';
import { toast } from '@/components/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: { name: string; initials: string; email?: string };
  onSave: (profile: { name: string; role: string; initials: string }) => void;
}

type Tab = 'profile' | 'system' | 'shortcuts';

export default function SettingsModal({ isOpen, onClose, profile, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [form, setForm] = useState({ name: profile.name, role: 'Administrador' });
  const [isHighSeason, setIsHighSeason] = useState<boolean>(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const settings = await apiFetch<Record<string, string>>(API.settings);
      setIsHighSeason(settings.is_high_season === 'true');
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const toggleHighSeason = async () => {
    setLoadingSettings(true);
    try {
      const newValue = !isHighSeason;
      await apiFetch(API.settings, {
        method: 'POST',
        body: JSON.stringify({ key: 'is_high_season', value: newValue.toString() })
      });
      setIsHighSeason(newValue);
      toast.success(`Temporada alta ${newValue ? 'activada' : 'desactivada'}`);
    } catch (err) {
      console.error('Failed to update high season:', err);
      toast.error('Error al actualizar temporada alta');
    } finally {
      setLoadingSettings(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    const parts = form.name.trim().split(' ');
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
    
    onSave({ name: form.name, role: form.role, initials });
    toast.success('Perfil actualizado localmente.');
    onClose();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Perfil', icon: <User size={16} /> },
    { id: 'system', label: 'Sistema', icon: <Monitor size={16} /> },
    { id: 'shortcuts', label: 'Atajos', icon: <Keyboard size={16} /> },
  ];

  const shortcuts = [
    { key: 'Ctrl + 1', action: 'Ir a Operaciones' },
    { key: 'Ctrl + 2', action: 'Ir a Suites' },
    { key: 'Ctrl + 3', action: 'Ir a Calendario' },
    { key: 'Ctrl + 4', action: 'Ir a Huéspedes' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#2D2D2D]/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[40px] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-[#F9F7F2] p-8 border-b border-[#E8E4D9] flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white shadow-lg shadow-[#A68A64]/20">
                  <Settings size={22} />
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-heading font-medium text-[#2D2D2D]">Configuración</h2>
                  <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-0.5">Lobby Concierge PWA</p>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-red-500 transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#E8E4D9] px-8 bg-white">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-[#A68A64] text-[#A68A64]'
                      : 'border-transparent text-[#8C8C8C] hover:text-[#2D2D2D]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-8 min-h-[320px]">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-[#A68A64]/20">
                        {profile.initials}
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-[#2D2D2D]">{form.name || 'Nombre del Administrador'}</p>
                      <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-1">{form.role}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Shield size={12} className="text-[#8E9B8E]" />
                        <span className="text-[10px] text-[#8C8C8C]">Acceso Total al Sistema</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-left col-span-2">
                      <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider">Nombre Completo</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        placeholder="Ej. Ana Torres"
                        className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between p-6 bg-[#A68A64]/5 rounded-[32px] border border-[#A68A64]/20 mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-[#A68A64] uppercase tracking-widest">Temporada Alta Global</h3>
                      <p className="text-[10px] text-[#8C8C8C] mt-1">Activa el modo Alta para el Dashboard y Sitio Web</p>
                    </div>
                    <button 
                      disabled={loadingSettings}
                      onClick={toggleHighSeason}
                      className={`w-14 h-8 rounded-full p-1 transition-all flex items-center ${isHighSeason ? 'bg-[#A68A64]' : 'bg-[#E8E4D9]'}`}
                    >
                      <motion.div 
                        animate={{ x: isHighSeason ? 24 : 0 }}
                        className="w-6 h-6 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>

                  <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Estado del Sistema</p>
                  {[
                    { label: 'Servicio de Base de Datos', value: 'Supabase PostgreSQL Cloud', status: 'Conectado' },
                    { label: 'Sincronización Web', value: isHighSeason ? 'Modo Alta' : 'Modo Estándar', status: 'OK' },
                    { label: 'Versión', value: 'v3.0.0 (PWA + Next.js)', status: 'Estable' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-[#F9F7F2] rounded-2xl border border-[#E8E4D9]">
                      <div>
                        <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">{item.label}</p>
                        <p className="text-sm font-medium text-[#2D2D2D] mt-0.5">{item.value}</p>
                      </div>
                      <span className="text-[9px] font-bold text-[#8E9B8E] bg-[#8E9B8E]/10 px-3 py-1 rounded-full uppercase tracking-widest">{item.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'shortcuts' && (
                <div className="space-y-3 text-left">
                  <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest mb-4">Atajos de Teclado Activos</p>
                  {shortcuts.map(s => (
                    <div key={s.key} className="flex items-center justify-between p-4 bg-[#F9F7F2] rounded-2xl border border-[#E8E4D9]">
                      <p className="text-sm text-[#4A4A4A]">{s.action}</p>
                      <kbd className="px-3 py-1.5 bg-white border border-[#E8E4D9] rounded-lg text-[11px] font-bold text-[#A68A64] shadow-sm">{s.key}</kbd>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {activeTab === 'profile' && (
              <div className="px-8 pb-8 pt-0 flex justify-end gap-3 border-t border-[#F2EEE4] pt-6">
                <button onClick={onClose} className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#8C8C8C] hover:text-[#2D2D2D] transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-8 py-3 bg-[#A68A64] text-white rounded-2xl text-xs font-bold tracking-widest uppercase hover:bg-[#8E7554] transition-all flex items-center gap-2 shadow-lg shadow-[#A68A64]/20 active:scale-95"
                >
                  <Save size={16} /> Guardar Perfil
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
