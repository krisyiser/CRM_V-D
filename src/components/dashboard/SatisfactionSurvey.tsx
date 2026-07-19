"use client";
import React from 'react';

interface Props {
  survey: any;
  setSurvey: React.Dispatch<React.SetStateAction<any>>;
}

export default function SatisfactionSurvey({
  survey,
  setSurvey,
}: Props) {
  const ratingOptions = ['Excelente', 'Buena', 'Regular', 'Mala'];

  const categories = [
    { key: 'reception', label: 'Recepción y Check-in', question: '¿Cómo califica su experiencia al llegar?' },
    { key: 'staff', label: 'Atención del Personal', question: '¿Cómo fue el trato recibido?' },
    { key: 'cleaning', label: 'Limpieza de la Habitación', question: '¿Cómo encontró la limpieza?' },
    { key: 'value', label: 'Relación Calidad - Precio', question: '¿Cómo califica la relación precio-servicio?' },
    { key: 'comfort', label: 'Comodidad', question: 'Califique cama, almohadas, temperatura y ruido:' },
    { key: 'facilities', label: 'Instalaciones', question: 'Califique áreas comunes, servicios y estado general:' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center border-b border-[#E8E4D9]/50 pb-6">
        <h3 className="text-2xl font-heading font-medium text-[#2D2D2D]">¡Gracias por su estancia!</h3>
        <p className="text-xs text-[#8C8C8C] mt-1">Nos encantaría conocer su opinión. Su satisfacción es muy importante para nosotros.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {categories.map(cat => (
          <div key={cat.key} className="space-y-3 p-5 bg-[#F9F7F2]/50 border border-[#E8E4D9]/60 rounded-3xl text-left">
            <div>
              <h4 className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wider">{cat.label}</h4>
              <p className="text-[11px] text-[#8C8C8C] mt-0.5">{cat.question}</p>
            </div>

            {/* Rating pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {ratingOptions.map(opt => {
                const isSelected = survey[cat.key].rating === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSurvey({
                      ...survey,
                      [cat.key]: { ...survey[cat.key], rating: opt }
                    })}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#A68A64] text-white border-[#A68A64] shadow-sm shadow-[#A68A64]/10'
                        : 'bg-white text-[#6B6B6B] border-[#E8E4D9] hover:bg-[#F9F7F2]'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              placeholder="Comentarios adicionales..."
              value={survey[cat.key].comment}
              onChange={(e) => setSurvey({
                ...survey,
                [cat.key]: { ...survey[cat.key], comment: e.target.value }
              })}
              className="w-full bg-white border border-[#E8E4D9] rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
            />
          </div>
        ))}

        {/* Recommendation check */}
        <div className="space-y-3 p-5 bg-[#F9F7F2]/50 border border-[#E8E4D9]/60 rounded-3xl text-left">
          <div>
            <h4 className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wider">¿Recomendaría nuestro hotel?</h4>
            <p className="text-[11px] text-[#8C8C8C] mt-0.5">Su recomendación es vital para nosotros.</p>
          </div>
          <div className="flex gap-4 pt-1">
            {['yes', 'no'].map(opt => {
              const isSelected = survey.recommend === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSurvey({ ...survey, recommend: opt })}
                  className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest border transition-all active:scale-95 ${
                    isSelected ? 'bg-[#A68A64] text-white border-[#A68A64]' : 'bg-white text-[#6B6B6B] border-[#E8E4D9]'
                  }`}
                >
                  {opt === 'yes' ? '✓ Sí, lo recomendaría' : 'No'}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            placeholder="¿Por qué?"
            value={survey.recommendWhy}
            onChange={(e) => setSurvey({ ...survey, recommendWhy: e.target.value })}
            className="w-full bg-white border border-[#E8E4D9] rounded-2xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
          />
        </div>

        {/* General rating */}
        <div className="space-y-4 p-5 bg-[#F9F7F2]/50 border border-[#E8E4D9]/60 rounded-3xl text-left flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#2D2D2D] uppercase tracking-wider">Calificación General</h4>
            <p className="text-[11px] text-[#8C8C8C] mt-0.5">Califique su estancia en una escala del 1 al 10:</p>
          </div>
          <div className="flex flex-wrap gap-2 py-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
              const isSelected = survey.overallScore === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSurvey({ ...survey, overallScore: num })}
                  className={`w-10 h-10 rounded-2xl text-xs font-bold flex items-center justify-center transition-all active:scale-90 ${
                    isSelected
                      ? 'bg-[#A68A64] text-white shadow-md shadow-[#A68A64]/20 ring-4 ring-[#A68A64]/20'
                      : 'bg-white border border-[#E8E4D9] text-[#6B6B6B] hover:bg-[#F9F7F2]'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-left">
        <label className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-widest ml-1">Sugerencias o comentarios generales</label>
        <textarea
          rows={3}
          placeholder="Escriba aquí sus comentarios, felicitaciones o sugerencias..."
          value={survey.generalSuggestions}
          onChange={(e) => setSurvey({ ...survey, generalSuggestions: e.target.value })}
          className="w-full bg-[#F9F7F2] border border-[#E8E4D9] rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#A68A64]/20 transition-all text-[#2D2D2D]"
        />
      </div>
    </div>
  );
}
