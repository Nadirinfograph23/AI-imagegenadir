import { NextRequest, NextResponse } from 'next/server';
import {
  generateWithHuggingFaceSDXL,
  generateWithHuggingFacePix2Pix,
  generateWithStableHorde,
  generateWithStableHordeImg2Img,
} from '@/lib/providers';
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

    // Generate images with fallback system (parallel)
    const images: string[] = [];
    let successProvider = '';
    const errors: string[] = [];
    const numImages = 4;

    // Helper: generate a single image with fallback
    async function generateOne(
      index: number,
      txt2imgFn: (p: string, ar: string) => Promise<Buffer>,
      fallbackFn: (p: string, ar: string) => Promise<Buffer>,
      primaryName: string,
      fallbackName: string,
      extraPrompt: string,
      ar: string
    ): Promise<{ image: string; provider: string } | null> {
      const variantPrompt = extraPrompt + (index > 0 ? `, variation ${index + 1}` : '');

      // Try primary provider
      try {
        const buffer = await txt2imgFn(variantPrompt, ar);
        return { image: buffer.toString('base64'), provider: primaryName };
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${primaryName} [${index}]: ${errMsg}`);
      }

      // Fallback provider
      try {
        const buffer = await fallbackFn(variantPrompt, ar);
        return { image: buffer.toString('base64'), provider: fallbackName };
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${fallbackName} [${index}]: ${errMsg}`);
      }

      return null;
    }

    if (mode === 'text-to-image') {
      // Run all 4 generations in parallel with fallback
      const promises = Array.from({ length: numImages }, (_, i) =>
        generateOne(
          i,
          (p, ar) => generateWithHuggingFaceSDXL(p, ar),
          (p, ar) => generateWithStableHorde(p, ar),
          'HuggingFace SDXL',
          'Stable Horde',
          prompt,
          aspectRatio
        )
      );

      const results = await Promise.allSettled(promises);
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          images.push(result.value.image);
          if (!successProvider) successProvider = result.value.provider;
        }
      }
    } else {
      // Image-to-image mode (parallel with fallback)
      const imageData = image!;
      const promises = Array.from({ length: numImages }, (_, i) =>
        generateOne(
          i,
          (p) => generateWithHuggingFacePix2Pix(p, imageData),
          (p, ar) => generateWithStableHordeImg2Img(p, imageData, ar),
          'HuggingFace Pix2Pix',
          'Stable Horde Img2Img',
          prompt,
          aspectRatio
        )
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
