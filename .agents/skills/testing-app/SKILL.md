# Testing MACRO BANANA AI Image Site

## Overview
Static HTML/CSS/JS site with two AI services:
1. **Image Generation** - Text-to-image using HuggingFace Gradio API
2. **Image Editing** - Upload + prompt-based editing using HuggingFace Gradio API with LoRA adapters

## Local Development Server
```bash
# Run from the repo root
python3 -m http.server 8080 --directory /home/ubuntu/repos/AI-imagegenadir
```
- If port 8080 is busy, use `fuser -k 8080/tcp` to kill existing processes first
- Access at http://localhost:8080

## Key UI Elements to Test

### Image Generation Section (top)
- Hero icon (banana emoji)
- Prompt input textarea
- Generate button with loading state
- Sample prompt cards that auto-fill the textarea
- Result area with download button

### Image Editing Section (below divider)
- Upload area (click or drag-and-drop) with file preview and remove button
- Edit prompt textarea
- Style/adapter dropdown (19 options like Photo-to-Anime, Upscaler, etc.)
- Edit Image button with validation (red border on upload area if no image)
- Sample edit cards that populate both prompt and style dropdown
- Result area with download button

## Testing Checklist
1. **Visual**: Verify banana emoji in hero, no model name references anywhere (subtitle, pills, footer, result metadata)
2. **Navigation**: Nav links ("Image" and "Image Edit") scroll to correct sections
3. **Upload flow**: Click upload area → file chooser opens → select image → preview shown with X button → click X → returns to placeholder
4. **Sample cards**: Click sample card → prompt textarea and style dropdown update correctly
5. **Validation**: Click "Edit Image" without uploading an image → upload area border turns red
6. **Console**: No JavaScript errors on page load (accessibility warnings like "No label associated with a form field" are acceptable)

## API Dependencies
- Image generation calls HuggingFace Gradio API (may have cold starts on ZeroGPU spaces)
- Image editing calls HuggingFace Gradio API for Qwen-Image-Edit space
- End-to-end API testing depends on HuggingFace space availability

## Deployment
- Deployed on Vercel - preview URLs are generated for PRs automatically
- Two Vercel projects may be configured: "imagegenadir" and "micro-banana"

## Notes
- This is a static site (no build step needed)
- No lint or typecheck commands configured in the repo
- Test images can be generated with PIL: `Image.new('RGB', (256, 256), color=(100, 150, 200))`
