# AI Image Generator

A powerful, browser-based AI image generation app built with [Puter.js](https://puter.com). No API keys, no backend, no signup required.

## Features

- **Text-to-Image** — Generate images from text prompts with automatic enhancement
- **Image-to-Image** — Transform existing images while preserving the subject
- **Style Blending** — Combine a subject image with a style image intelligently
- **Model Priority Chain** — Automatic fallback across models: FLUX.1 → Imagen → Gemini Image → SDXL
- **Prompt Enhancement** — Auto-adds realism, lighting, lens, and detail keywords
- **Negative Prompts** — Automatically filters out: blurry, low quality, bad anatomy, deformed, ugly, watermark, text
- **Caching** — In-memory cache with TTL to avoid redundant API calls
- **Retries & Fallback** — Exponential back-off retries per model, then falls back to next in chain
- **Web-Optimised Output** — Images compressed to WebP/JPEG, downscaled for fast delivery

## Supported Models

| Priority | Model | Use Case |
|----------|-------|----------|
| 1 | FLUX.1 Schnell / Dev / Pro | Primary text-to-image |
| 1 | FLUX.1 Kontext Pro / Max | Primary image-to-image |
| 2 | Imagen 4.0 Ultra | High-quality fallback |
| 3 | Gemini 3 Pro / 2.5 Flash Image | Multi-modal fallback |
| 4 | Stable Diffusion XL | Final fallback |

## Quick Start

1. Open `index.html` in any modern browser
2. Enter a prompt and click **Generate Image**
3. That's it — Puter.js handles authentication via the user-pays model

Or serve it locally:

```bash
# Any static file server works
npx serve .
# or
python3 -m http.server 8000
```

## Project Structure

```
├── index.html          # Main application page
├── css/
│   └── styles.css      # Dark theme UI styles
├── js/
│   ├── engine.js       # Core generation engine (models, cache, retries, prompts)
│   └── app.js          # UI controller (tabs, uploads, history)
└── README.md
```

## How It Works

### Model Priority Chain

When set to **Auto**, the engine tries models in priority order. If a model fails after retries, it automatically falls back to the next:

```
FLUX.1 → Imagen 4.0 Ultra → Gemini 3 Pro → Gemini 2.5 Flash → SDXL
```

### Prompt Enhancement

User prompts are automatically enriched with:
- `ultra realistic, highly detailed, cinematic lighting, sharp focus`
- `professional photography, 8k resolution, natural skin texture`
- `volumetric light, bokeh background, shot on Canon EOS R5`
- `f/1.8 aperture, golden hour lighting, ray tracing, photorealistic rendering`

Duplicate terms already in the prompt are skipped.

### Image-to-Image

Upload an image and the engine will:
1. Preserve the subject from the original
2. Enhance quality, sharpness, and detail
3. Apply your transformation prompt (or use smart defaults)

### Style Blending

Upload two images:
- **First image** = subject to preserve
- **Second image** = style to apply

Default blend prompt: *"combine subject from first image with style, lighting, and colors of second image, ultra realistic, highly detailed, cinematic lighting, sharp focus"*

The engine analyses the style image using AI vision to describe its artistic qualities, then uses that description to guide the blend.

## Configuration

All configuration is in `js/engine.js`:

- `MODEL_CHAINS` — Edit model priority order
- `ENHANCEMENT_KEYWORDS` — Customise prompt enhancement terms
- `DEFAULT_NEGATIVE_PROMPT` — Modify negative prompt
- `DEFAULT_BLEND_PROMPT` — Change default blend instructions
- `ImageCache` constructor — Adjust cache size and TTL

## License

MIT 
