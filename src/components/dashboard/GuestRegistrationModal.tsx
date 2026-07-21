"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import { API, apiFetch } from '@/lib/api';
import type { Room, Guest, Reservation } from '@/types';
import { toast } from '@/components/Toast';
import GuestForm from './GuestForm';
import StayOptions from './StayOptions';
import ChargeSummary from './ChargeSummary';
import { getTodayDateStr, isReservationActiveOnDate } from '@/lib/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  room?: Room | null;
  reservation?: Reservation | null;
  onSuccess?: () => void;
}

export default function GuestRegistrationModal({ isOpen, onClose, room, reservation, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [fetchingRooms, setFetchingRooms] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    checkIn: '',
    checkOut: '',
    roomId: room?.id || '',
    extraPersons: 0,
    extraCharge: 0,
    dayPasses: 0,
    dayPassWithFood: false,
    parking: false,
    paymentMethod: 'Efectivo',
    isHighSeason: false,
    basePrice: 0,
    total: 0,
    notes: '',
    idNumber: '',
    origin: ''
  });
  const [extraChargesList, setExtraChargesList] = useState<{ concept: string; amount: number }[]>([]);
  const [newConcept, setNewConcept] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const pricingMatrix: Record<string, any> = {
    '101': { alta: 2800, baja: 2300, semana: 1900 },
    '102': { alta: 1950, baja: 1600, semana: 1200 },
    '105': { alta: 1950, baja: 1600, semana: 1200 },
    '104': { alta: 1400, baja: 1100, semana: 900 },
    '103': { alta: 1400, baja: 1100, semana: 900 },
  };

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setFetchingRooms(true);
        try {
          const data = await apiFetch<Room[]>(API.rooms);
          setRooms(data);
          const resData = await apiFetch<Reservation[]>(API.reservations).catch(() => []);
          const targetRoomId = room?.id || formData.roomId;
          const activeRes = reservation || resData.find(r => r && String(r.room_id) === String(targetRoomId) && isReservationActiveOnDate(r, getTodayDateStr()));

          if (activeRes) {
            const ci = activeRes.check_in || (activeRes.dates?.split(' - ')[0] ?? '');
            const co = activeRes.check_out || (activeRes.dates?.split(' - ')[1] ?? '');
            setFormData(prev => ({
              ...prev,
              name: activeRes.guest_name || prev.name,
              phone: (activeRes as any).guest_phone || (activeRes as any).phone || prev.phone,
              email: (activeRes as any).guest_email || (activeRes as any).email || prev.email,
              checkIn: ci,
              checkOut: co,
              roomId: activeRes.room_id || targetRoomId || (data[0]?.id ?? '101'),
              notes: activeRes.notes || prev.notes,
              total: activeRes.total_price || prev.total
            }));
          } else if (room) {
            setFormData(prev => ({ ...prev, roomId: room.id }));
          } else if (data.length > 0) {
            const available = data.filter(r => r.status === 'available');
            setFormData(prev => ({ ...prev, roomId: available[0]?.id || data[0].id }));
          }

          const settings = await apiFetch<Record<string, string>>(API.settings);
          if (settings.is_high_season === 'true') {
            setFormData(prev => ({ ...prev, isHighSeason: true }));
          }
        } catch (error) {
          console.error("Error fetching available rooms:", error);
        } finally {
          setFetchingRooms(false);
        }
      };
      loadData();
    }
  }, [isOpen, room, reservation]);

  const getPriceForDate = (dateStr: string, roomId: string, forceHigh: boolean) => {
    if (!dateStr) return 0;
    if (forceHigh) return pricingMatrix[roomId]?.alta || 0;

    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDay();
    let type = 'semana';
    if (day === 6) type = 'alta';
    if (day === 0 || day === 4 || day === 5) type = 'baja';

    return pricingMatrix[roomId]?.[type] || 0;
  };

  useEffect(() => {
    if (!formData.checkIn || !formData.checkOut || !formData.roomId) return;

    const start = new Date(formData.checkIn + 'T12:00:00');
    const end = new Date(formData.checkOut + 'T12:00:00');
    let totalStayPrice = 0;
    let nights = 0;

    if (formData.checkIn === formData.checkOut) {
      totalStayPrice = getPriceForDate(formData.checkIn, formData.roomId, formData.isHighSeason);
      nights = 1;
    } else {
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const currentStr = d.toISOString().split('T')[0];
        totalStayPrice += getPriceForDate(currentStr, formData.roomId, formData.isHighSeason);
        nights++;
      }
    }

    const dayPassPrice = formData.dayPassWithFood ? 150 : 100;
    const parkingFee = formData.parking ? (nights * 50) : 0;
    const extraChargesSum = extraChargesList.reduce((acc, curr) => acc + curr.amount, 0);
    const extras = (formData.extraPersons * 250) + extraChargesSum + (formData.dayPasses * dayPassPrice) + parkingFee;
    let finalTotal = totalStayPrice + extras;
    
    if (formData.paymentMethod === 'Tarjeta') {
      finalTotal = finalTotal * 1.05;
    }
    
    setFormData(prev => ({ ...prev, basePrice: totalStayPrice, total: finalTotal }));
  }, [formData.roomId, formData.isHighSeason, formData.checkIn, formData.checkOut, formData.extraPersons, formData.dayPasses, formData.dayPassWithFood, formData.parking, formData.paymentMethod, rooms, extraChargesList]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const guest = await apiFetch<Guest>(API.guests, {
        method: 'POST',
        body: JSON.stringify({ 
          name: formData.name.trim(), 
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          id_number: (formData.idNumber || "N/A").trim(),
          origin: (formData.origin || "No especificado").trim()
        })
      });

      const start = new Date(formData.checkIn + 'T12:00:00');
      const end = new Date(formData.checkOut + 'T12:00:00');
      const nights = formData.checkIn === formData.checkOut ? 1 : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
      
      const parkingInfo = formData.parking ? ` | Estacionamiento (${nights} día${nights > 1 ? 's' : ''})` : '';
      const dayPassInfo = formData.dayPasses > 0 ? ` | Day Pass x${formData.dayPasses}${formData.dayPassWithFood ? ' (con comida)' : ''}` : '';
      const extrasStr = `Extras: ${extraChargesList.map(e => e.concept + '($' + e.amount + ')').join(', ')}${dayPassInfo}${parkingInfo}`;

      await apiFetch(API.reservations, {
        method: 'POST',
        body: JSON.stringify({ 
          guest_id: guest.id, 
          guest_name: formData.name.trim(),
          room_id: formData.roomId, 
          check_in: formData.checkIn,
          check_out: formData.checkOut,
          notes: `${formData.notes.trim()} | Procedencia: ${(formData.origin || 'N/A').trim()} | Pago: ${formData.paymentMethod} | ${extrasStr}`,
          payment_status: 'paid',
          total_price: formData.total
        })
      });

      await apiFetch(API.rooms, {
        method: 'PATCH',
        body: JSON.stringify({ id: formData.roomId, status: 'occupied' })
      });

      toast.success('Check-in completado exitosamente.');
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      toast.error('Error al procesar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 lg:p-12 overflow-hidden">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#2D2D2D]/40 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-3xl bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <div className="bg-[#F9F7F2] p-6 md:p-8 border-b border-[#E8E4D9] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white shadow-lg shadow-[#A68A64]/20"><CheckCircle2 size={24} /></div>
              <div>
                <h2 className="text-xl font-heading font-semibold text-[#2D2D2D]">Check-in de Huésped</h2>
                <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-0.5">Protocolo Lobby PWA</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-red-500 transition-colors shadow-sm"><X size={20} /></button>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar-light text-left flex-grow">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <GuestForm formData={formData} setFormData={setFormData} extraChargesList={extraChargesList} setExtraChargesList={setExtraChargesList} newConcept={newConcept} setNewConcept={setNewConcept} newAmount={newAmount} setNewAmount={setNewAmount} />
                <StayOptions formData={formData} setFormData={setFormData} rooms={rooms} fetchingRooms={fetchingRooms} />
              </div>
              <ChargeSummary total={formData.total} paymentMethod={formData.paymentMethod} notes={formData.notes} setNotes={(val) => setFormData(prev => ({ ...prev, notes: val }))} loading={loading} onClose={onClose} />
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
