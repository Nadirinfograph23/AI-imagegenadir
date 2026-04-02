'use client';

import { Banana, Github, History } from 'lucide-react';

interface HeaderProps {
  onToggleHistory: () => void;
  historyOpen: boolean;
}

export default function Header({ onToggleHistory, historyOpen }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400/20">
            <Banana className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider text-white">
              MICRO-BANANA
            </h1>
            <p className="text-[10px] text-white/40 tracking-wide">
              AI IMAGE STUDIO
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <span className="text-sm text-yellow-400 font-medium border-b-2 border-yellow-400 pb-1">
            Text to Image
          </span>
          <span className="text-sm text-white/50 hover:text-white/80 transition-colors cursor-default">
            Image to Image
          </span>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleHistory}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
              historyOpen
                ? 'bg-yellow-400/20 text-yellow-400'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <a
            href="https://github.com/Nadirinfograph23/AI-imagegenadir"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white transition-all"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
