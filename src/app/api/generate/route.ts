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
    const { prompt, image, mode } = body;

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

    // Generate images with fallback system
    const images: string[] = [];
    let successProvider = '';
    const errors: string[] = [];

    // Generate 4 images (try to get multiple)
    const numImages = 4;

    if (mode === 'text-to-image') {
      // Provider chain: HuggingFace SDXL → Stable Horde
      for (let i = 0; i < numImages; i++) {
        let generated = false;

        // Try HuggingFace SDXL first
        try {
          const buffer = await generateWithHuggingFaceSDXL(
            prompt + (i > 0 ? ` variation ${i + 1}` : '')
          );
          images.push(buffer.toString('base64'));
          successProvider = 'HuggingFace SDXL';
          generated = true;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`HF SDXL [${i}]: ${errMsg}`);
        }

        // Fallback to Stable Horde
        if (!generated) {
          try {
            const buffer = await generateWithStableHorde(
              prompt + (i > 0 ? ` variation ${i + 1}` : '')
            );
            images.push(buffer.toString('base64'));
            if (!successProvider) successProvider = 'Stable Horde';
            generated = true;
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Stable Horde [${i}]: ${errMsg}`);
          }
        }

        // If we got at least 1 image and the rest are failing, break early
        if (!generated && images.length > 0 && i >= 2) {
          break;
        }
      }
    } else {
      // Image-to-image mode
      // Provider chain: HuggingFace Pix2Pix → Stable Horde Img2Img
      const imageData = image!;

      for (let i = 0; i < numImages; i++) {
        let generated = false;

        // Try HuggingFace Pix2Pix first
        try {
          const buffer = await generateWithHuggingFacePix2Pix(
            prompt + (i > 0 ? `, variation ${i + 1}` : ''),
            imageData
          );
          images.push(buffer.toString('base64'));
          successProvider = 'HuggingFace Pix2Pix';
          generated = true;
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`HF Pix2Pix [${i}]: ${errMsg}`);
        }

        // Fallback to Stable Horde Img2Img
        if (!generated) {
          try {
            const buffer = await generateWithStableHordeImg2Img(
              prompt + (i > 0 ? `, variation ${i + 1}` : ''),
              imageData
            );
            images.push(buffer.toString('base64'));
            if (!successProvider) successProvider = 'Stable Horde Img2Img';
            generated = true;
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Stable Horde Img2Img [${i}]: ${errMsg}`);
          }
        }

        if (!generated && images.length > 0 && i >= 2) {
          break;
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
