/**
 * AI Image Generation Engine
 *
 * Features:
 *  - Model priority chain: FLUX.1 -> Imagen -> Gemini Image -> SDXL
 *  - Automatic prompt enhancement (realism, lighting, lens, detail)
 *  - Negative prompt injection
 *  - Image-to-image (preserve subject, improve quality)
 *  - Dual-image blending (first=subject, second=style)
 *  - In-memory caching with TTL
 *  - Retries with exponential back-off
 *  - Fallback across model chain
 *  - Web-optimised output
 */

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_NEGATIVE_PROMPT =
    'blurry, low quality, bad anatomy, deformed, ugly, watermark, text';

const DEFAULT_BLEND_PROMPT =
    'combine subject from first image with style, lighting, and colors of second image, ultra realistic, highly detailed, cinematic lighting, sharp focus';

/**
 * Model priority chains.
 * txt2img uses standard generation models.
 * img2img uses models that support image input (Kontext for FLUX, Gemini for
 * image-to-image, SDXL with image_base64 for Together).
 */
const MODEL_CHAINS = {
    txt2img: [
        { model: 'black-forest-labs/FLUX.1-schnell', provider: 'together',  label: 'FLUX.1' },
        { model: 'google/imagen-4.0-ultra',          provider: 'together',  label: 'Imagen' },
        { model: 'gemini-3-pro-image-preview',       provider: 'gemini',    label: 'Gemini 3 Pro' },
        { model: 'gemini-2.5-flash-image-preview',   provider: 'gemini',    label: 'Gemini 2.5 Flash' },
        { model: 'stabilityai/stable-diffusion-xl-base-1.0', provider: 'together', label: 'SDXL' },
    ],
    img2img: [
        { model: 'black-forest-labs/FLUX.1-kontext-pro', provider: 'together', label: 'FLUX.1 Kontext' },
        { model: 'gemini-3-pro-image-preview',           provider: 'gemini',   label: 'Gemini 3 Pro' },
        { model: 'gemini-2.5-flash-image-preview',       provider: 'gemini',   label: 'Gemini 2.5 Flash' },
        { model: 'stabilityai/stable-diffusion-xl-base-1.0', provider: 'together', label: 'SDXL' },
    ],
};

/* ------------------------------------------------------------------ */
/*  Prompt Enhancement                                                 */
/* ------------------------------------------------------------------ */

const ENHANCEMENT_KEYWORDS = [
    'ultra realistic',
    'highly detailed',
    'cinematic lighting',
    'sharp focus',
    'professional photography',
    '8k resolution',
    'natural skin texture',
    'volumetric light',
    'bokeh background',
    'shot on Canon EOS R5',
    'f/1.8 aperture',
    'golden hour lighting',
    'ray tracing',
    'photorealistic rendering',
];

/**
 * Enhance a user prompt with realism, lighting, lens, and detail keywords.
 * Avoids duplicating terms that are already present.
 */
function enhancePrompt(rawPrompt) {
    if (!rawPrompt || typeof rawPrompt !== 'string') return rawPrompt;

    const lowerPrompt = rawPrompt.toLowerCase();
    const additions = ENHANCEMENT_KEYWORDS.filter(
        (kw) => !lowerPrompt.includes(kw.toLowerCase())
    );

    // Pick a smart subset (5-7 keywords) to avoid overwhelming the model
    const selected = additions.slice(0, 7);
    return rawPrompt.trim() + ', ' + selected.join(', ');
}

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */

class ImageCache {
    constructor(maxSize = 50, ttlMs = 10 * 60 * 1000) {
        this._map = new Map();
        this._maxSize = maxSize;
        this._ttl = ttlMs;
    }

    _key(prompt, opts) {
        return JSON.stringify({ p: prompt, o: opts });
    }

    get(prompt, opts) {
        const k = this._key(prompt, opts);
        const entry = this._map.get(k);
        if (!entry) return null;
        if (Date.now() - entry.ts > this._ttl) {
            this._map.delete(k);
            return null;
        }
        return entry.data;
    }

    set(prompt, opts, data) {
        const k = this._key(prompt, opts);
        if (this._map.size >= this._maxSize) {
            // Evict oldest
            const oldest = this._map.keys().next().value;
            this._map.delete(oldest);
        }
        this._map.set(k, { data, ts: Date.now() });
    }
}

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                    */
/* ------------------------------------------------------------------ */

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Convert a File/Blob to a base64 data string (without the data-URI prefix).
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            // Strip the "data:image/...;base64," prefix
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Determine the provider for a model id.
 */
function inferProvider(model) {
    if (!model) return undefined;
    if (model.startsWith('gemini-')) return 'gemini';
    if (model.startsWith('google/')) return 'together';
    if (model.startsWith('black-forest-labs/')) return 'together';
    if (model.startsWith('stabilityai/')) return 'together';
    return undefined;
}

/**
 * Extract a data-URL src from the HTMLImageElement returned by Puter,
 * or from a raw Blob/data URL.
 */
function extractSrc(result) {
    if (!result) return null;
    if (result instanceof HTMLImageElement) return result.src;
    if (typeof result === 'string') return result;
    if (result.src) return result.src;
    return null;
}

/**
 * Compress / optimise an image data URL for web delivery.
 * Returns a Promise<string> with a WebP data URL (or JPEG fallback).
 */
function optimiseForWeb(dataUrl, maxDim = 1536, quality = 0.88) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            // Downscale if necessary
            if (width > maxDim || height > maxDim) {
                const scale = maxDim / Math.max(width, height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Try WebP first, fall back to JPEG
            let out = canvas.toDataURL('image/webp', quality);
            if (!out || out === 'data:,') {
                out = canvas.toDataURL('image/jpeg', quality);
            }
            resolve(out);
        };
        img.onerror = () => resolve(dataUrl); // return original on failure
        img.src = dataUrl;
    });
}

/* ------------------------------------------------------------------ */
/*  Main Engine                                                        */
/* ------------------------------------------------------------------ */

class ImageGenEngine {
    constructor() {
        this._cache = new ImageCache();
        this._maxRetries = 2;
        this._onStatus = null; // callback(message, progress 0-1)
    }

    /**
     * Register a status callback.
     * @param {Function} fn  (message: string, progress: number) => void
     */
    onStatus(fn) {
        this._onStatus = fn;
    }

    _status(msg, progress) {
        if (this._onStatus) this._onStatus(msg, progress);
    }

    /* ---------- txt2img ---------- */

    /**
     * Generate an image from text.
     *
     * @param {Object} params
     * @param {string}  params.prompt
     * @param {string}  [params.model='auto']  Model id or 'auto'
     * @param {boolean} [params.enhance=true]   Auto-enhance the prompt
     * @param {number}  [params.width=1024]
     * @param {number}  [params.height=1024]
     * @param {number}  [params.steps=20]
     * @param {number}  [params.seed]
     * @returns {Promise<{src: string, model: string, enhancedPrompt: string, elapsed: number}>}
     */
    async txt2img({
        prompt,
        model = 'auto',
        enhance = true,
        width = 1024,
        height = 1024,
        steps = 20,
        seed,
    }) {
        const finalPrompt = enhance ? enhancePrompt(prompt) : prompt;

        // Check cache
        const cacheKey = { model, width, height, steps, seed };
        const cached = this._cache.get(finalPrompt, cacheKey);
        if (cached) {
            this._status('Loaded from cache', 1);
            return cached;
        }

        const chain =
            model === 'auto'
                ? MODEL_CHAINS.txt2img
                : [{ model, provider: inferProvider(model), label: model }];

        const startTime = Date.now();
        let lastError = null;

        for (let ci = 0; ci < chain.length; ci++) {
            const entry = chain[ci];
            const progress = ci / chain.length;
            this._status(`Trying ${entry.label}...`, progress);

            for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
                try {
                    const opts = {
                        model: entry.model,
                        negative_prompt: DEFAULT_NEGATIVE_PROMPT,
                        width,
                        height,
                        steps,
                        disable_safety_checker: true,
                    };
                    if (entry.provider) opts.provider = entry.provider;
                    if (seed !== undefined && seed !== null && seed !== '') {
                        opts.seed = Number(seed);
                    }

                    const raw = await puter.ai.txt2img(finalPrompt, opts);
                    const src = extractSrc(raw);
                    if (!src) throw new Error('Empty result from model');

                    const optimised = await optimiseForWeb(src);
                    const elapsed = Date.now() - startTime;

                    const result = {
                        src: optimised,
                        model: entry.label,
                        enhancedPrompt: finalPrompt,
                        elapsed,
                    };
                    this._cache.set(finalPrompt, cacheKey, result);
                    this._status(`Generated with ${entry.label}`, 1);
                    return result;
                } catch (err) {
                    lastError = err;
                    console.warn(
                        `[engine] ${entry.label} attempt ${attempt + 1} failed:`,
                        err
                    );
                    if (attempt < this._maxRetries) {
                        const delay = 1000 * Math.pow(2, attempt);
                        this._status(
                            `Retrying ${entry.label} (${attempt + 2}/${this._maxRetries + 1})...`,
                            progress
                        );
                        await sleep(delay);
                    }
                }
            }
            // Move to next model in chain
            this._status(`${entry.label} failed, falling back...`, progress);
        }

        throw new Error(
            `All models failed. Last error: ${lastError ? lastError.message : 'unknown'}`
        );
    }

    /* ---------- img2img ---------- */

    /**
     * Image-to-image transformation. Preserves subject, improves quality/style.
     *
     * @param {Object} params
     * @param {string}  params.imageBase64   Base64 of the input image
     * @param {string}  params.imageMime     MIME type e.g. 'image/png'
     * @param {string}  [params.prompt]      Transformation prompt
     * @param {string}  [params.model='auto']
     * @param {boolean} [params.enhance=true]
     * @param {number}  [params.promptStrength=0.65]
     * @returns {Promise<{src: string, model: string, enhancedPrompt: string, elapsed: number}>}
     */
    async img2img({
        imageBase64,
        imageMime = 'image/png',
        prompt = '',
        model = 'auto',
        enhance = true,
        promptStrength = 0.65,
    }) {
        const defaultPrompt =
            'preserve the subject exactly, enhance quality, improve sharpness and detail, professional photography, cinematic lighting';
        let finalPrompt = prompt || defaultPrompt;
        if (enhance) finalPrompt = enhancePrompt(finalPrompt);

        const chain =
            model === 'auto'
                ? MODEL_CHAINS.img2img
                : [{ model, provider: inferProvider(model), label: model }];

        const startTime = Date.now();
        let lastError = null;

        for (let ci = 0; ci < chain.length; ci++) {
            const entry = chain[ci];
            const progress = ci / chain.length;
            this._status(`Trying ${entry.label}...`, progress);

            for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
                try {
                    const opts = { model: entry.model };
                    if (entry.provider) opts.provider = entry.provider;

                    // Provider-specific image input
                    if (entry.provider === 'gemini') {
                        opts.input_image = imageBase64;
                        opts.input_image_mime_type = imageMime;
                    } else {
                        // Together / FLUX Kontext
                        opts.image_base64 = imageBase64;
                        opts.prompt_strength = promptStrength;
                        opts.negative_prompt = DEFAULT_NEGATIVE_PROMPT;
                        opts.disable_safety_checker = true;
                    }

                    const raw = await puter.ai.txt2img(finalPrompt, opts);
                    const src = extractSrc(raw);
                    if (!src) throw new Error('Empty result from model');

                    const optimised = await optimiseForWeb(src);
                    const elapsed = Date.now() - startTime;

                    this._status(`Generated with ${entry.label}`, 1);
                    return {
                        src: optimised,
                        model: entry.label,
                        enhancedPrompt: finalPrompt,
                        elapsed,
                    };
                } catch (err) {
                    lastError = err;
                    console.warn(
                        `[engine] img2img ${entry.label} attempt ${attempt + 1} failed:`,
                        err
                    );
                    if (attempt < this._maxRetries) {
                        const delay = 1000 * Math.pow(2, attempt);
                        this._status(
                            `Retrying ${entry.label} (${attempt + 2}/${this._maxRetries + 1})...`,
                            progress
                        );
                        await sleep(delay);
                    }
                }
            }
            this._status(`${entry.label} failed, falling back...`, progress);
        }

        throw new Error(
            `All img2img models failed. Last error: ${lastError ? lastError.message : 'unknown'}`
        );
    }

    /* ---------- blend ---------- */

    /**
     * Blend two images: first = subject, second = style.
     *
     * Strategy: Use the subject image as the image input and construct a
     * prompt that tells the model to adopt the style/lighting/colors of the
     * second image. The style image is described via an auto-generated
     * caption when possible, otherwise we rely on the blend prompt.
     *
     * @param {Object} params
     * @param {string}  params.subjectBase64
     * @param {string}  params.subjectMime
     * @param {string}  params.styleBase64
     * @param {string}  params.styleMime
     * @param {string}  [params.prompt]        Custom blend prompt
     * @param {string}  [params.model='auto']
     * @param {number}  [params.blendStrength=0.70]
     * @returns {Promise<{src: string, model: string, enhancedPrompt: string, elapsed: number}>}
     */
    async blend({
        subjectBase64,
        subjectMime = 'image/png',
        styleBase64,
        styleMime = 'image/png',
        prompt = '',
        model = 'auto',
        blendStrength = 0.70,
    }) {
        // Build the blend prompt
        let blendPrompt = prompt || DEFAULT_BLEND_PROMPT;

        // Try to describe the style image for better blending
        let styleDescription = '';
        try {
            this._status('Analysing style image...', 0.05);
            const chatResult = await puter.ai.chat(
                'Describe the artistic style, lighting, colors, and mood of this image in one concise sentence. Only describe the style, not the content.',
                {
                    vision: [{ image_base64: styleBase64, mime_type: styleMime }],
                }
            );
            styleDescription =
                typeof chatResult === 'string'
                    ? chatResult
                    : chatResult?.message?.content || '';
        } catch (err) {
            console.warn('[engine] Style analysis failed, using default prompt:', err);
        }

        if (styleDescription) {
            blendPrompt += `. Apply this specific style: ${styleDescription}`;
        }

        // Use img2img with the subject image
        return this.img2img({
            imageBase64: subjectBase64,
            imageMime: subjectMime,
            prompt: blendPrompt,
            model,
            enhance: true,
            promptStrength: blendStrength,
        });
    }
}

// Export singleton
window.ImageGenEngine = new ImageGenEngine();
window.fileToBase64 = fileToBase64;
