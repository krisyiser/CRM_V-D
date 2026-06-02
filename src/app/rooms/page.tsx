"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MoreHorizontal, X, BedDouble, LogOut, Settings, Wrench } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../../lib/api';
import { SkeletonTable } from '../../components/Skeleton';

// ── Inline action dropdown ────────────────────────────────────────────────────
function RoomActionsMenu({
  room,
  onClose,
  onStatusChange,
}: {
  room: any;
  onClose: () => void;
  onStatusChange: (roomId: string, status: string) => void;
}) {
  const actions = [
    ...(room.status !== 'available'
      ? [{ label: 'Marcar Disponible', icon: <BedDouble size={14} />, status: 'available', color: 'text-[#8E9B8E]' }]
      : []),
    ...(room.status !== 'occupied'
      ? [{ label: 'Marcar Ocupada', icon: <LogOut size={14} />, status: 'occupied', color: 'text-[#A68A64]' }]
      : []),
    ...(room.status !== 'maintenance'
      ? [{ label: 'Enviar a Limpieza', icon: <Wrench size={14} />, status: 'maintenance', color: 'text-[#C2A88D]' }]
      : []),
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[90]"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ duration: 0.15 }}
        className="absolute right-8 top-full mt-2 z-[100] bg-white rounded-2xl border border-[#E8E4D9] shadow-2xl shadow-[#A68A64]/10 overflow-hidden w-56"
      >
        <div className="p-3 border-b border-[#F2EEE4]">
          <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest px-2">
            Suite {room.id}
          </p>
        </div>
        <div className="p-2">
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => { onStatusChange(room.id, action.status); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-[#F9F7F2] transition-colors ${action.color}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Rooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRooms() {
      try {
        const data = await apiFetch<any[]>(API_ENDPOINTS.rooms);
        setRooms(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, []);

  const handleStatusChange = async (roomId: string, status: string) => {
    try {
      await apiFetch(API_ENDPOINTS.rooms, {
        method: 'PATCH',
        body: JSON.stringify({ id: roomId, status }),
      });
      // Optimistic UI update
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, status } : r))
      );
    } catch (error) {
      const { toast } = await import('../../components/Toast');
      toast.error('Error al actualizar el estado de la suite.');
    }
  };

  const filteredRooms = rooms.filter(
    (room) =>
      room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.roomType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusConfig: Record<string, { label: string; classes: string }> = {
    available: { label: 'Disponible',  classes: 'border-[#8E9B8E]/30 text-[#8E9B8E] bg-[#8E9B8E]/5' },
    occupied:  { label: 'Ocupada',     classes: 'border-[#A68A64]/30 text-[#A68A64] bg-[#A68A64]/5' },
    maintenance: { label: 'Limpieza', classes: 'border-[#C2A88D]/30 text-[#C2A88D] bg-[#C2A88D]/5' },
  };

  return (
    <div className="flex flex-col gap-10 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-heading font-medium text-[#2D2D2D]">Gestión de Suites</h1>
          <p className="text-sm text-[#8C8C8C] mt-1">Inventario y disponibilidad de habitaciones</p>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-3">
          {(['available', 'occupied', 'maintenance'] as const).map((s) => {
            const count = rooms.filter((r) => r.status === s).length;
            const cfg = statusConfig[s];
            return (
              <span
                key={s}
                className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border ${cfg.classes}`}
              >
                {count} {cfg.label}
              </span>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8C8C]" size={16} />
          <input
            type="text"
            placeholder="Filtrar suites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white border border-[#E8E4D9] rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all w-64 text-[#2D2D2D]"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} />
      ) : (
        <div className="bg-white rounded-[32px] border border-[#E8E4D9] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F9F7F2] border-b border-[#E8E4D9]">
                  {['ID', 'Nombre de Suite', 'Categoría', 'Estado Actual', 'Precio Noche', 'Acciones'].map(
                    (col, i) => (
                      <th
                        key={col}
                        className={`py-6 px-8 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C8C8C] ${i === 5 ? 'text-right' : 'text-left'}`}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EEE4]">
                {filteredRooms.map((room, i) => {
                  const cfg = statusConfig[room.status] ?? statusConfig.available;
                  return (
                    <motion.tr
                      key={room.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-[#F9F7F2]/50 transition-colors group"
                    >
                      <td className="py-5 px-8 text-sm font-bold text-[#A68A64]">{room.id}</td>
                      <td className="py-5 px-8 text-sm font-semibold text-[#2D2D2D]">{room.name}</td>
                      <td className="py-5 px-8 text-sm font-medium text-[#6B6B6B]">{room.roomType}</td>
                      <td className="py-5 px-8">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border ${cfg.classes}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-5 px-8 text-sm font-semibold text-[#2D2D2D]">
                        ${room.price?.toLocaleString() ?? '—'}
                      </td>
                      <td className="py-5 px-8 text-right relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === room.id ? null : room.id)}
                          className="p-2 text-[#8C8C8C] hover:text-[#A68A64] transition-colors rounded-lg hover:bg-white border border-transparent hover:border-[#E8E4D9]"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        <AnimatePresence>
                          {openMenuId === room.id && (
                            <RoomActionsMenu
                              room={room}
                              onClose={() => setOpenMenuId(null)}
                              onStatusChange={handleStatusChange}
                            />
                          )}
                        </AnimatePresence>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {filteredRooms.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-[#8C8C8C] font-medium">
                  {searchQuery ? 'No se encontraron suites.' : 'No hay suites registradas aún.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
