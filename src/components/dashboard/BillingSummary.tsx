"use client";
import React from 'react';
import { DollarSign, Plus, Trash2 } from 'lucide-react';

interface Props {
  nights: number;
  roomTotal: number;
  hasDayPass: boolean;
  dayPassDetails: string;
  dayPassTotal: number;
  hasParking: boolean;
  parkingTotal: number;
  loadingBarCharges: boolean;
  barCharges: any[];
  totalBarAmount: number;
  grandTotal: number;
  newProduct: string;
  setNewProduct: (val: string) => void;
  newAmount: string;
  setNewAmount: (val: string) => void;
  extraCharges: { id: string; product: string; amount: number }[];
  handleAddCharge: () => void;
  handleRemoveCharge: (id: string) => void;
  totalExtraAmount: number;
  chargesPaid: boolean;
  setChargesPaid: (val: boolean) => void;
}

export default function BillingSummary({
  nights,
  roomTotal,
  hasDayPass,
  dayPassDetails,
  dayPassTotal,
  hasParking,
  parkingTotal,
  loadingBarCharges,
  barCharges,
  totalBarAmount,
  grandTotal,
  newProduct,
  setNewProduct,
  newAmount,
  setNewAmount,
  extraCharges,
  handleAddCharge,
  handleRemoveCharge,
  totalExtraAmount,
  chargesPaid,
  setChargesPaid,
}: Props) {
  return (
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

        {/* Restaurant & Bar charges charged to Room */}
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

      {/* Grand total preview */}
      <div className="bg-[#2D2D2D] text-white rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-center sm:text-left">
          <span className="text-[10px] font-bold text-[#A68A64] uppercase tracking-widest block">Gran Total Acumulado Estancia</span>
          <span className="text-2xl font-serif font-bold text-[#F9F7F2] mt-1 block">
            ${grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </span>
        </div>
        <div className="text-xs text-[#8C8C8C] text-center sm:text-right max-w-xs">
          Incluye tarifa base, servicios especiales de hospedaje, restaurante cargado a habitación y extras de checkout.
        </div>
      </div>

      {/* Extra Charges Section */}
      <div className="bg-[#F9F7F2]/40 border border-[#E8E4D9] rounded-3xl p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-2 text-left sm:col-span-2">
            <label className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1">Producto / Concepto</label>
            <input
              type="text"
              placeholder="Ej. Consumo de mini-bar, daño a toalla, etc."
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              className="w-full bg-white border border-[#E8E4D9] rounded-xl py-3 px-4 text-xs focus:outline-none text-[#2D2D2D]"
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
                className="w-full bg-white border border-[#E8E4D9] rounded-xl py-3 px-4 text-xs focus:outline-none text-[#2D2D2D]"
              />
              <button
                type="button"
                onClick={handleAddCharge}
                className="p-3 bg-[#A68A64] hover:bg-[#8E7554] text-white rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {extraCharges.length > 0 ? (
          <div className="space-y-2 border-t border-[#E8E4D9]/60 pt-4 text-left">
            <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider ml-1 mb-2">Desglose de Extras</p>
            <div className="max-h-[160px] overflow-y-auto space-y-2 custom-scrollbar-light pr-1">
              {extraCharges.map(charge => (
                <div key={charge.id} className="bg-white border border-[#E8E4D9] rounded-2xl py-3 px-4 flex justify-between items-center shadow-sm">
                  <span className="text-xs font-semibold text-[#2D2D2D]">{charge.product}</span>
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

            <div className="flex justify-between items-center bg-[#A68A64]/5 border border-[#A68A64]/20 rounded-2xl p-4 mt-4">
              <div>
                <span className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-wider block">Suma de Cargos Extras</span>
                <span className="text-base font-bold text-[#A68A64] mt-0.5 block">${totalExtraAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none bg-white border border-[#E8E4D9] py-2.5 px-4 rounded-xl shadow-sm">
                <input
                  type="checkbox"
                  checked={chargesPaid}
                  onChange={(e) => setChargesPaid(e.target.checked)}
                  className="rounded border-[#E8E4D9] text-[#A68A64] w-4 h-4"
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
  );
}
