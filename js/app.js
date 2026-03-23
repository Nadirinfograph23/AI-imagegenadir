/**
 * IMAGE EDITOR - AI Image Generator & Editor
 *
 * Development: حوامرية نذير - NADIR INFOGRAPH
 */

import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/dist/index.min.js";

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const SPACE_NAME = "mrfakename/Z-Image-Turbo";

/* ------------------------------------------------------------------ */
/*  DOM refs                                                           */
/* ------------------------------------------------------------------ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* -- Tab navigation -- */
const navLinks = $$('.nav-link');
const tabGen = $('#tab-gen');
const tabEdit = $('#tab-edit');
const heroSubtitle = $('#hero-subtitle');
const heroEmoji = $('#hero-emoji');

/* -- Image Generation refs -- */
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
const aspectOptions = $$('#aspect-dropdown .aspect-option');

const samplePrompts = $('#sample-prompts');
const sampleCards = $$('#sample-prompts .sample-card');

const historySection = $('#history-section');
const historyGrid = $('#history-grid');

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

let currentWidth = 1024;
let currentHeight = 1024;
let isGenerating = false;
let lastResultUrl = null;
let gradioClient = null;
const history = [];

/* ------------------------------------------------------------------ */
/*  Initialize Gradio client                                           */
/* ------------------------------------------------------------------ */

async function getClient() {
    if (!gradioClient) {
        gradioClient = await Client.connect(SPACE_NAME);
    }
    return gradioClient;
}

/* ------------------------------------------------------------------ */
/*  Tab Navigation                                                     */
/* ------------------------------------------------------------------ */

navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;

        navLinks.forEach((l) => l.classList.remove('active'));
        link.classList.add('active');

        if (section === 'gen') {
            tabGen.classList.add('active');
            tabEdit.classList.remove('active');
            heroSubtitle.textContent = 'Transform your ideas into stunning images with AI';
            heroEmoji.textContent = '\u{1F5BC}\uFE0F';
        } else {
            tabGen.classList.remove('active');
            tabEdit.classList.add('active');
            heroSubtitle.textContent = 'Upload an image and transform it with AI-powered editing';
            heroEmoji.textContent = '\u2728';
        }
    });
});

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
/*  Generate image via Z-Image-Turbo Gradio API                        */
/* ------------------------------------------------------------------ */

async function generateImage(prompt) {
    const client = await getClient();

    const result = await client.predict("/generate_image", {
        prompt: prompt,
        height: currentHeight,
        width: currentWidth,
        num_inference_steps: 8,
        seed: 0,
        randomize_seed: true,
    });

    // Gradio client returns { data: [imageData, seed] }
    const data = result.data;
    if (!data || data.length === 0) {
        throw new Error('No data returned from API');
    }

    let imageUrl = null;
    let seed = null;

    // First element is image data (FileData object with url)
    const imageData = data[0];
    if (imageData) {
        if (imageData.url) {
            imageUrl = imageData.url;
        } else if (typeof imageData === 'string') {
            imageUrl = imageData;
        }
    }

    // Second element is the seed number
    if (data.length > 1 && data[1] !== undefined) {
        seed = data[1];
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
        showStatus('Connecting to AI service...', 0.1);
        resultArea.classList.add('hidden');

        // Start progress animation
        let progress = 0.1;
        const progressInterval = setInterval(() => {
            progress = Math.min(progress + 0.03, 0.9);
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
        console.error('[IMAGE EDITOR] Generation failed:', err);
        showStatus(`Error: ${err.message}`, 1);
        progressFill.style.background = 'var(--error)';

        // Reset Gradio client on error (might need reconnection)
        gradioClient = null;

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
        link.download = `image-editor-${Date.now()}.png`;
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
                `<span>Time: <strong>${item.elapsed}s</strong></span>`,
                item.seed !== null ? `<span>Seed: <strong>${item.seed}</strong></span>` : '',
            ].filter(Boolean).join('');
            window.scrollTo({ top: resultArea.offsetTop - 80, behavior: 'smooth' });
        });
        historyGrid.appendChild(div);
    });
}

/* ================================================================== */
/*  IMAGE EDITING SECTION                                              */
/* ================================================================== */

const EDIT_SPACE_NAME = "prithivMLmods/Qwen-Image-Edit-2511-LoRAs-Fast";

const editFileInput = $('#edit-file-input');
const editUploadArea = $('#edit-upload-area');
const editUploadPlaceholder = $('#edit-upload-placeholder');
const editUploadPreview = $('#edit-upload-preview');
const editPreviewImg = $('#edit-preview-img');
const removeUploadBtn = $('#remove-upload-btn');
const editPromptInput = $('#edit-prompt-input');
const editBtn = $('#edit-btn');
const editBtnText = editBtn.querySelector('.btn-text');
const editBtnSparkle = editBtn.querySelector('.btn-sparkle');
const editBtnLoading = editBtn.querySelector('.btn-loading');
const editStatusBar = $('#edit-status-bar');
const editStatusText = $('#edit-status-text');
const editProgressFill = $('#edit-progress-fill');
const editResultArea = $('#edit-result-area');
const editResultImage = $('#edit-result-image');
const editResultMeta = $('#edit-result-meta');
const editDownloadBtn = $('#edit-download-btn');
const editExamples = $('#edit-examples');
const editSampleCards = $$('[data-edit-prompt]');

/* -- Style dropdown (pill-based, matching aspect ratio pattern) -- */
const styleToggle = $('#style-toggle');
const styleLabel = $('#style-label');
const styleDropdown = $('#style-dropdown');
const styleOptions = $$('#style-dropdown .aspect-option');

let currentEditStyle = 'Photo-to-Anime';
let currentEditStyleLabel = 'Photo to Anime';

styleToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    styleDropdown.classList.toggle('hidden');
});

styleDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
});

styleOptions.forEach((opt) => {
    opt.addEventListener('click', () => {
        currentEditStyle = opt.dataset.style;
        currentEditStyleLabel = opt.textContent;
        styleLabel.textContent = currentEditStyleLabel;
        styleOptions.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');
        styleDropdown.classList.add('hidden');
    });
});

// Close style dropdown on outside click
document.addEventListener('click', () => {
    styleDropdown.classList.add('hidden');
});

let editGradioClient = null;
let isEditing = false;
let lastEditResultUrl = null;
let uploadedFile = null;

/* -- Gradio client for edit space -- */
async function getEditClient() {
    if (!editGradioClient) {
        editGradioClient = await Client.connect(EDIT_SPACE_NAME);
    }
    return editGradioClient;
}

/* -- File upload handling -- */
editUploadArea.addEventListener('click', (e) => {
    if (e.target === editFileInput) return;
    if (!editUploadArea.classList.contains('has-image')) {
        editFileInput.click();
    }
});

editUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    editUploadArea.style.borderColor = 'var(--accent)';
});

editUploadArea.addEventListener('dragleave', () => {
    editUploadArea.style.borderColor = '';
});

editUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    editUploadArea.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleEditFileUpload(file);
    }
});

editFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleEditFileUpload(file);
    }
});

function handleEditFileUpload(file) {
    uploadedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        editPreviewImg.src = e.target.result;
        editUploadPlaceholder.classList.add('hidden');
        editUploadPreview.classList.remove('hidden');
        editUploadArea.classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

removeUploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    uploadedFile = null;
    editPreviewImg.src = '';
    editFileInput.value = '';
    editUploadPreview.classList.add('hidden');
    editUploadPlaceholder.classList.remove('hidden');
    editUploadArea.classList.remove('has-image');
});

/* -- Auto-resize edit textarea -- */
editPromptInput.addEventListener('input', () => {
    editPromptInput.style.height = 'auto';
    editPromptInput.style.height = Math.min(editPromptInput.scrollHeight, 200) + 'px';
});

/* -- Edit sample cards -- */
editSampleCards.forEach((card) => {
    card.addEventListener('click', () => {
        editPromptInput.value = card.dataset.editPrompt;
        // Update style dropdown to match sample
        const style = card.dataset.editStyle;
        styleOptions.forEach((opt) => {
            if (opt.dataset.style === style) {
                currentEditStyle = style;
                currentEditStyleLabel = opt.textContent;
                styleLabel.textContent = currentEditStyleLabel;
                styleOptions.forEach((o) => o.classList.remove('active'));
                opt.classList.add('active');
            }
        });
        editPromptInput.focus();
    });
});

/* -- Edit image via Gradio API -- */
async function editImage(file, prompt, style) {
    const client = await getEditClient();

    const result = await client.predict("/infer", {
        images: [{ image: file }],
        prompt: prompt,
        lora_adapter: style,
        seed: 0,
        randomize_seed: true,
        guidance_scale: 1.0,
        steps: 4,
    });

    const data = result.data;
    if (!data || data.length === 0) {
        throw new Error('No data returned from API');
    }

    let imageUrl = null;
    let seed = null;

    const imageData = data[0];
    if (imageData) {
        if (imageData.url) {
            imageUrl = imageData.url;
        } else if (typeof imageData === 'string') {
            imageUrl = imageData;
        }
    }

    if (data.length > 1 && data[1] !== undefined) {
        seed = data[1];
    }

    if (!imageUrl) {
        throw new Error('No image returned from API');
    }

    return { imageUrl, seed };
}

/* -- Edit button handler -- */
editBtn.addEventListener('click', handleEdit);

editPromptInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleEdit();
    }
});

async function handleEdit() {
    if (!uploadedFile) {
        editUploadArea.style.borderColor = 'var(--error)';
        setTimeout(() => { editUploadArea.style.borderColor = ''; }, 2000);
        return;
    }

    const prompt = editPromptInput.value.trim();
    if (!prompt) {
        editPromptInput.focus();
        return;
    }

    if (isEditing) return;

    const style = currentEditStyle;

    try {
        isEditing = true;
        setEditLoading(true);
        showEditStatus('Connecting to AI service...', 0.1);
        editResultArea.classList.add('hidden');

        let progress = 0.1;
        const progressInterval = setInterval(() => {
            progress = Math.min(progress + 0.02, 0.9);
            editProgressFill.style.width = `${Math.round(progress * 100)}%`;
        }, 600);

        showEditStatus('Processing your image...', 0.3);

        const startTime = Date.now();
        const result = await editImage(uploadedFile, prompt, style);
        clearInterval(progressInterval);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        showEditStatus('Edit complete!', 1);
        lastEditResultUrl = result.imageUrl;
        editResultImage.src = result.imageUrl;
        editResultArea.classList.remove('hidden');

        editResultMeta.innerHTML = [
            `<span>Style: <strong>${currentEditStyleLabel}</strong></span>`,
            `<span>Time: <strong>${elapsed}s</strong></span>`,
            result.seed !== null ? `<span>Seed: <strong>${result.seed}</strong></span>` : '',
        ].filter(Boolean).join('');

        editExamples.classList.add('hidden');

        setTimeout(() => {
            editStatusBar.classList.add('hidden');
        }, 2000);

    } catch (err) {
        console.error('[IMAGE EDITOR] Edit failed:', err);
        showEditStatus(`Error: ${err.message}`, 1);
        editProgressFill.style.background = 'var(--error)';

        editGradioClient = null;

        setTimeout(() => {
            editProgressFill.style.background = '';
            editStatusBar.classList.add('hidden');
        }, 5000);
    } finally {
        isEditing = false;
        setEditLoading(false);
    }
}

/* -- Edit status helpers -- */
function showEditStatus(msg, progress) {
    editStatusBar.classList.remove('hidden');
    editStatusText.textContent = msg;
    editProgressFill.style.width = `${Math.round(progress * 100)}%`;
}

function setEditLoading(loading) {
    editBtn.disabled = loading;
    if (loading) {
        editBtnText.classList.add('hidden');
        editBtnSparkle.classList.add('hidden');
        editBtnLoading.classList.remove('hidden');
    } else {
        editBtnText.classList.remove('hidden');
        editBtnSparkle.classList.remove('hidden');
        editBtnLoading.classList.add('hidden');
    }
}

/* -- Edit download -- */
editDownloadBtn.addEventListener('click', async () => {
    if (!lastEditResultUrl) return;

    try {
        const response = await fetch(lastEditResultUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `image-editor-edit-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
        window.open(lastEditResultUrl, '_blank');
    }
});
