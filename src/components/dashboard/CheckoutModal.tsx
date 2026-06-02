"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Plus, Trash2, CheckCircle2, DollarSign } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../../lib/api';
import { toast } from '../Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  currentReservation: any;
  onSuccess: () => void;
}

export default function CheckoutModal({ isOpen, onClose, roomId, roomName, currentReservation, onSuccess }: Props) {
  // Survey state
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

  // Extra charges state
  const [extraCharges, setExtraCharges] = useState<{ id: string; product: string; amount: number }[]>([]);
  const [newProduct, setNewProduct] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [chargesPaid, setChargesPaid] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Bar charges and room info states
  const [barCharges, setBarCharges] = useState<any[]>([]);
  const [loadingBarCharges, setLoadingBarCharges] = useState(false);
  const [roomDetails, setRoomDetails] = useState<any>(null);

  const ratingOptions = ['Excelente', 'Buena', 'Regular', 'Mala'];

  useEffect(() => {
    if (isOpen && roomId) {
      fetchBarCharges();
      fetchRoomDetails();
    }
  }, [isOpen, roomId]);

  const fetchBarCharges = async () => {
    try {
      setLoadingBarCharges(true);
      const sales = await apiFetch<any[]>(API_ENDPOINTS.posSales);
      if (Array.isArray(sales)) {
        const roomSales = sales.filter(sale => {
          if (sale.paymentMethod !== 'Habitación') return false;
          const notesStr = sale.notes || '';
          const roomPattern = new RegExp(`\\b${roomId}\\b`);
          return roomPattern.test(notesStr);
        });

        const itemsList: any[] = [];
        roomSales.forEach(sale => {
          try {
            const parsedItems = JSON.parse(sale.itemsJson || '[]');
            parsedItems.forEach((item: any) => {
              itemsList.push({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                total: item.price * item.quantity,
                date: sale.createdAt
              });
            });
          } catch (e) {
            console.error('Error parsing POS sale itemsJson:', e);
          }
        });
        setBarCharges(itemsList);
      }
    } catch (err) {
      console.error('Error loading room bar charges:', err);
    } finally {
      setLoadingBarCharges(false);
    }
  };

  const fetchRoomDetails = async () => {
    try {
      const roomsList = await apiFetch<any[]>(API_ENDPOINTS.rooms);
      if (Array.isArray(roomsList)) {
        const found = roomsList.find(r => r.id === roomId);
        setRoomDetails(found || null);
      }
    } catch (e) {
      console.error('Error fetching room details:', e);
    }
  };

  // Parse stay dates & calculate nights
  const dates = currentReservation?.dates || '';
  const [checkIn, checkOut] = dates.split(' - ');
  
  let nights = 1;
  if (checkIn && checkOut) {
    const start = new Date(checkIn + 'T12:00:00');
    const end = new Date(checkOut + 'T12:00:00');
    nights = checkIn === checkOut ? 1 : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  }

  const roomPrice = roomDetails?.price || 0;
  const roomTotal = roomPrice * nights;

  // Parse Day Pass and Parking info from currentReservation.notes
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
      const rate = isFood ? 150 : 100;
      dayPassTotal = count * rate;
      dayPassDetails = `Day Pass x${count}${isFood ? ' (con comida)' : ''}`;
    }
  }

  const totalBarAmount = barCharges.reduce((sum, item) => sum + item.total, 0);
  const totalExtraAmount = extraCharges.reduce((sum, c) => sum + c.amount, 0);
  const grandTotal = roomTotal + dayPassTotal + parkingTotal + totalBarAmount + totalExtraAmount;

  const handleAddCharge = () => {
    if (!newProduct.trim()) {
      toast.error('Especifica el nombre del producto.');
      return;
    }
    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Ingresa un monto válido mayor a 0.');
      return;
    }

    setExtraCharges([
      ...extraCharges,
      { id: Date.now().toString(), product: newProduct.trim(), amount: amt }
    ]);
    setNewProduct('');
    setNewAmount('');
  };

  const handleRemoveCharge = (id: string) => {
    setExtraCharges(extraCharges.filter(c => c.id !== id));
  };


  const handleSubmitCheckout = async () => {
    setSubmitting(true);
    try {
      const guestName = currentReservation?.guestName || 'Huésped';

      // 1. Serialize entire satisfaction survey to save in the comment field
      const fullFeedbackData = {
        surveyDetails: survey,
        extraCharges: {
          items: extraCharges,
          total: totalExtraAmount,
          paid: chargesPaid
        }
      };

      // Send feedback using add_feedback Tauri command/API
      await apiFetch(API_ENDPOINTS.feedback, {
        method: 'POST',
        body: JSON.stringify({
          guestName: guestName,
          rating: survey.overallScore,
          comment: JSON.stringify(fullFeedbackData)
        })
      });

      // 2. Perform checkout (set room to available/maintenance & delete reservation)
      await apiFetch(API_ENDPOINTS.rooms, {
        method: 'PATCH',
        body: JSON.stringify({ id: roomId, status: 'available' }) // Free the room to available
      });

      // 3. Save the complete stay report inside room_charges SQLite table
      try {
        const stayReport = {
          checkIn: checkIn || '',
          checkOut: checkOut || '',
          nights,
          roomPrice,
          roomTotal,
          dayPass: {
            active: hasDayPass,
            details: dayPassDetails || 'N/A',
            total: dayPassTotal
          },
          parking: {
            active: hasParking,
            total: parkingTotal
          },
          barCharges: barCharges,
          checkoutExtras: extraCharges,
          grandTotal: grandTotal,
          checkoutPaid: chargesPaid
        };

        await apiFetch(API_ENDPOINTS.roomCharges, {
          method: 'POST',
          body: JSON.stringify({
            roomId: roomId,
            guestName: guestName,
            itemsJson: JSON.stringify(stayReport),
            total: grandTotal
          })
        });
      } catch (chargeErr) {
        console.error("[Checkout] Error saving stay report inside room_charges:", chargeErr);
      }

      if (currentReservation) {
        // Delete active reservation from SQLite to free the room
        await apiFetch(API_ENDPOINTS.reservations, {
          method: 'DELETE',
          body: JSON.stringify({ id: currentReservation.id })
        });
      }

      toast.success(`Check-out de la Suite ${roomId} completado con éxito.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error('Error al realizar el Check-out: ' + (error.message || JSON.stringify(error)));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#2D2D2D]/60 backdrop-blur-sm"
        />

        {/* Modal Wrapper */}
        <div className="flex min-h-screen items-center justify-center p-4 md:p-6 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-4xl bg-white rounded-[40px] border border-[#E8E4D9] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-[#F9F7F2] p-6 md:p-8 border-b border-[#E8E4D9] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white shadow-lg shadow-[#A68A64]/20">
                  <LogOut size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-semibold text-[#2D2D2D]">Formulario de Check-out</h2>
                  <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-0.5">
                    Suite {roomId} &mdash; {roomName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-red-500 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar-light text-left">
              
              {/* Satisfaction Survey Block */}
              <div className="space-y-6">
                <div className="text-center border-b border-[#E8E4D9]/50 pb-6">
                  <h3 className="text-2xl font-heading font-medium text-[#2D2D2D]">¡Gracias por su estancia!</h3>
                  <p className="text-xs text-[#8C8C8C] mt-1">Nos encantaría conocer su opinión. Su satisfacción es muy importante para nosotros.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Category survey renderer */}
                  {[
                    { key: 'reception', label: 'Recepción y Check-in', question: '¿Cómo califica su experiencia al llegar?' },
                    { key: 'staff', label: 'Atención del Personal', question: '¿Cómo fue el trato recibido?' },
                    { key: 'cleaning', label: 'Limpieza de la Habitación', question: '¿Cómo encontró la limpieza?' },
                    { key: 'value', label: 'Relación Calidad - Precio', question: '¿Cómo califica la relación precio-servicio?' },
                    { key: 'comfort', label: 'Comodidad', question: 'Califique cama, almohadas, temperatura y ruido:' },
                    { key: 'facilities', label: 'Instalaciones', question: 'Califique áreas comunes, servicios y estado general:' }
                  ].map(cat => (
                    <div key={cat.key} className="space-y-3 p-5 bg-[#F9F7F2]/50 border border-[#E8E4D9]/60 rounded-3xl text-left">
                      <div>
                        <h4 className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wider">{cat.label}</h4>
                        <p className="text-[11px] text-[#8C8C8C] mt-0.5">{cat.question}</p>
                      </div>

                      {/* Options */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {ratingOptions.map(opt => {
                          const isSelected = (survey as any)[cat.key].rating === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSurvey({
                                ...survey,
                                [cat.key]: { ...(survey as any)[cat.key], rating: opt }
                              })}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                isSelected
                                  ? 'bg-[#A68A64] text-white border-[#A68A64] shadow-sm shadow-[#A68A64]/10'
                                  : 'bg-white text-[#6B6B6B] border-[#E8E4D9] hover:bg-[#F9F7F2]'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        placeholder="Comentarios adicionales..."
                        value={(survey as any)[cat.key].comment}
                        onChange={(e) => setSurvey({
                          ...survey,
                          [cat.key]: { ...(survey as any)[cat.key], comment: e.target.value }
                        })}
                        className="w-full bg-white border border-[#E8E4D9] rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                      />
                    </div>
                  ))}

                  {/* Recommendation Check */}
                  <div className="space-y-3 p-5 bg-[#F9F7F2]/50 border border-[#E8E4D9]/60 rounded-3xl text-left">
                    <div>
                      <h4 className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wider">¿Recomendaría nuestro hotel?</h4>
                      <p className="text-[11px] text-[#8C8C8C] mt-0.5">Su recomendación es vital para nosotros.</p>
                    </div>
                    <div className="flex gap-4 pt-1">
                      {['yes', 'no'].map(opt => {
                        const isSelected = survey.recommend === opt;
                        return (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="recommend"
                              checked={isSelected}
                              onChange={() => setSurvey({ ...survey, recommend: opt })}
                              className="text-[#A68A64] focus:ring-[#A68A64]/30"
                            />
                            <span className="text-xs font-semibold text-[#2D2D2D] uppercase">
                              {opt === 'yes' ? 'Sí' : 'No'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      placeholder="¿Por qué?"
                      value={survey.recommendWhy}
                      onChange={(e) => setSurvey({ ...survey, recommendWhy: e.target.value })}
                      className="w-full bg-white border border-[#E8E4D9] rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                    />
                  </div>

                  {/* General Overall Score */}
                  <div className="space-y-4 p-5 bg-[#F9F7F2]/50 border border-[#E8E4D9]/60 rounded-3xl text-left flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wider">Calificación General</h4>
                      <p className="text-[11px] text-[#8C8C8C] mt-0.5">Califique su estancia en una escala del 1 al 10:</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 py-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                        const isSelected = survey.overallScore === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setSurvey({ ...survey, overallScore: num })}
                            className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[#A68A64] text-white shadow-md shadow-[#A68A64]/20'
                                : 'bg-white border border-[#E8E4D9] text-[#6B6B6B] hover:bg-[#F9F7F2]'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Suggestions text area */}
                <div className="space-y-2 text-left">
                  <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-widest ml-1">Sugerencias o comentarios generales</label>
                  <textarea
                    rows={3}
                    placeholder="Escriba aquí sus comentarios, felicitaciones o sugerencias..."
                    value={survey.generalSuggestions}
                    onChange={(e) => setSurvey({ ...survey, generalSuggestions: e.target.value })}
                    className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                  />
                </div>
              </div>

              {/* Resumen de Cuenta & Barra */}
              <div className="border-t border-[#E8E4D9]/80 pt-10 space-y-6">
                <div className="flex items-center gap-2 text-[#A68A64]">
                  <DollarSign size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Resumen de Cuenta de la Estadía</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Stay Base Charges */}
                  <div className="bg-[#F9F7F2]/60 border border-[#E8E4D9] rounded-3xl p-6 space-y-4">
                    <h4 className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wider border-b border-[#E8E4D9] pb-3">Conceptos Base de Hospedaje</h4>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center text-[#6B6B6B]">
                        <span>Estancia ({nights} noche{nights > 1 ? 's' : ''}):</span>
                        <span className="font-bold text-[#2D2D2D]">${roomTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                      </div>
                      
                      {hasDayPass && (
                        <div className="flex justify-between items-center text-[#6B6B6B]">
                          <span>{dayPassDetails || 'Day Pass'}:</span>
                          <span className="font-bold text-[#2D2D2D]">${dayPassTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                        </div>
                      )}

                      {hasParking && (
                        <div className="flex justify-between items-center text-[#6B6B6B]">
                          <span>Estacionamiento ({nights} día{nights > 1 ? 's' : ''}):</span>
                          <span className="font-bold text-[#2D2D2D]">${parkingTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[#6B6B6B] border-t border-[#E8E4D9]/60 pt-3 mt-3">
                        <span className="font-bold">Subtotal Hospedaje:</span>
                        <span className="font-bold text-[#A68A64]">${(roomTotal + dayPassTotal + parkingTotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                      </div>
                    </div>
                  </div>

                  {/* Restaurante & Bar charges charged to Room */}
                  <div className="bg-[#F9F7F2]/60 border border-[#E8E4D9] rounded-3xl p-6 space-y-4">
                    <h4 className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wider border-b border-[#E8E4D9] pb-3">Consumos en Restaurante / Bar</h4>
                    {loadingBarCharges ? (
                      <p className="text-xs text-[#8C8C8C] italic">Cargando consumos de barra...</p>
                    ) : barCharges.length > 0 ? (
                      <div className="space-y-3">
                        <div className="max-h-[120px] overflow-y-auto space-y-2 custom-scrollbar-light pr-1 text-xs">
                          {barCharges.map((item, i) => (
                            <div key={i} className="flex justify-between text-[#6B6B6B]">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="font-medium text-[#2D2D2D]">${item.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center text-[#6B6B6B] border-t border-[#E8E4D9]/60 pt-3 mt-3">
                          <span className="font-bold">Total Restaurante/Bar:</span>
                          <span className="font-bold text-[#A68A64]">${totalBarAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#8C8C8C] italic py-2 text-left">Sin consumos cargados a la habitación.</p>
                    )}
                  </div>
                </div>

                {/* Grand total preview of Stay */}
                <div className="bg-[#2D2D2D] text-white rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-center sm:text-left text-left">
                    <span className="text-[10px] font-bold text-[#A68A64] uppercase tracking-widest block text-left">Gran Total Acumulado Estancia</span>
                    <span className="text-2xl font-serif font-bold text-[#F9F7F2] mt-1 block text-left">
                      ${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                    </span>
                  </div>
                  <div className="text-xs text-[#8C8C8C] text-center sm:text-right max-w-xs">
                    Incluye tarifa base, servicios especiales de hospedaje, restaurante cargado a habitación y extras de checkout.
                  </div>
                </div>
              </div>

              {/* Extra Charges Section */}
              <div className="border-t border-[#E8E4D9]/80 pt-10 space-y-6">
                <div className="flex items-center gap-2 text-[#A68A64]">
                  <DollarSign size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Cobros Extras al Salir</h3>
                </div>

                <div className="bg-[#F9F7F2]/40 border border-[#E8E4D9] rounded-3xl p-6 space-y-6">
                  {/* Form to add item */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2 text-left sm:col-span-2">
                      <label className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Producto / Concepto</label>
                      <input
                        type="text"
                        placeholder="Ej. Consumo de mini-bar, daño a toalla, etc."
                        value={newProduct}
                        onChange={(e) => setNewProduct(e.target.value)}
                        className="w-full bg-white border border-[#E8E4D9] rounded-xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Monto ($)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="0.00"
                          min="0.01"
                          step="0.01"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          className="w-full bg-white border border-[#E8E4D9] rounded-xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                        />
                        <button
                          type="button"
                          onClick={handleAddCharge}
                          className="p-3 bg-[#A68A64] hover:bg-[#8E7554] text-white rounded-xl transition-all shadow-md active:scale-95 shrink-0 flex items-center justify-center"
                          title="Añadir cobro"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* List of itemized charges */}
                  {extraCharges.length > 0 ? (
                    <div className="space-y-2 border-t border-[#E8E4D9]/60 pt-4 text-left">
                      <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1 mb-2">Desglose de Extras</p>
                      <div className="max-h-[160px] overflow-y-auto space-y-2 custom-scrollbar-light pr-1">
                        {extraCharges.map(charge => (
                          <div
                            key={charge.id}
                            className="bg-white border border-[#E8E4D9] rounded-2xl py-3 px-4 flex justify-between items-center shadow-sm"
                          >
                            <div>
                              <span className="text-xs font-semibold text-[#2D2D2D]">{charge.product}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-[#A68A64]">${charge.amount.toFixed(2)} MXN</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCharge(charge.id)}
                                className="text-red-500 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Sum / Total */}
                      <div className="flex justify-between items-center bg-[#A68A64]/5 border border-[#A68A64]/20 rounded-2xl p-4 mt-4">
                        <div>
                          <span className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-wider block">Suma de Cargos Extras</span>
                          <span className="text-base font-bold text-[#A68A64] mt-0.5 block">${totalExtraAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                        </div>
                        
                        {/* Paid Toggle Checkbox */}
                        <label className="flex items-center gap-2.5 cursor-pointer select-none bg-white border border-[#E8E4D9] py-2.5 px-4 rounded-xl shadow-sm">
                          <input
                            type="checkbox"
                            checked={chargesPaid}
                            onChange={(e) => setChargesPaid(e.target.checked)}
                            className="rounded border-[#E8E4D9] text-[#A68A64] focus:ring-[#A68A64]/30 w-4 h-4"
                          />
                          <span className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wider">Cargos Pagados ✓</span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center border border-dashed border-[#E8E4D9] rounded-2xl bg-white">
                      <p className="text-xs text-[#8C8C8C] font-semibold">Sin cobros extras agregados al salir.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 md:p-8 border-t border-[#E8E4D9] bg-[#F9F7F2] shrink-0 flex gap-4 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-[#E8E4D9] text-[#6B6B6B] rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-white transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitCheckout}
                disabled={submitting}
                className="px-8 py-3 bg-[#A68A64] hover:bg-[#8E7554] text-white rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? 'Finalizando...' : 'Finalizar y Check-out'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
