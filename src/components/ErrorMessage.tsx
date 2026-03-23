'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="w-full max-w-3xl mx-auto mt-4">
      <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-300">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
