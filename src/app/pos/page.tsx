"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coffee, Plus, Minus, Trash2, Search, Sparkles, Clock, 
  CreditCard, Wallet, FileText, CheckCircle2, Tag, 
  ShoppingBag, UtensilsCrossed, Wine, Beer, X, User, Pencil, AlertTriangle
} from 'lucide-react';
import { apiFetch, API_ENDPOINTS } from '../../lib/api';
import { toast } from '../../components/Toast';

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

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [salesHistory, setSalesHistory] = useState<PosSale[]>([]);
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [mobileView, setMobileView] = useState<'menu' | 'cart'>('menu');
  const [deletingProductObj, setDeletingProductObj] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Habitación'>('Efectivo');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Add Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Desayunos', price: '' });
  const [submittingProduct, setSubmittingProduct] = useState(false);

  // Success Receipt State
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null);

  // Edit Sale Modal State
  const [editingSale, setEditingSale] = useState<PosSale | null>(null);
  const [editItems, setEditItems] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Habitación'>('Efectivo');
  const [editNotes, setEditNotes] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete confirm modal
  const [deletingSaleId, setDeletingSaleId] = useState<string | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const [rooms, setRooms] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);

  const categories = ['Todas', 'Desayunos', 'Café', 'Cerveza', 'Vinos', 'Copas', 'Digestivos', 'Extras'];

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
      console.error('Error fetching rooms/reservations in POS:', err);
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
    toast.success(`${product.name} agregado a la cuenta`);
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
      toast.error('Por favor, selecciona una habitación para realizar el cargo.');
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
          notes: fullNotes || "Consumo general en Restaurante/Bar"
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
      await apiFetch<Product>(API_ENDPOINTS.products, {
        method: 'POST',
        body: JSON.stringify({
          name: newProduct.name,
          category: newProduct.category,
          price: Number(newProduct.price)
        })
      });

      toast.success('Producto agregado al menú exitosamente');
      setNewProduct({ name: '', category: 'Desayunos', price: '' });
      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      toast.error('Error al agregar producto');
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setDeletingProductObj(product);
  };

  const executeDeleteProduct = async (id: string) => {
    try {
      await apiFetch(`${API_ENDPOINTS.products}`, {
        method: 'DELETE',
        body: JSON.stringify({ id })
      });
      toast.success('Producto eliminado del menú');
      loadProducts();
    } catch (err) {
      toast.error('Error al eliminar producto');
    }
  };

  // --- Sale Actions ---
  const handleDeleteSale = async () => {
    if (!deletingSaleId) return;
    setDeletingLoading(true);
    try {
      await apiFetch(API_ENDPOINTS.posSales, {
        method: 'DELETE',
        body: JSON.stringify({ id: deletingSaleId })
      });
      toast.success('Venta eliminada del historial');
      setSalesHistory(prev => prev.filter(s => s.id !== deletingSaleId));
      setDeletingSaleId(null);
    } catch (err) {
      toast.error('Error al eliminar la venta');
    } finally {
      setDeletingLoading(false);
    }
  };

  const openEditSale = (sale: PosSale) => {
    let items: { id: string; name: string; price: number; quantity: number }[] = [];
    try { items = JSON.parse(sale.itemsJson); } catch (e) {}
    setEditingSale(sale);
    setEditItems(items);
    setEditPaymentMethod(sale.paymentMethod as 'Efectivo' | 'Tarjeta' | 'Habitación');
    setEditNotes(sale.notes || '');
  };

  const handleUpdateSaleItem = (idx: number, field: 'quantity' | 'price', value: number) => {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleRemoveEditItem = (idx: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSale = async () => {
    if (!editingSale || editItems.length === 0) {
      toast.error('La venta debe tener al menos un producto');
      return;
    }
    setSubmittingEdit(true);
    try {
      const newTotal = editItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        + (editPaymentMethod === 'Tarjeta' ? editItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.05 : 0);
      
      const updated = await apiFetch<PosSale>(API_ENDPOINTS.posSales, {
        method: 'PATCH',
        body: JSON.stringify({
          id: editingSale.id,
          itemsJson: JSON.stringify(editItems),
          total: Number(newTotal.toFixed(2)),
          paymentMethod: editPaymentMethod,
          notes: editNotes || null
        })
      });
      
      setSalesHistory(prev => prev.map(s => s.id === editingSale.id ? updated : s));
      toast.success('Venta actualizada correctamente');
      setEditingSale(null);
    } catch (err) {
      toast.error('Error al actualizar la venta');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'Todas' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen lg:h-screen bg-[#F9F7F2] text-[#2D2D2D] p-4 sm:p-6 lg:p-6 font-sans selection:bg-[#A68A64] selection:text-white text-left lg:overflow-hidden flex flex-col">
      
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E8E4D9] shrink-0">
        <div>
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[#A68A64] mb-2">
            <Coffee size={16} /> Restaurante & Café Bar
          </div>
          <h1 className="text-3xl md:text-4xl font-serif text-[#1C1C1C]">Punto de Venta Boutique</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[#E8E4D9]/60 p-1 rounded-2xl flex items-center gap-1">
            <button 
              onClick={() => setActiveTab('pos')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === 'pos' ? 'bg-[#2D2D2D] text-white shadow-lg shadow-black/10' : 'text-[#6B6B6B] hover:text-[#2D2D2D]'
              }`}
            >
              Caja / Pedido
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'history' ? 'bg-[#2D2D2D] text-white shadow-lg shadow-black/10' : 'text-[#6B6B6B] hover:text-[#2D2D2D]'
              }`}
            >
              <Clock size={14} /> Historial Ventas ({salesHistory.length})
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-[#A68A64] hover:bg-[#8F7553] text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-[#A68A64]/20 flex items-center gap-2"
          >
            <Plus size={16} strokeWidth={2.5} /> Agregar Producto
          </button>
        </div>
      </div>

      {/* Mobile View Tab Selector */}
      {activeTab === 'pos' && (
        <div className="flex lg:hidden bg-[#E8E4D9]/60 p-1 rounded-2xl mb-6 sticky top-2 z-30 backdrop-blur-md">
          <button 
            onClick={() => setMobileView('menu')}
            className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
              mobileView === 'menu' ? 'bg-[#2D2D2D] text-white shadow-lg' : 'text-[#6B6B6B]'
            }`}
          >
            1. Catálogo Menú
          </button>
          <button 
            onClick={() => setMobileView('cart')}
            className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              mobileView === 'cart' ? 'bg-[#2D2D2D] text-white shadow-lg' : 'text-[#6B6B6B]'
            }`}
          >
            2. Ver Cuenta ({cart.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
        </div>
      )}

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow min-h-0 lg:overflow-hidden">
          
          {/* Menu Catalog Left Side (8 Cols) */}
          <div className={`lg:col-span-7 xl:col-span-8 flex flex-col gap-4 lg:h-full lg:overflow-hidden ${mobileView === 'menu' ? 'block' : 'hidden lg:flex'}`}>
            
            {/* Search & Filter pills */}
            <div className="flex flex-col md:flex-row items-center gap-4 shrink-0">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8C8C]" size={18} />
                <input
                  type="text"
                  placeholder="Buscar en menú (ej. Carajillo, Latte, Corona...)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-[#E8E4D9] rounded-2xl pl-12 pr-6 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#A68A64]/30 focus:border-[#A68A64] transition-all shadow-sm text-[#2D2D2D]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C8C8C] hover:text-[#2D2D2D]">
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar shrink-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap uppercase tracking-wider transition-all flex items-center gap-2 ${
                    selectedCategory === cat 
                      ? 'bg-[#A68A64] text-white shadow-lg shadow-[#A68A64]/20 scale-105' 
                      : 'bg-white text-[#6B6B6B] hover:bg-[#E8E4D9]/40 border border-[#E8E4D9]'
                  }`}
                >
                  {cat === 'Desayunos' && <UtensilsCrossed size={14} />}
                  {cat === 'Café' && <Coffee size={14} />}
                  {cat === 'Cerveza' && <Beer size={14} />}
                  {cat === 'Vinos' && <Wine size={14} />}
                  {cat === 'Copas' && <Wine size={14} />}
                  {cat}
                </button>
              ))}
            </div>

            {/* Products Grid Wrapper with Independent Scroll */}
            <div className="flex-grow overflow-y-auto pr-1 no-scrollbar pb-6">
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                  {[1,2,3,4,5,6,7,8].map(n => (
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
                          onClick={(e) => { e.stopPropagation(); handleDeleteProduct(prod); }}
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

          {/* Current Order (Shopping Cart) Right Side (4 Cols) */}
          <div className={`lg:col-span-5 xl:col-span-4 flex flex-col lg:h-full ${mobileView === 'cart' ? 'block' : 'hidden lg:flex'}`}>
            <div className="bg-[#2D2D2D] text-white rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col lg:h-full border border-[#3D3D3D] overflow-hidden">
              
              <div className="flex items-center justify-between pb-4 border-b border-[#3D3D3D] mb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="text-[#A68A64]" size={20} />
                  <span className="font-serif text-lg font-bold">Cuenta en Curso</span>
                </div>
                <span className="px-2.5 py-1 bg-[#3D3D3D] text-[#A68A64] rounded-xl text-xs font-bold">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
                </span>
              </div>

              {/* Items List */}
              <div className="flex-grow overflow-y-auto space-y-3 pr-1 mb-4 no-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-[#8C8C8C] flex flex-col items-center justify-center h-full min-h-[150px]">
                    <ShoppingBag size={36} className="mx-auto mb-2 opacity-30 stroke-1" />
                    <p className="text-xs font-medium">No hay productos en la cuenta</p>
                    <p className="text-[11px] text-[#6B6B6B] mt-0.5">Haz clic en los productos para agregarlos</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between bg-[#383838] p-3 rounded-2xl border border-[#484848]">
                      <div className="flex flex-col flex-grow pr-2">
                        <span className="font-semibold text-xs leading-snug">{item.product.name}</span>
                        <span className="text-[10px] text-[#A68A64] font-medium">${item.product.price.toLocaleString()} c/u</span>
                      </div>

                      <div className="flex items-center gap-2 bg-[#2D2D2D] p-1 rounded-xl border border-[#4D4D4D]">
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 bg-[#3D3D3D] hover:bg-[#4D4D4D] text-white rounded-lg flex items-center justify-center transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-6 h-6 bg-[#A68A64] hover:bg-[#8F7553] text-white rounded-lg flex items-center justify-center transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Settings & Notes */}
              <div className="space-y-4 border-t border-[#3D3D3D] pt-4 mb-4 shrink-0">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#8C8C8C] mb-1.5 block">Método de Pago</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setPaymentMethod('Efectivo')}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1 ${
                        paymentMethod === 'Efectivo' ? 'bg-[#A68A64] border-[#A68A64] text-white shadow-lg shadow-[#A68A64]/20' : 'bg-[#383838] border-[#484848] text-[#8C8C8C] hover:text-white'
                      }`}
                    >
                      <Wallet size={14} /> Efectivo
                    </button>
                    <button
                      onClick={() => setPaymentMethod('Tarjeta')}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1 ${
                        paymentMethod === 'Tarjeta' ? 'bg-[#A68A64] border-[#A68A64] text-white shadow-lg shadow-[#A68A64]/20' : 'bg-[#383838] border-[#484848] text-[#8C8C8C] hover:text-white'
                      }`}
                    >
                      <CreditCard size={14} /> Tarjeta
                    </button>
                    <button
                      onClick={() => setPaymentMethod('Habitación')}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1 ${
                        paymentMethod === 'Habitación' ? 'bg-[#A68A64] border-[#A68A64] text-white shadow-lg shadow-[#A68A64]/20' : 'bg-[#383838] border-[#484848] text-[#8C8C8C] hover:text-white'
                      }`}
                    >
                      <User size={14} /> Habitación
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#8C8C8C] mb-1 block">
                    {paymentMethod === 'Habitación' ? 'Habitación Ocupada *' : 'Notas del Consumo / Mesa'}
                  </label>
                  {paymentMethod === 'Habitación' ? (
                    <select
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      required
                      className="w-full bg-[#383838] border border-[#484848] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#A68A64] text-white appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23A68A64%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.6rem_auto] bg-[right_0.8rem_center] bg-no-repeat placeholder-[#8C8C8C]"
                    >
                      <option value="" className="text-[#8C8C8C]">-- Selecciona Habitación --</option>
                      {getOccupiedRoomsWithGuests().map(r => (
                        <option key={r.id} value={`${r.id} - ${r.guestName}`} className="text-white bg-[#2d2d2d]">
                          Suite {r.id} &mdash; {r.guestName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ej. Mesa 3 o Para llevar"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full bg-[#383838] border border-[#484848] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#A68A64] text-white placeholder-[#8C8C8C]"
                    />
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-[#383838] p-4 rounded-2xl border border-[#484848] space-y-2 mb-4 text-xs text-left shrink-0">
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
                <div className="flex justify-between text-sm font-serif font-bold text-white border-t border-[#484848] pt-2 mt-1.5">
                  <span>Total a Cobrar:</span>
                  <span className="text-[#A68A64] text-base">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <button
                onClick={handleCompleteOrder}
                disabled={cart.length === 0}
                className="w-full py-3.5 bg-[#A68A64] hover:bg-[#8F7553] disabled:opacity-40 disabled:hover:bg-[#A68A64] text-white font-bold rounded-2xl uppercase tracking-[0.15em] text-[10px] shadow-xl shadow-[#A68A64]/30 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <CheckCircle2 size={16} /> Confirmar Pedido y Cobrar
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Sales History Tab */
        <div className="bg-white rounded-3xl border border-[#E8E4D9] p-8 lg:p-12 shadow-xl text-left">
          <div className="flex items-center justify-between pb-8 border-b border-[#E8E4D9] mb-8">
            <h2 className="font-serif text-2xl text-[#1C1C1C]">Historial de Ventas</h2>
            <div className="text-sm font-semibold text-[#8C8C8C]">
              Total histórico: <span className="text-[#A68A64] font-serif font-bold text-xl">${salesHistory.reduce((sum, s) => sum + s.total, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {salesHistory.length === 0 ? (
            <div className="text-center py-20 text-[#8C8C8C]">
              <FileText size={48} className="mx-auto mb-4 stroke-1 opacity-40" />
              <p className="text-lg font-semibold text-[#1C1C1C]">No hay ventas registradas aún</p>
              <p className="text-sm text-[#6B6B6B] mt-1">Los pedidos cobrados en la caja aparecerán aquí.</p>
            </div>
          ) : (
            (() => {
              // Group sales by day
              const groups: { [key: string]: PosSale[] } = {};
              salesHistory.forEach(sale => {
                const d = new Date(sale.createdAt);
                const dateKey = d.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(sale);
              });

              return (
                <div className="space-y-10">
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
                            try { items = JSON.parse(sale.itemsJson); } catch (e) {}

                            return (
                              <div key={sale.id} className="bg-white p-5 rounded-2xl border border-[#E8E4D9] flex flex-col md:flex-row justify-between gap-4 hover:border-[#A68A64] transition-all group">
                                <div className="space-y-2.5 flex-grow">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold bg-[#2D2D2D] text-white px-2.5 py-1 rounded-lg uppercase text-[10px] tracking-widest">
                                      {sale.paymentMethod}
                                    </span>
                                    <span className="text-xs text-[#8C8C8C] font-medium">
                                      {new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} • Folio #{sale.id.substring(0, 6).toUpperCase()}
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
                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => openEditSale(sale)}
                                      title="Editar venta"
                                      className="p-2 rounded-xl bg-[#F2EEE4] text-[#A68A64] hover:bg-[#A68A64] hover:text-white transition-all opacity-60 group-hover:opacity-100 shadow-sm"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      onClick={() => setDeletingSaleId(sale.id)}
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
              );
            })()
          )}
        </div>
      )}

      {/* Add Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 lg:p-10 w-full max-w-lg border border-[#E8E4D9] shadow-2xl relative text-left"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-[#8C8C8C] hover:text-[#2D2D2D] rounded-full hover:bg-[#F9F7F2] transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-8">
                <div className="flex items-center gap-2 text-[#A68A64] font-bold text-xs uppercase tracking-widest mb-2">
                  <Tag size={16} /> Menú Boutique
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#1C1C1C]">Agregar Nuevo Producto</h2>
                <p className="text-sm text-[#6B6B6B] mt-1">Ingresa los detalles del platillo, bebida o servicio.</p>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-[#8C8C8C] mb-2 block">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Omelette con Champiñones, Piña Colada..."
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#A68A64] focus:ring-2 focus:ring-[#A68A64]/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-[#8C8C8C] mb-2 block">Categoría *</label>
                    <select
                      value={newProduct.category}
                      onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#A68A64] focus:ring-2 focus:ring-[#A68A64]/20 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238C8C8C%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.7rem_auto] bg-[right_1rem_center] bg-no-repeat"
                    >
                      {categories.filter(c => c !== 'Todas').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-[#8C8C8C] mb-2 block">Precio ($ MXN) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ej. 150.00"
                      value={newProduct.price}
                      onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#A68A64] focus:ring-2 focus:ring-[#A68A64]/20"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-[#E8E4D9] flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3.5 text-[#6B6B6B] hover:text-[#2D2D2D] text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingProduct}
                    className="px-8 py-3.5 bg-[#A68A64] hover:bg-[#8F7553] text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-[#A68A64]/20 transition-all disabled:opacity-50"
                  >
                    {submittingProduct ? 'Guardando...' : 'Guardar Producto'}
                  </button>
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 lg:p-10 w-full max-w-md border border-[#E8E4D9] shadow-2xl text-center relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-[#8E9B8E]/20 text-[#8E9B8E] rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>

              <h2 className="font-serif text-3xl font-bold text-[#1C1C1C] mb-1">¡Cobro Exitoso!</h2>
              <p className="text-xs text-[#8C8C8C] mb-6">Folio #{lastCompletedSale.id.substring(0, 8).toUpperCase()} • {new Date(lastCompletedSale.createdAt).toLocaleTimeString()}</p>

              <div className="bg-[#F9F7F2] p-5 rounded-2xl border border-[#E8E4D9] mb-6 text-left space-y-3">
                <div className="flex justify-between text-xs font-bold text-[#8C8C8C] border-b border-[#E8E4D9] pb-2 uppercase tracking-wider">
                  <span>Concepto</span>
                  <span>Monto</span>
                </div>
                
                {lastCompletedSale.items.map((item: any) => (
                  <div key={item.product.id} className="flex justify-between text-sm font-medium text-[#2D2D2D]">
                    <span>{item.quantity}x {item.product.name}</span>
                    <span>${(item.product.price * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}

                {lastCompletedSale.fee > 0 && (
                  <div className="flex justify-between text-xs font-semibold text-[#A68A64] border-t border-[#E8E4D9] pt-2">
                    <span>Comisión Tarjeta (5%)</span>
                    <span>+${lastCompletedSale.fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-serif font-bold text-[#1C1C1C] border-t border-[#E8E4D9] pt-3 mt-3">
                  <span>Total Pagado ({lastCompletedSale.paymentMethod})</span>
                  <span className="text-[#A68A64]">${lastCompletedSale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {lastCompletedSale.notes && (
                <p className="text-xs text-[#A68A64] font-medium bg-[#F2EEE4] py-2 px-4 rounded-xl mb-8">
                  {lastCompletedSale.notes}
                </p>
              )}

              <button
                onClick={() => setLastCompletedSale(null)}
                className="w-full py-4 bg-[#2D2D2D] hover:bg-[#1C1C1C] text-white font-bold rounded-2xl uppercase tracking-widest text-xs shadow-xl transition-all"
              >
                Cerrar Recibo y Continuar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Sale Confirm Modal */}
      <AnimatePresence>
        {deletingSaleId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md border border-[#E8E4D9] shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#1C1C1C] mb-2">¿Eliminar esta venta?</h2>
              <p className="text-sm text-[#6B6B6B] mb-8">
                Esta acción no se puede deshacer. La venta se eliminará permanentemente del historial.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingSaleId(null)}
                  disabled={deletingLoading}
                  className="flex-1 py-3.5 border border-[#E8E4D9] text-[#6B6B6B] hover:text-[#2D2D2D] font-bold text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteSale}
                  disabled={deletingLoading}
                  className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Trash2 size={15} />
                  {deletingLoading ? 'Eliminando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Sale Modal */}
      <AnimatePresence>
        {editingSale && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 lg:p-10 w-full max-w-xl border border-[#E8E4D9] shadow-2xl relative max-h-[90vh] overflow-y-auto text-left"
            >
              <button
                onClick={() => setEditingSale(null)}
                className="absolute top-6 right-6 p-2 text-[#8C8C8C] hover:text-[#2D2D2D] rounded-full hover:bg-[#F9F7F2] transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-7">
                <div className="flex items-center gap-2 text-[#A68A64] font-bold text-xs uppercase tracking-widest mb-2">
                  <Pencil size={14} /> Editar Venta
                </div>
                <h2 className="text-2xl font-serif font-bold text-[#1C1C1C]">
                  Folio #{editingSale.id.substring(0, 8).toUpperCase()}
                </h2>
                <p className="text-xs text-[#8C8C8C] mt-1">
                  {new Date(editingSale.createdAt).toLocaleString('es-MX')}
                </p>
              </div>

              {/* Items Editor */}
              <div className="mb-6">
                <label className="text-xs font-bold uppercase tracking-widest text-[#8C8C8C] mb-3 block">Productos de la Venta</label>
                <div className="space-y-3">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-[#F9F7F2] p-3.5 rounded-2xl border border-[#E8E4D9]">
                      <div className="flex-grow">
                        <p className="text-sm font-semibold text-[#1C1C1C]">{item.name}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateSaleItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                              className="w-7 h-7 bg-[#E8E4D9] hover:bg-[#d4cfc4] text-[#2D2D2D] rounded-lg flex items-center justify-center transition-colors"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateSaleItem(idx, 'quantity', item.quantity + 1)}
                              className="w-7 h-7 bg-[#A68A64] hover:bg-[#8F7553] text-white rounded-lg flex items-center justify-center transition-colors"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <span className="text-xs text-[#8C8C8C]">×</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-[#8C8C8C]">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price}
                              onChange={e => handleUpdateSaleItem(idx, 'price', Number(e.target.value))}
                              className="w-20 bg-white border border-[#E8E4D9] rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:border-[#A68A64]"
                            />
                          </div>
                          <span className="text-xs text-[#A68A64] font-bold ml-auto">
                            = ${(item.price * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveEditItem(idx)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {editItems.length === 0 && (
                  <p className="text-xs text-red-500 text-center mt-3 font-medium">La venta debe tener al menos un producto</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="text-xs font-bold uppercase tracking-widest text-[#8C8C8C] mb-2.5 block">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Efectivo', 'Tarjeta', 'Habitación'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setEditPaymentMethod(m)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1.5 ${
                        editPaymentMethod === m
                          ? 'bg-[#A68A64] border-[#A68A64] text-white shadow-lg shadow-[#A68A64]/20'
                          : 'bg-[#F9F7F2] border-[#E8E4D9] text-[#6B6B6B] hover:text-[#2D2D2D]'
                      }`}
                    >
                      {m === 'Efectivo' && <Wallet size={15} />}
                      {m === 'Tarjeta' && <CreditCard size={15} />}
                      {m === 'Habitación' && <User size={15} />}
                      {m}
                    </button>
                  ))}
                </div>
                {editPaymentMethod === 'Tarjeta' && (
                  <p className="text-xs text-[#A68A64] mt-2 font-medium">⚠ Se aplicará comisión del 5% al recalcular el total</p>
                )}
              </div>

              {/* Notes */}
              <div className="mb-7">
                <label className="text-xs font-bold uppercase tracking-widest text-[#8C8C8C] mb-2 block">
                  {editPaymentMethod === 'Habitación' ? 'Suite / Huésped *' : 'Notas / Mesa'}
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder={editPaymentMethod === 'Habitación' ? 'Ej. Suite 101 - Juan Pérez' : 'Ej. Mesa 3 o Para llevar'}
                  className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#A68A64] focus:ring-2 focus:ring-[#A68A64]/20"
                />
              </div>

              {/* Totals Preview */}
              {editItems.length > 0 && (() => {
                const sub = editItems.reduce((s, i) => s + i.price * i.quantity, 0);
                const fee = editPaymentMethod === 'Tarjeta' ? sub * 0.05 : 0;
                const tot = sub + fee;
                return (
                  <div className="bg-[#F9F7F2] rounded-2xl p-4 border border-[#E8E4D9] mb-7 space-y-1.5 text-sm">
                    <div className="flex justify-between text-[#8C8C8C]"><span>Subtotal:</span><span className="font-semibold text-[#1C1C1C]">${sub.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                    {fee > 0 && <div className="flex justify-between text-[#A68A64] text-xs"><span>Comisión (5%):</span><span>+${fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>}
                    <div className="flex justify-between font-serif font-bold text-base border-t border-[#E8E4D9] pt-2"><span>Nuevo Total:</span><span className="text-[#A68A64]">${tot.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingSale(null)}
                  className="flex-1 py-3.5 border border-[#E8E4D9] text-[#6B6B6B] hover:text-[#2D2D2D] font-bold text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateSale}
                  disabled={submittingEdit || editItems.length === 0}
                  className="flex-1 py-3.5 bg-[#A68A64] hover:bg-[#8F7553] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[#A68A64]/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  {submittingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Delete Product Confirm Modal */}
      <AnimatePresence>
        {deletingProductObj && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border border-[#E8E4D9] shadow-2xl relative"
            >
              <button
                onClick={() => setDeletingProductObj(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-[#F9F7F2] border border-[#E8E4D9] text-[#8C8C8C] hover:text-[#2D2D2D] transition-colors"
              >
                <X size={14} />
              </button>

              <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <Trash2 size={28} />
              </div>
              
              <h3 className="text-lg font-heading font-semibold text-[#2D2D2D] mb-2">¿Eliminar del menú?</h3>
              <p className="text-sm text-[#6B6B6B] mb-6 leading-relaxed">
                ¿Estás seguro de eliminar permanentemente <strong>{deletingProductObj.name}</strong> del menú? Esta acción no se puede deshacer.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingProductObj(null)}
                  className="flex-1 py-3 rounded-2xl border border-[#E8E4D9] bg-[#F9F7F2] text-sm font-semibold text-[#6B6B6B] hover:bg-[#F2EEE4] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const id = deletingProductObj.id;
                    setDeletingProductObj(null);
                    await executeDeleteProduct(id);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-sm shadow-red-200"
                >
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
