import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

const COLORS = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-blue-600' };

export function Toast({ message, type, visible }: ToastProps) {
  if (!visible || !message) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-[100] text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 ${COLORS[type]}`}>
      {type === 'success' ? '✓ ' : type === 'error' ? '✗ ' : 'ℹ '}{message}
    </div>
  );
}