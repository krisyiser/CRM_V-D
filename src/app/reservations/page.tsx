"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, BedDouble, Cloud, RefreshCw, X, CalendarCheck, Trash2 } from 'lucide-react';
import { API_ENDPOINTS, apiFetch } from '../../lib/api';
import { toast } from '../../components/Toast';

export default function Reservations() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null);

  const fetchRooms = async () => {
    try {
      const data = await apiFetch<any[]>(API_ENDPOINTS.rooms);
      setRooms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando habitaciones:", error);
    }
  };

  const fetchReservations = async () => {
    try {
      const data = await apiFetch<any[]>(API_ENDPOINTS.reservations);
      setReservations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const syncLock = React.useRef(false);
  const syncGitHubQueue = async (silent = false) => {
    if (syncLock.current) return;
    syncLock.current = true;
    if (!silent) {
      setSyncingCloud(true);
      setCloudMessage('Sincronizando reservaciones con el sitio web...');
    }
    try {
      // 1. Fetch fresh list of local reservations to avoid duplicate check closure bug
      const freshReservations = await apiFetch<any[]>(API_ENDPOINTS.reservations);
      const localReservations = Array.isArray(freshReservations) ? freshReservations : [];

      const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN || "";
      const res = await fetch('https://api.github.com/repos/krisyiser/Vainilla-y-Descanso/contents/data/db.json', {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error("No se pudo conectar con GitHub");
      const data = await res.json();
      const content = JSON.parse(atob(data.content));
      const cloudReservations = content.reservations || [];
      
      const pending = cloudReservations.filter((r: any) => r.status === 'pending_sync' || r.sync_status === 'queued_in_github');
      
      if (pending.length === 0) {
        if (!silent) {
          setCloudMessage('Todas las reservaciones en la nube ya están sincronizadas.');
          setTimeout(() => setCloudMessage(''), 4000);
        }
        setSyncingCloud(false);
        return;
      }

      setCloudMessage(`Importando ${pending.length} reservaciones nuevas de la web...`);

      let count = 0;
      for (const item of pending) {
        try {
          // Prevent duplicate import by checking local state
          const targetDates = `${item.check_in || '2026-05-20'} - ${item.check_out || '2026-05-21'}`;
          const targetRoomId = String(item.room_id || item.roomId || '101');
          const targetGuestName = item.guest_name || item.guestName || 'Huésped Web';
          
          const isDuplicate = localReservations.some(r => 
            String(r.roomId) === targetRoomId && 
            r.guestName === targetGuestName && 
            r.dates === targetDates
          );

          if (isDuplicate) {
            console.log("[Desktop] Skipping duplicate reservation:", targetGuestName, targetRoomId, targetDates);
            item.status = 'confirmed_online';
            item.sync_status = 'synced_to_desktop';
            count++;
            continue;
          }

          await apiFetch(API_ENDPOINTS.reservations, {
            method: 'POST',
            body: JSON.stringify({
              room_id: targetRoomId,
              guest_name: targetGuestName,
              dates: targetDates,
              notes: item.notes || 'Reserva desde sitio web en línea',
              total_price: Number(item.total_price || 0)
            })
          });

          // Also register corresponding guest in SQLite DB if enqueued from website
          try {
            await apiFetch(API_ENDPOINTS.guests, {
              method: 'POST',
              body: JSON.stringify({
                name: item.guest_name || item.guestName || 'Huésped Web',
                email: item.guest_email || item.guestEmail || '',
                phone: item.guest_phone || '',
                id_number: '',
                origin: item.guest_origin || 'Sitio Web'
              })
            });
          } catch (guestErr) {
            console.error("Error creating guest during sync:", guestErr);
          }

          item.status = 'confirmed_online';
          item.sync_status = 'synced_to_desktop';
          count++;
        } catch (err) {
          console.error("Error importando reserva:", err);
        }
      }

      if (count > 0) {
        // Guardar de vuelta a GitHub con los estados actualizados
        await fetch('https://api.github.com/repos/krisyiser/Vainilla-y-Descanso/contents/data/db.json', {
          method: 'PUT',
          headers: { 
            Authorization: `Bearer ${GITHUB_TOKEN}`, 
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Sincronizadas ${count} reservaciones al CRM de Escritorio 🚀 [${new Date().toISOString()}]`,
            content: btoa(JSON.stringify(content, null, 2)),
            sha: data.sha
          })
        });
      }

      setCloudMessage(`¡Sincronizadas ${count} nuevas reservaciones!`);
      await fetchReservations();
      setTimeout(() => setCloudMessage(''), 4000);
    } catch (error: any) {
      console.error(error);
      if (!silent) {
        setCloudMessage(`Error de sincronización: ${error.message}`);
        setTimeout(() => setCloudMessage(''), 5000);
      }
    } finally {
      setSyncingCloud(false);
      syncLock.current = false;
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchRooms();
      await fetchReservations();
      // Auto-sync automatically on tab mount/entry
      syncGitHubQueue(true);
    };
    init();
    // Sync when window gains focus (e.g., user returns to tab)
    const handleFocus = () => syncGitHubQueue(true);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const filteredReservations = reservations.filter(res => 
    res.guestName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    res.roomId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getReservationsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredReservations.filter(res => {
      if (!res.dates) return false;
      const [checkIn, checkOut] = res.dates.split(' - ');
      if (checkIn === checkOut) {
        return dateStr === checkIn;
      }
      return dateStr >= checkIn && dateStr < checkOut;
    });
  };

  const totalSuitesCount = rooms.length || 5;

  return (
    <div className="flex flex-col gap-10 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-heading font-medium text-[#2D2D2D]">Calendario de Estancias</h1>
          <p className="text-sm text-[#8C8C8C] mt-1">Registro de entradas y salidas programadas (Autosincronizado)</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => syncGitHubQueue(false)}
            disabled={syncingCloud}
            className="px-5 py-3 bg-[#A68A64] hover:bg-[#8E7552] text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-lg flex items-center gap-2.5 disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncingCloud ? "animate-spin" : ""} />
            <span>{syncingCloud ? 'Sincronizando...' : 'Sincronizar Nube'}</span>
          </button>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C8C8C]" size={16} />
            <input 
              type="text" 
              placeholder="Buscar huésped o suite..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-[#E8E4D9] rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all w-64 text-[#2D2D2D]"
            />
          </div>
          <div className="flex items-center bg-white border border-[#E8E4D9] rounded-xl p-1">
            <button onClick={prevMonth} className="p-2 text-[#8C8C8C] hover:text-[#2D2D2D] hover:bg-[#F9F7F2] rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 text-sm font-semibold text-[#2D2D2D] min-w-[140px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={nextMonth} className="p-2 text-[#8C8C8C] hover:text-[#2D2D2D] hover:bg-[#F9F7F2] rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {cloudMessage && (
        <div className="p-4 bg-[#A68A64]/10 border border-[#A68A64]/30 rounded-2xl text-sm font-semibold text-[#A68A64] flex items-center gap-3 shadow-sm">
          <RefreshCw size={18} className={syncingCloud ? "animate-spin" : ""} />
          <span>{cloudMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-[#E8E4D9] shadow-sm overflow-hidden p-6">
        {loading ? (
          <div className="h-[600px] flex items-center justify-center text-[#8C8C8C]">Cargando calendario...</div>
        ) : (
          <div>
            <div className="grid grid-cols-7 mb-4">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-[#8C8C8C] pb-4 border-b border-[#E8E4D9]">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-[#E8E4D9]">
              {blanks.map(blank => (
                <div key={`blank-${blank}`} className="bg-[#F9F7F2] min-h-[140px] p-2" />
              ))}
              {days.map(day => {
                const dayReservations = getReservationsForDay(day);
                const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                
                // Calculate unique room occupancies
                const uniqueOccupiedRooms = Array.from(new Set(dayReservations.map(r => r.roomId)));
                const occupiedCount = uniqueOccupiedRooms.length;
                const isFullyBooked = occupiedCount >= totalSuitesCount;

                return (
                  <div key={day} className={`bg-white min-h-[140px] p-3 hover:bg-[#F9F7F2]/50 transition-colors flex flex-col justify-between ${isToday ? 'bg-[#A68A64]/5 ring-1 ring-inset ring-[#A68A64]/20' : ''}`}>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#A68A64] text-white' : 'text-[#8C8C8C]'}`}>
                          {day}
                        </span>
                        
                        {/* Occupancy Badges */}
                        {occupiedCount > 0 && (
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                            isFullyBooked 
                              ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                              : 'bg-[#A68A64]/10 text-[#A68A64] border border-[#A68A64]/20'
                          }`}>
                            {isFullyBooked ? 'Lleno' : `${occupiedCount}/${totalSuitesCount} Hab`}
                          </span>
                        )}
                      </div>

                      {/* Guest Reservations list */}
                      <div className="space-y-1 overflow-y-auto max-h-[85px] custom-scrollbar-light pr-1">
                        {dayReservations.map(res => {
                          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const [checkIn, checkOut] = (res.dates || '').split(' - ');
                          const isCheckIn = dateStr === checkIn;
                          const isCheckOut = dateStr === checkOut;

                          return (
                            <div 
                              key={res.id} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReservation(res);
                              }}
                              className="bg-[#A68A64]/10 border border-[#A68A64]/20 rounded-lg p-1.5 flex items-center justify-between gap-1 cursor-pointer hover:bg-red-500/10 hover:border-red-400 transition-colors group"
                            >
                              <div className="flex items-center gap-1 overflow-hidden">
                                <BedDouble size={10} className="text-[#A68A64] group-hover:text-red-400 shrink-0" />
                                <span className="text-[9px] font-bold text-[#A68A64] group-hover:text-red-400 truncate" title={res.guestName}>
                                  Suite {res.roomId}: {res.guestName}
                                </span>
                              </div>
                              {(isCheckIn || isCheckOut) && (
                                <span className={`text-[7px] px-1 py-0.5 rounded uppercase font-bold shrink-0 ${
                                  isCheckIn ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'
                                }`}>
                                  {isCheckIn ? 'IN' : 'OUT'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Small available indicator if completely free */}
                    {occupiedCount === 0 && (
                      <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider self-end opacity-60">
                        Disponible
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      <ReservationDetailModal 
        reservation={selectedReservation}
        rooms={rooms}
        onClose={() => setSelectedReservation(null)}
        onCancel={async (id) => {
          try {
            console.log("[Desktop] onCancel called with ID:", id);
            const result = await apiFetch(API_ENDPOINTS.reservations, {
              method: 'DELETE',
              body: JSON.stringify({ id })
            });
            console.log("[Desktop] delete apiFetch result:", result);
            toast.success('Reservación cancelada correctamente.');
            await fetchReservations();
          } catch (err: any) {
            console.error("[Desktop] cancel reservation error:", err);
            toast.error(`Error al cancelar: ${err.message || JSON.stringify(err)}`);
          }
        }}
      />
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Subcomponent: ReservationDetailModal
// ----------------------------------------------------
function ReservationDetailModal({ 
  reservation, 
  rooms, 
  onClose, 
  onCancel 
}: { 
  reservation: any; 
  rooms: any[]; 
  onClose: () => void; 
  onCancel: (id: string) => Promise<void>;
}) {
  if (!reservation) return null;
  const room = rooms.find(r => r.id === reservation.roomId);
  const roomName = room ? room.name : "Suite Premium";

  const [checkIn, checkOut] = (reservation.dates || ' - ').split(' - ');
  const [showConfirmCancel, setShowConfirmCancel] = React.useState(false);

  return (
    <AnimatePresence>
      {reservation && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="fixed inset-0 z-[100] bg-[#2D2D2D]/40 backdrop-blur-sm" 
          />
          {/* Slide-out Panel */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: 'spring', damping: 28, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-[110] w-full max-w-md bg-white shadow-2xl flex flex-col text-left overflow-hidden"
          >
            <div className="bg-[#F9F7F2] p-8 border-b border-[#E8E4D9] flex justify-between items-start shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#A68A64] flex items-center justify-center text-white shadow-lg shadow-[#A68A64]/20 shrink-0">
                  <CalendarCheck size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-heading font-semibold text-[#2D2D2D] truncate max-w-[180px]">{reservation.guestName}</h2>
                  <p className="text-[10px] text-[#A68A64] font-bold uppercase tracking-widest mt-0.5">Detalles de Reserva</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => setShowConfirmCancel(true)}
                  className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                  title="Cancelar Reservación"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 rounded-full bg-white border border-[#E8E4D9] flex items-center justify-center text-[#8C8C8C] hover:text-[#2D2D2D] transition-colors shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar-light">
              {/* Suite Card */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Alojamiento</p>
                <div className="p-5 bg-[#A68A64]/5 border border-[#A68A64]/20 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E4D9] flex items-center justify-center text-[#A68A64] shadow-sm shrink-0">
                      <BedDouble size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#2D2D2D]">Suite {reservation.roomId}</h4>
                      <p className="text-xs text-[#8C8C8C] mt-0.5">{roomName}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full text-[9px] font-bold uppercase tracking-widest">
                    Confirmado
                  </span>
                </div>
              </div>

              {/* Dates Detail */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Fechas de Estancia</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#F9F7F2] rounded-2xl border border-[#E8E4D9]">
                    <span className="text-[8px] font-bold text-[#8C8C8C] uppercase tracking-widest block mb-1">Check-In (Entrada)</span>
                    <span className="text-sm font-semibold text-[#2D2D2D]">{checkIn || '—'}</span>
                  </div>
                  <div className="p-4 bg-[#F9F7F2] rounded-2xl border border-[#E8E4D9]">
                    <span className="text-[8px] font-bold text-[#8C8C8C] uppercase tracking-widest block mb-1">Check-Out (Salida)</span>
                    <span className="text-sm font-semibold text-[#2D2D2D]">{checkOut || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Cost Detail */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Información Financiera</p>
                <div className="p-5 bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest block">Total Pagado / Tarifa</span>
                    <span className="text-lg font-bold text-[#A68A64] mt-0.5 block">${Number(reservation.totalPrice || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                    reservation.paymentStatus === 'paid' 
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                      : 'bg-[#C2A88D]/10 text-[#C2A88D] border-[#C2A88D]/20'
                  }`}>
                    {reservation.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-widest">Notas Especiales / Comentarios</p>
                <div className="p-5 bg-white border border-[#E8E4D9] rounded-2xl min-h-[80px]">
                  <p className="text-xs text-[#6B6B6B] leading-relaxed italic">
                    {reservation.notes || "Sin especificaciones ni requerimientos especiales."}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Custom confirmation overlay */}
            {showConfirmCancel && (
              <div className="absolute inset-0 z-50 bg-[#2D2D2D]/95 backdrop-blur-md flex flex-col justify-center p-8 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 text-red-500">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-heading font-semibold text-white mb-2">¿Confirmar Cancelación?</h3>
                <p className="text-xs text-[#8C8C8C] leading-relaxed max-w-[280px] mx-auto mb-8">
                  Esta acción eliminará de forma permanente la reservación del calendario y de la base de datos de manera irreversible.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={async () => {
                      setShowConfirmCancel(false);
                      await onCancel(reservation.id);
                      onClose();
                    }}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-xs font-bold tracking-widest uppercase transition-all shadow-lg shadow-red-500/20 active:scale-[0.98]"
                  >
                    Sí, Cancelar Reservación
                  </button>
                  <button
                    onClick={() => setShowConfirmCancel(false)}
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
