"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BedDouble, Search, Loader2 } from 'lucide-react';
import { apiFetch, API } from '@/lib/api';
import type { Room, Reservation } from '@/types';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const filtered = rooms.filter(room =>
    room.name.toLowerCase().includes(search.toLowerCase()) ||
    room.id.toLowerCase().includes(search.toLowerCase())
  );

  const getActiveReservation = (roomId: string) =>
    reservations.find(r => {
      const [ci, co] = (r.dates || '').split(' - ');
      return r.room_id === roomId && today >= ci && today <= co;
    });

  const statusMap: Record<string, { label: string; badge: string }> = {
    available:    { label: 'Disponible',    badge: 'bg-[#8E9B8E]/10 text-[#8E9B8E] border-[#8E9B8E]/20' },
    occupied:     { label: 'Ocupada',       badge: 'bg-[#A68A64]/10 text-[#A68A64] border-[#A68A64]/20' },
    maintenance:  { label: 'Mantenimiento', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
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
          const st = statusMap[room.status] || statusMap.available;
          const activeRes = getActiveReservation(room.id);
          return (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[28px] border border-[#E8E4D9] p-6 shadow-sm hover:shadow-md transition-shadow"
            >
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
                  <p className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest">Tarifa</p>
                  <p className="text-sm font-semibold text-[#A68A64] mt-0.5">${room.price.toLocaleString('es-MX')} MXN</p>
                </div>
              </div>

              {activeRes && (
                <div className="bg-[#A68A64]/5 border border-[#A68A64]/20 rounded-xl p-3 text-left">
                  <p className="text-[9px] font-bold text-[#A68A64] uppercase tracking-widest">Huésped Actual</p>
                  <p className="text-sm font-semibold text-[#2D2D2D] mt-0.5">{activeRes.guest_name}</p>
                  <p className="text-[10px] text-[#8C8C8C] mt-0.5">{activeRes.dates}</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
