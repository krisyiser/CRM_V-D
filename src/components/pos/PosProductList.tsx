"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Coffee, Trash2, UtensilsCrossed, Beer, Wine } from 'lucide-react';
import type { Product } from '@/types';

interface Props {
  products: Product[];
  loading: boolean;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  addToCart: (p: Product) => void;
  onDeleteProduct: (p: Product) => void;
  categories: string[];
  filteredProducts: Product[];
}

export default function PosProductList({
  loading,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  addToCart,
  onDeleteProduct,
  categories,
  filteredProducts,
}: Props) {
  const getCatIcon = (cat: string) => {
    switch (cat) {
      case 'Desayunos': return <UtensilsCrossed size={14} />;
      case 'Café':      return <Coffee size={14} />;
      case 'Cerveza':   return <Beer size={14} />;
      case 'Vinos':     return <Wine size={14} />;
      case 'Copas':     return <Wine size={14} />;
      default:          return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:overflow-hidden">
      {/* Search Input */}
      <div className="flex flex-col md:flex-row items-center gap-4 shrink-0">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8C8C]" size={18} />
          <input
            type="text"
            placeholder="Buscar en menú (ej. Carajillo, Latte, Corona...)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E8E4D9] rounded-xl pl-12 pr-6 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#A68A64]/30 focus:border-[#A68A64] transition-all shadow-sm text-[#2D2D2D]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C8C8C] hover:text-[#2D2D2D]">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar shrink-0">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              selectedCategory === cat 
                ? 'bg-[#A68A64] text-white shadow-lg shadow-[#A68A64]/20 scale-105' 
                : 'bg-white text-[#6B6B6B] hover:bg-[#E8E4D9]/40 border border-[#E8E4D9]'
            }`}
          >
            {getCatIcon(cat)}
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="flex-grow overflow-y-auto pr-1 no-scrollbar pb-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="bg-white p-6 rounded-3xl h-48 border border-[#E8E4D9]" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-[#E8E4D9] rounded-3xl p-16 text-center shadow-xs">
            <Coffee size={48} className="mx-auto text-[#8C8C8C] mb-4 stroke-1 opacity-50" />
            <h3 className="text-lg font-bold text-[#1C1C1C]">No se encontraron productos</h3>
            <p className="text-sm text-[#6B6B6B] mt-1">Intenta con otra búsqueda o agrega un nuevo producto al menú.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredProducts.map(prod => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="bg-white border border-[#E8E4D9] rounded-3xl p-5 hover:border-[#A68A64] hover:shadow-2xl hover:shadow-[#A68A64]/10 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteProduct(prod); }}
                    className="absolute top-3 right-3 p-2 bg-[#F9F7F2] text-[#8C8C8C] hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Eliminar del menú"
                  >
                    <Trash2 size={14} />
                  </button>

                  <div className="mb-4">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-[#F2EEE4] text-[#8C8C8C] text-[10px] font-bold uppercase tracking-widest mb-3">
                      {prod.category}
                    </span>
                    <h3 className="font-semibold text-sm leading-snug text-[#1C1C1C] group-hover:text-[#A68A64] transition-colors">
                      {prod.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#F2EEE4] pt-4 mt-auto">
                    <span className="font-serif text-lg text-[#1C1C1C] font-bold">
                      ${prod.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-[#F9F7F2] group-hover:bg-[#A68A64] text-[#2D2D2D] group-hover:text-white transition-colors flex items-center justify-center font-bold text-base">
                      +
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
