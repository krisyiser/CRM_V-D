"use client";
import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Receipt, Calendar, User, BedDouble, Coffee, ShieldCheck, CreditCard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  guestName: string;
  chargeRecord: any; // The record from room_charges
}

export default function StayReportModal({ isOpen, onClose, guestName, chargeRecord }: Props) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !chargeRecord) return null;

  // Parse itemsJson
  let stay = {
    checkIn: '',
    checkOut: '',
    nights: 1,
    roomPrice: 0,
    roomTotal: 0,
    dayPass: { active: false, details: 'N/A', total: 0 },
    parking: { active: false, total: 0 },
    barCharges: [] as any[],
    checkoutExtras: [] as any[],
    grandTotal: 0,
    checkoutPaid: true
  };

  try {
    if (typeof chargeRecord.itemsJson === 'string') {
      stay = JSON.parse(chargeRecord.itemsJson);
    } else if (chargeRecord.itemsJson) {
      stay = chargeRecord.itemsJson;
    }
  } catch (e) {
    console.error('Error parsing stay report itemsJson:', e);
  }

  const handlePrint = () => {
    // 1. Create a style block dynamically that hides everything except our print target area
    const printStyle = document.createElement('style');
    printStyle.id = 'dynamic-print-style';
    printStyle.innerHTML = `
      @media print {
        /* Hide all page content */
        body > * {
          display: none !important;
        }
        /* Show only our dynamic print container */
        #tauri-printable-invoice-container {
          display: block !important;
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white !important;
          color: #2D2D2D !important;
          padding: 30px !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #E8E4D9 !important;
          padding-bottom: 20px;
          margin-bottom: 25px;
        }
        .brand-title {
          font-size: 24px;
          font-weight: bold;
          color: #A68A64 !important;
        }
        .brand-subtitle {
          font-size: 10px;
          color: #8C8C8C;
          text-transform: uppercase;
        }
        .invoice-meta {
          text-align: right;
        }
        .invoice-title {
          font-size: 18px;
          font-weight: bold;
          color: #2D2D2D;
          margin: 0;
        }
        .invoice-date {
          font-size: 11px;
          color: #8C8C8C;
        }
        .grid-cols-2, .grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 20px !important;
          margin-bottom: 25px !important;
        }
        .info-panel {
          background: #ffffff !important;
          border: 1px solid #E8E4D9 !important;
          border-radius: 12px !important;
          padding: 15px !important;
        }
        .info-panel-title {
          font-size: 10px;
          font-weight: bold;
          color: #A68A64 !important;
          border-bottom: 1px solid #F2EEE4 !important;
          padding-bottom: 5px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 6px;
        }
        .info-label {
          color: #8C8C8C;
        }
        .info-value {
          font-weight: 600;
          color: #2D2D2D;
        }
        .table-section-title {
          font-size: 11px;
          font-weight: bold;
          color: #2D2D2D;
          margin-top: 25px;
          margin-bottom: 10px;
          border-left: 3px solid #A68A64;
          padding-left: 8px;
          text-transform: uppercase;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin-bottom: 20px !important;
          font-size: 11px !important;
        }
        th {
          background-color: #F2EEE4 !important;
          color: #2D2D2D !important;
          font-weight: bold !important;
          padding: 10px !important;
          text-align: left;
          text-transform: uppercase;
        }
        td {
          padding: 10px !important;
          border-bottom: 1px solid #F2EEE4 !important;
          color: #4A4A4A !important;
        }
        .grand-total-box {
          background-color: #2D2D2D !important;
          color: #ffffff !important;
          border-radius: 12px !important;
          padding: 15px 20px !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-top: 25px !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .grand-total-label {
          font-size: 10px;
          color: #A68A64 !important;
          text-transform: uppercase;
        }
        .grand-total-value {
          font-size: 20px;
          font-weight: bold;
          color: #F9F7F2 !important;
        }
        .stamp {
          border: 2px solid #8E9B8E !important;
          color: #8E9B8E !important;
          font-size: 10px;
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-block;
          transform: rotate(-2deg);
        }
        .text-right {
          text-align: right !important;
        }
        .text-center {
          text-align: center !important;
        }
      }
    `;
    
    // 2. Clone the printable area to a temporary absolute element in the body so it prints perfectly
    const printContainer = document.createElement('div');
    printContainer.id = 'tauri-printable-invoice-container';
    printContainer.innerHTML = printAreaRef.current?.innerHTML || '';
    
    document.body.appendChild(printStyle);
    document.body.appendChild(printContainer);
    
    // 3. Trigger printing
    setTimeout(() => {
      window.print();
      
      // 4. Clean up after printing completes
      setTimeout(() => {
        document.getElementById('dynamic-print-style')?.remove();
        document.getElementById('tauri-printable-invoice-container')?.remove();
      }, 500);
    }, 100);
  };

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
                  <Receipt size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-semibold text-[#2D2D2D]">Reporte de Cobros de Estancia</h2>
                  <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-0.5">
                    Huésped: {guestName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-white border border-[#E8E4D9] hover:bg-[#A68A64] text-[#A68A64] hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                >
                  <Printer size={15} /> Imprimir Reporte
                </button>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-red-500 transition-colors shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Report Body */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar-light text-left">
              {/* PRINT CONTENT START */}
              <div ref={printAreaRef} className="space-y-8">
                {/* Print Header */}
                <div className="invoice-header flex justify-between items-start border-b border-[#E8E4D9] pb-6">
                  <div className="text-left">
                    <span className="brand-title font-serif text-2xl font-bold text-[#A68A64] block">Vainilla & Descanso</span>
                    <span className="brand-subtitle text-[9px] font-bold uppercase tracking-[0.2em] text-[#8C8C8C] block mt-1">Lobby & Concierge Hotel</span>
                  </div>
                  <div className="invoice-meta text-right">
                    <h3 className="invoice-title text-lg font-bold text-[#2D2D2D]">RESUMEN DE CUENTA</h3>
                    <p className="invoice-date text-xs text-[#8C8C8C] mt-1">
                      Fecha checkout: {new Date(chargeRecord.createdAt || Date.now()).toLocaleString('es-MX')}
                    </p>
                    <span className={`stamp mt-3 inline-block border-2 ${stay.checkoutPaid ? 'border-[#8E9B8E] text-[#8E9B8E]' : 'border-[#C2A88D] text-[#C2A88D]'} text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-lg transform -rotate-2`}>
                      {stay.checkoutPaid ? 'Cuenta Liquidada ✓' : 'Pendiente de Pago'}
                    </span>
                  </div>
                </div>

                {/* Grid Info Panels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Guest Info */}
                  <div className="info-panel bg-white border border-[#E8E4D9] rounded-2xl p-5 text-left">
                    <h4 className="info-panel-title text-[9px] font-bold uppercase tracking-widest text-[#A68A64] border-b border-[#F2EEE4] pb-2 mb-3">Detalle del Huésped</h4>
                    <div className="space-y-2.5 text-xs text-[#6B6B6B]">
                      <div className="info-row flex justify-between">
                        <span className="info-label text-[#8C8C8C]">Nombre del Cliente:</span>
                        <span className="info-value font-bold text-[#2D2D2D]">{guestName}</span>
                      </div>
                      <div className="info-row flex justify-between">
                        <span className="info-label text-[#8C8C8C]">Habitación Asignada:</span>
                        <span className="info-value font-bold text-[#2D2D2D]">Suite {chargeRecord.roomId}</span>
                      </div>
                      <div className="info-row flex justify-between">
                        <span className="info-label text-[#8C8C8C]">Periodo de Estancia:</span>
                        <span className="info-value font-bold text-[#2D2D2D]">{stay.checkIn} al {stay.checkOut}</span>
                      </div>
                    </div>
                  </div>

                  {/* Room Stay Info */}
                  <div className="info-panel bg-white border border-[#E8E4D9] rounded-2xl p-5 text-left">
                    <h4 className="info-panel-title text-[9px] font-bold uppercase tracking-widest text-[#A68A64] border-b border-[#F2EEE4] pb-2 mb-3">Resumen de Noches</h4>
                    <div className="space-y-2.5 text-xs text-[#6B6B6B]">
                      <div className="info-row flex justify-between">
                        <span className="info-label text-[#8C8C8C]">Duración de la Estancia:</span>
                        <span className="info-value font-bold text-[#2D2D2D]">{stay.nights} Noche(s)</span>
                      </div>
                      <div className="info-row flex justify-between">
                        <span className="info-label text-[#8C8C8C]">Precio Base por Noche:</span>
                        <span className="info-value font-bold text-[#2D2D2D]">${stay.roomPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                      </div>
                      <div className="info-row flex justify-between">
                        <span className="info-label text-[#8C8C8C]">Total Hospedaje:</span>
                        <span className="info-value font-bold text-[#2D2D2D]">${stay.roomTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stay Base Charges Table */}
                <div>
                  <h4 className="table-section-title text-[10px] font-bold uppercase tracking-wider border-l-4 border-[#A68A64] pl-2.5 mb-3 text-left">1. Desglose de Servicios de Hospedaje</h4>
                  <table className="w-full border border-[#E8E4D9] bg-white rounded-xl overflow-hidden text-xs">
                    <thead>
                      <tr className="bg-[#F2EEE4] text-[#2D2D2D] font-bold uppercase text-[9px] tracking-wider">
                        <th className="py-3 px-4 text-left">Concepto / Servicio</th>
                        <th className="py-3 px-4 text-center">Cantidad</th>
                        <th className="py-3 px-4 text-right">Tarifa / Costo</th>
                        <th className="py-3 px-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2EEE4]">
                      <tr>
                        <td className="py-3 px-4 text-left font-semibold">Hospedaje - Suite {chargeRecord.roomId}</td>
                        <td className="py-3 px-4 text-center">{stay.nights} noche(s)</td>
                        <td className="py-3 px-4 text-right">${stay.roomPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-right font-bold">${stay.roomTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      {stay.dayPass && stay.dayPass.active && (
                        <tr>
                          <td className="py-3 px-4 text-left font-semibold">Acceso Especial: {stay.dayPass.details}</td>
                          <td className="py-3 px-4 text-center">1</td>
                          <td className="py-3 px-4 text-right">${stay.dayPass.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-4 text-right font-bold">${stay.dayPass.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )}
                      {stay.parking && stay.parking.total > 0 && (
                        <tr>
                          <td className="py-3 px-4 text-left font-semibold">Cajón de Estacionamiento Exclusivo</td>
                          <td className="py-3 px-4 text-center">{stay.nights} día(s)</td>
                          <td className="py-3 px-4 text-right">$50.00</td>
                          <td className="py-3 px-4 text-right font-bold">${stay.parking.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bar/Restaurant Charges Table */}
                {stay.barCharges && stay.barCharges.length > 0 && (
                  <div>
                    <h4 className="table-section-title text-[10px] font-bold uppercase tracking-wider border-l-4 border-[#A68A64] pl-2.5 mb-3 text-left">2. Consumos en Restaurante y Bar (Cargos a Habitación)</h4>
                    <table className="w-full border border-[#E8E4D9] bg-white rounded-xl overflow-hidden text-xs">
                      <thead>
                        <tr className="bg-[#F2EEE4] text-[#2D2D2D] font-bold uppercase text-[9px] tracking-wider">
                          <th className="py-3 px-4 text-left">Alimento / Bebida</th>
                          <th className="py-3 px-4 text-center">Cantidad</th>
                          <th className="py-3 px-4 text-right">Precio Unitario</th>
                          <th className="py-3 px-4 text-right">Total Consumo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2EEE4]">
                        {stay.barCharges.map((item, i) => (
                          <tr key={i}>
                            <td className="py-3 px-4 text-left font-semibold">{item.name}</td>
                            <td className="py-3 px-4 text-center">{item.quantity}</td>
                            <td className="py-3 px-4 text-right">${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-right font-bold">${item.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Checkout Extra Charges Table */}
                {stay.checkoutExtras && stay.checkoutExtras.length > 0 && (
                  <div>
                    <h4 className="table-section-title text-[10px] font-bold uppercase tracking-wider border-l-4 border-[#A68A64] pl-2.5 mb-3 text-left">3. Cargos Extras al Salir (Check-out)</h4>
                    <table className="w-full border border-[#E8E4D9] bg-white rounded-xl overflow-hidden text-xs">
                      <thead>
                        <tr className="bg-[#F2EEE4] text-[#2D2D2D] font-bold uppercase text-[9px] tracking-wider">
                          <th className="py-3 px-4 text-left">Concepto del Cargo Extra</th>
                          <th className="py-3 px-4 text-center">Cantidad</th>
                          <th className="py-3 px-4 text-right">Monto Unitario</th>
                          <th className="py-3 px-4 text-right">Total Cargo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F2EEE4]">
                        {stay.checkoutExtras.map((item, i) => (
                          <tr key={i}>
                            <td className="py-3 px-4 text-left font-semibold">{item.product}</td>
                            <td className="py-3 px-4 text-center">1</td>
                            <td className="py-3 px-4 text-right">${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-right font-bold">${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Grand Total Box */}
                <div className="grand-total-box bg-[#2D2D2D] text-white rounded-2xl p-6 flex justify-between items-center mt-8">
                  <div className="text-left">
                    <span className="grand-total-label text-[10px] font-bold uppercase tracking-wider text-[#A68A64] block">Gran Total de la Estancia</span>
                    <span className="text-[10px] text-[#8C8C8C] block mt-0.5">Impuestos y servicios incluidos</span>
                  </div>
                  <span className="grand-total-value font-serif text-2xl font-bold text-[#F9F7F2]">
                    ${stay.grandTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                  </span>
                </div>
              </div>
              {/* PRINT CONTENT END */}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
