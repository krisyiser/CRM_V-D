import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-[#E8E4D9]/40 rounded-lg ${className || ''}`} 
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#E8E4D9] shadow-sm flex flex-col justify-between min-h-[180px]">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="h-2 w-8 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="w-2 h-2 rounded-full" />
      </div>
      <div className="mt-6 pt-4 border-t border-[#F9F7F2]">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Skeleton className="h-2 w-12 mb-2" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-white p-8 rounded-3xl border border-[#E8E4D9] shadow-sm">
      <Skeleton className="h-2 w-20 mb-3" />
      <div className="flex items-end justify-between">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-[32px] border border-[#E8E4D9] shadow-sm overflow-hidden">
      <div className="w-full bg-[#F9F7F2] h-16 border-b border-[#E8E4D9]" />
      <div className="p-8 space-y-6">
        {Array(rows).fill(0).map((_, i) => (
          <div key={i} className="flex justify-between items-center pb-6 border-b border-[#F2EEE4] last:border-0">
            <div className="flex gap-4 items-center">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array(items).fill(0).map((_, i) => (
        <div key={i} className="p-6 bg-white border border-[#E8E4D9] rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <Skeleton className="w-14 h-14 rounded-2xl" />
            <div>
              <Skeleton className="h-5 w-40 mb-2" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-5 h-5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
