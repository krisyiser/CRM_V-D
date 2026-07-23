"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Ticket, CreditCard, DollarSign } from 'lucide-react';
import { API, apiFetch } from '@/lib/api';
import type { Guest } from '@/types';
import { toast } from '@/components/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function DayPassModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    origin: '',
    passesCount: 1,
    withFood: false,
    paymentMethod: 'Efectivo',
    notes: ''
  });

  const basePrice = formData.withFood ? 150 : 100;
  const subtotal = formData.passesCount * basePrice;
  const fee = formData.paymentMethod === 'Tarjeta' ? subtotal * 0.05 : 0;
  const total = subtotal + fee;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre del cliente es obligatorio.');
      return;
    }
    setLoading(true);

    try {
      // 1. Register client as guest in guests history
      const guest = await apiFetch<Guest>(API.guests, {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          origin: (formData.origin || "Day Pass").trim(),
          id_number: 'N/A'
        })
      });

      // 2. Register sale in POS Sales
      const items = [{
        id: 'daypass',
        name: `Day Pass${formData.withFood ? ' (con comida)' : ''}`,
        price: basePrice,
        quantity: formData.passesCount
      }];

      const saleNotes = `Day Pass para ${formData.name.trim()} &mdash; Cantidad: ${formData.passesCount}${formData.withFood ? ' (con comida)' : ''}. Procedencia: ${formData.origin || 'N/A'}. Notas: ${formData.notes.trim() || 'Ninguna'}`;

      await apiFetch(API.posSales, {
        method: 'POST',
        body: JSON.stringify({
          items_json: JSON.stringify(items),
          total: Number(total.toFixed(2)),
          payment_method: formData.paymentMethod,
          notes: saleNotes
        })
      });

      toast.success('Day Pass registrado y cobrado con éxito.');
      onClose();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error('Error al registrar el Day Pass.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
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
          className="relative w-full max-w-lg bg-white rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-[#F9F7F2] p-6 md:p-8 border-b border-[#E8E4D9] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white shadow-lg shadow-[#A68A64]/20">
                <Ticket size={24} />
              </div>
              <div>
                <h2 className="text-xl font-heading font-semibold text-[#2D2D2D]">Registro de Day Pass</h2>
                <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-0.5">Acceso a instalaciones sin hospedaje</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-red-500 transition-colors shadow-sm"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar-light text-left flex-grow">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Nombre Completo *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. María Sánchez"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Teléfono (Opcional)</label>
                    <input
                      type="tel"
                      placeholder="222 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Procedencia</label>
                    <input
                      type="text"
                      placeholder="Ej. Puebla, Atlixco"
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E8E4D9]/50">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Cantidad de Personas</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.passesCount}
                      onChange={(e) => setFormData({ ...formData, passesCount: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
                    />
                  </div>
                  <div className="space-y-2 flex flex-col justify-center pl-2">
                    <label className="flex items-center gap-2 mt-4 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.withFood}
                        onChange={(e) => setFormData({ ...formData, withFood: e.target.checked })}
                        className="rounded border-[#E8E4D9] text-[#A68A64] focus:ring-[#A68A64]/30 w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-[#6B6B6B]">Incluye comida (+ $50)</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-[#E8E4D9]/50">
                  <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Método de Pago</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Transferencia', 'Tarjeta', 'Efectivo'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: method })}
                        className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border active:scale-95 ${
                          formData.paymentMethod === method
                            ? 'bg-[#A68A64] text-white border-[#A68A64] shadow-md'
                            : 'bg-white text-[#8C8C8C] border-[#E8E4D9]'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Notas / Observaciones</label>
                  <textarea
                    rows={2}
                    placeholder="Detalles extras..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D] resize-none"
                  />
                </div>
              </div>

              {/* Total Card */}
              <div className="p-5 bg-[#F9F7F2] rounded-3xl border border-[#E8E4D9] space-y-2">
                <div className="flex justify-between items-center text-xs text-[#8C8C8C]">
                  <span>Pases de Día ({formData.passesCount}x ${basePrice})</span>
                  <span>${subtotal.toLocaleString('es-MX')} MXN</span>
                </div>
                {fee > 0 && (
                  <div className="flex justify-between items-center text-xs text-[#A68A64]">
                    <span>Comisión de Tarjeta (5%)</span>
                    <span>+${fee.toLocaleString('es-MX')} MXN</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-[#E8E4D9] font-bold text-[#2D2D2D]">
                  <span className="text-sm">Total a Pagar</span>
                  <span className="text-lg text-[#A68A64]">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 border border-[#E8E4D9] text-[#6B6B6B] rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-[#A68A64] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-[#8F7553] transition-all shadow-lg shadow-[#A68A64]/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? 'Registrando...' : (
                    <>
                      <CheckCircle2 size={16} /> Registrar y Cobrar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
