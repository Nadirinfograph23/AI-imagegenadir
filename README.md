# MICRO-BANANA 🍌 — AI Image Studio

> Generate stunning AI images from text or transform existing images with AI.

**Developed by حوامرية نذير — NADIR INFOGRAPH**

## Features

- **Text-to-Image** — Describe what you want and get 4 AI-generated images
- **Image-to-Image** — Upload an image + prompt to edit/transform it
- **Multi-Image Generation** — Returns 4 image variations per request
- **Smart Fallback System** — Automatically switches between AI providers
- **Generation History** — Session-based history stored in localStorage
- **Dark Mode UI** — Clean, modern interface inspired by muapi.ai

## AI Providers

| Priority | Provider | Model | Use Case |
|----------|----------|-------|----------|
| 1 | HuggingFace | Stable Diffusion XL | Text-to-Image |
| 2 | HuggingFace | InstructPix2Pix | Image-to-Image |
| 3 | Stable Horde | Stable Diffusion | Fallback (free GPUs) |

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS 4**
- **Serverless API Routes**
- **Vercel Deployment Ready**

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/Nadirinfograph23/AI-imagegenadir.git
cd AI-imagegenadir
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:
- `HF_API_KEYS` — Comma-separated HuggingFace API keys
- `STABLE_HORDE_API_KEY` — Stable Horde API key (optional)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Architecture

- **In-Memory Caching** — Identical requests return cached results instantly
- **Request Queue (FIFO)** — Prevents API overload
- **IP-Based Rate Limiting** — 10 requests per minute per user
- **Client-Side Image Compression** — Uploads compressed to < 1MB
- **Debounce Protection** — Prevents duplicate submissions
- **Multi-Key Rotation** — Random API key selection per request

## Deployment

Deploy to Vercel:
```bash
npm run build
vercel deploy
```

## License

MIT
