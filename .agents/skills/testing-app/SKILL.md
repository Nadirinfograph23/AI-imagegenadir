# Testing AI-imagegenadir

## Overview
This is a static HTML/CSS/JS site (no build system, no package manager). It uses vanilla JS modules and imports Gradio client from CDN.

## Local Server Setup
```bash
cd /home/ubuntu/repos/AI-imagegenadir
python3 -m http.server 8080
```
The site will be available at http://localhost:8080

## Launching Browser
The environment has Chrome for Testing at:
```
/opt/.devin/chrome/chrome/linux-133.0.6943.126/chrome-linux64/chrome
```
Launch with:
```bash
DISPLAY=:0 /opt/.devin/chrome/chrome/linux-133.0.6943.126/chrome-linux64/chrome \
  --no-first-run --no-default-browser-check --disable-gpu \
  --user-data-dir=/tmp/chrome-test "http://localhost:8080" &>/dev/null &
```
Note: The `google-chrome` wrapper script at `~/.local/bin/google-chrome` uses a CDP proxy at port 29229 which may not always be available. Use the full Chrome binary path instead.

## Testing Mobile Responsiveness
1. Open Chrome DevTools with F12
2. Toggle device toolbar with Ctrl+Shift+M
3. Set width to 375px (iPhone) or other mobile sizes
4. Key breakpoints in CSS:
   - `max-width: 768px` - Main mobile breakpoint (nav links, hero, controls)
   - `max-width: 480px` - Small mobile (hero title, control pills wrap)

## Testing File Upload
- Navigate to the "Image Edit" tab by clicking the nav link
- Click the upload area ("Drop image here or click to upload")
- A native file picker dialog should open
- Select an image file; it should show a preview with an X remove button
- If the file picker doesn't open, check for event bubbling issues in the click handler

## Key Architecture Notes
- Two tabs: Image Generation (gen) and Image Edit (edit), toggled via nav links
- Image generation uses Gradio API (mrfakename/Z-Image-Turbo)
- Image editing uses Gradio API (prithivMLmods/Qwen-Image-Edit-2511-LoRAs-Fast)
- No build/lint tooling - changes are immediately reflected when served

## Deployment
- Deployed via Vercel (auto-deploys from GitHub)
- Preview URLs are generated for PRs automatically
- Vercel preview URLs may require Vercel authentication; test locally instead

## Devin Secrets Needed
No secrets needed for local testing. The Gradio APIs are public.
