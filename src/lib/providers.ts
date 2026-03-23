const HF_API_KEYS = (process.env.HF_API_KEYS || '').split(',').filter(Boolean);
const STABLE_HORDE_API_KEY = process.env.STABLE_HORDE_API_KEY || '0000000000';

// Aspect ratio to pixel dimensions mapping
// SDXL works best with multiples of 64, total pixels near 1024x1024
const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1':  { width: 1024, height: 1024 },
  '3:4':  { width: 896, height: 1152 },
  '4:3':  { width: 1152, height: 896 },
  '9:16': { width: 768, height: 1344 },
  '16:9': { width: 1344, height: 768 },
  '3:2':  { width: 1216, height: 832 },
  '2:3':  { width: 832, height: 1216 },
  '5:4':  { width: 1152, height: 896 },
  '4:5':  { width: 896, height: 1152 },
  '21:9': { width: 1536, height: 640 },
};

// Stable Horde uses smaller dimensions (max 512-768 range)
const STABLE_HORDE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1':  { width: 512, height: 512 },
  '3:4':  { width: 448, height: 576 },
  '4:3':  { width: 576, height: 448 },
  '9:16': { width: 384, height: 672 },
  '16:9': { width: 672, height: 384 },
  '3:2':  { width: 608, height: 416 },
  '2:3':  { width: 416, height: 608 },
  '5:4':  { width: 576, height: 448 },
  '4:5':  { width: 448, height: 576 },
  '21:9': { width: 768, height: 320 },
};

export function getDimensions(aspectRatio: string): { width: number; height: number } {
  return ASPECT_RATIO_DIMENSIONS[aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];
}

export function getStableHordeDimensions(aspectRatio: string): { width: number; height: number } {
  return STABLE_HORDE_DIMENSIONS[aspectRatio] || STABLE_HORDE_DIMENSIONS['1:1'];
}

function getRandomHFKey(): string {
  if (HF_API_KEYS.length === 0) return '';
  return HF_API_KEYS[Math.floor(Math.random() * HF_API_KEYS.length)];
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateWithHuggingFaceSDXL(
  prompt: string,
  aspectRatio: string = '1:1'
): Promise<Buffer> {
  const apiKey = getRandomHFKey();
  if (!apiKey) throw new Error('No HuggingFace API keys configured');

  const dims = getDimensions(aspectRatio);

  const response = await fetchWithTimeout(
    'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_inference_steps: 30,
          guidance_scale: 7.5,
          width: dims.width,
          height: dims.height,
        },
      }),
    },
    15000
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace SDXL error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateWithHuggingFacePix2Pix(
  prompt: string,
  imageBase64: string
): Promise<Buffer> {
  const apiKey = getRandomHFKey();
  if (!apiKey) throw new Error('No HuggingFace API keys configured');

  const imageBuffer = Buffer.from(imageBase64, 'base64');

  const response = await fetchWithTimeout(
    'https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          image: imageBuffer.toString('base64'),
          prompt: prompt,
        },
        parameters: {
          num_inference_steps: 20,
          image_guidance_scale: 1.5,
          guidance_scale: 7.5,
        },
      }),
    },
    15000
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace Pix2Pix error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateWithStableHorde(
  prompt: string,
  aspectRatio: string = '1:1'
): Promise<Buffer> {
  const dims = getStableHordeDimensions(aspectRatio);

  // Step 1: Submit generation request
  const submitResponse = await fetchWithTimeout(
    'https://stablehorde.net/api/v2/generate/async',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: STABLE_HORDE_API_KEY,
      },
      body: JSON.stringify({
        prompt: prompt,
        params: {
          sampler_name: 'k_euler',
          cfg_scale: 7.5,
          height: dims.height,
          width: dims.width,
          steps: 30,
          n: 1,
        },
        nsfw: false,
        models: ['stable_diffusion'],
      }),
    },
    15000
  );

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(`Stable Horde submit error: ${submitResponse.status} - ${errorText}`);
  }

  const submitData = await submitResponse.json();
  const requestId = submitData.id;

  if (!requestId) {
    throw new Error('Stable Horde did not return a request ID');
  }

  // Step 2: Poll for results (max 60 seconds)
  const maxPolls = 20;
  const pollInterval = 3000;

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const checkResponse = await fetchWithTimeout(
      `https://stablehorde.net/api/v2/generate/check/${requestId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      10000
    );

    if (!checkResponse.ok) continue;

    const checkData = await checkResponse.json();

    if (checkData.done) {
      // Step 3: Get the result
      const statusResponse = await fetchWithTimeout(
        `https://stablehorde.net/api/v2/generate/status/${requestId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
        10000
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to get Stable Horde result');
      }

      const statusData = await statusResponse.json();
      const generations = statusData.generations;

      if (!generations || generations.length === 0) {
        throw new Error('No generations returned from Stable Horde');
      }

      // Download the image
      const imageUrl = generations[0].img;
      const imageResponse = await fetchWithTimeout(imageUrl, {}, 10000);

      if (!imageResponse.ok) {
        throw new Error('Failed to download image from Stable Horde');
      }

      const imageArrayBuffer = await imageResponse.arrayBuffer();
      return Buffer.from(imageArrayBuffer);
    }
  }

  throw new Error('Stable Horde generation timed out');
}

export async function generateWithStableHordeImg2Img(
  prompt: string,
  imageBase64: string,
  aspectRatio: string = '1:1'
): Promise<Buffer> {
  const dims = getStableHordeDimensions(aspectRatio);

  const submitResponse = await fetchWithTimeout(
    'https://stablehorde.net/api/v2/generate/async',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: STABLE_HORDE_API_KEY,
      },
      body: JSON.stringify({
        prompt: prompt,
        params: {
          sampler_name: 'k_euler',
          cfg_scale: 7.5,
          height: dims.height,
          width: dims.width,
          steps: 30,
          denoising_strength: 0.6,
          n: 1,
        },
        source_image: imageBase64,
        nsfw: false,
        models: ['stable_diffusion'],
      }),
    },
    15000
  );

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(`Stable Horde img2img error: ${submitResponse.status} - ${errorText}`);
  }

  const submitData = await submitResponse.json();
  const requestId = submitData.id;

  if (!requestId) {
    throw new Error('Stable Horde did not return a request ID');
  }

  const maxPolls = 20;
  const pollInterval = 3000;

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const checkResponse = await fetchWithTimeout(
      `https://stablehorde.net/api/v2/generate/check/${requestId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      10000
    );

    if (!checkResponse.ok) continue;

    const checkData = await checkResponse.json();

    if (checkData.done) {
      const statusResponse = await fetchWithTimeout(
        `https://stablehorde.net/api/v2/generate/status/${requestId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
        10000
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to get Stable Horde img2img result');
      }

      const statusData = await statusResponse.json();
      const generations = statusData.generations;

      if (!generations || generations.length === 0) {
        throw new Error('No img2img generations returned from Stable Horde');
      }

      const imageUrl = generations[0].img;
      const imageResponse = await fetchWithTimeout(imageUrl, {}, 10000);

      if (!imageResponse.ok) {
        throw new Error('Failed to download img2img from Stable Horde');
      }

      const imageArrayBuffer = await imageResponse.arrayBuffer();
      return Buffer.from(imageArrayBuffer);
    }
  }

  throw new Error('Stable Horde img2img generation timed out');
}
