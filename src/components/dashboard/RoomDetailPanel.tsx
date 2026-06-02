"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BedDouble, User, CalendarCheck, LogOut, MoreHorizontal, Edit2, Phone, Mail } from 'lucide-react';

interface Reservation {
  id: string;
  guestId: string;
  guestName: string;
  roomId: string;
  dates: string;
  notes?: string;
  paymentStatus: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room: any;
  currentReservation: Reservation | null;
  upcomingReservations: Reservation[];
  onCheckout: (roomId: string) => void;
}

export default function RoomDetailPanel({ isOpen, onClose, room, currentReservation, upcomingReservations = [], onCheckout }: Props) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [ratings, setRatings] = useState({
    reception: 0,
    staff: 0,
    cleaning: 0,
    value: 0,
    comfort: 0,
    facilities: 0,
    overall: 10,
    recommend: 'yes'
  });
  const [comments, setComments] = useState('');

  if (!room) return null;

  const statusLabel = room.status === 'available' ? 'Disponible' : room.status === 'occupied' ? 'En Uso' : 'Mantenimiento';
  const statusColor = room.status === 'available' ? 'text-[#8E9B8E] bg-[#8E9B8E]/10 border-[#8E9B8E]/20' :
    room.status === 'occupied' ? 'text-[#A68A64] bg-[#A68A64]/10 border-[#A68A64]/20' :
    'text-[#C2A88D] bg-[#C2A88D]/10 border-[#C2A88D]/20';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-[#2D2D2D]/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: 'spring', damping: 28, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-[110] w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-[#F9F7F2] p-8 border-b border-[#E8E4D9] flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${statusColor}`}>
                  <BedDouble size={22} />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest">{room.id}</p>
                  <h2 className="text-xl font-heading font-medium text-[#2D2D2D]">{room.name}</h2>
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusColor}`}>{statusLabel}</span>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-red-500 transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 text-left custom-scrollbar-light">
              {/* Room info */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Detalles de Suite</p>
                {[
                  { label: 'Categoría', value: room.roomType || 'Estándar' },
                  { label: 'Precio por Noche', value: room.price ? `$${room.price.toLocaleString()} MXN` : '—' },
                  { label: 'Capacidad', value: room.capacity ? `${room.capacity} personas` : '—' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center p-4 bg-[#F9F7F2] rounded-2xl border border-[#E8E4D9]">
                    <span className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">{item.label}</span>
                    <span className="text-sm font-semibold text-[#2D2D2D]">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Current guest */}
              {currentReservation ? (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Huésped Actual</p>
                  <div className="p-6 bg-[#A68A64]/5 border border-[#A68A64]/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#A68A64] flex items-center justify-center text-white font-bold text-sm">
                        {currentReservation.guestName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#2D2D2D]">{currentReservation.guestName}</p>
                        <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest">Huésped Activo</p>
                      </div>
                    </div>
                    {[
                      { icon: <CalendarCheck size={14} />, label: 'Fechas', value: currentReservation.dates },
                      { icon: <User size={14} />, label: 'Pago', value: currentReservation.paymentStatus === 'paid' ? 'Pagado ✓' : 'Pendiente' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-3 text-sm text-[#6B6B6B]">
                        <span className="text-[#A68A64]">{row.icon}</span>
                        <span className="font-bold text-[10px] text-[#8C8C8C] uppercase tracking-widest w-16">{row.label}</span>
                        <span className="font-medium text-[#2D2D2D]">{row.value}</span>
                      </div>
                    ))}
                    {currentReservation.notes && (
                      <p className="text-xs text-[#8C8C8C] italic border-t border-[#A68A64]/10 pt-3">{currentReservation.notes}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Huésped Actual</p>
                  <div className="py-8 text-center border border-dashed border-[#E8E4D9] rounded-2xl bg-[#F9F7F2]">
                    <BedDouble size={24} className="mx-auto text-[#E8E4D9] mb-2" />
                    <p className="text-xs text-[#8C8C8C] font-semibold">Sin huésped hospedado hoy</p>
                  </div>
                </div>
              )}

              {/* Upcoming reservations */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Próximas Reservaciones</p>
                {upcomingReservations.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-[#E8E4D9] rounded-2xl bg-[#F9F7F2]">
                    <p className="text-xs text-[#8C8C8C] font-semibold">Sin reservaciones próximas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingReservations.map(res => (
                      <div key={res.id} className="p-4 bg-white border border-[#E8E4D9] rounded-2xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-[#2D2D2D]">{res.guestName}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${
                            res.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[#C2A88D]/10 text-[#C2A88D]'
                          }`}>
                            {res.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#A68A64] font-semibold">{res.dates}</p>
                        {res.notes && <p className="text-[10px] text-[#8C8C8C] italic border-t border-dashed border-[#E8E4D9] pt-2">{res.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            {room.status === 'occupied' && (
              <div className="p-8 border-t border-[#E8E4D9] shrink-0 flex gap-4">
                <button
                  onClick={() => {
                    onCheckout(room.id);
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#A68A64] text-white rounded-2xl text-xs font-bold tracking-widest uppercase hover:bg-[#8E7554] transition-all shadow-lg shadow-[#A68A64]/20 active:scale-95"
                >
                  <LogOut size={16} /> Procesar Check-out
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
