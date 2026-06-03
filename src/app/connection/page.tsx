"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, QrCode, Copy, RefreshCw, Smartphone, 
  Trash2, ShieldAlert, Monitor, Info, Check, Ban, CheckCircle2, X
} from 'lucide-react';
import { apiFetch, API_ENDPOINTS } from '../../lib/api';
import { toast } from '../../components/Toast';
import { invoke } from '@tauri-apps/api/core';

interface ConnectedDevice {
  ip: String;
  device_id: String;
  name: String;
  user_agent: String;
  last_seen: String;
  status: String; // "active" or "blocked"
}

export default function ConnectionPage() {
  const [localIp, setLocalIp] = useState<string>('Cargando...');
  const [port] = useState<'3001'>('3001');
  const [copied, setCopied] = useState(false);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deletingDevice, setDeletingDevice] = useState<ConnectedDevice | null>(null);

  const [tunnelUrl, setTunnelUrl] = useState<string>('');

  useEffect(() => {
    // 1. Fetch the actual local IP of the PC using our Tauri Rust command and load tunnel URL from settings
    const fetchIpAndSettings = async () => {
      try {
        const ip = await invoke<string>('get_local_ip');
        setLocalIp(ip || '127.0.0.1');
      } catch (err) {
        console.error("Failed to get local IP from Rust:", err);
        setLocalIp(window.location.hostname || '127.0.0.1');
      }

      try {
        const settings = await apiFetch<any>(API_ENDPOINTS.settings);
        const savedTunnel = settings.cloudTunnelUrl || settings.cloud_tunnel_url || '';
        setTunnelUrl(savedTunnel);
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };

    fetchIpAndSettings();
    loadDevices();

    // Poll devices list every 10 seconds to keep CRM updated
    const interval = setInterval(loadDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDevices = async () => {
    try {
      const data = await apiFetch<ConnectedDevice[]>('devices');
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading connected devices:", err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const getPosUrl = () => {
    if (tunnelUrl) {
      return `${tunnelUrl}/pos/mobile`;
    }
    return `http://${localIp}:${port}/pos/mobile`;
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(getPosUrl());
    setCopied(true);
    toast.success("¡Enlace del POS copiado al portapapeles!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBlockDevice = async (deviceId: string, blocked: boolean) => {
    setActionLoading(deviceId);
    try {
      const { API_BASE_URL } = await import('../../lib/api');
      const res = await fetch(`${API_BASE_URL}/api/v1/devices/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, blocked })
      });
      
      if (res.ok) {
        toast.success(blocked ? "Dispositivo desvinculado con éxito" : "Dispositivo autorizado nuevamente");
        await loadDevices();
      } else {
        toast.error("Error al procesar la vinculación del dispositivo");
      }
    } catch (err) {
      toast.error("Error al conectar con la API de control");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDevice = (device: ConnectedDevice) => {
    setDeletingDevice(device);
  };

  const executeDeleteDevice = async (deviceId: string) => {
    setActionLoading(deviceId);
    try {
      const { API_BASE_URL } = await import('../../lib/api');
      const res = await fetch(`${API_BASE_URL}/api/v1/devices`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId })
      });
      
      if (res.ok) {
        toast.success("Terminal eliminada de la lista");
        await loadDevices();
      } else {
        toast.error("Error al eliminar la terminal");
      }
    } catch (err) {
      toast.error("Error al conectar con la API de control");
    } finally {
      setActionLoading(null);
    }
  };

  // Simplifies User-Agent for mobile branding
  const getDeviceBrand = (uaString: string) => {
    const ua = String(uaString);
    if (/android/i.test(ua)) {
      if (/samsung/i.test(ua)) return "Samsung Galaxy";
      if (/huawei/i.test(ua)) return "Huawei Mobile";
      if (/xiaomi/i.test(ua)) return "Xiaomi Redmi";
      return "Android Smartphone";
    }
    if (/ipad/i.test(ua)) return "Apple iPad";
    if (/iphone/i.test(ua)) return "Apple iPhone";
    if (/macintosh/i.test(ua)) return "macOS Terminal";
    if (/windows/i.test(ua)) return "Windows PC";
    return "Navegador Móvil";
  };

  const activeDevicesCount = devices.filter(d => d.status === 'active').length;

  return (
    <div className="space-y-12 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E8E4D9]/40 pb-6">
        <div className="text-left">
          <h1 className="text-4xl font-heading font-medium text-[#2D2D2D] leading-tight">
            Conexión de Terminales Móviles
          </h1>
          <p className="text-[#8C8C8C] text-sm mt-2 leading-relaxed">
            Genera accesos remotos por red local y administra las tablets y celulares de los meseros del bar.
          </p>
        </div>
        <button
          onClick={loadDevices}
          className="flex items-center gap-2 px-6 py-3.5 bg-white border border-[#E8E4D9] rounded-2xl text-xs font-bold uppercase tracking-wider text-[#A68A64] hover:bg-[#F9F7F2] active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw size={14} className={loadingDevices ? "animate-spin" : ""} />
          Actualizar Red
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: QR Code & IP Server Info */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white rounded-[32px] border border-[#E8E4D9] shadow-xl p-8 text-center flex flex-col items-center relative overflow-hidden">
            {/* Ambient gold glow */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-[#A68A64]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="w-12 h-12 rounded-2xl bg-[#A68A64]/10 text-[#A68A64] flex items-center justify-center mb-6">
              <QrCode size={22} />
            </div>

            <h3 className="text-lg font-heading font-medium text-[#2D2D2D]">Vincular Nueva Terminal</h3>
            <p className="text-xs text-[#8C8C8C] mt-2 mb-6 max-w-xs leading-relaxed">
              {tunnelUrl 
                ? "Conexión segura remota activa. Escanea este código QR desde cualquier red (datos móviles o Wi-Fi) para abrir el POS."
                : "Los meseros deben conectarse al mismo Wi-Fi del restaurante y escanear este código QR para abrir el POS."}
            </p>

            {/* QR Code Container */}
            <div className="relative p-6 bg-[#F9F7F2] rounded-[24px] border border-[#E8E4D9]/60 shadow-inner group transition-all">
              {localIp === 'Cargando...' ? (
                <div className="w-64 h-64 flex flex-col items-center justify-center text-xs text-[#8C8C8C]">
                  <div className="w-8 h-8 rounded-full border-4 border-[#A68A64]/20 border-t-[#A68A64] animate-spin mb-4" />
                  Obteniendo dirección IP local...
                </div>
              ) : (
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(getPosUrl())}&bgcolor=F9F7F2&color=2D2D2D`}
                  alt="POS QR Code"
                  className="w-64 h-64 object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.02]"
                />
              )}
            </div>

            {/* Port info */}
            <div className="mt-6 w-full max-w-[280px]">
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F9F7F2] border border-[#E8E4D9] rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8C8C]">
                  Servidor Activo en Puerto 3001
                </span>
              </div>
            </div>

            {/* Connection URL Bar */}
            <div className="w-full mt-6 bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="text-left overflow-hidden">
                <p className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest">Enlace de Conexión</p>
                <code className="text-[11px] font-mono text-[#A68A64] block truncate mt-1">
                  {getPosUrl()}
                </code>
              </div>
              <button
                onClick={handleCopyUrl}
                className="p-3 bg-white hover:bg-[#F9F7F2] text-[#8C8C8C] hover:text-[#A68A64] border border-[#E8E4D9] rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
                title="Copiar URL"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Connected Devices Control */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[#E8E4D9] rounded-3xl p-6 text-left shadow-sm">
              <span className="text-[10px] text-[#8C8C8C] font-bold uppercase tracking-widest block">IP del Servidor Central</span>
              <span className="text-2xl font-heading font-medium text-[#2D2D2D] block mt-1.5">{localIp}</span>
              <span className="text-[9px] text-[#A68A64] font-bold uppercase tracking-wider block mt-2">Puerto de API: 3001</span>
            </div>
            <div className="bg-white border border-[#E8E4D9] rounded-3xl p-6 text-left shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-[#8C8C8C] font-bold uppercase tracking-widest block">Dispositivos Conectados</span>
                <span className="text-2xl font-heading font-medium text-[#2D2D2D] block mt-1.5">
                  {activeDevicesCount} <span className="text-xs text-[#8C8C8C] font-sans">activos</span>
                </span>
              </div>
              <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider self-start mt-2">
                Escucha Abierta (0.0.0.0)
              </span>
            </div>
          </div>

          {/* CRM Devices List Panel */}
          <div className="bg-white border border-[#E8E4D9] rounded-[32px] shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#F2EEE4] bg-[#F9F7F2]/50 flex justify-between items-center">
              <div className="text-left">
                <h3 className="text-sm font-semibold text-[#2D2D2D]">Terminales Activas Registradas</h3>
                <p className="text-[10px] text-[#8C8C8C] mt-0.5">Control de acceso y desvinculación a las bases del POS.</p>
              </div>
              <span className="text-[10px] font-bold px-3 py-1 bg-white border border-[#E8E4D9] rounded-full text-[#A68A64] shadow-xs">
                Total: {devices.length}
              </span>
            </div>

            {/* List */}
            <div className="divide-y divide-[#F2EEE4] min-h-[260px] overflow-y-auto max-h-[460px]">
              {loadingDevices ? (
                <div className="p-12 text-center text-[#8C8C8C] text-sm flex flex-col items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#A68A64]/20 border-t-[#A68A64] rounded-full animate-spin mb-3" />
                  Consultando terminales activas...
                </div>
              ) : devices.length === 0 ? (
                <div className="p-12 text-center text-[#8C8C8C] text-xs leading-relaxed flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#F9F7F2] border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C]">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#2D2D2D]">No hay terminales conectadas aún</p>
                    <p className="text-[10px] mt-1">Cuando los meseros escaneen el QR y carguen el POS, aparecerán listados aquí.</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence>
                  {devices.map((device) => {
                    const isBlocked = device.status === 'blocked';
                    return (
                      <motion.div
                        key={String(device.device_id)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          isBlocked ? 'bg-red-50/10' : 'hover:bg-[#F9F7F2]/40'
                        }`}
                      >
                        {/* Device Info */}
                        <div className="flex gap-4 items-start text-left">
                          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${
                            isBlocked 
                              ? 'bg-red-50 border-red-100 text-red-500' 
                              : device.status === 'offline'
                                ? 'bg-slate-50 border-slate-200 text-slate-400'
                                : 'bg-[#A68A64]/10 border-[#A68A64]/20 text-[#A68A64]'
                          }`}>
                            {isBlocked ? <Ban size={18} /> : <Smartphone size={18} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-[#2D2D2D]">{String(device.name)}</p>
                              <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                isBlocked 
                                  ? 'bg-red-100 text-red-700 border border-red-200' 
                                  : device.status === 'offline'
                                    ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                              }`}>
                                {isBlocked ? 'Bloqueado' : device.status === 'offline' ? 'Desconectado' : 'Conectado'}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#8C8C8C] mt-1">
                              IP: <span className="font-mono text-[#2D2D2D]">{String(device.ip)}</span> &bull; ID: <span className="font-mono">{String(device.device_id)}</span>
                            </p>
                            <p className="text-[9px] text-[#A68A64] mt-0.5">
                              {getDeviceBrand(String(device.user_agent))}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 sm:self-center self-end">
                          <span className="text-[9px] text-[#8C8C8C] font-medium hidden md:inline">
                            Visto: {new Date(String(device.last_seen)).toLocaleTimeString()}
                          </span>
                          
                          {isBlocked ? (
                            <button
                              onClick={() => handleBlockDevice(String(device.device_id), false)}
                              disabled={actionLoading === String(device.device_id)}
                              className="px-4 py-2 border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                              {actionLoading === String(device.device_id) ? "Procesando..." : "Autorizar"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlockDevice(String(device.device_id), true)}
                              disabled={actionLoading === String(device.device_id)}
                              className="px-4 py-2 border border-red-100 bg-white hover:bg-red-50 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                              {actionLoading === String(device.device_id) ? "Procesando..." : "Desvincular"}
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteDevice(device)}
                            disabled={actionLoading === String(device.device_id)}
                            className="p-2 border border-slate-200 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all shadow-sm shrink-0 cursor-pointer active:scale-90 disabled:opacity-50"
                            title="Eliminar dispositivo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
            
            {/* Info footer */}
            <div className="p-4 bg-[#F9F7F2] border-t border-[#F2EEE4] text-center flex items-center justify-center gap-2">
              <Info size={12} className="text-[#A68A64]" />
              <p className="text-[9px] text-[#8C8C8C] font-semibold uppercase tracking-wider leading-relaxed">
                Seguridad Local: Cualquier tablet externa debe estar validada para interactuar con la base de datos de la PC.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Guide Banner */}
      <div className="bg-[#A68A64]/5 border border-[#A68A64]/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E4D9] flex items-center justify-center text-[#A68A64] shadow-sm shrink-0">
          <Info size={20} />
        </div>
        <div className="text-left flex-1 space-y-1">
          <h4 className="text-sm font-semibold text-[#2D2D2D]">¿Cómo realizar pruebas del punto de venta en red local?</h4>
          <p className="text-xs text-[#8C8C8C] leading-relaxed">
            {tunnelUrl
              ? "1. Escanea el código QR desde el teléfono o tablet del mesero. Te abrirá directamente el POS móvil a través de la Conexión Segura."
              : "1. Asegúrate de que tanto tu PC como el teléfono del mesero estén conectados a la misma red Wi-Fi."}
            <br />
            2. Escanea el código QR desde el teléfono o tablet del mesero. Te abrirá directamente el POS Sandbox. <br />
            3. Al abrirlo, el dispositivo se registrará automáticamente en este panel. ¡Registra ventas en el móvil y míralas aparecer en el historial de la PC!
          </p>
        </div>
      </div>

      {/* Custom Confirm Delete Device Modal */}
      <AnimatePresence>
        {deletingDevice && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[32px] border border-[#E8E4D9] shadow-2xl p-8 max-w-md w-full text-center"
            >
              <button
                onClick={() => setDeletingDevice(null)}
                className="absolute top-6 right-6 p-2 text-[#8C8C8C] hover:text-[#2D2D2D] rounded-full hover:bg-[#F9F7F2] transition-colors"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <Trash2 size={28} />
              </div>
              
              <h3 className="text-xl font-heading font-medium text-[#2D2D2D] mb-2">¿Eliminar Terminal?</h3>
              <p className="text-sm text-[#6B6B6B] mb-8 leading-relaxed">
                Se desvinculará y eliminará permanentemente la terminal <strong>{String(deletingDevice.name)}</strong> de la red local. Tendrás que volver a escanear el QR si deseas registrarla nuevamente.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingDevice(null)}
                  disabled={actionLoading === String(deletingDevice.device_id)}
                  className="flex-1 py-3.5 border border-[#E8E4D9] bg-[#F9F7F2] text-xs font-bold uppercase tracking-widest text-[#6B6B6B] hover:bg-[#F2EEE4] transition-all rounded-2xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const devId = String(deletingDevice.device_id);
                    setDeletingDevice(null);
                    await executeDeleteDevice(devId);
                  }}
                  disabled={actionLoading === String(deletingDevice.device_id)}
                  className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-widest transition-all rounded-2xl shadow-xl shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  Sí, Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
