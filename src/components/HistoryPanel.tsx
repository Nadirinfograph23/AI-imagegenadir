'use client';

import { X, RotateCcw, Trash2, Clock } from 'lucide-react';
import { HistoryItem } from '@/types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onRerun: (item: HistoryItem) => void;
  onClear: () => void;
}

export default function HistoryPanel({
  isOpen,
  onClose,
  history,
  onRerun,
  onClear,
}: HistoryPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-16 bottom-0 z-40 w-80 border-l border-white/10 bg-black/95 backdrop-blur-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-400" />
          <h2 className="text-sm font-semibold text-white">Generation History</h2>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-8 w-8 text-white/10 mb-3" />
            <p className="text-sm text-white/30">No generation history yet</p>
            <p className="text-xs text-white/20 mt-1">
              Your generated images will appear here
            </p>
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-white/20 transition-all"
            >
              {/* Provider badge */}
              <div className="mb-2 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                <span className="text-[10px] text-white/40">{item.provider}</span>
              </div>

              {/* Prompt */}
              <p className="text-xs text-white/70 line-clamp-2 mb-2">
                {item.prompt}
              </p>

              {/* Meta info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/30">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40">
                    {item.mode === 'text-to-image' ? 'txt2img' : 'img2img'}
                  </span>
                </div>
                <button
                  onClick={() => onRerun(item)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Re-run
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
