"use client";
import React from 'react';
import { ShoppingBag, Minus, Plus, Wallet, CreditCard, User, PauseCircle, UtensilsCrossed, Grid } from 'lucide-react';
import type { CartItem } from '@/types';

export interface OpenTable {
  id: string;
  tableName: string;
  cart: CartItem[];
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Habitación';
  notes: string;
  createdAt: string;
}

interface Props {
  cart: CartItem[];
  updateQuantity: (productId: string, delta: number) => void;
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Habitación';
  setPaymentMethod: (method: 'Efectivo' | 'Tarjeta' | 'Habitación') => void;
  notes: string;
  setNotes: (notes: string) => void;
  subtotal: number;
  fee: number;
  total: number;
  occupiedRooms: { id: string; name: string; guestName: string }[];
  onCompleteOrder: () => void;

  // Tablet Active Table
  activeTableName: string;
  onOpenTableGrid: () => void;
  onPauseTable: () => void;
}

export default function PosCart({
  cart,
  updateQuantity,
  paymentMethod,
  setPaymentMethod,
  notes,
  setNotes,
  subtotal,
  fee,
  total,
  occupiedRooms,
  onCompleteOrder,
  activeTableName,
  onOpenTableGrid,
  onPauseTable,
}: Props) {
  return (
    <div className="bg-[#2D2D2D] text-white rounded-[28px] md:rounded-[32px] p-4 md:p-5 shadow-2xl flex flex-col h-full max-h-[calc(100vh-120px)] border border-[#3D3D3D] overflow-hidden text-left relative">
      
      {/* 1. Active Table Selector Header (Shrink-0) */}
      <div className="bg-[#383838] p-3 rounded-2xl border border-[#484848] mb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#A68A64] flex items-center justify-center font-bold text-white shadow-md">
            <UtensilsCrossed size={16} />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#A68A64] block">Mesa Asignada</span>
            <h3 className="font-bold text-sm md:text-base text-white truncate max-w-[140px] md:max-w-[180px]">
              {activeTableName || 'Mesa 1'}
            </h3>
          </div>
        </div>

        <button
          onClick={onOpenTableGrid}
          className="px-2.5 py-1.5 bg-[#2D2D2D] hover:bg-[#A68A64] text-[#A68A64] hover:text-white border border-[#4D4D4D] rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shrink-0"
          title="Ver mapa de mesas para cambiar o seleccionar otra mesa"
        >
          <Grid size={13} /> Cambiar Mesa
        </button>
      </div>

      {/* 2. Cart Items Header (Shrink-0) */}
      <div className="flex items-center justify-between pb-2 border-b border-[#3D3D3D] mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-[#A68A64]" size={15} />
          <span className="font-serif text-xs md:text-sm font-bold">Comanda de Consumo</span>
        </div>
        <span className="px-2 py-0.5 bg-[#3D3D3D] text-[#A68A64] rounded-lg text-[11px] font-bold">
          {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
        </span>
      </div>

      {/* 3. SCROLLABLE Items List (Flex-1 Min-h-0) - Internal Scroll Only */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 mb-2 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="text-center py-6 text-[#8C8C8C] flex flex-col items-center justify-center h-full min-h-[80px]">
            <ShoppingBag size={24} className="mx-auto mb-1.5 opacity-30 stroke-1" />
            <p className="text-xs font-medium">Comanda vacía para {activeTableName || 'Mesa 1'}</p>
            <p className="text-[10px] text-[#6B6B6B] mt-0.5">Toca los productos del menú a la izquierda para agregarlos</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.product.id} className="flex items-center justify-between bg-[#383838] p-2.5 rounded-2xl border border-[#484848]">
              <div className="flex flex-col flex-grow pr-2">
                <span className="font-semibold text-xs leading-snug">{item.product.name}</span>
                <span className="text-[10px] text-[#A68A64] font-medium">${item.product.price.toLocaleString()} c/u</span>
              </div>

              {/* Large Touch Stepper Buttons */}
              <div className="flex items-center gap-1.5 bg-[#2D2D2D] p-1 rounded-xl border border-[#4D4D4D]">
                <button 
                  onClick={() => updateQuantity(item.product.id, -1)}
                  className="w-6 h-6 bg-[#3D3D3D] hover:bg-[#4D4D4D] text-white rounded-lg flex items-center justify-center active:scale-90 transition-all"
                >
                  <Minus size={11} />
                </button>
                <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.product.id, 1)}
                  className="w-6 h-6 bg-[#A68A64] hover:bg-[#8F7553] text-white rounded-lg flex items-center justify-center active:scale-90 transition-all"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. FIXED BOTTOM SECTION: Payment Settings, Totals & Action Buttons (Shrink-0) */}
      <div className="shrink-0 space-y-2 border-t border-[#3D3D3D] pt-2">
        {/* Payment Method Selector */}
        <div>
          <label className="text-[9px] font-bold uppercase tracking-widest text-[#8C8C8C] mb-1 block">Método de Pago</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { type: 'Efectivo', icon: <Wallet size={12} /> },
              { type: 'Tarjeta', icon: <CreditCard size={12} /> },
              { type: 'Habitación', icon: <User size={12} /> }
            ].map(m => (
              <button
                key={m.type}
                onClick={() => setPaymentMethod(m.type as any)}
                className={`py-1.5 px-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-0.5 active:scale-95 ${
                  paymentMethod === m.type 
                    ? 'bg-[#A68A64] border-[#A68A64] text-white shadow-md' 
                    : 'bg-[#383838] border-[#484848] text-[#8C8C8C] hover:text-white'
                }`}
              >
                {m.icon} {m.type}
              </button>
            ))}
          </div>
        </div>

        {/* Room / Notes Input */}
        <div>
          <label className="text-[9px] font-bold uppercase tracking-widest text-[#8C8C8C] mb-1 block">
            {paymentMethod === 'Habitación' ? 'Habitación Ocupada *' : 'Notas Adicionales'}
          </label>
          {paymentMethod === 'Habitación' ? (
            <select
              value={notes}
              onChange={e => setNotes(e.target.value)}
              required
              className="w-full bg-[#383838] border border-[#484848] rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#A68A64] text-white appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A68A64%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.6rem_auto] bg-[right_0.8rem_center] bg-no-repeat placeholder-[#8C8C8C]"
            >
              <option value="" className="text-[#8C8C8C]">-- Selecciona Habitación --</option>
              {occupiedRooms.map(r => (
                <option key={r.id} value={`${r.id} - ${r.guestName}`} className="text-white bg-[#2d2d2d]">
                  Suite {r.id} &mdash; {r.guestName}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Ej. Sin cebolla, extra hielo..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#383838] border border-[#484848] rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#A68A64] text-white placeholder-[#8C8C8C]"
            />
          )}
        </div>

        {/* Totals Summary Box */}
        <div className="bg-[#383838] p-2.5 rounded-xl border border-[#484848] space-y-1 text-xs text-left">
          <div className="flex justify-between text-[#8C8C8C]">
            <span>Subtotal:</span>
            <span className="text-white font-semibold">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          {paymentMethod === 'Tarjeta' && (
            <div className="flex justify-between text-[#A68A64] text-[10px]">
              <span>Comisión Tarjeta (5%):</span>
              <span>+${fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between text-xs md:text-sm font-serif font-bold text-white border-t border-[#484848] pt-1 mt-0.5">
            <span>Total:</span>
            <span className="text-[#F9F7F2] font-bold text-sm md:text-base">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
          </div>
        </div>

        {/* ALWAYS VISIBLE Touch Action Buttons */}
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={onPauseTable}
            disabled={cart.length === 0}
            className="flex-1 py-3 bg-[#383838] hover:bg-[#484848] disabled:opacity-40 text-[#A68A64] hover:text-white border border-[#484848] rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95"
            title="Pausar cuenta y guardar estado de la mesa"
          >
            <PauseCircle size={15} /> Pausar
          </button>
          <button
            onClick={onCompleteOrder}
            disabled={cart.length === 0}
            className="flex-[2] py-3 bg-[#A68A64] hover:bg-[#8F7553] disabled:opacity-40 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
          >
            Cobrar ${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </button>
        </div>
      </div>
    </div>
  );
}
