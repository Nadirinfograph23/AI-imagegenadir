'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Banana } from 'lucide-react';
import Header from '@/components/Header';
import PromptInput from '@/components/PromptInput';
import ImageGrid from '@/components/ImageGrid';
import HistoryPanel from '@/components/HistoryPanel';
import ErrorMessage from '@/components/ErrorMessage';
import { HistoryItem, ApiResponse } from '@/types';

export default function Home() {
  const [images, setImages] = useState<string[]>([]);
  const [provider, setProvider] = useState('');
  const [cached, setCached] = useState(false);
  const [currentAspectRatio, setCurrentAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const historyRef = useRef<HistoryItem[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Clean up debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('micro-banana-history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    try {
      const toSave = newHistory.slice(0, 20).map((item) => ({
        ...item,
        // Store only prompt/metadata, not full image data (too large for localStorage)
        images: [],
      }));
      localStorage.setItem('micro-banana-history', JSON.stringify(toSave));
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleGenerate = useCallback(
    (
      prompt: string,
      mode: 'text-to-image' | 'image-to-image',
      image: string | null,
      aspectRatio: string
    ) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(async () => {
        setIsGenerating(true);
        setError(null);
        setImages([]);
        setProvider('');
        setCached(false);
        setCurrentAspectRatio(aspectRatio);

        try {
          const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt,
              mode,
              image: image || undefined,
              aspectRatio,
            }),
          });

          const data: ApiResponse = await response.json();

          if (!response.ok || !data.success) {
            setError(
              data.error || 'Failed to generate images. Please try again.'
            );
            return;
          }

          if (data.images && data.images.length > 0) {
            setImages(data.images);
            setProvider(data.provider || 'Unknown');
            setCached(data.cached || false);

            const historyItem: HistoryItem = {
              id: Date.now().toString(),
              prompt,
              mode,
              provider: data.provider || 'Unknown',
              timestamp: Date.now(),
              images: data.images,
              aspectRatio,
            };

            const newHistory = [historyItem, ...historyRef.current];
            saveHistory(newHistory);
          }
        } catch {
          setError(
            'Network error. Please check your connection and try again.'
          );
        } finally {
          setIsGenerating(false);
        }
      }, 300);
    },
    [saveHistory]
  );

  const handleRerun = useCallback(
    (item: HistoryItem) => {
      handleGenerate(item.prompt, item.mode, null, item.aspectRatio);
      setHistoryOpen(false);
    },
    [handleGenerate]
  );

  const handleClearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  return (
    <div className="min-h-screen bg-black">
      <Header
        onToggleHistory={() => setHistoryOpen(!historyOpen)}
        historyOpen={historyOpen}
      />

      <main className="pt-16">
        <div className="flex flex-col items-center px-4 py-12">
          {images.length === 0 && !isGenerating && (
            <div className="mb-10 flex flex-col items-center animate-fade-in">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-yellow-400/10 border border-yellow-400/20">
                <Banana className="h-10 w-10 text-yellow-400" />
              </div>
              <h2 className="mb-2 text-center text-4xl font-bold tracking-widest text-white sm:text-5xl">
                MICRO-BANANA
              </h2>
              <p className="mb-1 text-center text-sm text-white/40">
                Transform your ideas into stunning images with AI
              </p>
              <p className="text-center text-xs text-white/25">
                Powered by FLUX.1 &amp; SDXL &bull; Free &amp; Open Source
              </p>
            </div>
          )}

          <PromptInput onGenerate={handleGenerate} isGenerating={isGenerating} />

          {error && (
            <ErrorMessage message={error} onDismiss={() => setError(null)} />
          )}

          <ImageGrid
            images={images}
            provider={provider}
            isLoading={isGenerating}
            cached={cached}
            aspectRatio={currentAspectRatio}
          />

          <div className="mt-16 mb-8 text-center">
            <p className="text-xs text-white/20">
              Developed by{' '}
              <span className="text-white/40">حوامرية نذير</span>
              {' '}&mdash;{' '}
              <span className="text-yellow-400/40">NADIR INFOGRAPH</span>
            </p>
          </div>
        </div>
      </main>

      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onRerun={handleRerun}
        onClear={handleClearHistory}
      />

      {historyOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}
