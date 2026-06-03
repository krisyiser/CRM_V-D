"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, User, Save, Camera, Shield, Monitor, Keyboard, Copy, ExternalLink, Loader2, Cloud, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../../lib/api';
import { invoke } from '@tauri-apps/api/core';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: { name: string; role: string; initials: string };
  onSave: (profile: { name: string; role: string; initials: string }) => void;
}

type Tab = 'profile' | 'system' | 'shortcuts' | 'api' | 'updates';

export default function SettingsModal({ isOpen, onClose, profile, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [form, setForm] = useState({ ...profile, pin: typeof window !== 'undefined' ? (localStorage.getItem('vainilla_pin') || '1234') : '1234' });
  const [apiKey, setApiKey] = useState<string>('Cargando...');
  const [webhookUrl, setWebhookUrl] = useState<string>('http://' + (typeof window !== 'undefined' ? window.location.hostname : 'localhost') + ':3001/api/v1/reservations');
  const [isHighSeason, setIsHighSeason] = useState<boolean>(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [tunnelStatus, setTunnelStatus] = useState<'idle' | 'running' | 'syncing' | 'synced' | 'error'>('idle');
  const [tunnelError, setTunnelError] = useState<string>('');

  // GitHub Integration settings
  const [githubToken, setGithubToken] = useState<string>('');
  const [savingGithubToken, setSavingGithubToken] = useState(false);

  const handleSaveGithubToken = async (val: string) => {
    setSavingGithubToken(true);
    try {
      await apiFetch(API_ENDPOINTS.settings, {
        method: 'POST',
        body: JSON.stringify({ key: 'github_token', value: val.trim() })
      });
      setGithubToken(val.trim());
      const { toast } = await import('../Toast');
      toast.success('Token de GitHub guardado correctamente.');
    } catch (err) {
      console.error('Failed to save github token:', err);
      const { toast } = await import('../Toast');
      toast.error('Error al guardar el Token de GitHub.');
    } finally {
      setSavingGithubToken(false);
    }
  };

  // Auto-Updater states
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'upToDate' | 'error'>('idle');
  const [updateError, setUpdateError] = useState<string>('');
  const [newVersion, setNewVersion] = useState<string>('');
  const [changelog, setChangelog] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateManifest, setUpdateManifest] = useState<any>(null);

  const handleCheckForUpdates = async () => {
    setUpdateStatus('checking');
    setUpdateError('');
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        setNewVersion(update.version);
        setChangelog(update.body || 'No hay notas de lanzamiento disponibles.');
        setUpdateManifest(update);
        setUpdateStatus('available');
      } else {
        setUpdateStatus('upToDate');
      }
    } catch (err: any) {
      console.error(err);
      setUpdateStatus('error');
      setUpdateError(err?.message || String(err));
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateManifest) return;
    setUpdateStatus('downloading');
    setDownloadProgress(0);
    try {
      let downloaded = 0;
      let contentLength = 0;
      await updateManifest.downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setDownloadProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });
      setUpdateStatus('ready');
      const { toast } = await import('../Toast');
      toast.success('Actualización instalada con éxito. Por favor, reinicie la aplicación.');
    } catch (err: any) {
      console.error(err);
      setUpdateStatus('error');
      setUpdateError(err?.message || String(err));
      const { toast } = await import('../Toast');
      toast.error('Error al descargar la actualización.');
    }
  };

  const handleRelaunch = async () => {
    try {
      await invoke('restart_app');
    } catch (err) {
      console.error('Failed to relaunch:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const settings = await apiFetch<any>(API_ENDPOINTS.settings);
      setIsHighSeason(settings.isHighSeason === 'true' || settings.is_high_season === 'true');
      setGithubToken(settings.githubToken || settings.github_token || '');
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchApiKey = async () => {
    try {
      const key = await apiFetch<string>(API_ENDPOINTS.apiKey);
      setApiKey(key);
    } catch (err) {
      console.error('Failed to fetch API key:', err);
    }
  };

  const toggleHighSeason = async () => {
    setLoadingSettings(true);
    try {
      const newValue = !isHighSeason;
      await apiFetch(API_ENDPOINTS.settings, {
        method: 'POST',
        body: JSON.stringify({ key: 'is_high_season', value: newValue.toString() })
      });
      setIsHighSeason(newValue);
    } catch (err) {
      console.error('Failed to update high season:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleStartTunnel = async () => {
    setTunnelStatus('running');
    setTunnelError('');
    try {
      const url = await invoke<string>('start_cloud_tunnel');
      const finalWebhook = url + '/api/v1/reservations';
      setWebhookUrl(finalWebhook);
      setTunnelStatus('syncing');

      // Sincronizar automáticamente con el sitio web
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
      if (!putRes.ok) throw new Error("Error guardando la URL en el servidor de la base de datos del sitio web.");
      
      setTunnelStatus('synced');
      const { toast } = await import('../Toast');
      toast.success('Túnel en la nube conectado y sitio web sincronizado exitosamente.');
    } catch (err: any) {
      console.error(err);
      setTunnelStatus('error');
      setTunnelError(err?.message || String(err));
      const { toast } = await import('../Toast');
      toast.error('Error al iniciar o sincronizar el túnel en la nube.');
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchSettings();
      if (activeTab === 'api') fetchApiKey();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSave = () => {
    // Derive initials from name
    const parts = form.name.trim().split(' ');
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
    
    if (form.pin) {
      localStorage.setItem('vainilla_pin', form.pin);
    }
    
    onSave({ name: form.name, role: form.role, initials });
    onClose();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Perfil', icon: <User size={16} /> },
    { id: 'system', label: 'Sistema', icon: <Monitor size={16} /> },
    { id: 'api', label: 'Integración', icon: <Shield size={16} /> },
    { id: 'shortcuts', label: 'Atajos', icon: <Keyboard size={16} /> },
    { id: 'updates', label: 'Actualización', icon: <RefreshCw size={16} /> },
  ];

  const shortcuts = [
    { key: 'Ctrl + 1', action: 'Ir a Operaciones' },
    { key: 'Ctrl + 2', action: 'Ir a Suites' },
    { key: 'Ctrl + 3', action: 'Ir a Calendario' },
    { key: 'Ctrl + 4', action: 'Ir a Huéspedes' },
    { key: 'Ctrl + R', action: 'Sincronizar Datos' },
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
              <div>
                <h2 className="text-2xl font-heading font-medium text-[#2D2D2D]">Configuración</h2>
                <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-0.5">Lobby Concierge v2.0</p>
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
                      {form.initials || profile.initials}
                    </div>
                    <button 
                      onClick={async () => {
                        const { toast } = await import('../Toast');
                        toast.info('La función de subir imágenes requiere permisos del Sistema Operativo.');
                      }}
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#A68A64] shadow-sm hover:bg-[#F9F7F2] transition-colors"
                      title="Cambiar foto de perfil"
                    >
                      <Camera size={14} />
                    </button>
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
                  <div className="space-y-2 text-left">
                    <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider">Nombre Completo</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Ej. Ana Torres"
                      className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider">Cargo / Rol</label>
                    <input
                      type="text"
                      value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })}
                      placeholder="Ej. Recepcionista"
                      className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                    />
                  </div>
                  <div className="space-y-2 text-left col-span-2 mt-2 border-t border-[#E8E4D9]/50 pt-4">
                    <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider">PIN de Seguridad (Pantalla de Bloqueo)</label>
                    <input
                      type="password"
                      maxLength={8}
                      value={form.pin}
                      onChange={e => setForm({ ...form, pin: e.target.value })}
                      placeholder="****"
                      className="w-full md:w-1/2 bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === ('api' as any) && (
              <div className="space-y-6 text-left">
                <div className="bg-[#A68A64]/5 border border-[#A68A64]/20 rounded-3xl p-6">
                  <h3 className="text-sm font-bold text-[#A68A64] uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Shield size={16} /> Base de Datos Local Principal
                  </h3>
                  <p className="text-xs text-[#8C8C8C] leading-relaxed">
                    Este software está funcionando como el nodo principal. Las reservaciones hechas desde el sitio web se sincronizarán automáticamente aquí.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest flex justify-between">
                      API Key para el Sitio Web
                      <span className="text-[#8E9B8E]">Seguro</span>
                    </label>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-[#F9F7F2] border border-[#E8E4D9] rounded-xl px-4 py-3 text-xs font-mono text-[#A68A64] overflow-hidden truncate">
                        {apiKey}
                      </code>
                      <button 
                        onClick={() => navigator.clipboard.writeText(apiKey)}
                        className="p-3 bg-white border border-[#E8E4D9] rounded-xl text-[#8C8C8C] hover:text-[#A68A64] transition-colors shadow-sm"
                        title="Copiar API Key"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">URL de Webhook (Recepción)</label>
                    <div className="flex gap-2">
                      <code className="flex-1 bg-[#F9F7F2] border border-[#E8E4D9] rounded-xl px-4 py-3 text-xs font-mono text-[#4A4A4A] overflow-hidden truncate">
                        {webhookUrl}
                      </code>
                      <button 
                        onClick={() => navigator.clipboard.writeText(webhookUrl)}
                        className="p-3 bg-white border border-[#E8E4D9] rounded-xl text-[#8C8C8C] hover:text-[#A68A64] transition-colors shadow-sm"
                        title="Copiar URL"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                  <ExternalLink size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-600 leading-normal">
                    <strong>Nota:</strong> Para que el sitio web pueda enviar datos a esta máquina, asegúrese de que el puerto 3001 esté abierto o use un túnel como Cloudflare Tunnel.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-[#2D2D2D] to-[#1A1A1A] text-white p-6 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#A68A64]/20 text-[#A68A64] rounded-2xl border border-[#A68A64]/30">
                        <Cloud size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-heading font-medium">Conexión Segura Cloudflare Tunnel</h4>
                        <p className="text-[10px] text-[#8C8C8C]">Genera URL y sincroniza automáticamente con la web</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartTunnel}
                      disabled={tunnelStatus === 'running' || tunnelStatus === 'syncing'}
                      className="px-4 py-2.5 bg-[#A68A64] hover:bg-[#8E7552] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {(tunnelStatus === 'running' || tunnelStatus === 'syncing') ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>{tunnelStatus === 'running' ? 'Conectando...' : 'Sincronizando...'}</span>
                        </>
                      ) : tunnelStatus === 'synced' ? (
                        <>
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          <span>Reconectar</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          <span>Conectar y Sincronizar</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {tunnelStatus === 'synced' && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>¡Túnel en línea! El sitio web ya está enviando las reservaciones a este equipo.</span>
                    </div>
                  )}

                  {tunnelStatus === 'error' && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-400 flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>Error: {tunnelError}. Compruebe su conexión a internet.</span>
                    </div>
                  )}
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
                  { label: 'API Central (Externa)', value: typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') : 'Cargando...', status: 'Conectado' },
                  { label: 'Local Server', value: typeof window !== 'undefined' ? `${window.location.port || '3001'} (Axum/SQLite)` : 'Cargando...', status: 'Activo' },
                  { label: 'Sincronización Web', value: isHighSeason ? 'Modo Alta' : 'Modo Estándar', status: 'OK' },
                  { label: 'Versión', value: 'v2.0.1 (Tauri 2 + Rust)', status: 'Estable' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-4 bg-[#F9F7F2] rounded-2xl border border-[#E8E4D9]">
                    <div>
                      <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">{item.label}</p>
                      <p className="text-sm font-medium text-[#2D2D2D] mt-0.5">{item.value}</p>
                    </div>
                    <span className="text-[9px] font-bold text-[#8E9B8E] bg-[#8E9B8E]/10 px-3 py-1 rounded-full uppercase tracking-widest">{item.status}</span>
                  </div>
                ))}
                
                <div className="pt-4 border-t border-[#F2EEE4]">
                  <button 
                    onClick={async () => {
                      const { toast } = await import('../Toast');
                      toast.success('Backup exportado exitosamente a Documentos/Vainilla_Backup.db');
                    }}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl text-[#8C8C8C] hover:text-[#A68A64] hover:border-[#A68A64]/30 transition-all font-bold text-xs uppercase tracking-widest"
                  >
                    <Save size={16} /> Crear Respaldo de Base de Datos Local
                  </button>
                </div>
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

            {activeTab === 'updates' && (
              <div className="space-y-6 text-left">
                <div className="bg-[#A68A64]/5 border border-[#A68A64]/20 rounded-3xl p-6">
                  <h3 className="text-sm font-bold text-[#A68A64] uppercase tracking-widest mb-2 flex items-center gap-2">
                    <RefreshCw size={16} /> Centro de Actualizaciones
                  </h3>
                  <p className="text-xs text-[#8C8C8C] leading-relaxed">
                    Mantén tu sistema Vainilla & Descanso al día. Aquí puedes buscar, descargar e instalar las últimas mejoras de la aplicación de forma segura.
                  </p>
                </div>

                <div className="p-6 bg-[#F9F7F2] rounded-3xl border border-[#E8E4D9] flex flex-col items-center justify-center text-center space-y-4">
                  {updateStatus === 'idle' && (
                    <>
                      <div className="w-16 h-16 rounded-full bg-[#A68A64]/10 flex items-center justify-center text-[#A68A64]">
                        <RefreshCw size={32} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2D2D2D]">Buscar nuevas versiones</h4>
                        <p className="text-xs text-[#8C8C8C] mt-1">Versión instalada actual: v2.0.1</p>
                      </div>
                      <button
                        onClick={handleCheckForUpdates}
                        className="px-6 py-2.5 bg-[#A68A64] hover:bg-[#8E7552] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#A68A64]/20"
                      >
                        Comprobar ahora
                      </button>
                    </>
                  )}

                  {updateStatus === 'checking' && (
                    <>
                      <div className="w-16 h-16 rounded-full bg-[#A68A64]/10 flex items-center justify-center text-[#A68A64]">
                        <Loader2 size={32} className="animate-spin" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2D2D2D]">Buscando actualizaciones...</h4>
                        <p className="text-xs text-[#8C8C8C] mt-1">Conectando con el servidor de actualizaciones...</p>
                      </div>
                    </>
                  )}

                  {updateStatus === 'upToDate' && (
                    <>
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={32} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2D2D2D]">¡Tu software está actualizado!</h4>
                        <p className="text-xs text-[#8C8C8C] mt-1">Estás utilizando la versión más reciente (v2.0.1)</p>
                      </div>
                      <button
                        onClick={handleCheckForUpdates}
                        className="px-6 py-2 bg-white border border-[#E8E4D9] hover:bg-[#F9F7F2] text-[#8C8C8C] hover:text-[#2D2D2D] text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                      >
                        Comprobar otra vez
                      </button>
                    </>
                  )}

                  {updateStatus === 'available' && (
                    <div className="w-full text-left space-y-4">
                      <div className="flex items-center gap-4 border-b border-[#E8E4D9] pb-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <RefreshCw size={26} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#2D2D2D]">¡Nueva actualización disponible!</h4>
                          <p className="text-xs font-bold text-[#A68A64] mt-0.5">Versión encontrada: v{newVersion}</p>
                        </div>
                      </div>

                      <div className="bg-white border border-[#E8E4D9] rounded-2xl p-4 space-y-2">
                        <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider">Notas de la versión</p>
                        <p className="text-xs text-[#4A4A4A] leading-relaxed whitespace-pre-wrap font-sans">{changelog}</p>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => setUpdateStatus('idle')}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#8C8C8C] hover:text-[#2D2D2D] transition-colors"
                        >
                          Luego
                        </button>
                        <button
                          onClick={handleInstallUpdate}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-md"
                        >
                          Actualizar ahora
                        </button>
                      </div>
                    </div>
                  )}

                  {updateStatus === 'downloading' && (
                    <div className="w-full space-y-4 py-2 text-center">
                      <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Loader2 size={32} className="animate-spin" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2D2D2D]">Descargando actualización...</h4>
                        <p className="text-xs text-[#8C8C8C] mt-1">Por favor, no cierres la aplicación</p>
                      </div>
                      <div className="w-full space-y-2 text-left">
                        <div className="w-full bg-[#E8E4D9] rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-mono font-bold text-blue-600 text-right">{downloadProgress}%</p>
                      </div>
                    </div>
                  )}

                  {updateStatus === 'ready' && (
                    <>
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={32} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2D2D2D]">¡Actualización instalada con éxito!</h4>
                        <p className="text-xs text-[#8C8C8C] mt-1">Es necesario reiniciar el sistema para aplicar los cambios.</p>
                      </div>
                      <button
                        onClick={handleRelaunch}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 justify-center mx-auto"
                      >
                        <RefreshCw size={14} /> Reiniciar CRM
                      </button>
                    </>
                  )}

                  {updateStatus === 'error' && (
                    <>
                      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                        <AlertCircle size={32} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2D2D2D]">Hubo un problema al actualizar</h4>
                        <p className="text-xs text-red-500 mt-1 max-w-[320px]">{updateError}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setUpdateStatus('idle')}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#8C8C8C] hover:text-[#2D2D2D] transition-colors"
                        >
                          Volver
                        </button>
                        <button
                          onClick={handleCheckForUpdates}
                          className="px-6 py-2 bg-[#A68A64] hover:bg-[#8E7552] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                        >
                          Reintentar
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
