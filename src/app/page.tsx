"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BedDouble, TrendingUp, Search, Plus, ChevronRight } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';
import GuestRegistrationModal from '../components/dashboard/GuestRegistrationModal';
import RoomDetailPanel from '../components/dashboard/RoomDetailPanel';
import CheckoutModal from '../components/dashboard/CheckoutModal';
import { SkeletonCard, SkeletonStat } from '../components/Skeleton';

export default function Overview() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutRoomId, setCheckoutRoomId] = useState('');
  const [checkoutRoomName, setCheckoutRoomName] = useState('');
  const [checkoutReservation, setCheckoutReservation] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [roomsData, resData] = await Promise.all([
          apiFetch<any[]>(API_ENDPOINTS.rooms),
          apiFetch<any[]>(API_ENDPOINTS.reservations)
        ]);
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setReservations(Array.isArray(resData) ? resData : []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getCurrentReservationForRoom = (roomId: string) => {
    if (!Array.isArray(reservations)) return null;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return reservations.find(r => {
      if (r.roomId !== roomId) return false;
      const [checkIn, checkOut] = (r.dates || '').split(' - ');
      return todayStr >= checkIn && todayStr <= checkOut;
    }) || null;
  };

  const getUpcomingReservationsForRoom = (roomId: string) => {
    if (!Array.isArray(reservations)) return [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return reservations.filter(r => {
      if (r.roomId !== roomId) return false;
      const [checkIn] = (r.dates || '').split(' - ');
      return checkIn > todayStr;
    }).sort((a, b) => {
      const [checkInA] = (a.dates || '').split(' - ');
      const [checkInB] = (b.dates || '').split(' - ');
      return checkInA.localeCompare(checkInB);
    });
  };

  const getGuestForRoom = (room: any) => {
    if (room.status !== 'occupied') return '-';
    const res = getCurrentReservationForRoom(room.id);
    return res ? res.guestName : '-';
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const occupiedCount = Array.isArray(rooms) ? rooms.filter(r => r.status === 'occupied').length : 0;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;
  const todayCheckins = reservations.filter(r => {
    if (!r.dates) return false;
    const [ci] = r.dates.split(' - ');
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return ci === todayStr;
  }).length;

  const getOccupancyTrend = (rate: number) => rate >= 80 ? 'Cap. Alta' : rate >= 40 ? 'Estable' : 'Baja';
  const getOutTrend = (count: number) => count > 0 ? 'Pendiente' : 'Al día';
  const getInTrend = (count: number) => count > 0 ? 'Frecuente' : 'Normal';

  const stats = [
    { label: 'Check-ins Hoy', value: todayCheckins.toString(), color: 'bg-[#A68A64]', trend: getInTrend(todayCheckins) },
    { label: 'Ocupación Total', value: `${occupancyRate}%`, color: 'bg-[#8E9B8E]', trend: getOccupancyTrend(occupancyRate) },
    { label: 'Salidas Pendientes', value: occupiedCount.toString(), color: 'bg-[#C2A88D]', trend: getOutTrend(occupiedCount) },
  ];

  const handleQuickCheckout = (roomId: string) => {
    const activeRes = getCurrentReservationForRoom(roomId);
    const roomObj = rooms.find(r => r.id === roomId);
    setCheckoutRoomId(roomId);
    setCheckoutRoomName(roomObj ? roomObj.name : `Suite ${roomId}`);
    setCheckoutReservation(activeRes);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="flex flex-col gap-10 text-left">
      {/* Daily pressure banner */}
      <div className="bg-[#A68A64] rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl shadow-[#A68A64]/20 group">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-[0.2em]">Temporada Alta</span>
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          </div>
          <h2 className="text-4xl font-heading font-medium mb-2">Estado del Lobby</h2>
          <p className="text-white/80 max-w-md text-sm leading-relaxed">
            Hay <span className="font-bold text-white">{todayCheckins} check-ins</span> programados para hoy.
            El equipo de limpieza ha reportado <span className="font-bold text-white">{rooms.filter(r => r.status === 'available').length} suites</span> listas para entrega.
          </p>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700">
          <BedDouble size={240} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-heading font-medium text-[#2D2D2D]">Panel de Control</h1>
          <p className="text-sm text-[#8C8C8C] mt-1">Gestión operativa y estado del inventario</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden xl:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8C8C]" size={16} />
            <input
              type="text"
              placeholder="Buscar habitación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-[#E8E4D9] rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all w-64 text-[#2D2D2D]"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#A68A64] text-white px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-[#8E7554] shadow-sm transition-all active:scale-95"
          >
            <Plus size={18} /> Registrar Ingreso
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <><SkeletonStat /><SkeletonStat /><SkeletonStat /></>
        ) : (
          stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-[#E8E4D9] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C8C8C]">{stat.label}</p>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F9F7F2] text-[#A68A64] border border-[#E8E4D9]">{stat.trend}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-heading font-medium text-[#2D2D2D]">{stat.value}</span>
                <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                  <TrendingUp size={16} />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2D2D2D] flex items-center gap-2">
            Estado de Suites
            {!loading && <span className="text-[10px] font-bold bg-[#F2EEE4] text-[#8C8C8C] px-2 py-0.5 rounded-full">{rooms.length} Total</span>}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {loading ? (
            Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            filteredRooms.map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white p-6 rounded-3xl border border-[#E8E4D9] shadow-sm hover:border-[#A68A64]/50 transition-all flex flex-col justify-between min-h-[220px] cursor-pointer"
                onClick={() => setSelectedRoom(room)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      room.status === 'available' ? 'bg-[#8E9B8E]/10 text-[#8E9B8E]' :
                      room.status === 'occupied' ? 'bg-[#A68A64]/10 text-[#A68A64]' :
                      'bg-[#C2A88D]/10 text-[#C2A88D]'
                    }`}>
                      <BedDouble size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest">{room.id}</p>
                      <h3 className="font-semibold text-[#2D2D2D] leading-tight">{room.name}</h3>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase tracking-tighter ${
                    room.status === 'available' ? 'bg-[#8E9B8E]/10 text-[#8E9B8E]' :
                    room.status === 'occupied' ? 'bg-[#A68A64]/10 text-[#A68A64]' :
                    'bg-[#C2A88D]/10 text-[#C2A88D]'
                  }`}>
                    {room.status === 'available' ? 'Libre' : room.status === 'occupied' ? 'En Uso' : 'Mantenim.'}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#F9F7F2]">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-[0.1em]">Huésped Actual</span>
                      <span className="text-sm font-medium text-[#4A4A4A] truncate max-w-[100px]">{getGuestForRoom(room)}</span>
                    </div>
                    <div className="flex gap-2">
                      {room.status === 'occupied' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleQuickCheckout(room.id); }}
                          className="px-3 py-2 bg-[#F9F7F2] hover:bg-[#A68A64] text-[#A68A64] hover:text-white text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all border border-[#E8E4D9]"
                        >
                          Checkout
                        </button>
                      )}
                      <div className="w-8 h-8 rounded-full bg-[#F9F7F2] flex items-center justify-center text-[#8C8C8C] group-hover:text-[#A68A64] transition-colors border border-[#E8E4D9]">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <GuestRegistrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <RoomDetailPanel
        isOpen={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        room={selectedRoom}
        currentReservation={selectedRoom ? getCurrentReservationForRoom(selectedRoom.id) : null}
        upcomingReservations={selectedRoom ? getUpcomingReservationsForRoom(selectedRoom.id) : []}
        onCheckout={handleQuickCheckout}
      />
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        roomId={checkoutRoomId}
        roomName={checkoutRoomName}
        currentReservation={checkoutReservation}
        onSuccess={async () => {
          // Refresh rooms and reservations lists on successful checkout
          try {
            const [roomsData, resData] = await Promise.all([
              apiFetch<any[]>(API_ENDPOINTS.rooms),
              apiFetch<any[]>(API_ENDPOINTS.reservations)
            ]);
            setRooms(Array.isArray(roomsData) ? roomsData : []);
            setReservations(Array.isArray(resData) ? resData : []);
          } catch (err) {
            console.error('Error refreshing room data after checkout:', err);
          }
        }}
      />
    </div>
  );
}
