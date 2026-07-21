"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BedDouble, Search, Loader2 } from 'lucide-react';
import { apiFetch, API, registerCancelledReservationIdInStorage } from '@/lib/api';
import type { Room, Reservation } from '@/types';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      const [r, res] = await Promise.all([
        apiFetch<Room[]>(API.rooms),
        apiFetch<Reservation[]>(API.reservations),
      ]);
      setRooms(Array.isArray(r) ? r : []);
      setReservations(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Rooms fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const filtered = rooms.filter(room =>
    room.name.toLowerCase().includes(search.toLowerCase()) ||
    room.id.toLowerCase().includes(search.toLowerCase())
  );

  const getActiveReservation = (roomId: string) =>
    reservations.find(r => {
      if (!r) return false;
      const statusLower = String(r.status || '').toLowerCase();
      if (
        statusLower === 'cancelled' ||
        statusLower === 'checkedout' ||
        statusLower === 'checked_out' ||
        statusLower === 'completed'
      ) {
        return false;
      }
      const checkIn = r.check_in || (r.dates?.split(' - ')[0] ?? '');
      const checkOut = r.check_out || (r.dates?.split(' - ')[1] ?? '');
      return String(r.room_id) === String(roomId) && today >= checkIn && today <= checkOut;
    });

  const statusMap: Record<string, { label: string; badge: string }> = {
    available:    { label: 'Disponible',    badge: 'bg-[#8E9B8E]/10 text-[#8E9B8E] border-[#8E9B8E]/20' },
    occupied:     { label: 'Ocupada',       badge: 'bg-[#A68A64]/10 text-[#A68A64] border-[#A68A64]/20' },
    maintenance:  { label: 'Mantenimiento', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    cleaning:     { label: 'Limpieza',      badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  };

  const updateRoomStatus = async (roomId: string, newStatus: Room['status']) => {
    try {
      // Optimistic UI update
      setRooms(prev => prev.map(r => String(r.id) === String(roomId) ? { ...r, status: newStatus } : r));

      if (newStatus === 'available') {
        const activeRes = getActiveReservation(roomId);
        if (activeRes) {
          registerCancelledReservationIdInStorage(activeRes.id, activeRes.external_id);
          setReservations(prev => prev.filter(r => String(r.room_id) !== String(roomId)));
        }
      }

      await apiFetch(API.rooms, { method: 'PATCH', body: JSON.stringify({ id: roomId, status: newStatus }) });
      await loadData();

      const { toast } = await import('@/components/Toast');
      toast.success(`Estado de la Suite ${roomId} cambiado a ${statusMap[newStatus]?.label || newStatus}.`);
    } catch (err) {
      console.error('Update room error:', err);
      await loadData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 size={32} className="text-[#A68A64] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-medium text-[#2D2D2D]">Suites & Habitaciones</h1>
          <p className="text-sm text-[#8C8C8C] mt-1">Gestión de alojamientos del hotel</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8C8C]" size={16} />
          <input
            type="text"
            placeholder="Buscar suite..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-white border border-[#E8E4D9] rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all w-64 text-[#2D2D2D]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(room => {
          const activeRes = getActiveReservation(room.id);
          const effectiveStatus = room.status || 'available';
          const st = statusMap[effectiveStatus] || statusMap.available;

          return (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[28px] border border-[#E8E4D9] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#A68A64]/10 flex items-center justify-center text-[#A68A64]">
                      <BedDouble size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#2D2D2D]">Suite {room.id}</h3>
                      <p className="text-sm text-[#8C8C8C]">{room.name}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${st.badge}`}>
                    {st.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#F9F7F2] rounded-xl p-3">
                    <p className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest">Tipo</p>
                    <p className="text-sm font-semibold text-[#2D2D2D] mt-0.5">{room.room_type}</p>
                  </div>
                  <div className="bg-[#F9F7F2] rounded-xl p-3">
                    <p className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest">Tarifa Base</p>
                    <p className="text-sm font-semibold text-[#A68A64] mt-0.5">${room.price.toLocaleString('es-MX')} MXN</p>
                  </div>
                </div>

                {activeRes && effectiveStatus === 'occupied' && (
                  <div className="bg-[#A68A64]/5 border border-[#A68A64]/20 rounded-xl p-3 text-left mb-4">
                    <p className="text-[9px] font-bold text-[#A68A64] uppercase tracking-widest">Huésped Actual</p>
                    <p className="text-sm font-semibold text-[#2D2D2D] mt-0.5">{activeRes.guest_name}</p>
                    <p className="text-[10px] text-[#8C8C8C] mt-0.5">{activeRes.dates}</p>
                  </div>
                )}
              </div>

              {/* Status control action buttons */}
              <div className="pt-3 border-t border-[#E8E4D9]/60 flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-wider mr-1">Cambiar a:</span>
                <button
                  onClick={() => updateRoomStatus(room.id, 'available')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${effectiveStatus === 'available' ? 'bg-[#8E9B8E] text-white border-[#8E9B8E]' : 'bg-[#F9F7F2] text-[#6B6B6B] border-[#E8E4D9] hover:bg-white'}`}
                >
                  Disponible
                </button>
                <button
                  onClick={() => updateRoomStatus(room.id, 'occupied')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${effectiveStatus === 'occupied' ? 'bg-[#A68A64] text-white border-[#A68A64]' : 'bg-[#F9F7F2] text-[#6B6B6B] border-[#E8E4D9] hover:bg-white'}`}
                >
                  Ocupada
                </button>
                <button
                  onClick={() => updateRoomStatus(room.id, 'maintenance')}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${effectiveStatus === 'maintenance' ? 'bg-amber-500 text-white border-amber-500' : 'bg-[#F9F7F2] text-[#6B6B6B] border-[#E8E4D9] hover:bg-white'}`}
                >
                  Mantenimiento
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
