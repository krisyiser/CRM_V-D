"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MoreHorizontal, User, Search, X, CalendarCheck, BedDouble, Phone, Trash2, Grid, List, Copy, Check, Printer } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../../lib/api';
import { SkeletonCard } from '../../components/Skeleton';
import StayReportModal from '../../components/dashboard/StayReportModal';

function GuestDetailPanel({ guest, reservations, onClose }: { guest: any; reservations: any[]; onClose: () => void }) {
  if (!guest) return null;
  const guestReservations = reservations.filter(r => r.guestId === guest.id || r.guestName === guest.name);
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  return (
    <AnimatePresence>
      {guest && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[100] bg-[#2D2D2D]/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: 'spring', damping: 28, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-[110] w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="bg-[#F9F7F2] p-8 border-b border-[#E8E4D9] flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#A68A64]/20">
                  {guest.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-heading font-medium text-[#2D2D2D]">{guest.name}</h2>
                  <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-0.5">Huésped Registrado</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => setShowConfirmDelete(true)}
                  className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                  title="Eliminar Huésped permanentemente"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-[#2D2D2D] transition-colors shadow-sm">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 text-left custom-scrollbar-light">
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Datos de Contacto</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-[#F9F7F2] rounded-2xl border border-[#E8E4D9]">
                    <Mail size={16} className="text-[#A68A64]" />
                    <span className="text-sm text-[#4A4A4A]">{guest.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#F9F7F2] rounded-2xl border border-[#E8E4D9]">
                    <User size={16} className="text-[#A68A64]" />
                    <div>
                      <span className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest block">Registrado el</span>
                      <span className="text-sm text-[#4A4A4A]">{new Date(guest.createdAt || guest.created_at || Date.now()).toLocaleDateString('es-MX')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Historial de Estancias</p>
                {guestReservations.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-[#E8E4D9] rounded-2xl">
                    <CalendarCheck size={28} className="mx-auto text-[#E8E4D9] mb-2" />
                    <p className="text-sm text-[#8C8C8C]">Sin estancias registradas</p>
                  </div>
                ) : (
                  guestReservations.map(res => (
                    <div key={res.id} className="p-5 bg-[#A68A64]/5 border border-[#A68A64]/20 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BedDouble size={14} className="text-[#A68A64]" />
                          <span className="text-sm font-semibold text-[#2D2D2D]">Suite {res.roomId}</span>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${res.paymentStatus === 'paid' ? 'bg-[#8E9B8E]/10 text-[#8E9B8E]' : 'bg-[#C2A88D]/10 text-[#C2A88D]'}`}>
                          {res.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-xs text-[#8C8C8C] italic">{res.dates}</p>
                      {res.notes && <p className="text-xs text-[#6B6B6B] border-t border-[#A68A64]/10 pt-2">{res.notes}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Custom confirmation overlay */}
            {showConfirmDelete && (
              <div className="absolute inset-0 z-50 bg-[#2D2D2D]/95 backdrop-blur-md flex flex-col justify-center p-8 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 text-red-500">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-heading font-semibold text-white mb-2">¿Eliminar Huésped?</h3>
                <p className="text-xs text-[#8C8C8C] leading-relaxed max-w-[280px] mx-auto mb-8">
                  Esta acción eliminará de forma permanente al huésped y todos sus datos del registro local de manera irreversible.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      setShowConfirmDelete(false);
                      try {
                        await apiFetch(API_ENDPOINTS.guests, {
                          method: 'DELETE',
                          body: JSON.stringify({ id: guest.id })
                        });
                        window.location.reload();
                      } catch (e) {
                        const { toast } = await import('../../components/Toast');
                        toast.error('Error al eliminar');
                      }
                    }}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-xs font-bold tracking-widest uppercase transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                  >
                    Sí, Eliminar Huésped
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold tracking-widest uppercase transition-all border border-white/10 active:scale-[0.98]"
                  >
                    No, Volver
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function Guests() {
  const [guests, setGuests] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [roomCharges, setRoomCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [selectedCharge, setSelectedCharge] = useState<any>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [contactPopoverId, setContactPopoverId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [guestsData, resData, chargesData] = await Promise.all([
          apiFetch<any[]>(API_ENDPOINTS.guests),
          apiFetch<any[]>(API_ENDPOINTS.reservations),
          apiFetch<any[]>(API_ENDPOINTS.roomCharges),
        ]);
        setGuests(Array.isArray(guestsData) ? guestsData : []);
        setReservations(Array.isArray(resData) ? resData : []);
        setRoomCharges(Array.isArray(chargesData) ? chargesData : []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getGuestCharges = (guestName: string) => {
    return roomCharges.filter(c => c.guestName === guestName);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredGuests = guests.filter(guest =>
    guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (guest.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-10 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-heading font-medium text-[#2D2D2D]">Base de Huéspedes</h1>
          <p className="text-sm text-[#8C8C8C] mt-1">Directorio de clientes y fidelización</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-[#F9F7F2] border border-[#E8E4D9] rounded-xl p-1 shrink-0">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[#A68A64] text-white shadow-sm' : 'text-[#8C8C8C] hover:text-[#2D2D2D]'}`}
              title="Vista Cuadrícula"
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#A68A64] text-white shadow-sm' : 'text-[#8C8C8C] hover:text-[#2D2D2D]'}`}
              title="Vista Lista"
            >
              <List size={16} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8C8C]" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-[#E8E4D9] rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all w-64 text-[#2D2D2D]"
            />
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : filteredGuests.length === 0 ? (
            <div className="col-span-full py-20 text-center border border-dashed border-[#E8E4D9] rounded-[32px] bg-white">
              <p className="text-[#8C8C8C] font-medium">
                {searchQuery ? 'No se encontraron resultados.' : 'No hay huéspedes registrados aún.'}
              </p>
            </div>
          ) : (
            filteredGuests.map((guest, i) => (
              <motion.div
                key={guest.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white p-8 rounded-[32px] border border-[#E8E4D9] shadow-sm hover:border-[#A68A64]/40 transition-all text-left cursor-pointer relative"
                onClick={() => setSelectedGuest(guest)}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#F9F7F2] flex items-center justify-center text-[#A68A64] border border-[#E8E4D9]">
                    <User size={24} strokeWidth={1.5} />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedGuest(guest); }}
                    className="p-2 text-[#8C8C8C] hover:text-[#A68A64] hover:bg-[#F9F7F2] rounded-lg transition-colors"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <h3 className="font-semibold text-xl text-[#2D2D2D] mb-4">{guest.name}</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-[#6B6B6B]">
                    <div className="w-8 h-8 rounded-lg bg-[#F9F7F2] flex items-center justify-center text-[#A68A64]">
                      <Mail size={14} />
                    </div>
                    {guest.email || '—'}
                  </div>
                  <div className="pt-4 border-t border-[#F2EEE4] flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest">Registrado</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#4A4A4A]">{new Date(guest.createdAt || guest.created_at || Date.now()).toLocaleDateString('es-MX')}</span>
                        {guest.origin === 'Sitio Web' && (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest border border-emerald-500/20">
                            Vía Web
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getGuestCharges(guest.name).length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const charges = getGuestCharges(guest.name);
                            setSelectedCharge(charges[0]);
                            setIsReportOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#A68A64]/10 hover:bg-[#A68A64] text-[#A68A64] hover:text-white border border-[#A68A64]/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
                          title="Ver Reporte de Cobros de Estancia"
                        >
                          <Printer size={12} /> Reporte de Cobros
                        </button>
                      )}

                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setContactPopoverId(contactPopoverId === guest.id ? null : guest.id);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                            contactPopoverId === guest.id 
                              ? 'bg-[#A68A64] text-white border-[#A68A64]' 
                              : 'bg-[#F9F7F2] text-[#8C8C8C] hover:text-[#A68A64] border border-[#E8E4D9]'
                          }`}
                          title="Ver datos de contacto"
                        >
                          <Mail size={14} />
                        </button>
                        {contactPopoverId === guest.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 bottom-10 z-20 w-64 bg-white border border-[#E8E4D9] rounded-2xl shadow-xl p-4 space-y-3 text-xs text-[#2D2D2D] animate-in fade-in slide-in-from-bottom-2 duration-200"
                          >
                            <div className="flex justify-between items-center border-b border-[#F2EEE4] pb-2">
                              <span className="font-bold text-[9px] text-[#8C8C8C] uppercase tracking-wider">Contacto de Huésped</span>
                              <button onClick={() => setContactPopoverId(null)} className="text-[#8C8C8C] hover:text-[#2D2D2D]">
                                <X size={12} />
                              </button>
                            </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-[#6B6B6B] truncate font-medium" title={guest.email}>{guest.email || 'Sin correo'}</span>
                              {guest.email && (
                                <button 
                                  onClick={() => copyToClipboard(guest.email, `${guest.id}-email`)}
                                  className="text-[#8C8C8C] hover:text-[#A68A64] shrink-0"
                                  title="Copiar Correo"
                                >
                                  {copiedId === `${guest.id}-email` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                </button>
                              )}
                            </div>
                            <div className="flex justify-between items-center gap-2 border-t border-[#F2EEE4]/50 pt-2">
                              <span className="text-[#6B6B6B] font-medium">{guest.phone || 'Sin teléfono'}</span>
                              {guest.phone && (
                                <button 
                                  onClick={() => copyToClipboard(guest.phone, `${guest.id}-phone`)}
                                  className="text-[#8C8C8C] hover:text-[#A68A64] shrink-0"
                                  title="Copiar Teléfono"
                                >
                                  {copiedId === `${guest.id}-phone` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-[#E8E4D9] shadow-sm overflow-hidden p-6">
          {loading ? (
            <div className="py-20 text-center text-[#8C8C8C] font-medium">Cargando directorio...</div>
          ) : filteredGuests.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[#8C8C8C] font-medium">
                {searchQuery ? 'No se encontraron resultados.' : 'No hay huéspedes registrados aún.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E8E4D9] text-[#8C8C8C] font-bold uppercase tracking-widest text-[9px]">
                    <th className="py-4 px-6">Huésped</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Teléfono</th>
                    <th className="py-4 px-6">Fecha Registro</th>
                    <th className="py-4 px-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EEE4]">
                  {filteredGuests.map((guest) => (
                    <tr 
                      key={guest.id}
                      onClick={() => setSelectedGuest(guest)}
                      className="hover:bg-[#F9F7F2]/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 font-semibold text-[#2D2D2D]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F9F7F2] flex items-center justify-center text-[#A68A64] border border-[#E8E4D9]">
                            <User size={14} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-[#2D2D2D]">{guest.name}</span>
                            {guest.origin === 'Sitio Web' && (
                              <span className="text-[7px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-emerald-500/20 w-fit mt-1">
                                Vía Web
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-[#6B6B6B] font-medium">{guest.email || '—'}</td>
                      <td className="py-4 px-6 text-[#6B6B6B] font-medium">{guest.phone || '—'}</td>
                      <td className="py-4 px-6 text-[#6B6B6B] font-medium">
                        {new Date(guest.createdAt || guest.created_at || Date.now()).toLocaleDateString('es-MX')}
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {getGuestCharges(guest.name).length > 0 && (
                            <button
                              onClick={() => {
                                const charges = getGuestCharges(guest.name);
                                setSelectedCharge(charges[0]);
                                setIsReportOpen(true);
                              }}
                              className="w-8 h-8 rounded-full bg-[#A68A64]/10 border border-[#A68A64]/20 flex items-center justify-center text-[#A68A64] hover:bg-[#A68A64] hover:text-white transition-colors shadow-sm"
                              title="Ver Reporte de Cobros de Estancia"
                            >
                              <Printer size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => copyToClipboard(guest.email || '', `${guest.id}-list-email`)}
                            className="w-8 h-8 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-[#A68A64] transition-colors shadow-sm"
                            title="Copiar Correo"
                            disabled={!guest.email}
                          >
                            {copiedId === `${guest.id}-list-email` ? <Check size={12} className="text-emerald-500" /> : <Mail size={12} />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(guest.phone || '', `${guest.id}-list-phone`)}
                            className="w-8 h-8 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-[#A68A64] transition-colors shadow-sm"
                            title="Copiar Teléfono"
                            disabled={!guest.phone}
                          >
                            {copiedId === `${guest.id}-list-phone` ? <Check size={12} className="text-emerald-500" /> : <Phone size={12} />}
                          </button>
                          <button
                            onClick={() => setSelectedGuest(guest)}
                            className="w-8 h-8 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-[#A68A64] transition-colors shadow-sm"
                            title="Ver Historial"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <GuestDetailPanel
        guest={selectedGuest}
        reservations={reservations}
        onClose={() => setSelectedGuest(null)}
      />

      <StayReportModal
        isOpen={isReportOpen}
        onClose={() => {
          setIsReportOpen(false);
          setSelectedCharge(null);
        }}
        guestName={selectedCharge ? selectedCharge.guestName : ''}
        chargeRecord={selectedCharge}
      />
    </div>
  );
}
