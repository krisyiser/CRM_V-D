"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Clock, Plus, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiFetch, API } from '@/lib/api';
import { toast } from '@/components/Toast';
import type { Product, CartItem, PosSale, Room, Reservation } from '@/types';
import PosProductList from '@/components/pos/PosProductList';
import PosCart, { OpenTable } from '@/components/pos/PosCart';
import PosSalesHistory from '@/components/pos/PosSalesHistory';

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [salesHistory, setSalesHistory] = useState<PosSale[]>([]);
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [mobileView, setMobileView] = useState<'menu' | 'cart'>('menu');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Habitación'>('Efectivo');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Open tables state
  const [openTables, setOpenTables] = useState<OpenTable[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Desayunos', price: '' });
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null);
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const categories = ['Todas', 'Desayunos', 'Café', 'Cerveza', 'Vinos', 'Copas', 'Digestivos', 'Extras'];

  const loadOpenTables = useCallback(async () => {
    try {
      const data = await apiFetch<OpenTable[]>('/api/open-tables');
      if (Array.isArray(data)) setOpenTables(data);
    } catch (err) {
      console.error('Error loading open tables:', err);
    }
  }, []);

  const syncOpenTables = async (newList: OpenTable[]) => {
    setOpenTables(newList);
    try {
      await apiFetch('/api/open-tables', {
        method: 'POST',
        body: JSON.stringify(newList)
      });
    } catch (e) {
      console.error('Error saving open tables:', e);
    }
  };

  const loadRoomsAndReservations = useCallback(async () => {
    try {
      const [roomsData, resData] = await Promise.all([
        apiFetch<Room[]>(API.rooms),
        apiFetch<Reservation[]>(API.reservations)
      ]);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setReservations(Array.isArray(resData) ? resData : []);
    } catch (err) {
      console.error('Error fetching rooms/reservations in POS:', err);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Product[]>(API.products);
      setProducts(data || []);
    } catch (err) {
      toast.error('Error al cargar productos del menú');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSalesHistory = useCallback(async () => {
    try {
      const data = await apiFetch<PosSale[]>(API.posSales);
      setSalesHistory(data || []);
    } catch (err) {
      console.error('Error al cargar historial de ventas', err);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadSalesHistory();
    loadRoomsAndReservations();
    loadOpenTables();
  }, [loadProducts, loadSalesHistory, loadRoomsAndReservations, loadOpenTables]);

  const getOccupiedRoomsWithGuests = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    return rooms
      .filter(room => room.status === 'occupied')
      .map(room => {
        const res = reservations.find(r => {
          if (r.room_id !== room.id) return false;
          const [checkIn, checkOut] = (r.dates || '').split(' - ');
          return todayStr >= checkIn && todayStr <= checkOut;
        });
        return {
          id: room.id,
          name: room.name,
          guestName: res ? res.guest_name : 'Huésped Activo'
        };
      });
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast.success(`${product.name} agregado a la cuenta`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const handlePauseTable = (tableName: string) => {
    const existingIndex = openTables.findIndex(t => t.tableName.toLowerCase() === tableName.toLowerCase() || (activeTableId && t.id === activeTableId));
    const updatedTable: OpenTable = {
      id: activeTableId || `table_${Date.now()}`,
      tableName,
      cart: [...cart],
      paymentMethod,
      notes,
      createdAt: new Date().toISOString()
    };

    let newTablesList: OpenTable[];
    if (existingIndex >= 0) {
      newTablesList = [...openTables];
      newTablesList[existingIndex] = updatedTable;
    } else {
      newTablesList = [...openTables, updatedTable];
    }

    syncOpenTables(newTablesList);
    setCart([]);
    setNotes('');
    setActiveTableId(null);
    toast.success(`Cuenta de ${tableName} pausada correctamente.`);
  };

  const handleRestoreTable = (table: OpenTable) => {
    setCart(table.cart);
    setPaymentMethod(table.paymentMethod);
    setNotes(table.notes);
    setActiveTableId(table.id);

    // Remove restored table from open list until re-paused or paid
    const remaining = openTables.filter(t => t.id !== table.id);
    syncOpenTables(remaining);
    toast.success(`Cuenta de ${table.tableName} cargada en caja.`);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const fee = paymentMethod === 'Tarjeta' ? subtotal * 0.05 : 0;
  const total = subtotal + fee;

  const handleCompleteOrder = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Habitación' && !notes) {
      toast.error('Por favor, selecciona una habitación para realizar el cargo.');
      return;
    }
    
    try {
      const items_json = JSON.stringify(cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })));
      const fullNotes = paymentMethod === 'Habitación' ? `Cargo a Habitación / Huesped: ${notes}` : notes;

      const newSale = await apiFetch<PosSale>(API.posSales, {
        method: 'POST',
        body: JSON.stringify({
          items_json,
          total: Number(total.toFixed(2)),
          payment_method: paymentMethod,
          notes: fullNotes || "Consumo general en Restaurante/Bar"
        })
      });

      // If completing an active open table, clean it up from openTables
      if (activeTableId) {
        const remaining = openTables.filter(t => t.id !== activeTableId);
        syncOpenTables(remaining);
        setActiveTableId(null);
      }

      toast.success('¡Pedido cobrado con éxito!');
      setLastCompletedSale({ ...newSale, items: cart, total, fee, subtotal });
      setCart([]);
      setNotes('');
      loadSalesHistory();
    } catch (err) {
      toast.error('Ocurrió un error al procesar el cobro');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || isNaN(Number(newProduct.price))) {
      toast.error('Por favor ingresa un nombre y precio válido');
      return;
    }
    try {
      setSubmittingProduct(true);
      await apiFetch<Product>(API.products, {
        method: 'POST',
        body: JSON.stringify({ name: newProduct.name, category: newProduct.category, price: Number(newProduct.price) })
      });
      toast.success('Producto agregado con éxito');
      setIsModalOpen(false);
      setNewProduct({ name: '', category: 'Desayunos', price: '' });
      loadProducts();
    } catch (err) {
      toast.error('Error al agregar el producto');
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar ${product.name} del menú?`)) return;
    try {
      await apiFetch(API.products, { method: 'DELETE', body: JSON.stringify({ id: product.id }) });
      toast.success('Producto eliminado del menú');
      loadProducts();
    } catch (err) {
      toast.error('Error al eliminar producto');
    }
  };

  const handleDeleteSale = async () => {
    if (!deletingSaleId) return;
    try {
      setDeletingLoading(true);
      await apiFetch(API.posSales, { method: 'DELETE', body: JSON.stringify({ id: deletingSaleId }) });
      toast.success('Venta eliminada con éxito');
      setDeletingSaleId(null);
      loadSalesHistory();
    } catch (err) {
      toast.error('Error al eliminar la venta');
    } finally {
      setDeletingLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen lg:min-h-0 lg:h-full bg-[#F9F7F2] text-[#2D2D2D] p-4 sm:p-6 lg:p-0 font-sans selection:bg-[#A68A64] selection:text-white text-left lg:overflow-hidden flex flex-col">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-[#E8E4D9] shrink-0">
        <div>
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[#A68A64] mb-1.5">
            <Coffee size={16} /> Restaurante & Café Bar
          </div>
          <h1 className="text-2xl md:text-3xl font-serif text-[#1C1C1C]">Punto de Venta Boutique</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-[#E8E4D9]/60 p-1 rounded-2xl flex items-center gap-1">
            <button onClick={() => setActiveTab('pos')} className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${activeTab === 'pos' ? 'bg-[#2D2D2D] text-white shadow-lg' : 'text-[#6B6B6B]'}`}>Caja</button>
            <button onClick={() => setActiveTab('history')} className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-[#2D2D2D] text-white shadow-lg' : 'text-[#6B6B6B]'}`}><Clock size={14} /> Historial ({salesHistory.length})</button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-[#A68A64] hover:bg-[#8F7553] text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-md flex items-center gap-2"><Plus size={16} /> Nuevo Producto</button>
        </div>
      </div>

      {activeTab === 'pos' && (
        <div className="flex lg:hidden bg-[#E8E4D9]/60 p-1 rounded-2xl mb-4 sticky top-2 z-30">
          <button onClick={() => setMobileView('menu')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${mobileView === 'menu' ? 'bg-[#2D2D2D] text-white' : 'text-[#6B6B6B]'}`}>Menú</button>
          <button onClick={() => setMobileView('cart')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${mobileView === 'cart' ? 'bg-[#2D2D2D] text-white' : 'text-[#6B6B6B]'}`}>Carrito ({cart.reduce((sum, item) => sum + item.quantity, 0)})</button>
        </div>
      )}

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow min-h-0 lg:overflow-hidden">
          <div className={`lg:col-span-7 xl:col-span-8 flex flex-col lg:h-full lg:overflow-hidden ${mobileView === 'menu' ? 'block' : 'hidden lg:flex'}`}>
            <PosProductList products={products} loading={loading} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} searchQuery={searchQuery} setSearchQuery={setSearchQuery} addToCart={addToCart} onDeleteProduct={handleDeleteProduct} categories={categories} filteredProducts={filteredProducts} />
          </div>
          <div className={`lg:col-span-5 xl:col-span-4 flex flex-col lg:h-full ${mobileView === 'cart' ? 'block' : 'hidden lg:flex'}`}>
            <PosCart
              cart={cart}
              updateQuantity={updateQuantity}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              notes={notes}
              setNotes={setNotes}
              subtotal={subtotal}
              fee={fee}
              total={total}
              occupiedRooms={getOccupiedRoomsWithGuests()}
              onCompleteOrder={handleCompleteOrder}
              openTables={openTables}
              onPauseTable={handlePauseTable}
              onRestoreTable={handleRestoreTable}
            />
          </div>
        </div>
      ) : (
        <PosSalesHistory salesHistory={salesHistory} onOpenEditSale={() => {}} onConfirmDeleteSale={(id) => setDeletingSaleId(id)} />
      )}

      {/* Add Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-md border border-[#E8E4D9] shadow-2xl relative text-left">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-[#8C8C8C] hover:text-[#2D2D2D] rounded-full"><X size={20} /></button>
              <div className="mb-6"><h2 className="text-xl font-serif font-bold text-[#1C1C1C]">Agregar Nuevo Producto</h2></div>
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#8C8C8C] mb-1.5 block">Nombre *</label>
                  <input type="text" required placeholder="Ej. Omelette..." value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#A68A64]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8C8C8C] mb-1.5 block">Categoría *</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#A68A64]">
                      {categories.filter(c => c !== 'Todas').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8C8C8C] mb-1.5 block">Precio *</label>
                    <input type="number" step="0.01" required placeholder="150" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#A68A64]" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[#6B6B6B] hover:text-[#2D2D2D] text-xs font-bold uppercase">Cancelar</button>
                  <button type="submit" disabled={submittingProduct} className="px-6 py-2.5 bg-[#A68A64] hover:bg-[#8F7553] text-white rounded-xl text-xs font-bold uppercase disabled:opacity-50">{submittingProduct ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Receipt Modal */}
      <AnimatePresence>
        {lastCompletedSale && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-md border border-[#E8E4D9] shadow-2xl text-center">
              <div className="w-12 h-12 bg-[#8E9B8E]/20 text-[#8E9B8E] rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={24} /></div>
              <h2 className="font-serif text-2xl font-bold text-[#1C1C1C] mb-1">¡Cobro Exitoso!</h2>
              <p className="text-[10px] text-[#8C8C8C] mb-4">Folio #{lastCompletedSale.id.substring(0, 8).toUpperCase()}</p>
              <div className="bg-[#F9F7F2] p-4 rounded-xl border border-[#E8E4D9] mb-4 text-left space-y-2 text-xs">
                {lastCompletedSale.items.map((item: any) => (
                  <div key={item.product.id} className="flex justify-between">
                    <span>{item.quantity}x {item.product.name}</span>
                    <span>${(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                {lastCompletedSale.fee > 0 && <div className="flex justify-between text-[10px] text-[#A68A64]"><span>Comisión Tarjeta</span><span>+${lastCompletedSale.fee.toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold border-t border-[#E8E4D9] pt-2"><span>Total</span><span>${lastCompletedSale.total.toLocaleString()} MXN</span></div>
              </div>
              <button onClick={() => setLastCompletedSale(null)} className="w-full py-3 bg-[#2D2D2D] text-white font-bold rounded-xl uppercase tracking-wider text-xs">Cerrar</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Sale Modal */}
      <AnimatePresence>
        {deletingSaleId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-sm border border-[#E8E4D9] shadow-2xl text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24} className="text-red-500" /></div>
              <h2 className="font-serif text-lg font-bold text-[#1C1C1C] mb-1">¿Eliminar esta venta?</h2>
              <p className="text-xs text-[#6B6B6B] mb-6">Esta acción no se puede deshacer de forma simple.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingSaleId(null)} className="flex-1 py-2.5 border border-[#E8E4D9] text-[#6B6B6B] rounded-xl text-xs font-bold uppercase">Cancelar</button>
                <button onClick={handleDeleteSale} disabled={deletingLoading} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold uppercase">{deletingLoading ? 'Eliminando...' : 'Confirmar'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
