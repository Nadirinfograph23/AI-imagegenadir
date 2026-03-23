export interface GenerationRequest {
  prompt: string;
  image?: string; // base64 encoded image for img2img
  mode: 'text-to-image' | 'image-to-image';
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3';
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
