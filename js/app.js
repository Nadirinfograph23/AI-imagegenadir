/**
 * MACRO BANANA - AI Image Generator
 * Powered by Z-Image-Turbo (HuggingFace Spaces)
 *
 * Development: حوامرية نذير - NADIR INFOGRAPH
 */

(function () {
    'use strict';

    /* ------------------------------------------------------------------ */
    /*  Configuration                                                      */
    /* ------------------------------------------------------------------ */

    const API_BASE = 'https://mrfakename-z-image-turbo.hf.space';
    const GENERATE_ENDPOINT = '/run/generate_image';

    /* ------------------------------------------------------------------ */
    /*  DOM refs                                                           */
    /* ------------------------------------------------------------------ */

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const promptInput = $('#prompt-input');
    const generateBtn = $('#generate-btn');
    const btnText = generateBtn.querySelector('.btn-text');
    const btnSparkle = generateBtn.querySelector('.btn-sparkle');
    const btnLoading = generateBtn.querySelector('.btn-loading');

    const statusBar = $('#status-bar');
    const statusText = $('#status-text');
    const progressFill = $('#progress-fill');

    const resultArea = $('#result-area');
    const resultImage = $('#result-image');
    const resultMeta = $('#result-meta');
    const downloadBtn = $('#download-btn');

    const aspectToggle = $('#aspect-toggle');
    const aspectLabel = $('#aspect-label');
    const aspectDropdown = $('#aspect-dropdown');
    const aspectOptions = $$('.aspect-option');

    const samplePrompts = $('#sample-prompts');
    const sampleCards = $$('.sample-card');

    const historySection = $('#history-section');
    const historyGrid = $('#history-grid');

    /* ------------------------------------------------------------------ */
    /*  State                                                              */
    /* ------------------------------------------------------------------ */

    let currentWidth = 1024;
    let currentHeight = 1024;
    let isGenerating = false;
    let lastResultUrl = null;
    const history = [];

    /* ------------------------------------------------------------------ */
    /*  Auto-resize textarea                                               */
    /* ------------------------------------------------------------------ */

    promptInput.addEventListener('input', () => {
        promptInput.style.height = 'auto';
        promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
    });

    /* ------------------------------------------------------------------ */
    /*  Aspect ratio dropdown                                              */
    /* ------------------------------------------------------------------ */

    aspectToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        aspectDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        aspectDropdown.classList.add('hidden');
    });

    aspectDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    aspectOptions.forEach((opt) => {
        opt.addEventListener('click', () => {
            const ratio = opt.dataset.ratio;
            currentWidth = parseInt(opt.dataset.w, 10);
            currentHeight = parseInt(opt.dataset.h, 10);

            aspectLabel.textContent = ratio;
            aspectOptions.forEach((o) => o.classList.remove('active'));
            opt.classList.add('active');
            aspectDropdown.classList.add('hidden');
        });
    });

    /* ------------------------------------------------------------------ */
    /*  Sample prompts                                                     */
    /* ------------------------------------------------------------------ */

    sampleCards.forEach((card) => {
        card.addEventListener('click', () => {
            promptInput.value = card.dataset.prompt;
            promptInput.style.height = 'auto';
            promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
            promptInput.focus();
        });
    });

    /* ------------------------------------------------------------------ */
    /*  Generate image via Z-Image-Turbo API                               */
    /* ------------------------------------------------------------------ */

    async function generateImage(prompt) {
        const url = API_BASE + GENERATE_ENDPOINT;

        const payload = {
            prompt: prompt,
            height: currentHeight,
            width: currentWidth,
            num_inference_steps: 8,
            seed: 0,
            randomize_seed: true,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        // The response contains output (image data) and output_1 (seed)
        let imageUrl = null;
        let seed = null;

        if (data.output) {
            // Gradio returns file data with url or path
            if (data.output.url) {
                imageUrl = data.output.url;
            } else if (data.output.path) {
                imageUrl = API_BASE + '/file=' + data.output.path;
            }
        }

        if (data.output_1 !== undefined) {
            seed = data.output_1;
        }

        if (!imageUrl) {
            throw new Error('No image returned from API');
        }

        return { imageUrl, seed };
    }

    /* ------------------------------------------------------------------ */
    /*  Generate button handler                                            */
    /* ------------------------------------------------------------------ */

    generateBtn.addEventListener('click', handleGenerate);

    // Allow Ctrl+Enter / Cmd+Enter to generate
    promptInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleGenerate();
        }
    });

    async function handleGenerate() {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            promptInput.focus();
            return;
        }

        if (isGenerating) return;

        try {
            isGenerating = true;
            setLoading(true);
            showStatus('Connecting to Z-Image-Turbo...', 0.1);
            resultArea.classList.add('hidden');

            // Start progress animation
            let progress = 0.1;
            const progressInterval = setInterval(() => {
                progress = Math.min(progress + 0.05, 0.9);
                setProgress(progress);
            }, 500);

            showStatus('Generating your image...', 0.3);

            const startTime = Date.now();
            const result = await generateImage(prompt);
            clearInterval(progressInterval);

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            // Show result
            showStatus('Image ready!', 1);
            lastResultUrl = result.imageUrl;
            resultImage.src = result.imageUrl;
            resultArea.classList.remove('hidden');

            // Update meta info
            resultMeta.innerHTML = [
                `<span>Model: <strong>Z-Image-Turbo</strong></span>`,
                `<span>Time: <strong>${elapsed}s</strong></span>`,
                `<span>Size: <strong>${currentWidth}x${currentHeight}</strong></span>`,
                result.seed !== null ? `<span>Seed: <strong>${result.seed}</strong></span>` : '',
            ].filter(Boolean).join('');

            // Add to history
            addToHistory({
                src: result.imageUrl,
                prompt: prompt,
                elapsed: elapsed,
                seed: result.seed,
            });

            // Hide sample prompts after first generation
            samplePrompts.classList.add('hidden');

            // Hide status after a moment
            setTimeout(() => {
                statusBar.classList.add('hidden');
            }, 2000);

        } catch (err) {
            console.error('[MACRO BANANA] Generation failed:', err);
            showStatus(`Error: ${err.message}`, 1);
            progressFill.style.background = 'var(--error)';

            // Reset progress bar color after a delay
            setTimeout(() => {
                progressFill.style.background = '';
                statusBar.classList.add('hidden');
            }, 5000);
        } finally {
            isGenerating = false;
            setLoading(false);
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Status & Progress helpers                                          */
    /* ------------------------------------------------------------------ */

    function showStatus(msg, progress) {
        statusBar.classList.remove('hidden');
        statusText.textContent = msg;
        setProgress(progress);
    }

    function setProgress(val) {
        progressFill.style.width = `${Math.round(val * 100)}%`;
    }

    /* ------------------------------------------------------------------ */
    /*  Loading state                                                      */
    /* ------------------------------------------------------------------ */

    function setLoading(loading) {
        generateBtn.disabled = loading;
        if (loading) {
            btnText.classList.add('hidden');
            btnSparkle.classList.add('hidden');
            btnLoading.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            btnSparkle.classList.remove('hidden');
            btnLoading.classList.add('hidden');
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Download                                                           */
    /* ------------------------------------------------------------------ */

    downloadBtn.addEventListener('click', async () => {
        if (!lastResultUrl) return;

        try {
            const response = await fetch(lastResultUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `macro-banana-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (err) {
            // Fallback: open in new tab
            window.open(lastResultUrl, '_blank');
        }
    });

    /* ------------------------------------------------------------------ */
    /*  History                                                            */
    /* ------------------------------------------------------------------ */

    function addToHistory(item) {
        history.unshift(item);
        if (history.length > 20) history.pop();
        renderHistory();
    }

    function renderHistory() {
        if (history.length === 0) {
            historySection.classList.add('hidden');
            return;
        }
        historySection.classList.remove('hidden');
        historyGrid.innerHTML = '';
        history.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.title = item.prompt || `Generation ${idx + 1}`;
            const img = document.createElement('img');
            img.src = item.src;
            img.alt = `Generation ${idx + 1}`;
            img.loading = 'lazy';
            div.appendChild(img);
            div.addEventListener('click', () => {
                lastResultUrl = item.src;
                resultImage.src = item.src;
                resultArea.classList.remove('hidden');
                resultMeta.innerHTML = [
                    `<span>Model: <strong>Z-Image-Turbo</strong></span>`,
                    `<span>Time: <strong>${item.elapsed}s</strong></span>`,
                    item.seed !== null ? `<span>Seed: <strong>${item.seed}</strong></span>` : '',
                ].filter(Boolean).join('');
                window.scrollTo({ top: resultArea.offsetTop - 80, behavior: 'smooth' });
            });
            historyGrid.appendChild(div);
        });
    }

})();
