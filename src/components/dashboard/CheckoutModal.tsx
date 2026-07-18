"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut } from 'lucide-react';
import { API, apiFetch } from '@/lib/api';
import type { Room, Reservation, PosSale } from '@/types';
import { toast } from '@/components/Toast';
import SatisfactionSurvey from './SatisfactionSurvey';
import BillingSummary from './BillingSummary';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  currentReservation: Reservation | null;
  onSuccess: () => void;
}

export default function CheckoutModal({ isOpen, onClose, roomId, roomName, currentReservation, onSuccess }: Props) {
  const [survey, setSurvey] = useState({
    reception: { rating: 'Excelente', comment: '' },
    staff: { rating: 'Excelente', comment: '' },
    cleaning: { rating: 'Excelente', comment: '' },
    value: { rating: 'Excelente', comment: '' },
    comfort: { rating: 'Excelente', comment: '' },
    facilities: { rating: 'Excelente', comment: '' },
    recommend: 'yes',
    recommendWhy: '',
    generalSuggestions: '',
    overallScore: 10
  });

  const [extraCharges, setExtraCharges] = useState<{ id: string; product: string; amount: number }[]>([]);
  const [newProduct, setNewProduct] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [chargesPaid, setChargesPaid] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [barCharges, setBarCharges] = useState<any[]>([]);
  const [loadingBarCharges, setLoadingBarCharges] = useState(false);
  const [roomDetails, setRoomDetails] = useState<Room | null>(null);

  useEffect(() => {
    if (isOpen && roomId) {
      const fetchBarCharges = async () => {
        try {
          setLoadingBarCharges(true);
          const sales = await apiFetch<PosSale[]>(API.posSales);
          if (Array.isArray(sales)) {
            const roomSales = sales.filter(sale => {
              if (sale.payment_method !== 'Habitación') return false;
              const notesStr = sale.notes || '';
              return new RegExp(`\\b${roomId}\\b`).test(notesStr);
            });
            const itemsList: any[] = [];
            roomSales.forEach(sale => {
              try {
                const parsedItems = JSON.parse(sale.items_json || '[]');
                parsedItems.forEach((item: any) => {
                  itemsList.push({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    total: item.price * item.quantity,
                    date: sale.created_at
                  });
                });
              } catch (e) {
                console.error('Error parsing POS items_json:', e);
              }
            });
            setBarCharges(itemsList);
          }
        } catch (err) {
          console.error('Error loading bar charges:', err);
        } finally {
          setLoadingBarCharges(false);
        }
      };

      const fetchRoomDetails = async () => {
        try {
          const roomsList = await apiFetch<Room[]>(API.rooms);
          if (Array.isArray(roomsList)) {
            setRoomDetails(roomsList.find(r => r.id === roomId) || null);
          }
        } catch (e) {
          console.error('Error fetching room details:', e);
        }
      };

      fetchBarCharges();
      fetchRoomDetails();
    }
  }, [isOpen, roomId]);

  const dates = currentReservation?.dates || '';
  const [checkIn, checkOut] = dates.split(' - ');
  
  let nights = 1;
  if (checkIn && checkOut) {
    const start = new Date(checkIn + 'T12:00:00');
    const end = new Date(checkOut + 'T12:00:00');
    nights = checkIn === checkOut ? 1 : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  }

  const reservationNotes = currentReservation?.notes || '';
  const hasParking = reservationNotes.includes('Estacionamiento');
  const parkingTotal = hasParking ? nights * 50 : 0;

  const hasDayPass = reservationNotes.includes('Day Pass');
  let dayPassTotal = 0;
  let dayPassDetails = '';
  if (hasDayPass) {
    const match = reservationNotes.match(/Day Pass x(\d+)/);
    if (match) {
      const count = parseInt(match[1]);
      const isFood = reservationNotes.includes('con comida');
      dayPassTotal = count * (isFood ? 150 : 100);
      dayPassDetails = `Day Pass x${count}${isFood ? ' (con comida)' : ''}`;
    }
  }

  const roomTotal = currentReservation && typeof currentReservation.total_price === 'number'
    ? Math.max(0, currentReservation.total_price - dayPassTotal - parkingTotal)
    : ((roomDetails?.price || 0) * nights);
  
  const roomPrice = nights > 0 ? (roomTotal / nights) : (roomDetails?.price || 0);
  const totalBarAmount = barCharges.reduce((sum, item) => sum + item.total, 0);
  const totalExtraAmount = extraCharges.reduce((sum, c) => sum + c.amount, 0);
  const grandTotal = roomTotal + dayPassTotal + parkingTotal + totalBarAmount + totalExtraAmount;

  const handleAddCharge = () => {
    if (!newProduct.trim()) return toast.error('Especifica el nombre del producto.');
    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt <= 0) return toast.error('Ingresa un monto válido mayor a 0.');

    setExtraCharges([...extraCharges, { id: Date.now().toString(), product: newProduct.trim(), amount: amt }]);
    setNewProduct('');
    setNewAmount('');
  };

  const handleRemoveCharge = (id: string) => {
    setExtraCharges(extraCharges.filter(c => c.id !== id));
  };

  const handleSubmitCheckout = async () => {
    setSubmitting(true);
    try {
      const guestName = currentReservation?.guest_name || 'Huésped';
      const fullFeedbackData = {
        surveyDetails: survey,
        extraCharges: { items: extraCharges, total: totalExtraAmount, paid: chargesPaid }
      };

      await apiFetch(API.feedback, {
        method: 'POST',
        body: JSON.stringify({ guest_name: guestName, rating: survey.overallScore, comment: JSON.stringify(fullFeedbackData) })
      });

      await apiFetch(API.rooms, { method: 'PATCH', body: JSON.stringify({ id: roomId, status: 'available' }) });

      try {
        const stayReport = {
          checkIn: checkIn || '',
          checkOut: checkOut || '',
          nights,
          roomPrice,
          roomTotal,
          dayPass: { active: hasDayPass, details: dayPassDetails || 'N/A', total: dayPassTotal },
          parking: { active: hasParking, total: parkingTotal },
          barCharges,
          checkoutExtras: extraCharges,
          grandTotal,
          checkoutPaid: chargesPaid
        };

        await apiFetch(API.roomCharges, {
          method: 'POST',
          body: JSON.stringify({ room_id: roomId, guest_name: guestName, items_json: JSON.stringify(stayReport), total: grandTotal })
        });
      } catch (chargeErr) {
        console.error("[Checkout] Error saving stay report:", chargeErr);
      }

      if (currentReservation) {
        await apiFetch(API.reservations, { method: 'DELETE', body: JSON.stringify({ id: currentReservation.id }) });
      }

      toast.success(`Check-out de la Suite ${roomId} completado con éxito.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Error al realizar el Check-out: ' + (error.message || JSON.stringify(error)));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-[#2D2D2D]/60 backdrop-blur-sm" />
        <div className="flex min-h-screen items-center justify-center p-4 md:p-6 relative">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full max-w-4xl bg-white rounded-[40px] border border-[#E8E4D9] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#F9F7F2] p-6 md:p-8 border-b border-[#E8E4D9] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white shadow-lg"><LogOut size={22} /></div>
                <div>
                  <h2 className="text-xl font-heading font-semibold text-[#2D2D2D]">Formulario de Check-out</h2>
                  <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-0.5">Suite {roomId} &mdash; {roomName}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-red-500 shadow-sm"><X size={20} /></button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar-light text-left">
              <SatisfactionSurvey survey={survey} setSurvey={setSurvey} />
              <BillingSummary nights={nights} roomTotal={roomTotal} hasDayPass={hasDayPass} dayPassDetails={dayPassDetails} dayPassTotal={dayPassTotal} hasParking={hasParking} parkingTotal={parkingTotal} loadingBarCharges={loadingBarCharges} barCharges={barCharges} totalBarAmount={totalBarAmount} grandTotal={grandTotal} newProduct={newProduct} setNewProduct={setNewProduct} newAmount={newAmount} setNewAmount={setNewAmount} extraCharges={extraCharges} handleAddCharge={handleAddCharge} handleRemoveCharge={handleRemoveCharge} totalExtraAmount={totalExtraAmount} chargesPaid={chargesPaid} setChargesPaid={setChargesPaid} />
            </div>

            <div className="p-6 md:p-8 border-t border-[#E8E4D9] bg-[#F9F7F2] shrink-0 flex gap-4 justify-end">
              <button type="button" onClick={onClose} className="px-6 py-3 border border-[#E8E4D9] text-[#6B6B6B] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white">Cancelar</button>
              <button type="button" onClick={handleSubmitCheckout} disabled={submitting} className="px-8 py-3 bg-[#A68A64] hover:bg-[#8E7554] text-white rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-50 flex items-center gap-2">{submitting ? 'Finalizando...' : 'Finalizar y Check-out'}</button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
