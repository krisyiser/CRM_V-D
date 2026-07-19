"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Utensils, Sun, Coffee, BedDouble, ChevronRight } from 'lucide-react';
import type { OpenTable } from './PosCart';
import type { CartItem } from '@/types';

interface Props {
  openTables: OpenTable[];
  activeTableName: string;
  onSelectTable: (tableName: string, existingOpenTable?: OpenTable) => void;
  occupiedRooms: { id: string; name: string; guestName: string }[];
}

export default function PosTableGrid({
  openTables,
  activeTableName,
  onSelectTable,
  occupiedRooms
}: Props) {
  const [selectedZone, setSelectedZone] = useState<'all' | 'salon' | 'terraza' | 'bar' | 'rooms'>('all');

  const salonTables = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Mesa 6'];
  const terrazaTables = ['Terraza 1', 'Terraza 2', 'Terraza 3', 'Terraza 4'];
  const barTables = ['Bar 1', 'Bar 2', 'Bar 3'];
  const roomTables = occupiedRooms.map(r => `Suite ${r.id} - ${r.guestName}`);

  const getOpenTableFor = (tableName: string) => {
    return openTables.find(t => t.tableName.toLowerCase() === tableName.toLowerCase());
  };

  const zones = [
    { id: 'all', label: 'Todas las Mesas', icon: <Utensils size={14} /> },
    { id: 'salon', label: 'Salón Principal', icon: <Utensils size={14} /> },
    { id: 'terraza', label: 'Terraza / Jardín', icon: <Sun size={14} /> },
    { id: 'bar', label: 'Barra', icon: <Coffee size={14} /> },
    { id: 'rooms', label: 'Room Service', icon: <BedDouble size={14} /> },
  ];

  const renderTableTile = (tableName: string, zoneType: string) => {
    const openTable = getOpenTableFor(tableName);
    const isActive = activeTableName.toLowerCase() === tableName.toLowerCase();
    const itemCount = openTable ? openTable.cart.reduce((sum: number, i: CartItem) => sum + i.quantity, 0) : 0;
    const totalAmount = openTable ? openTable.cart.reduce((sum: number, i: CartItem) => sum + (i.product.price * i.quantity), 0) : 0;

    return (
      <motion.button
        key={tableName}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => onSelectTable(tableName, openTable)}
        className={`relative p-4 md:p-5 rounded-[24px] border transition-all text-left flex flex-col justify-between h-32 md:h-36 shadow-sm active:scale-95 ${
          isActive
            ? 'bg-[#2D2D2D] text-white border-[#2D2D2D] ring-4 ring-[#A68A64]/30 shadow-xl'
            : openTable
            ? 'bg-[#A68A64]/10 border-[#A68A64] text-[#2D2D2D] shadow-md hover:bg-[#A68A64]/20'
            : 'bg-white border-[#E8E4D9] text-[#2D2D2D] hover:border-[#A68A64]/50 hover:shadow-md'
        }`}
      >
        <div className="flex items-start justify-between w-full">
          <div>
            <span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${
              isActive ? 'text-[#A68A64]' : openTable ? 'text-[#A68A64]' : 'text-[#8C8C8C]'
            }`}>
              {zoneType}
            </span>
            <h4 className="font-bold text-base md:text-lg leading-tight truncate">{tableName}</h4>
          </div>

          <span className={`w-3 h-3 rounded-full ${
            isActive ? 'bg-[#A68A64] ring-4 ring-white/20' : openTable ? 'bg-amber-500 animate-pulse' : 'bg-[#8E9B8E]'
          }`} />
        </div>

        {openTable ? (
          <div className="mt-auto pt-2 border-t border-current/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-white/70' : 'text-[#8C8C8C]'}`}>
                {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
              </span>
              <span className={`text-sm font-bold font-serif ${isActive ? 'text-[#A68A64]' : 'text-[#A68A64]'}`}>
                ${totalAmount.toLocaleString('es-MX')} MXN
              </span>
            </div>
            <span className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider ${
              isActive ? 'bg-[#A68A64] text-white' : 'bg-[#A68A64] text-white'
            }`}>
              Abierta
            </span>
          </div>
        ) : (
          <div className="mt-auto pt-2 border-t border-[#E8E4D9]/60 flex items-center justify-between text-[#8C8C8C]">
            <span className="text-[10px] font-semibold">Disponible</span>
            <ChevronRight size={14} />
          </div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="bg-[#F9F7F2] rounded-[32px] border border-[#E8E4D9] p-4 md:p-6 shadow-sm flex flex-col gap-5 text-left">
      {/* Active Table Banner */}
      <div className="bg-[#2D2D2D] text-white p-4 rounded-2xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#A68A64] flex items-center justify-center font-bold text-white shadow-md">
            <Utensils size={18} />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#A68A64]">Mesa en atención activa</p>
            <h3 className="text-base font-bold">{activeTableName || 'Ninguna mesa seleccionada'}</h3>
          </div>
        </div>
        {activeTableName && (
          <span className="px-3 py-1 bg-[#A68A64]/20 border border-[#A68A64]/40 text-[#A68A64] rounded-xl text-xs font-bold uppercase tracking-wider">
            Ticket Abierto
          </span>
        )}
      </div>

      {/* Zone Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
        {zones.map(z => (
          <button
            key={z.id}
            onClick={() => setSelectedZone(z.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-all flex items-center gap-2 ${
              selectedZone === z.id
                ? 'bg-[#A68A64] text-white shadow-md scale-105'
                : 'bg-white text-[#6B6B6B] border border-[#E8E4D9] hover:bg-[#E8E4D9]/30'
            }`}
          >
            {z.icon} {z.label}
          </button>
        ))}
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 max-h-[55vh] overflow-y-auto pr-1 no-scrollbar">
        {(selectedZone === 'all' || selectedZone === 'salon') &&
          salonTables.map(t => renderTableTile(t, 'Salón'))
        }
        {(selectedZone === 'all' || selectedZone === 'terraza') &&
          terrazaTables.map(t => renderTableTile(t, 'Terraza'))
        }
        {(selectedZone === 'all' || selectedZone === 'bar') &&
          barTables.map(t => renderTableTile(t, 'Bar'))
        }
        {(selectedZone === 'all' || selectedZone === 'rooms') &&
          roomTables.map(t => renderTableTile(t, 'Room Service'))
        }
      </div>
    </div>
  );
}
