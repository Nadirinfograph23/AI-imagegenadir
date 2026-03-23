'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Sparkles, Ratio, ImageIcon } from 'lucide-react';
import { compressImage, validateFile } from '@/lib/image-utils';

interface PromptInputProps {
  onGenerate: (
    prompt: string,
    mode: 'text-to-image' | 'image-to-image',
    image: string | null,
    aspectRatio: string
  ) => void;
  isGenerating: boolean;
}

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '3:4', value: '3:4' },
  { label: '4:3', value: '4:3' },
  { label: '9:16', value: '9:16' },
  { label: '16:9', value: '16:9' },
  { label: '3:2', value: '3:2' },
  { label: '2:3', value: '2:3' },
  { label: '5:4', value: '5:4' },
  { label: '4:5', value: '4:5' },
  { label: '21:9', value: '21:9' },
];

export default function PromptInput({
  onGenerate,
  isGenerating,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadError(null);
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setIsCompressing(true);
    try {
      const base64 = await compressImage(file);
      setUploadedImage(base64);
      setUploadedImagePreview(URL.createObjectURL(file));
    } catch {
      setUploadError('Failed to process image. Please try another file.');
    } finally {
      setIsCompressing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleSubmit = useCallback(() => {
    if (!prompt.trim() || isGenerating) return;
    const mode = uploadedImage ? 'image-to-image' : 'text-to-image';
    onGenerate(prompt.trim(), mode, uploadedImage, aspectRatio);
  }, [prompt, uploadedImage, aspectRatio, isGenerating, onGenerate]);

  const removeImage = useCallback(() => {
    setUploadedImage(null);
    setUploadedImagePreview(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        className="rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-sm overflow-hidden transition-all hover:border-white/20"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* Image preview */}
        {uploadedImagePreview && (
          <div className="relative p-3 pb-0">
            <div className="relative inline-block">
              <img
                src={uploadedImagePreview}
                alt="Uploaded"
                className="h-20 w-20 rounded-lg object-cover border border-white/10"
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Prompt input */}
        <div className="flex items-center gap-2 p-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white/40 hover:bg-white/10 hover:text-white/70 transition-all"
            title="Upload image for Image-to-Image"
          >
            {isCompressing ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-yellow-400" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
          />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Describe the image you want to create..."
            className="flex-1 bg-transparent text-white placeholder-white/30 outline-none text-sm"
            maxLength={500}
            disabled={isGenerating}
          />
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-2">
            {/* Mode indicator */}
            <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-xs text-white/70">
                {uploadedImage ? 'Image to Image' : 'SDXL'}
              </span>
            </div>

            {/* Aspect ratio */}
            <div className="relative">
              <button
                onClick={() => setShowAspectMenu(!showAspectMenu)}
                className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition-colors"
              >
                <Ratio className="h-3 w-3" />
                {aspectRatio}
              </button>
              {showAspectMenu && (
                <div className="absolute bottom-full left-0 mb-2 rounded-lg bg-zinc-800 border border-white/10 p-1 shadow-xl z-10">
                  {ASPECT_RATIOS.map((ar) => (
                    <button
                      key={ar.value}
                      onClick={() => {
                        setAspectRatio(ar.value);
                        setShowAspectMenu(false);
                      }}
                      className={`block w-full rounded px-3 py-1.5 text-left text-xs transition-colors ${
                        aspectRatio === ar.value
                          ? 'bg-yellow-400/20 text-yellow-400'
                          : 'text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {ar.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {uploadedImage && (
              <div className="flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1.5">
                <ImageIcon className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-blue-400">img2img</span>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className="flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            Generate
            <Sparkles className="h-4 w-4" />
          </button>
        </div>
      </div>

      {uploadError && (
        <p className="mt-2 text-center text-xs text-red-400">{uploadError}</p>
      )}
    </div>
  );
}
