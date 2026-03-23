/**
 * AI Image Generator - Application Controller
 *
 * Wires the UI to the ImageGenEngine.
 */

(function () {
    'use strict';

    const engine = window.ImageGenEngine;

    /* ------------------------------------------------------------------ */
    /*  DOM refs                                                           */
    /* ------------------------------------------------------------------ */

    const $  = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // Tabs
    const tabBtns   = $$('.tab-btn');
    const panels    = $$('.mode-panel');

    // txt2img
    const txt2imgPrompt  = $('#txt2img-prompt');
    const txt2imgModel   = $('#txt2img-model');
    const txt2imgWidth   = $('#txt2img-width');
    const txt2imgHeight  = $('#txt2img-height');
    const txt2imgSteps   = $('#txt2img-steps');
    const txt2imgSeed    = $('#txt2img-seed');
    const txt2imgEnhance = $('#txt2img-enhance');

    // img2img
    const img2imgUpload    = $('#img2img-upload');
    const img2imgFile      = $('#img2img-file');
    const img2imgPreview   = $('#img2img-preview');
    const img2imgPlaceholder = $('#img2img-placeholder');
    const img2imgPrompt    = $('#img2img-prompt');
    const img2imgModel     = $('#img2img-model');
    const img2imgStrength  = $('#img2img-strength');
    const img2imgStrengthVal = $('#img2img-strength-val');
    const img2imgEnhance   = $('#img2img-enhance');

    // blend
    const blendSubjectUpload = $('#blend-subject-upload');
    const blendSubjectFile   = $('#blend-subject-file');
    const blendSubjectPreview = $('#blend-subject-preview');
    const blendSubjectPlaceholder = $('#blend-subject-placeholder');
    const blendStyleUpload   = $('#blend-style-upload');
    const blendStyleFile     = $('#blend-style-file');
    const blendStylePreview  = $('#blend-style-preview');
    const blendStylePlaceholder = $('#blend-style-placeholder');
    const blendPrompt        = $('#blend-prompt');
    const blendModel         = $('#blend-model');
    const blendStrength      = $('#blend-strength');
    const blendStrengthVal   = $('#blend-strength-val');

    // controls
    const generateBtn = $('#generate-btn');
    const btnText     = generateBtn.querySelector('.btn-text');
    const btnLoading  = generateBtn.querySelector('.btn-loading');

    // status
    const statusBar   = $('#status-bar');
    const statusText  = $('#status-text');
    const progressFill = $('#progress-fill');

    // result
    const resultArea  = $('#result-area');
    const resultImage = $('#result-image');
    const resultMeta  = $('#result-meta');
    const downloadBtn = $('#download-btn');
    const reuseBtn    = $('#reuse-btn');

    // history
    const historySection = $('#history-section');
    const historyGrid    = $('#history-grid');

    /* ------------------------------------------------------------------ */
    /*  State                                                              */
    /* ------------------------------------------------------------------ */

    let currentMode = 'txt2img';
    let img2imgData = null;  // { base64, mime }
    let blendSubjectData = null;
    let blendStyleData = null;
    let lastResultSrc = null;
    const history = [];

    /* ------------------------------------------------------------------ */
    /*  Tab switching                                                      */
    /* ------------------------------------------------------------------ */

    tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            currentMode = mode;

            tabBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');

            panels.forEach((p) => p.classList.remove('active'));
            $(`#${mode}-panel`).classList.add('active');
        });
    });

    /* ------------------------------------------------------------------ */
    /*  File upload helpers                                                 */
    /* ------------------------------------------------------------------ */

    function setupUpload(uploadEl, fileInput, previewImg, placeholderEl, onLoad) {
        uploadEl.addEventListener('click', () => fileInput.click());

        uploadEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadEl.classList.add('drag-over');
        });

        uploadEl.addEventListener('dragleave', () => {
            uploadEl.classList.remove('drag-over');
        });

        uploadEl.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadEl.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleFile(file, previewImg, placeholderEl, onLoad);
            }
        });

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) handleFile(file, previewImg, placeholderEl, onLoad);
        });
    }

    async function handleFile(file, previewImg, placeholderEl, onLoad) {
        const base64 = await window.fileToBase64(file);
        const mime = file.type || 'image/png';

        // Show preview
        previewImg.src = `data:${mime};base64,${base64}`;
        previewImg.classList.remove('hidden');
        placeholderEl.classList.add('hidden');

        if (onLoad) onLoad({ base64, mime });
    }

    // Wire up uploads
    setupUpload(img2imgUpload, img2imgFile, img2imgPreview, img2imgPlaceholder, (data) => {
        img2imgData = data;
    });

    setupUpload(blendSubjectUpload, blendSubjectFile, blendSubjectPreview, blendSubjectPlaceholder, (data) => {
        blendSubjectData = data;
    });

    setupUpload(blendStyleUpload, blendStyleFile, blendStylePreview, blendStylePlaceholder, (data) => {
        blendStyleData = data;
    });

    /* ------------------------------------------------------------------ */
    /*  Range slider live values                                           */
    /* ------------------------------------------------------------------ */

    img2imgStrength.addEventListener('input', () => {
        img2imgStrengthVal.textContent = img2imgStrength.value;
    });

    blendStrength.addEventListener('input', () => {
        blendStrengthVal.textContent = blendStrength.value;
    });

    /* ------------------------------------------------------------------ */
    /*  Status callback                                                    */
    /* ------------------------------------------------------------------ */

    engine.onStatus((msg, progress) => {
        statusBar.classList.remove('hidden');
        statusText.textContent = msg;
        progressFill.style.width = `${Math.round(progress * 100)}%`;
    });

    /* ------------------------------------------------------------------ */
    /*  Generate                                                           */
    /* ------------------------------------------------------------------ */

    generateBtn.addEventListener('click', async () => {
        try {
            setLoading(true);
            resultArea.classList.add('hidden');
            statusBar.classList.remove('hidden');
            progressFill.style.width = '0%';

            let result;

            if (currentMode === 'txt2img') {
                const prompt = txt2imgPrompt.value.trim();
                if (!prompt) {
                    alert('Please enter a prompt.');
                    setLoading(false);
                    return;
                }
                result = await engine.txt2img({
                    prompt,
                    model: txt2imgModel.value,
                    enhance: txt2imgEnhance.checked,
                    width: parseInt(txt2imgWidth.value, 10) || 1024,
                    height: parseInt(txt2imgHeight.value, 10) || 1024,
                    steps: parseInt(txt2imgSteps.value, 10) || 20,
                    seed: txt2imgSeed.value ? parseInt(txt2imgSeed.value, 10) : undefined,
                });
            } else if (currentMode === 'img2img') {
                if (!img2imgData) {
                    alert('Please upload an image first.');
                    setLoading(false);
                    return;
                }
                result = await engine.img2img({
                    imageBase64: img2imgData.base64,
                    imageMime: img2imgData.mime,
                    prompt: img2imgPrompt.value.trim(),
                    model: img2imgModel.value,
                    enhance: img2imgEnhance.checked,
                    promptStrength: parseFloat(img2imgStrength.value) || 0.65,
                });
            } else if (currentMode === 'blend') {
                if (!blendSubjectData || !blendStyleData) {
                    alert('Please upload both a subject image and a style image.');
                    setLoading(false);
                    return;
                }
                result = await engine.blend({
                    subjectBase64: blendSubjectData.base64,
                    subjectMime: blendSubjectData.mime,
                    styleBase64: blendStyleData.base64,
                    styleMime: blendStyleData.mime,
                    prompt: blendPrompt.value.trim(),
                    model: blendModel.value,
                    blendStrength: parseFloat(blendStrength.value) || 0.70,
                });
            }

            showResult(result);
        } catch (err) {
            console.error('[app] Generation failed:', err);
            statusText.textContent = `Error: ${err.message}`;
            progressFill.style.width = '100%';
            progressFill.style.background = 'var(--error)';
        } finally {
            setLoading(false);
        }
    });

    /* ------------------------------------------------------------------ */
    /*  Show result                                                        */
    /* ------------------------------------------------------------------ */

    function showResult(result) {
        if (!result || !result.src) return;

        lastResultSrc = result.src;
        resultImage.src = result.src;
        resultArea.classList.remove('hidden');

        const seconds = (result.elapsed / 1000).toFixed(1);
        resultMeta.innerHTML = [
            `<span>Model: <strong>${result.model}</strong></span>`,
            `<span>Time: <strong>${seconds}s</strong></span>`,
            `<span>Mode: <strong>${currentMode}</strong></span>`,
        ].join('');

        // Add to history
        addToHistory(result);

        // Reset progress bar color
        progressFill.style.background = '';
    }

    /* ------------------------------------------------------------------ */
    /*  History                                                            */
    /* ------------------------------------------------------------------ */

    function addToHistory(result) {
        history.unshift(result);
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
            div.title = `${item.model} — click to view`;
            const img = document.createElement('img');
            img.src = item.src;
            img.alt = `Generation ${idx + 1}`;
            img.loading = 'lazy';
            div.appendChild(img);
            div.addEventListener('click', () => showResult(item));
            historyGrid.appendChild(div);
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Download                                                           */
    /* ------------------------------------------------------------------ */

    downloadBtn.addEventListener('click', () => {
        if (!lastResultSrc) return;
        const link = document.createElement('a');
        link.href = lastResultSrc;
        // Determine extension from data URL
        let ext = 'webp';
        if (lastResultSrc.includes('image/jpeg')) ext = 'jpg';
        if (lastResultSrc.includes('image/png')) ext = 'png';
        link.download = `ai-generated-${Date.now()}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    /* ------------------------------------------------------------------ */
    /*  Reuse (send result to img2img)                                     */
    /* ------------------------------------------------------------------ */

    reuseBtn.addEventListener('click', () => {
        if (!lastResultSrc) return;

        // Switch to img2img mode
        tabBtns.forEach((b) => b.classList.remove('active'));
        document.querySelector('[data-mode="img2img"]').classList.add('active');
        panels.forEach((p) => p.classList.remove('active'));
        $('#img2img-panel').classList.add('active');
        currentMode = 'img2img';

        // Set the image
        img2imgPreview.src = lastResultSrc;
        img2imgPreview.classList.remove('hidden');
        img2imgPlaceholder.classList.add('hidden');

        // Extract base64
        const parts = lastResultSrc.split(',');
        const mimeMatch = lastResultSrc.match(/data:(image\/[^;]+);/);
        img2imgData = {
            base64: parts[1],
            mime: mimeMatch ? mimeMatch[1] : 'image/webp',
        };

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ------------------------------------------------------------------ */
    /*  Loading state                                                      */
    /* ------------------------------------------------------------------ */

    function setLoading(loading) {
        generateBtn.disabled = loading;
        if (loading) {
            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
        }
    }
})();
