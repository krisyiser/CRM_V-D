"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_ENDPOINTS, apiFetch } from '../../lib/api';
import { Star, MessageCircle, User, Calendar, Trash2, ShieldCheck, Heart, Award, Sparkles, Building2, Smile, Droplet, Percent, AlertTriangle, X } from 'lucide-react';
import Skeleton from '../../components/Skeleton';
import { toast } from '../../components/Toast';

// ─── Custom Confirm Dialog ───────────────────────────────────────────────────
// Replaces window.confirm() which is blocked in Tauri macOS WebView
interface ConfirmDialogProps {
  isOpen: boolean;
  guestName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ isOpen, guestName, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center"
        onClick={onCancel}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white rounded-3xl border border-[#E8E4D9] shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
        >
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-[#F9F7F2] border border-[#E8E4D9] text-[#8C8C8C] hover:text-[#2D2D2D] transition-colors"
          >
            <X size={14} />
          </button>

          <div className="w-14 h-14 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h3 className="text-lg font-heading font-semibold text-[#2D2D2D] mb-2">¿Eliminar encuesta?</h3>
          <p className="text-sm text-[#6B6B6B] mb-6 leading-relaxed">
            Se eliminará permanentemente la encuesta de satisfacción de <strong>{guestName}</strong>. Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl border border-[#E8E4D9] bg-[#F9F7F2] text-sm font-semibold text-[#6B6B6B] hover:bg-[#F2EEE4] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-sm shadow-red-200"
            >
              Sí, eliminar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFeedback = async () => {
    try {
      const data = await apiFetch<any[]>(API_ENDPOINTS.feedback);
      if (Array.isArray(data)) setFeedbacks(data);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const mapRatingToStars = (r: string): number => {
    if (r === 'Excelente') return 5;
    if (r === 'Buena') return 4;
    if (r === 'Regular') return 3;
    if (r === 'Mala') return 2;
    return 5;
  };

  // Opens the custom confirm dialog — no window.confirm()
  const requestDelete = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingItem(item);
  };

  // Called when user clicks "Sí, eliminar" in the dialog
  const confirmDelete = async () => {
    if (!deletingItem) return;
    const targetId = deletingItem?.id || deletingItem?.id_ || deletingItem?._id;

    if (!targetId) {
      toast.error('Error: ID de encuesta no encontrado.');
      setDeletingItem(null);
      return;
    }

    setIsDeleting(true);
    try {
      // Use window.__TAURI_INTERNALS__ invoke — most reliable in Tauri desktop
      const tauri = (window as any).__TAURI_INTERNALS__;
      if (tauri && tauri.invoke) {
        await tauri.invoke('delete_feedback', { id: targetId });
      } else {
        // Fallback: use apiFetch for web/dev mode
        await apiFetch(API_ENDPOINTS.feedback, {
          method: 'DELETE',
          body: JSON.stringify({ id: targetId }),
        });
      }
      setFeedbacks(prev => prev.filter(f => f.id !== targetId));
      toast.success('Encuesta eliminada correctamente.');
    } catch (err: any) {
      console.error('delete_feedback error:', err);
      toast.error(`Error al eliminar: ${err?.message || String(err)}`);
    } finally {
      setIsDeleting(false);
      setDeletingItem(null);
    }
  };

  // ── Compute Stats ──────────────────────────────────────────────────────────
  const totalSurveys = feedbacks.length;
  let overallSum = 0;
  let recommendCount = 0;
  let catAverages = {
    reception: { sum: 0, count: 0 },
    staff: { sum: 0, count: 0 },
    cleaning: { sum: 0, count: 0 },
    value: { sum: 0, count: 0 },
    comfort: { sum: 0, count: 0 },
    facilities: { sum: 0, count: 0 },
  };

  feedbacks.forEach(item => {
    overallSum += (item.rating || 10);
    try {
      if (item.comment && item.comment.startsWith('{')) {
        const parsed = JSON.parse(item.comment);
        const details = parsed.surveyDetails;
        if (details) {
          if (details.recommend === 'yes' || details.recommend === true) recommendCount++;
          const categories = ['reception', 'staff', 'cleaning', 'value', 'comfort', 'facilities'];
          categories.forEach((catKey) => {
            const catObj = details[catKey];
            if (catObj && catObj.rating) {
              const stars = mapRatingToStars(catObj.rating);
              (catAverages as any)[catKey].sum += stars;
              (catAverages as any)[catKey].count++;
            }
          });
        } else {
          recommendCount++;
        }
      } else {
        recommendCount++;
      }
    } catch {
      recommendCount++;
    }
  });

  const averageOverallScore = totalSurveys > 0 ? (overallSum / totalSurveys).toFixed(1) : '10.0';
  const recommendPercentage = totalSurveys > 0 ? Math.round((recommendCount / totalSurveys) * 100) : 100;
  const getCatAverage = (key: keyof typeof catAverages): number => {
    const c = catAverages[key];
    return c.count > 0 ? parseFloat((c.sum / c.count).toFixed(1)) : 5.0;
  };

  const deletingGuestName =
    deletingItem?.guestName || deletingItem?.guest_name || 'este huésped';

  return (
    <>
      {/* Custom Confirm Dialog — replaces window.confirm() */}
      <ConfirmDialog
        isOpen={!!deletingItem}
        guestName={deletingGuestName}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingItem(null)}
      />

      <div className="space-y-8 text-left max-w-7xl mx-auto px-4 md:px-0 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-heading font-medium text-[#2D2D2D] mb-1">Encuestas de Satisfacción</h1>
            <p className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-widest">Métricas de Calidad y Experiencia</p>
          </div>
          <div className="flex gap-2">
            <span className="px-4 py-2 bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl text-[10px] font-bold uppercase tracking-widest text-[#A68A64]">
              Total Encuestas: {totalSurveys}
            </span>
          </div>
        </div>

        {/* Analytics Panel */}
        {totalSurveys > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gradient-to-br from-[#F9F7F2] to-white rounded-[40px] border border-[#E8E4D9] p-8 shadow-sm"
          >
            {/* Score Circle */}
            <div className="bg-white border border-[#E8E4D9] rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#A68A64]/5 rounded-full blur-2xl" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8C8C] mb-4">Puntuación General Promedio</span>
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#F2EEE4" strokeWidth="8" fill="transparent" />
                  <circle
                    cx="50" cy="50" r="40" stroke="#A68A64" strokeWidth="8" fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * (parseFloat(averageOverallScore) * 10)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-heading font-bold text-[#2D2D2D]">{averageOverallScore}</span>
                  <span className="text-[9px] font-bold text-[#8C8C8C] uppercase tracking-widest mt-0.5">de 10.0</span>
                </div>
              </div>
              <p className="text-[11px] text-[#A68A64] font-semibold mt-4 flex items-center gap-1">
                <Sparkles size={14} /> Alto Nivel de Excelencia
              </p>
            </div>

            {/* Recommendation Bar */}
            <div className="bg-white border border-[#E8E4D9] rounded-3xl p-6 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8C8C] block mb-1">Tasa de Recomendación</span>
                <h3 className="text-3xl font-heading font-bold text-[#2D2D2D] flex items-baseline gap-1 mt-1">
                  {recommendPercentage}% <span className="text-xs text-[#8E9B8E] font-sans font-bold">✓</span>
                </h3>
                <p className="text-xs text-[#6B6B6B] mt-2 leading-relaxed">
                  Porcentaje de huéspedes que recomendarían hospedarse en <strong>Vainilla &amp; Descanso</strong>.
                </p>
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-[#8C8C8C]">Promesa de Satisfacción</span>
                  <span className="text-[#A68A64]">{recommendPercentage}%</span>
                </div>
                <div className="w-full bg-[#F2EEE4] h-3 rounded-full overflow-hidden">
                  <div className="bg-[#A68A64] h-full rounded-full transition-all duration-1000" style={{ width: `${recommendPercentage}%` }} />
                </div>
              </div>
            </div>

            {/* Category Chart */}
            <div className="bg-white border border-[#E8E4D9] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8C8C] block mb-4">Satisfacción por Categorías</span>
              <div className="space-y-3.5">
                {[
                  { label: 'Recepción', score: getCatAverage('reception'), icon: <Smile size={12} /> },
                  { label: 'Personal', score: getCatAverage('staff'), icon: <Award size={12} /> },
                  { label: 'Limpieza', score: getCatAverage('cleaning'), icon: <Droplet size={12} /> },
                  { label: 'Confort', score: getCatAverage('comfort'), icon: <Heart size={12} /> },
                  { label: 'Instalaciones', score: getCatAverage('facilities'), icon: <Building2 size={12} /> },
                  { label: 'Precio / Calidad', score: getCatAverage('value'), icon: <Percent size={12} /> },
                ].map((cat, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#6B6B6B] font-medium flex items-center gap-1.5">
                        <span className="text-[#A68A64]">{cat.icon}</span> {cat.label}
                      </span>
                      <span className="font-bold text-[#2D2D2D]">{cat.score} / 5</span>
                    </div>
                    <div className="w-full bg-[#F2EEE4] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#A68A64] h-full rounded-full" style={{ width: `${(cat.score / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Feedback Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-[#E8E4D9]">
                <Skeleton width="40%" height="20px" className="mb-4" />
                <Skeleton width="100%" height="10px" className="mb-2" />
                <Skeleton width="80%" height="10px" />
              </div>
            ))
          ) : feedbacks.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-[#E8E4D9] shadow-sm">
              <MessageCircle size={48} className="mx-auto text-[#E8E4D9] mb-4 animate-bounce" />
              <h3 className="text-lg font-medium text-[#2D2D2D]">Bandeja de Satisfacción Vacía</h3>
              <p className="text-[#8C8C8C] text-sm mt-2">No hay encuestas registradas aún.</p>
            </div>
          ) : (
            <AnimatePresence>
              {feedbacks.map((item, i) => {
                let ratingList: { label: string; rating: string }[] = [];
                let suggestionsText = '';

                try {
                  if (item.comment && item.comment.startsWith('{')) {
                    const parsedComment = JSON.parse(item.comment);
                    const surveyDetails = parsedComment.surveyDetails;
                    if (surveyDetails) {
                      ratingList = [
                        { label: 'Recepción', rating: surveyDetails.reception?.rating },
                        { label: 'Personal', rating: surveyDetails.staff?.rating },
                        { label: 'Limpieza', rating: surveyDetails.cleaning?.rating },
                        { label: 'Precio/Valor', rating: surveyDetails.value?.rating },
                        { label: 'Confort', rating: surveyDetails.comfort?.rating },
                        { label: 'Instalaciones', rating: surveyDetails.facilities?.rating },
                      ].filter(r => r.rating);
                      suggestionsText = surveyDetails.generalSuggestions || '';
                    } else {
                      suggestionsText = item.comment || '';
                    }
                  } else {
                    suggestionsText = item.comment || '';
                  }
                } catch {
                  suggestionsText = item.comment || '';
                }

                const cardId = item.id || item.id_ || String(i);

                return (
                  <motion.div
                    key={cardId}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="bg-white rounded-[32px] p-6 border border-[#E8E4D9] shadow-sm hover:border-[#A68A64]/40 hover:shadow-lg transition-all flex flex-col justify-between text-left"
                  >
                    {/* Card Header */}
                    <div>
                      <div className="flex items-center justify-between mb-5 border-b border-[#F2EEE4] pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#F9F7F2] border border-[#E8E4D9] flex items-center justify-center text-[#A68A64]">
                            <User size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-[#2D2D2D] line-clamp-1">
                              {item.guestName || item.guest_name || 'Huésped'}
                            </span>
                            <span className="text-[9px] text-[#8C8C8C] flex items-center gap-1 mt-0.5">
                              <Calendar size={10} />
                              {new Date(item.createdAt || item.created_at || Date.now()).toLocaleDateString('es-MX')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="bg-[#A68A64]/10 border border-[#A68A64]/20 px-2.5 py-1 rounded-lg text-[9px] font-bold text-[#A68A64] uppercase tracking-wider">
                            ★ {item.rating} / 10
                          </div>
                          {/* Delete button — no window.confirm, opens custom dialog */}
                          <button
                            type="button"
                            onClick={(e) => requestDelete(item, e)}
                            disabled={isDeleting}
                            className="p-2 rounded-xl border border-red-100 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 hover:border-red-200 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                            title="Eliminar encuesta"
                            aria-label="Eliminar encuesta"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Rating breakdown */}
                      {ratingList.length > 0 ? (
                        <div className="space-y-2 mb-6">
                          {ratingList.map((rat, index) => {
                            const starVal = mapRatingToStars(rat.rating);
                            return (
                              <div key={index} className="flex justify-between items-center text-xs">
                                <span className="text-[#8C8C8C] font-medium">{rat.label}</span>
                                <div className="flex text-[#A68A64]">
                                  {Array.from({ length: 5 }).map((_, si) => (
                                    <Star
                                      key={si}
                                      size={11}
                                      fill={si < starVal ? 'currentColor' : 'transparent'}
                                      className={si < starVal ? 'opacity-90' : 'text-[#F2EEE4]'}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-[#E8E4D9] text-xs text-[#2D2D2D] font-bold uppercase tracking-wider flex items-center gap-2 mb-5">
                          <ShieldCheck size={14} className="text-[#8E9B8E]" /> Satisfacción Estándar OK
                        </div>
                      )}
                    </div>

                    {/* Suggestions */}
                    {suggestionsText ? (
                      <div className="bg-[#F9F7F2] p-4 rounded-2xl border border-[#E8E4D9] text-xs text-[#4A4A4A] italic leading-relaxed relative">
                        <span className="absolute top-2 left-2 text-[#A68A64] text-xl font-serif">"</span>
                        <p className="pl-4 pr-2">{suggestionsText}</p>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#8C8C8C] italic text-center border-t border-[#F2EEE4]/50 pt-3">
                        Huésped no incluyó comentarios adicionales.
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </>
  );
}
