import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Bed, ArrowRight, Loader2, CheckCircle2, Phone, Plus } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuestRegistrationModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [fetchingRooms, setFetchingRooms] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    checkIn: '',
    checkOut: '',
    roomId: '',
    extraPersons: 0,
    extraCharge: 0,
    dayPasses: 0,
    dayPassWithFood: false,
    parking: false,
    paymentMethod: 'Efectivo', // Transferencia, Tarjeta, Efectivo
    isHighSeason: false, // Override all nights to 'alta'
    basePrice: 0,
    total: 0,
    notes: '',
    idNumber: '',
    origin: ''
  });
  const [extraChargesList, setExtraChargesList] = useState<{concept: string, amount: number}[]>([]);
  const [newConcept, setNewConcept] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const [pricingMatrix, setPricingMatrix] = useState<Record<string, any>>({});

  // Fetch rooms when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setFetchingRooms(true);
        try {
          const data = await apiFetch<any[]>(API_ENDPOINTS.rooms);
          const available = data.filter(r => r.status === 'available');
          setRooms(available);
          if (available.length > 0) {
            setFormData(prev => ({ ...prev, roomId: available[0].id }));
          }

          // Fetch Settings
          const settings = await apiFetch<any>(API_ENDPOINTS.settings);
          if (settings.isHighSeason === 'true' || settings.is_high_season === 'true') {
            setFormData(prev => ({ ...prev, isHighSeason: true }));
          }

          // Fetch Pricing dynamically if API supports it (fallback to default)
          try {
            const pricingData = await apiFetch<any>('pricing'); // We will assume an endpoint
            if (pricingData && Object.keys(pricingData).length > 0) setPricingMatrix(pricingData);
          } catch (e) {
            console.log('Using fallback pricing');
          }
        } catch (error) {
          console.error("Error fetching available rooms:", error);
        } finally {
          setFetchingRooms(false);
        }
      };
      loadData();
    }
  }, [isOpen]);

  const getPriceForDate = (dateStr: string, roomId: string, forceHigh: boolean) => {
    if (!dateStr) return 0;
    
    // Dynamic Pricing Matrix or Fallback
    const prices: Record<string, any> = Object.keys(pricingMatrix).length > 0 ? pricingMatrix : {
      '101': { alta: 2800, baja: 2300, semana: 1900 }, // Moros
      '102': { alta: 1950, baja: 1600, semana: 1200 }, // Volador
      '105': { alta: 1950, baja: 1600, semana: 1200 }, // Santiagueros
      '104': { alta: 1400, baja: 1100, semana: 900 },  // Negritos
      '103': { alta: 1400, baja: 1100, semana: 900 },  // Guaguas
    };

    if (forceHigh) return prices[roomId]?.alta || 0;

    const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid TZ issues
    const day = date.getDay(); // 0 (Sun) to 6 (Sat)
    
    let type = 'semana'; // Default (Mon-Wed)
    if (day === 6) type = 'alta'; // Sat
    if (day === 0 || day === 4 || day === 5) type = 'baja'; // Sun, Thu, Fri

    return prices[roomId]?.[type] || 0;
  };

  React.useEffect(() => {
    if (!formData.checkIn || !formData.checkOut || !formData.roomId) return;

    const start = new Date(formData.checkIn + 'T12:00:00');
    const end = new Date(formData.checkOut + 'T12:00:00');
    let totalStayPrice = 0;
    let nights = 0;

    if (formData.checkIn === formData.checkOut) {
      totalStayPrice = getPriceForDate(formData.checkIn, formData.roomId, formData.isHighSeason);
      nights = 1;
    } else {
      // Calculate per night
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
      // 1. Create Guest with optional ID
      const guest = await apiFetch<any>(API_ENDPOINTS.guests, {
        method: 'POST',
        body: JSON.stringify({ 
          name: formData.name.trim(), 
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          idNumber: (formData.idNumber || "N/A").trim(),
          origin: (formData.origin || "No especificado").trim()
        })
      });

      const start = new Date(formData.checkIn + 'T12:00:00');
      const end = new Date(formData.checkOut + 'T12:00:00');
      const nights = formData.checkIn === formData.checkOut ? 1 : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
      
      const parkingInfo = formData.parking ? ` | Estacionamiento (${nights} día${nights > 1 ? 's' : ''})` : '';
      const dayPassInfo = formData.dayPasses > 0 ? ` | Day Pass x${formData.dayPasses}${formData.dayPassWithFood ? ' (con comida)' : ''}` : '';
      const extrasStr = `Extras: ${extraChargesList.map(e => e.concept + '($' + e.amount + ')').join(', ')}${dayPassInfo}${parkingInfo}`;

      // 2. Create Reservation with Notes and Payment
      await apiFetch(API_ENDPOINTS.reservations, {
        method: 'POST',
        body: JSON.stringify({ 
          guestId: guest.id, 
          guestName: formData.name.trim(),
          roomId: formData.roomId, 
          dates: `${formData.checkIn} - ${formData.checkOut}`,
          notes: `${formData.notes.trim()} | Procedencia: ${(formData.origin || 'N/A').trim()} | Pago: ${formData.paymentMethod} | ${extrasStr}`,
          paymentStatus: 'paid',
          totalPrice: formData.total
        })
      });

      // 3. Update Room Status ONLY if check-in is today or earlier
      if (formData.checkIn) {
        // Get today's local date as YYYY-MM-DD format
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayLocalStr = `${year}-${month}-${day}`;
        
        if (formData.checkIn <= todayLocalStr) {
          await apiFetch(API_ENDPOINTS.rooms, {
            method: 'PATCH',
            body: JSON.stringify({ id: formData.roomId, status: 'occupied' })
          });
        }
      }

      onClose();
      const { toast } = await import('../Toast');
      toast.success('Check-in completado exitosamente.');
      window.location.reload(); 
    } catch (error) {
      console.error(error);
      const { toast } = await import('../Toast');
      toast.error('Error al procesar el registro: Probablemente el sistema está en modo offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 lg:p-12 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#2D2D2D]/40 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="bg-[#F9F7F2] p-8 border-b border-[#E8E4D9] flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white shadow-lg shadow-[#A68A64]/20">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-medium text-[#2D2D2D]">Check-in de Huésped</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest">Protocolo Lobby v2.0</span>
                  <span className="text-[10px] text-[#8C8C8C]">•</span>
                  <span className="text-[10px] text-[#8C8C8C] font-bold uppercase tracking-widest">Temporada Alta</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-red-500 transition-colors shadow-sm">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar-light text-[#4A4A4A]">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Columna Izquierda: Identidad */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-[#A68A64]">
                    <User size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Identificación y Perfil</span>
                  </div>
                  
                  <div className="space-y-2 text-left">
                    <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Nombre Completo</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ej. Juan Pérez"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Teléfono (Opcional)</label>
                      <input 
                        type="tel" 
                        placeholder="222 000 0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Correo Electrónico (Opcional)</label>
                      <input 
                        type="email" 
                        placeholder="ej@mail.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left pt-2 border-t border-[#E8E4D9]/50">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Documento (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="INE, Pasaporte..."
                        value={formData.idNumber || ''}
                        onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                        className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Procedencia</label>
                      <input 
                        type="text" 
                        placeholder="Ej. CDMX, Monterrey"
                        value={formData.origin || ''}
                        onChange={(e) => setFormData({...formData, origin: e.target.value})}
                        className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]" 
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#E8E4D9]/50">
                    <div className="flex items-center gap-2 text-[#A68A64]">
                      <Plus size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Extras y Adicionales</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-left items-start">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Pers. Extra ($250)</label>
                        <input 
                          type="number" 
                          min="0"
                          value={formData.extraPersons || ''}
                          onChange={(e) => setFormData({...formData, extraPersons: parseInt(e.target.value) || 0})}
                          placeholder="0"
                          className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">
                          Day Pass (${formData.dayPassWithFood ? '150' : '100'})
                        </label>
                        <input 
                          type="number" 
                          min="0"
                          value={formData.dayPasses || ''}
                          onChange={(e) => setFormData({...formData, dayPasses: parseInt(e.target.value) || 0})}
                          placeholder="0"
                          className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]" 
                        />
                        <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                          <input 
                            type="checkbox"
                            checked={formData.dayPassWithFood}
                            onChange={(e) => setFormData({...formData, dayPassWithFood: e.target.checked})}
                            className="rounded border-[#E8E4D9] text-[#A68A64] focus:ring-[#A68A64]/30"
                          />
                          <span className="text-[10px] font-semibold text-[#6B6B6B]">Con comida (+ $50)</span>
                        </label>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Estacionamiento</label>
                        <div className="h-[46px] flex items-center">
                          <label className="flex items-center gap-2 cursor-pointer select-none bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-3 w-full justify-center">
                            <input 
                              type="checkbox"
                              checked={formData.parking}
                              onChange={(e) => setFormData({...formData, parking: e.target.checked})}
                              className="rounded border-[#E8E4D9] text-[#A68A64] focus:ring-[#A68A64]/30"
                            />
                            <span className="text-xs font-semibold text-[#2D2D2D]">$50 / día</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Otros Cargos (Estacionamiento, Bebidas, etc.)</label>
                        <div className="flex flex-col gap-2">
                          {extraChargesList.map((charge, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border border-[#E8E4D9] px-4 py-2 rounded-xl text-xs">
                              <span className="font-semibold text-[#4A4A4A]">{charge.concept}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-[#A68A64]">${charge.amount}</span>
                                <button type="button" onClick={() => setExtraChargesList(extraChargesList.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Concepto..."
                              value={newConcept}
                              onChange={e => setNewConcept(e.target.value)}
                              className="flex-grow bg-[#F9F7F2] border border-[#E8E4D9] rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 text-[#2D2D2D]" 
                            />
                            <input 
                              type="number" 
                              placeholder="Monto"
                              min="0"
                              value={newAmount}
                              onChange={e => setNewAmount(e.target.value)}
                              className="w-24 bg-[#F9F7F2] border border-[#E8E4D9] rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 text-[#2D2D2D]" 
                            />
                            <button 
                              type="button" 
                              onClick={() => {
                                if (newConcept && newAmount) {
                                  setExtraChargesList([...extraChargesList, { concept: newConcept, amount: parseFloat(newAmount) }]);
                                  setNewConcept('');
                                  setNewAmount('');
                                }
                              }}
                              className="bg-[#A68A64] text-white px-3 rounded-xl hover:bg-[#8E7552] transition-colors flex items-center justify-center"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Estancia */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-[#A68A64]">
                    <Bed size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Logística de Estancia</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Ingreso</label>
                      <input 
                        required
                        type="date" 
                        value={formData.checkIn}
                        onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
                        className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Salida</label>
                      <input 
                        required
                        type="date" 
                        value={formData.checkOut}
                        onChange={(e) => setFormData({...formData, checkOut: e.target.value})}
                        className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]" 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-2 col-span-2">
                      <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Suite y Configuración de Tarifa</label>
                      <div className="flex gap-4 mb-3">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, isHighSeason: !formData.isHighSeason})}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                            formData.isHighSeason 
                              ? 'bg-[#A68A64] text-white border-[#A68A64] shadow-md' 
                              : 'bg-white text-[#8C8C8C] border-[#E8E4D9]'
                          }`}
                        >
                          {formData.isHighSeason ? '★ Temporada Alta Activa' : 'Aplicar Temporada Alta'}
                        </button>
                      </div>
                      <div className="relative">
                        <select 
                          disabled={fetchingRooms || rooms.length === 0}
                          value={formData.roomId}
                          onChange={(e) => setFormData({...formData, roomId: e.target.value})}
                          className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 appearance-none cursor-pointer text-[#2D2D2D] disabled:opacity-50"
                        >
                          {fetchingRooms ? (
                            <option>Cargando...</option>
                          ) : rooms.length === 0 ? (
                            <option>Sin cupo</option>
                          ) : (
                            rooms.map(room => (
                              <option key={room.id} value={room.id}>{room.id} - {room.name}</option>
                            ))
                          )}
                        </select>
                        <ArrowRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C8C8C] rotate-90" />
                      </div>
                      <div className="mt-2 flex justify-between items-center px-1">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-[#8C8C8C] uppercase font-bold">Tarifa Dinámica Aplicada</span>
                          <span className="text-[10px] font-bold text-[#A68A64]">
                            {formData.isHighSeason ? '✓ Todo incluido con Desayuno' : 'Varios precios por noche'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-[#8C8C8C] uppercase font-bold">Subtotal Hospedaje</span>
                          <div className="text-sm font-bold text-[#2D2D2D]">
                            ${formData.basePrice.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Método de Pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Transferencia', 'Tarjeta', 'Efectivo'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setFormData({...formData, paymentMethod: method})}
                          className={`py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border ${
                            formData.paymentMethod === method 
                              ? 'bg-[#A68A64]/10 text-[#A68A64] border-[#A68A64]' 
                              : 'bg-white text-[#8C8C8C] border-[#E8E4D9]'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas de Recepción */}
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-2 text-[#A68A64]">
                  <ArrowRight size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Observaciones Especiales</span>
                </div>
                <textarea 
                  rows={3}
                  placeholder="Requerimientos especiales, alergias, preferencias de almohadas..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-3xl py-5 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D] resize-none"
                />
              </div>

              <div className="pt-6 border-t border-[#F2EEE4] flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex flex-col text-left">
                  <div className="text-[10px] text-[#8C8C8C] font-medium italic">
                    * Check-in: 2:00 PM | Check-out: 12:00 PM
                  </div>
                  <div className="text-xl font-bold text-[#A68A64] mt-1">
                    Total: ${formData.total.toLocaleString()}
                    {formData.paymentMethod === 'Tarjeta' && <span className="text-[10px] ml-2 text-[#8C8C8C] font-normal">(Inc. 5% comisión)</span>}
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    type="button" 
                    onClick={onClose}
                    className="flex-1 md:flex-none px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#8C8C8C] hover:text-[#2D2D2D] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 md:flex-none px-8 py-3 bg-[#A68A64] text-white rounded-2xl text-xs font-bold tracking-widest uppercase hover:bg-[#8E7554] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#A68A64]/20 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} 
                    Finalizar Check-in
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
