"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, BedDouble, X, CalendarCheck, Trash2, Loader2 } from 'lucide-react';
import { apiFetch, API, registerCancelledReservationIdInStorage } from '@/lib/api';
import type { Room, Reservation } from '@/types';

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const fetchData = async () => {
    try {
      const [r, res] = await Promise.all([
        apiFetch<Room[]>(API.rooms),
        apiFetch<Reservation[]>(API.reservations),
      ]);
      setRooms(Array.isArray(r) ? r : []);
      setReservations(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Reservations fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = reservations.filter(res =>
    res &&
    res.status !== 'Cancelled' &&
    res.status !== 'cancelled' &&
    ((res.guest_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
     (res.room_id || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getReservationsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filtered.filter(res => {
      if (!res || res.status === 'Cancelled' || res.status === 'cancelled') return false;
      const checkIn = res.check_in || (res.dates?.split(' - ')[0] ?? '');
      const checkOut = res.check_out || (res.dates?.split(' - ')[1] ?? '');
      if (!checkIn || !checkOut) return false;
      return dateStr >= checkIn && dateStr <= checkOut;
    });
  };

  const totalSuitesCount = rooms.length || 5;

  const handleCancel = async (id: string, roomId?: string) => {
    try {
      const cleanId = String(id).trim().toLowerCase();
      registerCancelledReservationIdInStorage(cleanId);

      // Find reservation to get roomId if not passed
      const targetRes = reservations.find(r => r && (String(r.id).toLowerCase() === cleanId || String(r.external_id).toLowerCase() === cleanId));
      const targetRoomId = roomId || targetRes?.room_id;

      // Optimistic UI update: remove from state immediately for 0ms visual latency
      setReservations(prev => prev.filter(r => {
        if (!r) return false;
        const rId = String(r.id || '').trim().toLowerCase();
        const rExtId = String(r.external_id || '').trim().toLowerCase();
        if (rId === cleanId || rExtId === cleanId) {
          registerCancelledReservationIdInStorage(rId, rExtId);
          return false;
        }
        return true;
      }));

      await apiFetch(API.reservations, { method: 'DELETE', body: JSON.stringify({ id }) });

      if (targetRoomId) {
        await apiFetch(API.rooms, { method: 'PATCH', body: JSON.stringify({ id: targetRoomId, status: 'available' }) });
      }

      await fetchData();
      const { toast } = await import('@/components/Toast');
      toast.success('Reservación cancelada exitosamente.');
    } catch (err) {
      console.error('Cancel error:', err);
      await fetchData();
    }
  };


  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 size={32} className="text-[#A68A64] animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-10 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-heading font-medium text-[#2D2D2D]">Calendario de Estancias</h1>
          <p className="text-sm text-[#8C8C8C] mt-1">Registro de entradas y salidas programadas</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8C8C]" size={16} />
            <input
              type="text"
              placeholder="Buscar huésped o suite..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white border border-[#E8E4D9] rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all w-64 text-[#2D2D2D]"
            />
          </div>
          <div className="flex items-center bg-white border border-[#E8E4D9] rounded-xl p-1">
            <button onClick={prevMonth} className="p-2 text-[#8C8C8C] hover:text-[#2D2D2D] hover:bg-[#F9F7F2] rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 text-sm font-semibold text-[#2D2D2D] min-w-[140px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={nextMonth} className="p-2 text-[#8C8C8C] hover:text-[#2D2D2D] hover:bg-[#F9F7F2] rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-[#E8E4D9] shadow-sm overflow-hidden p-3 sm:p-6">
        <div className="overflow-x-auto custom-scrollbar-light pb-2">
          <div className="min-w-[620px] sm:min-w-0">
            <div className="grid grid-cols-7 mb-3 sm:mb-4">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#8C8C8C] pb-3 sm:pb-4 border-b border-[#E8E4D9]">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-[#E8E4D9]">
              {blanks.map(blank => (
                <div key={`blank-${blank}`} className="bg-[#F9F7F2] min-h-[110px] sm:min-h-[140px] p-1.5 sm:p-2" />
              ))}
              {days.map(day => {
                const dayReservations = getReservationsForDay(day);
                const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                const uniqueOccupied = new Set(dayReservations.map(r => r.room_id));
                const occupiedCount = uniqueOccupied.size;
                const isFull = occupiedCount >= totalSuitesCount;

                return (
                  <div key={day} className={`bg-white min-h-[110px] sm:min-h-[140px] p-2 sm:p-3 hover:bg-[#F9F7F2]/50 transition-colors flex flex-col justify-between ${isToday ? 'bg-[#A68A64]/5 ring-1 ring-inset ring-[#A68A64]/20' : ''}`}>
                    <div>
                      <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                        <span className={`text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#A68A64] text-white' : 'text-[#8C8C8C]'}`}>
                          {day}
                        </span>
                        {occupiedCount > 0 && (
                          <span className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${isFull ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-[#A68A64]/10 text-[#A68A64] border border-[#A68A64]/20'}`}>
                            {isFull ? 'Lleno' : `${occupiedCount}/${totalSuitesCount}`}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 overflow-y-auto max-h-[75px] sm:max-h-[85px] custom-scrollbar-light pr-0.5">
                        {dayReservations.map(res => {
                          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const [checkIn, checkOut] = (res.dates || '').split(' - ');
                          const isCheckIn = dateStr === checkIn;
                          const isCheckOut = dateStr === checkOut;
                          return (
                            <div
                              key={res.id}
                              onClick={() => setSelectedReservation(res)}
                              className="bg-[#A68A64]/10 border border-[#A68A64]/20 rounded-lg p-1 sm:p-1.5 flex items-center justify-between gap-1 cursor-pointer hover:bg-red-500/10 hover:border-red-400 transition-colors group"
                            >
                              <div className="flex items-center gap-1 overflow-hidden">
                                <BedDouble size={9} className="text-[#A68A64] group-hover:text-red-400 shrink-0" />
                                <span className="text-[8px] sm:text-[9px] font-bold text-[#A68A64] group-hover:text-red-400 truncate" title={res.guest_name}>
                                  Suite {res.room_id}: {res.guest_name}
                                </span>
                              </div>
                              {(isCheckIn || isCheckOut) && (
                                <span className={`text-[7px] px-1 py-0.5 rounded uppercase font-bold shrink-0 ${isCheckIn ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'}`}>
                                  {isCheckIn ? 'IN' : 'OUT'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {occupiedCount === 0 && (
                      <div className="text-[8px] sm:text-[9px] text-emerald-500 font-bold uppercase tracking-wider self-end opacity-60 truncate max-w-full">
                        <span className="hidden sm:inline">Disponible</span>
                        <span className="inline sm:hidden">Disp</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

        {/* Reservation Detail */}
        <ReservationDetail
          reservation={selectedReservation}
          rooms={rooms}
          onClose={() => setSelectedReservation(null)}
          onCancel={handleCancel}
        />
      </div>
  );
}


function ReservationDetail({ reservation, rooms, onClose, onCancel }: {
  reservation: Reservation | null;
  rooms: Room[];
  onClose: () => void;
  onCancel: (id: string) => Promise<void>;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  if (!reservation) return null;

  const room = rooms.find(r => r.id === reservation.room_id);
  const [checkIn, checkOut] = (reservation.dates || ' - ').split(' - ');

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[100] bg-[#2D2D2D]/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        transition={{ type: 'spring', damping: 28, stiffness: 200 }}
        className="fixed top-0 right-0 bottom-0 z-[110] w-full max-w-md bg-white shadow-2xl flex flex-col text-left overflow-hidden"
      >
        <div className="bg-[#F9F7F2] p-8 border-b border-[#E8E4D9] flex justify-between items-start shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white shadow-lg shadow-[#A68A64]/20 shrink-0">
              <CalendarCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-heading font-semibold text-[#2D2D2D] truncate max-w-[180px]">{reservation.guest_name}</h2>
              <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-0.5">Detalles de Reserva</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowConfirm(true)} className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors shadow-sm" title="Cancelar Reservación">
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-[#2D2D2D] transition-colors shadow-sm">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar-light">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Alojamiento</p>
            <div className="p-5 bg-[#A68A64]/5 border border-[#A68A64]/20 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E4D9] flex items-center justify-center text-[#A68A64] shadow-sm shrink-0">
                  <BedDouble size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#2D2D2D]">Suite {reservation.room_id}</h4>
                  <p className="text-xs text-[#8C8C8C] mt-0.5">{room?.name || 'Suite Premium'}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full text-[9px] font-bold uppercase tracking-widest">Confirmado</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Fechas de Estancia</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#F9F7F2] rounded-2xl border border-[#E8E4D9]">
                <span className="text-[8px] font-bold text-[#8C8C8C] uppercase tracking-widest block mb-1">Check-In</span>
                <span className="text-sm font-semibold text-[#2D2D2D]">{checkIn || '—'}</span>
              </div>
              <div className="p-4 bg-[#F9F7F2] rounded-2xl border border-[#E8E4D9]">
                <span className="text-[8px] font-bold text-[#8C8C8C] uppercase tracking-widest block mb-1">Check-Out</span>
                <span className="text-sm font-semibold text-[#2D2D2D]">{checkOut || '—'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Total</p>
            <div className="p-5 bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl flex items-center justify-between">
              <span className="text-lg font-bold text-[#A68A64]">${Number(reservation.total_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
              <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${reservation.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-[#C2A88D]/10 text-[#C2A88D] border-[#C2A88D]/20'}`}>
                {reservation.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Notas</p>
            <div className="p-5 bg-white border border-[#E8E4D9] rounded-2xl min-h-[80px]">
              <p className="text-xs text-[#6B6B6B] leading-relaxed italic">{reservation.notes || 'Sin especificaciones.'}</p>
            </div>
          </div>
        </div>

        {/* Confirm cancel overlay */}
        {showConfirm && (
          <div className="absolute inset-0 z-50 bg-[#2D2D2D]/95 backdrop-blur-md flex flex-col justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 text-red-500">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-heading font-semibold text-white mb-2">¿Confirmar Cancelación?</h3>
            <p className="text-xs text-[#8C8C8C] leading-relaxed max-w-[280px] mx-auto mb-8">
              Esta acción eliminará la reservación de forma permanente.
            </p>
            <div className="space-y-3">
              <button onClick={async () => { setShowConfirm(false); await onCancel(reservation.id); onClose(); }}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-xs font-bold tracking-widest uppercase transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]">
                Sí, Cancelar Reservación
              </button>
              <button onClick={() => setShowConfirm(false)}
                className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold tracking-widest uppercase transition-all border border-white/10 active:scale-[0.98]">
                No, Volver
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
