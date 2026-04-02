import { NextRequest, NextResponse } from 'next/server';
import {
  generateWithFlux,
  generateWithHuggingFaceSDXL,
  generateWithHuggingFaceFallback,
  generateWithHuggingFacePix2Pix,
  generateWithStableHorde,
  generateWithStableHordeImg2Img,
} from '@/lib/providers';
import { enhancePrompt } from '@/lib/prompt-enhancer';
import { generateCacheKey, getCachedResult, setCachedResult } from '@/lib/cache';
import { checkRateLimit } from '@/lib/rate-limit';

interface GenerateRequestBody {
  prompt: string;
  image?: string;
  mode: 'text-to-image' | 'image-to-image';
  aspectRatio?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000)),
          },
        }
      );
    }

    const body: GenerateRequestBody = await request.json();
    const { prompt, image, mode, aspectRatio = '1:1' } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (prompt.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Prompt must be less than 500 characters' },
        { status: 400 }
      );
    }

    if (mode === 'image-to-image' && !image) {
      return NextResponse.json(
        { success: false, error: 'Image is required for image-to-image mode' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = generateCacheKey(prompt, image);
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        images: cached.images,
        provider: cached.provider + ' (cached)',
        cached: true,
      });
    }

    // Enhance the prompt automatically
    const enhancedPrompt = enhancePrompt(prompt);
    console.log(`Prompt enhanced: "${prompt}" -> "${enhancedPrompt.substring(0, 80)}..."`);

    // Generate images with fallback system (parallel)
    // Pipeline priority: FLUX.1 -> SDXL -> HuggingFace fallback models -> Stable Horde
    const images: string[] = [];
    let successProvider = '';
    const errors: string[] = [];
    const numImages = 4;

    // Helper: generate a single image with cascading fallback
    async function generateOne(
      index: number,
      providers: Array<{ fn: (p: string, ar: string) => Promise<Buffer>; name: string }>,
      extraPrompt: string,
      ar: string
    ): Promise<{ image: string; provider: string } | null> {
      const variantPrompt = extraPrompt + (index > 0 ? `, variation ${index + 1}` : '');

      for (const provider of providers) {
        try {
          const buffer = await provider.fn(variantPrompt, ar);
          return { image: buffer.toString('base64'), provider: provider.name };
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${provider.name} [${index}]: ${errMsg}`);
        }
      }

      return null;
    }

    if (mode === 'text-to-image') {
      // Pipeline: FLUX.1 -> SDXL -> HuggingFace fallback -> Stable Horde
      const providers = [
        { fn: (p: string, ar: string) => generateWithFlux(p, ar), name: 'FLUX.1' },
        { fn: (p: string, ar: string) => generateWithHuggingFaceSDXL(p, ar), name: 'SDXL' },
        { fn: (p: string, ar: string) => generateWithHuggingFaceFallback(p, ar), name: 'HuggingFace SD' },
        { fn: (p: string, ar: string) => generateWithStableHorde(p, ar), name: 'Stable Horde' },
      ];

      const promises = Array.from({ length: numImages }, (_, i) =>
        generateOne(i, providers, enhancedPrompt, aspectRatio)
      );

      const results = await Promise.allSettled(promises);
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          images.push(result.value.image);
          if (!successProvider) successProvider = result.value.provider;
        }
      }
    } else {
      // Image-to-image mode: Pix2Pix -> Stable Horde Img2Img
      const imageData = image!;
      const providers = [
        { fn: (p: string) => generateWithHuggingFacePix2Pix(p, imageData), name: 'HuggingFace Pix2Pix' },
        { fn: (p: string, ar: string) => generateWithStableHordeImg2Img(p, imageData, ar), name: 'Stable Horde Img2Img' },
      ];

      const promises = Array.from({ length: numImages }, (_, i) =>
        generateOne(i, providers, enhancedPrompt, aspectRatio)
      );

      const results = await Promise.allSettled(promises);
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          images.push(result.value.image);
          if (!successProvider) successProvider = result.value.provider;
        }
      }
    }

    if (images.length === 0) {
      console.error('All providers failed:', errors);
      return NextResponse.json(
        {
          success: false,
          error:
            'All AI providers are currently unavailable. Please try again later.',
          details: errors,
        },
        { status: 503 }
      );
    }

    // Cache the result
    setCachedResult(cacheKey, images, successProvider);

    console.log(
      `Generated ${images.length} images using ${successProvider} for prompt: "${prompt.substring(0, 50)}..."`
    );

    return NextResponse.json({
      success: true,
      images,
      provider: successProvider,
      cached: false,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}
