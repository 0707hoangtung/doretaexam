import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-indigo-500/50 bg-slate-900/95 text-indigo-200';
        let Icon = Info;

        if (toast.type === 'success') {
          borderClass = 'border-emerald-500/50 bg-slate-900/95 text-emerald-200 shadow-emerald-500/10';
          Icon = CheckCircle2;
        } else if (toast.type === 'error') {
          borderClass = 'border-rose-500/50 bg-slate-900/95 text-rose-200 shadow-rose-500/10';
          Icon = AlertCircle;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-500/50 bg-slate-900/95 text-amber-200 shadow-amber-500/10';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={toast.id}
            className={`p-3.5 rounded-2xl border ${borderClass} shadow-2xl text-xs font-semibold backdrop-blur-md transition-all pointer-events-auto flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200`}
          >
            <div className="flex items-start gap-2.5 pt-0.5">
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{toast.message}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
