"use client";
import React from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  total: number;
  paymentMethod: string;
  notes: string;
  setNotes: (val: string) => void;
  loading: boolean;
  onClose: () => void;
}

export default function ChargeSummary({
  total,
  paymentMethod,
  notes,
  setNotes,
  loading,
  onClose,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Observaciones Especiales */}
      <div className="space-y-4 text-left">
        <div className="flex items-center gap-2 text-[#A68A64]">
          <ArrowRight size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Observaciones Especiales</span>
        </div>
        <textarea 
          rows={3}
          placeholder="Requerimientos especiales, alergias, preferencias de almohadas..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-3xl py-5 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D] resize-none"
        />
      </div>

      <div className="pt-6 border-t border-[#F2EEE4] flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-col text-left">
          <div className="text-[10px] text-[#8C8C8C] font-medium italic">
            * Check-in: 2:00 PM | Check-out: 12:00 PM
          </div>
          <div className="text-xl font-bold text-[#A68A64] mt-1">
            Total: ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            {paymentMethod === 'Tarjeta' && <span className="text-[10px] ml-2 text-[#8C8C8C] font-normal">(Inc. 5% comisión)</span>}
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
    </div>
  );
}
