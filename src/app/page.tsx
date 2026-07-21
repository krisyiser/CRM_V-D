"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BedDouble, CalendarCheck, Users, DollarSign, Loader2, Sparkles, Plus } from 'lucide-react';
import { apiFetch, API } from '@/lib/api';
import type { Room, Reservation, RoomCharge } from '@/types';
import RoomDetailPanel from '@/components/dashboard/RoomDetailPanel';
import GuestRegistrationModal from '@/components/dashboard/GuestRegistrationModal';
import CheckoutModal from '@/components/dashboard/CheckoutModal';
import StayReportModal from '@/components/dashboard/StayReportModal';

export default function DashboardPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInRoom, setCheckInRoom] = useState<Room | null>(null);
  const [checkInReservation, setCheckInReservation] = useState<Reservation | null>(null);

  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutRoom, setCheckoutRoom] = useState<Room | null>(null);

  // Stay Report Modal state
  const [checkoutChargeRecord, setCheckoutChargeRecord] = useState<RoomCharge | null>(null);
  const [showStayReportModal, setShowStayReportModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [roomsData, resData] = await Promise.all([
        apiFetch<Room[]>(API.rooms),
        apiFetch<Reservation[]>(API.reservations),
      ]);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setReservations(Array.isArray(resData) ? resData : []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date().toISOString().split('T')[0];
  const todayReservations = reservations.filter(r => {
    if (!r || r.status === 'Cancelled' || r.status === 'cancelled') return false;
    const checkIn = r.check_in || (r.dates?.split(' - ')[0] ?? '');
    const checkOut = r.check_out || (r.dates?.split(' - ')[1] ?? '');
    return today >= checkIn && today <= checkOut;
  });

  const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
  const reservedCount = rooms.filter(r => r.status === 'reserved').length;
  const occupancy = rooms.length > 0 ? Math.round(((occupiedCount + reservedCount) / rooms.length) * 100) : 0;
  const todayRevenue = todayReservations.reduce((sum, r) => sum + (r.total_price || 0), 0);

  const stats = [
    { label: 'Habitaciones Ocupadas', value: `${occupiedCount}/${rooms.length}`, icon: <BedDouble size={20} />, color: 'bg-[#A68A64]' },
    { label: 'Reservaciones Hoy', value: todayReservations.length, icon: <CalendarCheck size={20} />, color: 'bg-[#5B7B9A]' },
    { label: 'Huéspedes Activos', value: todayReservations.length, icon: <Users size={20} />, color: 'bg-[#C2A88D]' },
    { label: 'Revenue Hoy', value: `$${todayRevenue.toLocaleString('es-MX')}`, icon: <DollarSign size={20} />, color: 'bg-[#6B8F71]' },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'occupied':    return { bg: 'bg-[#A68A64]/10 border-[#A68A64]/30', dot: 'bg-[#A68A64]', text: 'Ocupada' };
      case 'reserved':    return { bg: 'bg-[#5B7B9A]/15 border-[#5B7B9A]/40', dot: 'bg-[#5B7B9A]', text: 'Reservada Hoy' };
      case 'maintenance': return { bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-500', text: 'Mantenimiento' };
      case 'cleaning':    return { bg: 'bg-blue-500/10 border-blue-500/30', dot: 'bg-blue-500', text: 'Limpieza' };
      default:            return { bg: 'bg-[#8E9B8E]/10 border-[#8E9B8E]/30', dot: 'bg-[#8E9B8E]', text: 'Disponible' };
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
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] border border-[#E8E4D9] p-5 flex items-center gap-4 shadow-sm"
          >
            <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center text-white shadow-md`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-bold text-[#2D2D2D] mt-0.5">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Occupancy Bar */}
      <div className="bg-white rounded-[24px] border border-[#E8E4D9] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Ocupación General</p>
          <span className="text-sm font-bold text-[#A68A64]">{occupancy}%</span>
        </div>
        <div className="w-full h-3 bg-[#F9F7F2] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${occupancy}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[#A68A64] to-[#C2A88D] rounded-full"
          />
        </div>
      </div>

      {/* Rooms Grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-[#A68A64]" />
            <h2 className="text-lg font-semibold text-[#2D2D2D]">Estado de Suites</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {rooms.map(room => {
            const effectiveStatus = room.status || 'available';
            const todayRes = todayReservations.find(r => String(r.room_id) === String(room.id));
            const st = getStatusStyle(effectiveStatus);

            return (
              <motion.div
                key={room.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRoom(room)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`text-left p-5 rounded-[24px] border ${st.bg} transition-all shadow-sm hover:shadow-md cursor-pointer`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-[#2D2D2D]">{room.id}</span>
                  <span className={`w-3 h-3 rounded-full ${st.dot} ring-4 ring-white`} />
                </div>
                <p className="text-sm font-semibold text-[#4A4A4A] truncate">{room.name}</p>
                <p className="text-[10px] text-[#8C8C8C] uppercase tracking-widest font-bold mt-1">{room.room_type}</p>
                <div className="mt-3 pt-3 border-t border-[#E8E4D9]/50">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: st.dot.replace('bg-', '') }}>
                    {st.text}
                  </p>
                  {todayRes && (
                    <p className="text-[10px] text-[#5B7B9A] font-bold mt-1 truncate">
                      Huésped: {todayRes.guest_name}
                    </p>
                  )}
                </div>
                {(effectiveStatus === 'available' || effectiveStatus === 'reserved') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCheckInRoom(room);
                      setCheckInReservation(todayRes || null);
                      setShowCheckIn(true);
                    }}
                    className={`mt-3 w-full py-2 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
                      effectiveStatus === 'reserved' ? 'bg-[#5B7B9A] hover:bg-[#4A6A89]' : 'bg-[#8E9B8E] hover:bg-[#7A8A7A]'
                    }`}
                  >
                    <Plus size={12} /> Check-In {todayRes ? `(${todayRes.guest_name.split(' ')[0]})` : ''}
                  </button>
                )}
              </motion.div>
            );
          })}

        </div>
      </div>

      {/* Room Detail Slide Panel */}
      <AnimatePresence>
        {selectedRoom && (
          <RoomDetailPanel
            isOpen={!!selectedRoom}
            room={selectedRoom}
            currentReservation={reservations.find(r => r && r.status !== 'Cancelled' && r.status !== 'cancelled' && r.room_id === selectedRoom.id && today >= (r.dates?.split(' - ')[0] ?? '') && today <= (r.dates?.split(' - ')[1] ?? '')) || null}
            upcomingReservations={reservations.filter(r => r && r.status !== 'Cancelled' && r.status !== 'cancelled' && r.room_id === selectedRoom.id && (r.dates?.split(' - ')[0] ?? '') > today)}
            onClose={() => setSelectedRoom(null)}
            onCheckout={() => {
              setCheckoutRoom(selectedRoom);
              setShowCheckout(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Check-in Modal */}
      {showCheckIn && checkInRoom && (
        <GuestRegistrationModal
          isOpen={showCheckIn}
          onClose={() => { setShowCheckIn(false); setCheckInRoom(null); setCheckInReservation(null); }}
          room={checkInRoom}
          reservation={checkInReservation}
          onSuccess={fetchData}
        />
      )}

      {/* Checkout Modal */}
      {showCheckout && checkoutRoom && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => { setShowCheckout(false); setCheckoutRoom(null); }}
          roomId={checkoutRoom.id}
          roomName={checkoutRoom.name}
          currentReservation={reservations.find(r => r.room_id === checkoutRoom.id) || null}
          onSuccess={(createdCharge) => {
            fetchData();
            if (createdCharge) {
              setCheckoutChargeRecord(createdCharge);
              setShowStayReportModal(true);
            }
          }}
        />
      )}

      {/* Immediate Stay Report Modal for billing/invoicing */}
      <StayReportModal
        isOpen={showStayReportModal}
        onClose={() => {
          setShowStayReportModal(false);
          setCheckoutChargeRecord(null);
        }}
        guestName={checkoutChargeRecord ? checkoutChargeRecord.guest_name : ''}
        chargeRecord={checkoutChargeRecord}
      />
    </div>
  );
}
