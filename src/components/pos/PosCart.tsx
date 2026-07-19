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
    <div className="bg-[#2D2D2D] text-white rounded-[32px] p-5 shadow-2xl flex flex-col lg:h-full border border-[#3D3D3D] overflow-hidden text-left">
      {/* Active Table Selector Header (Tablet Ergonomics) */}
      <div className="bg-[#383838] p-3.5 rounded-2xl border border-[#484848] mb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#A68A64] flex items-center justify-center font-bold text-white shadow-md">
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#A68A64] block">Mesa Asignada</span>
            <h3 className="font-bold text-base text-white truncate max-w-[150px] md:max-w-[200px]">
              {activeTableName || 'Mesa 1'}
            </h3>
          </div>
        </div>

        <button
          onClick={onOpenTableGrid}
          className="px-3 py-2 bg-[#2D2D2D] hover:bg-[#A68A64] text-[#A68A64] hover:text-white border border-[#4D4D4D] rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
          title="Ver mapa de mesas para cambiar o seleccionar otra mesa"
        >
          <Grid size={14} /> Cambiar Mesa
        </button>
      </div>

      {/* Cart Items Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#3D3D3D] mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-[#A68A64]" size={16} />
          <span className="font-serif text-sm font-bold">Comanda de Consumo</span>
        </div>
        <span className="px-2.5 py-0.5 bg-[#3D3D3D] text-[#A68A64] rounded-lg text-xs font-bold">
          {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
        </span>
      </div>

      {/* Items List */}
      <div className="flex-grow overflow-y-auto space-y-2 pr-1 mb-3 no-scrollbar">
        {cart.length === 0 ? (
          <div className="text-center py-8 text-[#8C8C8C] flex flex-col items-center justify-center h-full min-h-[100px]">
            <ShoppingBag size={28} className="mx-auto mb-2 opacity-30 stroke-1" />
            <p className="text-xs font-medium">Comanda vacía para {activeTableName || 'Mesa 1'}</p>
            <p className="text-[10px] text-[#6B6B6B] mt-0.5">Toca los productos del menú a la izquierda para agregarlos</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.product.id} className="flex items-center justify-between bg-[#383838] p-3 rounded-2xl border border-[#484848]">
              <div className="flex flex-col flex-grow pr-2">
                <span className="font-semibold text-xs leading-snug">{item.product.name}</span>
                <span className="text-[10px] text-[#A68A64] font-medium">${item.product.price.toLocaleString()} c/u</span>
              </div>

              {/* Large Touch Stepper Buttons */}
              <div className="flex items-center gap-2 bg-[#2D2D2D] p-1 rounded-xl border border-[#4D4D4D]">
                <button 
                  onClick={() => updateQuantity(item.product.id, -1)}
                  className="w-7 h-7 bg-[#3D3D3D] hover:bg-[#4D4D4D] text-white rounded-lg flex items-center justify-center active:scale-90 transition-all"
                >
                  <Minus size={12} />
                </button>
                <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.product.id, 1)}
                  className="w-7 h-7 bg-[#A68A64] hover:bg-[#8F7553] text-white rounded-lg flex items-center justify-center active:scale-90 transition-all"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Settings & Notes */}
      <div className="space-y-3 border-t border-[#3D3D3D] pt-3 mb-3 shrink-0">
        <div>
          <label className="text-[9px] font-bold uppercase tracking-widest text-[#8C8C8C] mb-1.5 block">Método de Pago</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { type: 'Efectivo', icon: <Wallet size={12} /> },
              { type: 'Tarjeta', icon: <CreditCard size={12} /> },
              { type: 'Habitación', icon: <User size={12} /> }
            ].map(m => (
              <button
                key={m.type}
                onClick={() => setPaymentMethod(m.type as any)}
                className={`py-2 px-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1 active:scale-95 ${
                  paymentMethod === m.type 
                    ? 'bg-[#A68A64] border-[#A68A64] text-white shadow-lg shadow-[#A68A64]/20' 
                    : 'bg-[#383838] border-[#484848] text-[#8C8C8C] hover:text-white'
                }`}
              >
                {m.icon} {m.type}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[9px] font-bold uppercase tracking-widest text-[#8C8C8C] mb-1 block">
            {paymentMethod === 'Habitación' ? 'Habitación Ocupada *' : 'Notas Adicionales'}
          </label>
          {paymentMethod === 'Habitación' ? (
            <select
              value={notes}
              onChange={e => setNotes(e.target.value)}
              required
              className="w-full bg-[#383838] border border-[#484848] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#A68A64] text-white appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A68A64%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.6rem_auto] bg-[right_0.8rem_center] bg-no-repeat placeholder-[#8C8C8C]"
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
              className="w-full bg-[#383838] border border-[#484848] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#A68A64] text-white placeholder-[#8C8C8C]"
            />
          )}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-[#383838] p-3.5 rounded-2xl border border-[#484848] space-y-1.5 mb-3 text-xs text-left shrink-0">
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
        <div className="flex justify-between text-sm font-serif font-bold text-white border-t border-[#484848] pt-2 mt-1">
          <span>Total:</span>
          <span className="text-[#F9F7F2] font-bold text-base">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
        </div>
      </div>

      {/* Action Buttons (Tablet Friendly Touch) */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onPauseTable}
          disabled={cart.length === 0}
          className="flex-1 py-3.5 bg-[#383838] hover:bg-[#484848] disabled:opacity-40 text-[#A68A64] hover:text-white border border-[#484848] rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
          title="Pausar cuenta y guardar estado de la mesa"
        >
          <PauseCircle size={16} /> Pausar
        </button>
        <button
          onClick={onCompleteOrder}
          disabled={cart.length === 0}
          className="flex-[2] py-3.5 bg-[#A68A64] hover:bg-[#8F7553] disabled:opacity-40 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
        >
          Cobrar ${total.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
        </button>
      </div>
    </div>
  );
}
