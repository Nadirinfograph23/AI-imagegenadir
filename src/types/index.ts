export interface GenerationRequest {
  prompt: string;
  image?: string; // base64 encoded image for img2img
  mode: 'text-to-image' | 'image-to-image';
  aspectRatio: string;
}

export interface GenerationResult {
  id: string;
  images: string[]; // base64 encoded images
  prompt: string;
  mode: 'text-to-image' | 'image-to-image';
  provider: string;
  timestamp: number;
  aspectRatio: string;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  mode: 'text-to-image' | 'image-to-image';
  provider: string;
  timestamp: number;
  images: string[];
  aspectRatio: string;
}

export interface ApiResponse {
  success: boolean;
  images?: string[];
  provider?: string;
  error?: string;
  cached?: boolean;
}
