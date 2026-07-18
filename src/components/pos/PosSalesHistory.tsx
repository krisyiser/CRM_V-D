"use client";
import React from 'react';
import { FileText, Trash2, Pencil } from 'lucide-react';
import type { PosSale } from '@/types';

interface Props {
  salesHistory: PosSale[];
  onOpenEditSale: (sale: PosSale) => void;
  onConfirmDeleteSale: (id: string) => void;
}

export default function PosSalesHistory({
  salesHistory,
  onOpenEditSale,
  onConfirmDeleteSale,
}: Props) {
  const totalHistory = salesHistory.reduce((sum, s) => sum + s.total, 0);

  // Group sales by day
  const groups: { [key: string]: PosSale[] } = {};
  salesHistory.forEach(sale => {
    const d = new Date(sale.created_at);
    const dateKey = d.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(sale);
  });

  return (
    <div className="bg-white rounded-3xl border border-[#E8E4D9] p-6 lg:p-8 shadow-xl text-left flex-grow min-h-0 lg:overflow-hidden flex flex-col">
      <div className="flex items-center justify-between pb-6 border-b border-[#E8E4D9] mb-6 shrink-0">
        <h2 className="font-serif text-2xl text-[#1C1C1C]">Historial de Ventas</h2>
        <div className="text-sm font-semibold text-[#8C8C8C]">
          Total histórico: <span className="text-[#A68A64] font-serif font-bold text-xl">${totalHistory.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {salesHistory.length === 0 ? (
        <div className="text-center py-20 text-[#8C8C8C] flex-grow flex flex-col items-center justify-center">
          <FileText size={48} className="mx-auto mb-4 stroke-1 opacity-40" />
          <p className="text-lg font-semibold text-[#1C1C1C]">No hay ventas registradas aún</p>
          <p className="text-sm text-[#6B6B6B] mt-1">Los pedidos cobrados en la caja aparecerán aquí.</p>
        </div>
      ) : (
        <div className="flex-grow overflow-y-auto space-y-6 pr-2 no-scrollbar">
          {Object.entries(groups).map(([dateLabel, daySales]) => {
            const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);
            return (
              <div key={dateLabel} className="bg-[#FDFDFC] rounded-3xl border border-[#E8E4D9] p-7 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-[#E8E4D9] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#A68A64]" />
                    <h3 className="font-serif text-lg font-bold text-[#1C1C1C] capitalize">{dateLabel}</h3>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-[#8C8C8C]">
                    Ventas del día: <span className="text-[#A68A64] font-serif text-lg ml-1 font-bold">${dayTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {daySales.map(sale => {
                    let items: any[] = [];
                    try {
                      items = JSON.parse(sale.items_json);
                    } catch (e) {
                      console.error('Error parsing sale items JSON:', e);
                    }

                    return (
                      <div key={sale.id} className="bg-white p-5 rounded-2xl border border-[#E8E4D9] flex flex-col md:flex-row justify-between gap-4 hover:border-[#A68A64] transition-all group">
                        <div className="space-y-2.5 flex-grow">
                          <div className="flex items-center gap-3">
                            <span className="font-bold bg-[#2D2D2D] text-white px-2.5 py-1 rounded-lg uppercase text-[10px] tracking-widest">
                              {sale.payment_method}
                            </span>
                            <span className="text-xs text-[#8C8C8C] font-medium">
                              {new Date(sale.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} • Folio #{sale.id.substring(0, 6).toUpperCase()}
                            </span>
                          </div>
                          
                          {sale.notes && (
                            <p className="text-xs font-semibold text-[#A68A64] bg-[#F9F7F2] px-3 py-1.5 rounded-xl border border-[#E8E4D9] inline-block">
                              {sale.notes}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            {items.map((item, i) => (
                              <span key={i} className="text-xs font-medium bg-[#F9F7F2] px-3 py-1 rounded-xl border border-[#E8E4D9] text-[#2D2D2D]">
                                <b className="text-[#A68A64]">{item.quantity}x</b> {item.name} <span className="text-[#8C8C8C] text-[10px]">(${item.price})</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center md:items-end gap-3 md:flex-col md:justify-between border-t md:border-t-0 pt-3 md:pt-0">
                          <div className="text-left md:text-right flex-grow">
                            <span className="text-[10px] uppercase tracking-widest text-[#8C8C8C] block">Pagado</span>
                            <span className="font-serif text-xl font-bold text-[#1C1C1C]">
                              ${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onOpenEditSale(sale)}
                              title="Editar venta"
                              className="p-2 rounded-xl bg-[#F2EEE4] text-[#A68A64] hover:bg-[#A68A64] hover:text-white transition-all opacity-60 group-hover:opacity-100 shadow-sm"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => onConfirmDeleteSale(sale.id)}
                              title="Eliminar venta"
                              className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-60 group-hover:opacity-100 shadow-sm"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
