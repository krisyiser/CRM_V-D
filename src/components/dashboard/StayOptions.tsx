"use client";
import React from 'react';
import { Bed, ArrowRight } from 'lucide-react';
import type { Room } from '@/types';

interface Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  rooms: Room[];
  fetchingRooms: boolean;
}

export default function StayOptions({
  formData,
  setFormData,
  rooms,
  fetchingRooms,
}: Props) {
  const setQuickStay = (nights: number) => {
    const today = new Date();
    const ciStr = today.toISOString().split('T')[0];
    const coDate = new Date(today);
    coDate.setDate(coDate.getDate() + nights);
    const coStr = coDate.toISOString().split('T')[0];
    setFormData((prev: any) => ({ ...prev, checkIn: ciStr, checkOut: coStr }));
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#A68A64]">
          <Bed size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Logística de Estancia</span>
        </div>

        {/* Quick presets for Touch Screens */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold text-[#8C8C8C] uppercase mr-1">Preajustes:</span>
          <button
            type="button"
            onClick={() => setQuickStay(1)}
            className="px-2 py-1 bg-[#F9F7F2] hover:bg-[#A68A64] hover:text-white border border-[#E8E4D9] rounded-lg text-[9px] font-bold uppercase transition-all"
          >
            1 Noche
          </button>
          <button
            type="button"
            onClick={() => setQuickStay(2)}
            className="px-2 py-1 bg-[#F9F7F2] hover:bg-[#A68A64] hover:text-white border border-[#E8E4D9] rounded-lg text-[9px] font-bold uppercase transition-all"
          >
            2 Noches
          </button>
          <button
            type="button"
            onClick={() => setQuickStay(3)}
            className="px-2 py-1 bg-[#F9F7F2] hover:bg-[#A68A64] hover:text-white border border-[#E8E4D9] rounded-lg text-[9px] font-bold uppercase transition-all"
          >
            3 Noches
          </button>
        </div>
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
                <option>Sin cupo disponible</option>
              ) : (
                rooms.map(room => (
                  <option key={room.id} value={room.id}>Suite {room.id} &mdash; {room.name}</option>
                ))
              )}
            </select>
            <ArrowRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C8C8C] rotate-90 pointer-events-none" />
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
    </div>
  );
}
