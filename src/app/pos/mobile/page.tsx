"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coffee, Plus, Minus, Trash2, Search, Sparkles, Clock, 
  CreditCard, Wallet, FileText, CheckCircle2, Tag, 
  ShoppingBag, UtensilsCrossed, Wine, Beer, X, User, Pencil, AlertTriangle, ChevronUp, ChevronDown
} from 'lucide-react';
import { apiFetch, API_ENDPOINTS } from '../../../lib/api';
import { toast } from '../../../components/Toast';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock?: number;
  image?: string;
  createdAt?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface PosSale {
  id: string;
  itemsJson: string;
  total: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export default function PosMobilePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [salesHistory, setSalesHistory] = useState<PosSale[]>([]);
  const [activeView, setActiveView] = useState<'catalog' | 'history'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Habitación'>('Efectivo');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Success Receipt State
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null);
  
  // Mobile Cart Drawer State
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // DB reference lists
  const [rooms, setRooms] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);

  const categories = ['Todas', 'Desayunos', 'Café', 'Cerveza', 'Vinos', 'Copas', 'Digestivos', 'Extras'];
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    loadSalesHistory();
    loadRoomsAndReservations();
  }, []);

  const loadRoomsAndReservations = async () => {
    try {
      const [roomsData, resData] = await Promise.all([
        apiFetch<any[]>(API_ENDPOINTS.rooms),
        apiFetch<any[]>(API_ENDPOINTS.reservations)
      ]);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setReservations(Array.isArray(resData) ? resData : []);
    } catch (err) {
      console.error('Error fetching rooms/reservations in Mobile POS:', err);
    }
  };

  const getOccupiedRoomsWithGuests = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return rooms
      .filter(room => room.status === 'occupied')
      .map(room => {
        const res = reservations.find(r => {
          if (r.roomId !== room.id) return false;
          const [checkIn, checkOut] = (r.dates || '').split(' - ');
          return todayStr >= checkIn && todayStr <= checkOut;
        });
        return {
          id: room.id,
          name: room.name,
          guestName: res ? res.guestName : 'Huésped Activo'
        };
      });
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Product[]>(API_ENDPOINTS.products);
      setProducts(data || []);
    } catch (err) {
      toast.error('Error al cargar productos del menú');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesHistory = async () => {
    try {
      const data = await apiFetch<PosSale[]>(API_ENDPOINTS.posSales);
      setSalesHistory(data || []);
    } catch (err) {
      console.error('Error al cargar historial de ventas', err);
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} agregado`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const fee = paymentMethod === 'Tarjeta' ? subtotal * 0.05 : 0;
  const total = subtotal + fee;

  const handleCompleteOrder = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Habitación' && !notes) {
      toast.error('Selecciona una habitación para el cargo.');
      return;
    }
    
    try {
      const itemsJson = JSON.stringify(cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })));

      const fullNotes = paymentMethod === 'Habitación' ? `Cargo a Habitación / Huesped: ${notes}` : notes;

      const newSale = await apiFetch<PosSale>(API_ENDPOINTS.posSales, {
        method: 'POST',
        body: JSON.stringify({
          itemsJson,
          total: Number(total.toFixed(2)),
          paymentMethod,
          notes: fullNotes || "Consumo en Restaurante (Móvil)"
        })
      });

      toast.success('¡Pedido cobrado con éxito!');
      setLastCompletedSale({
        ...newSale,
        items: cart,
        total,
        fee,
        subtotal
      });

      // Reset cart
      setCart([]);
      setNotes('');
      setCartDrawerOpen(false);
      loadSalesHistory();
    } catch (err) {
      toast.error('Error al procesar comanda móvil');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#F9F7F2] text-[#2D2D2D] font-sans select-none overflow-hidden text-left relative">
      
      {/* Header */}
      <header className="px-4 py-3 shrink-0 bg-white border-b border-[#E8E4D9] flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#A68A64] flex items-center justify-center text-white shadow-md shadow-[#A68A64]/20">
            <Coffee size={16} />
          </div>
          <div>
            <h1 className="text-sm font-serif font-bold text-[#1C1C1C] tracking-wide">Comanda Digital</h1>
            <p className="text-[10px] text-[#A68A64] font-semibold uppercase tracking-wider">Vainilla & Descanso</p>
          </div>
        </div>

        {/* Tab view switcher */}
        <div className="bg-[#E8E4D9]/60 p-0.5 rounded-xl flex items-center gap-0.5 text-[11px] font-bold">
          <button 
            onClick={() => { setActiveView('catalog'); setCartDrawerOpen(false); }}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${
              activeView === 'catalog' ? 'bg-[#2D2D2D] text-white shadow-xs' : 'text-[#6B6B6B]'
            }`}
          >
            Menú
          </button>
          <button 
            onClick={() => { setActiveView('history'); setCartDrawerOpen(false); }}
            className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all flex items-center gap-1 ${
              activeView === 'history' ? 'bg-[#2D2D2D] text-white shadow-xs' : 'text-[#6B6B6B]'
            }`}
          >
            <Clock size={12} />
            Comandas ({salesHistory.length})
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 w-full relative overflow-hidden flex flex-col">
        {activeView === 'catalog' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Search & Category Tabs Panel (Shrink-0) */}
            <div className="p-3 bg-white/70 backdrop-blur-md border-b border-[#E8E4D9]/60 space-y-2.5 shrink-0 z-10">
              {/* Search */}
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8C8C]" size={15} />
                <input
                  type="text"
                  ref={searchInputRef}
                  placeholder="Buscar platillo, bebida o cerveza..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-xl pl-10 pr-9 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 focus:border-[#A68A64] transition-all text-[#2D2D2D]"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8C8C] hover:text-[#2D2D2D] p-1 rounded-full bg-[#E8E4D9]/50"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Categories horizontally scrollable */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-3 px-3 snap-x">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap uppercase tracking-wider transition-all snap-start ${
                      selectedCategory === cat 
                        ? 'bg-[#A68A64] text-white shadow-md shadow-[#A68A64]/10' 
                        : 'bg-[#F9F7F2] text-[#6B6B6B] border border-[#E8E4D9]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid View (Full scroll-y, flex-1) */}
            <div className="flex-1 overflow-y-auto p-3 pb-24 space-y-3">
              {loading ? (
                <div className="grid grid-cols-2 gap-3 animate-pulse">
                  {[1,2,3,4,5,6].map(n => (
                    <div key={n} className="bg-white p-5 rounded-2xl h-36 border border-[#E8E4D9]" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white border border-[#E8E4D9] rounded-2xl p-10 text-center shadow-xs">
                  <Coffee size={36} className="mx-auto text-[#8C8C8C] mb-3 stroke-1 opacity-50" />
                  <h3 className="text-sm font-bold text-[#1C1C1C]">No hay resultados</h3>
                  <p className="text-[11px] text-[#6B6B6B] mt-0.5">Intenta con otro término o categoría.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <AnimatePresence>
                    {filteredProducts.map(prod => {
                      const countInCart = cart.find(item => item.product.id === prod.id)?.quantity || 0;
                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={prod.id}
                          onClick={() => addToCart(prod)}
                          className={`bg-white border rounded-2xl p-3.5 flex flex-col justify-between active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden select-none ${
                            countInCart > 0 ? 'border-[#A68A64] ring-1 ring-[#A68A64]/30' : 'border-[#E8E4D9]'
                          }`}
                        >
                          {/* Mini cart counter badge */}
                          {countInCart > 0 && (
                            <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#A68A64] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                              {countInCart}
                            </div>
                          )}

                          <div className="mb-3 text-left">
                            <span className="inline-block px-2 py-0.5 rounded bg-[#F2EEE4] text-[#8C8C8C] text-[8px] font-bold uppercase tracking-wider mb-1.5">
                              {prod.category}
                            </span>
                            <h3 className="font-semibold text-xs leading-snug text-[#1C1C1C] line-clamp-2">
                              {prod.name}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between border-t border-[#F2EEE4] pt-2.5 mt-auto">
                            <span className="font-serif text-sm text-[#1C1C1C] font-bold">
                              ${prod.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                            <div className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
                              countInCart > 0 ? 'bg-[#A68A64] text-white' : 'bg-[#F9F7F2] text-[#2D2D2D]'
                            }`}>
                              +
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* SALES HISTORY MOBILE VIEW */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E4D9]/80 pb-3">
              <h2 className="font-serif text-base font-bold text-[#1C1C1C]">Historial de Comandas</h2>
              <div className="text-[11px] font-semibold text-[#8C8C8C]">
                Total: <span className="text-[#A68A64] font-serif font-bold text-sm">${salesHistory.reduce((sum, s) => sum + s.total, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {salesHistory.length === 0 ? (
              <div className="text-center py-16 text-[#8C8C8C]">
                <FileText size={36} className="mx-auto mb-3 stroke-1 opacity-40" />
                <p className="text-xs font-semibold text-[#1C1C1C]">No hay comandas registradas aún</p>
                <p className="text-[10px] text-[#6B6B6B] mt-0.5">Los pedidos de hoy aparecerán aquí.</p>
              </div>
            ) : (
              (() => {
                // Group sales by day
                const groups: { [key: string]: PosSale[] } = {};
                salesHistory.forEach(sale => {
                  const d = new Date(sale.createdAt);
                  const dateKey = d.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' });
                  if (!groups[dateKey]) groups[dateKey] = [];
                  groups[dateKey].push(sale);
                });

                return (
                  <div className="space-y-6 text-left">
                    {Object.entries(groups).map(([dateLabel, daySales]) => {
                      const dayTotal = daySales.reduce((sum, s) => sum + s.total, 0);
                      return (
                        <div key={dateLabel} className="bg-white rounded-2xl border border-[#E8E4D9] p-3 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-[#E8E4D9]/60 pb-2">
                            <span className="font-serif text-xs font-bold text-[#1C1C1C] capitalize flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#A68A64]" />
                              {dateLabel}
                            </span>
                            <span className="text-[10px] font-semibold text-[#8C8C8C]">
                              Día: <b className="text-[#A68A64] font-serif">${dayTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</b>
                            </span>
                          </div>

                          <div className="space-y-2">
                            {daySales.map(sale => {
                              let items: any[] = [];
                              try { items = JSON.parse(sale.itemsJson); } catch (e) {}

                              return (
                                <div key={sale.id} className="p-3 bg-[#F9F7F2]/50 border border-[#E8E4D9] rounded-xl flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold bg-[#2D2D2D] text-white px-2 py-0.5 rounded text-[8px] tracking-wider">
                                      {sale.paymentMethod}
                                    </span>
                                    <span className="text-[9px] text-[#8C8C8C] font-mono">
                                      #{sale.id.substring(0, 6).toUpperCase()} • {new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>

                                  {sale.notes && (
                                    <p className="text-[9px] font-semibold text-[#A68A64] bg-white px-2 py-1 rounded border border-[#E8E4D9]/60 self-start">
                                      {sale.notes}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap gap-1 border-t border-b border-[#E8E4D9]/40 py-2">
                                    {items.map((item, i) => (
                                      <span key={i} className="text-[10px] font-medium bg-white px-2 py-0.5 rounded border border-[#E8E4D9]/40 text-[#2D2D2D]">
                                        <b className="text-[#A68A64]">{item.quantity}x</b> {item.name}
                                      </span>
                                    ))}
                                  </div>

                                  <div className="flex justify-between items-center mt-1">
                                    <span className="text-[9px] uppercase tracking-widest text-[#8C8C8C]">Monto Cobrado</span>
                                    <span className="font-serif text-sm font-bold text-[#1C1C1C]">
                                      ${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Bar (Persistent CTA for Cart Drawer) */}
      {activeView === 'catalog' && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/80 border-t border-[#E8E4D9] backdrop-blur-lg flex items-center justify-between gap-3 z-30 shadow-2xl">
          <div className="text-left">
            <span className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest block">Subtotal</span>
            <span className="font-serif text-base font-bold text-[#A68A64] leading-tight">
              ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={() => setCartDrawerOpen(true)}
            disabled={cart.length === 0}
            className="flex-grow max-w-[220px] py-3.5 bg-[#2D2D2D] active:bg-black disabled:opacity-40 disabled:active:bg-[#2D2D2D] text-white font-bold rounded-xl text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <ShoppingBag size={14} />
            Ver Cuenta ({cartItemsCount})
          </button>
        </div>
      )}

      {/* Bottom Cart Drawer Sheet (Using pure CSS backdrop with Framer Motion slide-up) */}
      <AnimatePresence>
        {cartDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartDrawerOpen(false)}
              className="absolute inset-0 bg-black z-40"
            />

            {/* Bottom Drawer Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-[#F9F7F2] rounded-t-[32px] border-t border-[#E8E4D9] shadow-2xl z-50 flex flex-col overflow-hidden text-left"
            >
              {/* Drag Indicator Top Header */}
              <div className="w-full py-3 bg-white flex flex-col items-center border-b border-[#E8E4D9]/80 shrink-0 relative">
                <button
                  onClick={() => setCartDrawerOpen(false)}
                  className="absolute top-1/2 -translate-y-1/2 right-4 p-2 text-[#8C8C8C] hover:text-[#2D2D2D] rounded-full hover:bg-[#F9F7F2]"
                >
                  <X size={16} />
                </button>
                <div className="w-10 h-1 bg-[#E8E4D9] rounded-full mb-1.5" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#2D2D2D]">Detalle de la Comanda</h3>
                <p className="text-[9px] text-[#A68A64] font-bold tracking-widest">{cartItemsCount} Platillos/Bebidas</p>
              </div>

              {/* Scrollable Cart Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-8">
                {/* Cart Items List */}
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-[#E8E4D9] shadow-xs">
                      <div className="flex flex-col flex-1 pr-3 text-left">
                        <span className="font-semibold text-xs leading-snug text-[#1C1C1C]">{item.product.name}</span>
                        <span className="text-[10px] text-[#A68A64] font-bold mt-0.5">${item.product.price.toLocaleString()} c/u</span>
                      </div>

                      <div className="flex items-center gap-2.5 bg-[#F9F7F2] p-1 rounded-xl border border-[#E8E4D9]">
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 bg-white hover:bg-[#E8E4D9]/50 text-[#2D2D2D] rounded-lg flex items-center justify-center transition-colors border border-[#E8E4D9]"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-6 h-6 bg-[#A68A64] text-white rounded-lg flex items-center justify-center transition-colors"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Settings & Info */}
                <div className="space-y-4 pt-3 border-t border-[#E8E4D9]">
                  {/* Payment Method Selector */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#8C8C8C] mb-2 block">Método de Pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Efectivo', 'Tarjeta', 'Habitación'] as const).map(method => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1.5 ${
                            paymentMethod === method 
                              ? 'bg-[#A68A64] border-[#A68A64] text-white shadow-md' 
                              : 'bg-white border-[#E8E4D9] text-[#8C8C8C] hover:text-[#2D2D2D]'
                          }`}
                        >
                          {method === 'Efectivo' && <Wallet size={14} />}
                          {method === 'Tarjeta' && <CreditCard size={14} />}
                          {method === 'Habitación' && <User size={14} />}
                          <span className="text-[9px] tracking-wide mt-0.5">{method}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes / Mesa Input */}
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-[#8C8C8C] mb-2 block">
                      {paymentMethod === 'Habitación' ? 'Habitación Ocupada *' : 'Notas de Mesa / Comentarios'}
                    </label>
                    {paymentMethod === 'Habitación' ? (
                      <select
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        required
                        className="w-full bg-white border border-[#E8E4D9] rounded-xl px-3 py-3 text-xs focus:outline-none focus:border-[#A68A64] text-[#2D2D2D] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A68A64%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.6rem_auto] bg-[right_1rem_center] bg-no-repeat placeholder-[#8C8C8C]"
                      >
                        <option value="" className="text-[#8C8C8C]">-- Selecciona Habitación --</option>
                        {getOccupiedRoomsWithGuests().map(r => (
                          <option key={r.id} value={`${r.id} - ${r.guestName}`} className="text-[#2d2d2d] bg-white">
                            Suite {r.id} &mdash; {r.guestName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Ej. Mesa 4, Terraza, Sin cebolla..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full bg-white border border-[#E8E4D9] rounded-xl px-3 py-3 text-xs focus:outline-none focus:border-[#A68A64] text-[#2D2D2D] placeholder-[#8C8C8C]"
                      />
                    )}
                  </div>
                </div>

                {/* Final Cost Details Card */}
                <div className="bg-white p-4 rounded-2xl border border-[#E8E4D9] space-y-2 text-xs">
                  <div className="flex justify-between text-[#8C8C8C]">
                    <span>Subtotal:</span>
                    <span className="text-[#2D2D2D] font-bold">${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {paymentMethod === 'Tarjeta' && (
                    <div className="flex justify-between text-[#A68A64] text-[11px] font-semibold">
                      <span>Comisión Bancaria (5%):</span>
                      <span>+${fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-serif font-bold text-[#1C1C1C] border-t border-[#E8E4D9] pt-2 mt-1">
                    <span>Total de la Cuenta:</span>
                    <span className="text-[#A68A64] text-base">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Complete Order Button inside Drawer */}
                <button
                  onClick={handleCompleteOrder}
                  className="w-full py-4 bg-[#A68A64] active:bg-[#8F7553] text-white font-bold rounded-2xl uppercase tracking-wider text-xs shadow-lg shadow-[#A68A64]/20 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  <CheckCircle2 size={16} /> Confirmar Comanda & Registrar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success Comanda Overlay */}
      <AnimatePresence>
        {lastCompletedSale && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm border border-[#E8E4D9] shadow-2xl text-center relative overflow-hidden"
            >
              <div className="w-12 h-12 bg-[#8E9B8E]/20 text-[#8E9B8E] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} strokeWidth={2.5} />
              </div>

              <h2 className="font-serif text-xl font-bold text-[#1C1C1C] mb-1">¡Comanda Registrada!</h2>
              <p className="text-[10px] text-[#8C8C8C] mb-4">Folio #{lastCompletedSale.id.substring(0, 8).toUpperCase()}</p>

              <div className="bg-[#F9F7F2] p-4 rounded-xl border border-[#E8E4D9] mb-5 text-left space-y-2 text-xs">
                {lastCompletedSale.items.map((item: any) => (
                  <div key={item.product.id} className="flex justify-between text-[#2D2D2D] font-semibold">
                    <span>{item.quantity}x {item.product.name}</span>
                    <span>${(item.product.price * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                {lastCompletedSale.fee > 0 && (
                  <div className="flex justify-between text-[10px] font-semibold text-[#A68A64] border-t border-[#E8E4D9] pt-1.5">
                    <span>Comisión Tarjeta (5%)</span>
                    <span>+${lastCompletedSale.fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between font-serif font-bold text-sm text-[#1C1C1C] border-t border-[#E8E4D9] pt-2 mt-2">
                  <span>Total Pagado ({lastCompletedSale.paymentMethod})</span>
                  <span className="text-[#A68A64]">${lastCompletedSale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {lastCompletedSale.notes && (
                <p className="text-[10px] text-[#A68A64] font-medium bg-[#F2EEE4] py-2 px-3 rounded-lg mb-5">
                  {lastCompletedSale.notes}
                </p>
              )}

              <button
                onClick={() => setLastCompletedSale(null)}
                className="w-full py-3 bg-[#2D2D2D] hover:bg-black text-white font-bold rounded-xl uppercase tracking-widest text-[10px] shadow-sm transition-all"
              >
                Aceptar & Continuar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
