"use client";
import React from 'react';
import { User, Plus, X } from 'lucide-react';

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  extraChargesList: { concept: string; amount: number }[];
  setExtraChargesList: React.Dispatch<React.SetStateAction<{ concept: string; amount: number }[]>>;
  newConcept: string;
  setNewConcept: (val: string) => void;
  newAmount: string;
  setNewAmount: (val: string) => void;
}

export default function GuestForm({
  formData,
  setFormData,
  extraChargesList,
  setExtraChargesList,
  newConcept,
  setNewConcept,
  newAmount,
  setNewAmount,
}: Props) {
  return (
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
        <div className="grid grid-cols-2 gap-4 text-left items-start">
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
            <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Otros Cargos</label>
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
  );
}
