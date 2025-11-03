document.addEventListener("DOMContentLoaded", () => {
    // --- Configuration ---
    // Prefer localhost in dev; fall back to configured LAN IP
    const BACKEND_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://127.0.0.1:5001'
        : 'http://192.168.1.200:5001';
    const GENERATE_ENDPOINT = `${BACKEND_URL}/generate-music`;
    const ANALYZE_ENDPOINT = `${BACKEND_URL}/analyze-drawing`;
    const CANVAS_SIZE = 300; // Default; functions will use actual canvas size

    // --- DOM Elements ---
    const statusMessage = document.getElementById("status-message");
    const audioContainer = document.getElementById("audio-container");
    const generateButton = document.getElementById("generate-button");
    const genreLabTitle = document.getElementById("genre-lab-title");
    
    // Preview Prompts
    const previewGenre = document.getElementById("prompt-preview-genre");
    const previewSubGenre = document.getElementById("prompt-preview-subgenre");
    const previewVibe = document.getElementById("prompt-preview-vibe");
    const previewLayer = document.getElementById("prompt-preview-layer");

    // Drawing Elements
    const styleCanvas = document.getElementById('style-canvas');
    const vibeCanvas = document.getElementById('vibe-canvas');
    const styleStatus = document.getElementById('style-status');
    const vibeStatus = document.getElementById('vibe-status');
    const analyzeStyleBtn = document.getElementById('analyze-style');
    const analyzeVibeBtn = document.getElementById('analyze-vibe');
    const resetStyleBtn = document.getElementById('reset-style');
    const resetVibeBtn = document.getElementById('reset-vibe');

    // Layer Controls
    const layerSwitch = document.getElementById('layer-switch');
    const layerSlowBtn = document.getElementById('layer-slow');
    const layerFastBtn = document.getElementById('layer-fast');
    
    // Display Elements
    const displayStyle = document.getElementById('display-style');
    const displayVibe = document.getElementById('display-vibe');
    const generateStatus = document.getElementById('generate-status');
    const trackText = document.getElementById('track-text');
    
    // --- Global State ---
    const path = window.location.pathname;
    const isHouse = path.endsWith('/pages/house.html');
    
    // The fixed genre is 'House' for this page
    const selectedGenre = "House";
    
    // Prompt variables will be filled by drawing analysis
    let selectedSubGenre = null; 
    let selectedVibe = null;
    let selectedLayer = layerSlowBtn ? layerSlowBtn.dataset.value : 'Slow'; // Default safely

    // Canvas Contexts
    const styleCtx = styleCanvas ? styleCanvas.getContext('2d') : null;
    const vibeCtx = vibeCanvas ? vibeCanvas.getContext('2d') : null;

    // Drawing State
    let isDrawing = false;
    let currentTarget = null; // 'style' or 'vibe'

    // --- Utility Functions ---

    // 1. Initialize Canvas for Drawing
    function initializeCanvas(ctx) {
        if (!ctx) return;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        // Light grey base to match deck aesthetic; circle handled by CSS border-radius
        ctx.fillStyle = '#d9d9d9';
        ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000'; // Black drawing lines
        ctx.beginPath();
    }

    // 2. Drawing Event Handlers
    function startDrawing(e, ctx) {
        if (!ctx) return;
        isDrawing = true;
        draw(e, ctx);
    }

    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        if (styleCtx) styleCtx.beginPath();
        if (vibeCtx) vibeCtx.beginPath();

        // Auto-analyze after drawing stops
        if (currentTarget === 'style' && styleCanvas && styleStatus) {
            analyzeDrawing(styleCanvas, 'style', styleStatus, previewSubGenre);
        } else if (currentTarget === 'vibe' && vibeCanvas && vibeStatus) {
            analyzeDrawing(vibeCanvas, 'vibe', vibeStatus, previewVibe);
        }
        currentTarget = null;
    }

    function draw(e, ctx) {
        if (!isDrawing || !ctx) return;
        const rect = ctx.canvas.getBoundingClientRect();
        let clientX, clientY;

        // Handle touch and mouse events
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
    
    // 3. Reset Canvas
    function resetCanvas(ctx, statusElement, previewElement, statusText) {
        if (ctx) initializeCanvas(ctx);
        if (statusElement) {
            statusElement.textContent = 'Ready';
            statusElement.classList.remove('status-analyzing', 'status-done');
            statusElement.classList.add('status-ready');
        }
        if (previewElement) {
            previewElement.textContent = previewElement.id.replace('prompt-preview-', '');
            previewElement.classList.remove('selected');
        }
        generateButton.style.display = 'none';
        selectedSubGenre = selectedVibe = null;
        displayStyle.textContent = displayVibe.textContent = '?';
        if (trackText) {
            trackText.textContent = 'Ready';
            trackText.classList.remove('playing', 'error');
        }
    }

    // 4. Get Base64 Image Data
    function getCanvasBase64(canvas) {
        // Returns the Base64 data string without the "data:image/png;base64," prefix
        return canvas.toDataURL("image/png").split(',')[1];
    }
    
    // 5. Analyze Drawing via Backend
    async function analyzeDrawing(canvas, featureType, statusElement, previewElement) {
        statusElement.textContent = 'Analyzing';
        statusElement.classList.remove('status-ready', 'status-done');
        statusElement.classList.add('status-analyzing');
        
        try {
            const base64Image = getCanvasBase64(canvas);

            const response = await fetch(ANALYZE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    imageBase64: base64Image,
                    featureType: featureType 
                }),
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => null);
                 throw new Error(errorData && errorData.error ? errorData.error : `Server error (HTTP ${response.status})`);
            }

            const data = await response.json();
            const prompt = data.promptResult;

            // Update Global State and UI
            if (featureType === 'style') {
                selectedSubGenre = prompt;
                displayStyle.textContent = prompt;
                if (previewElement) previewElement.textContent = prompt;
            } else if (featureType === 'vibe') {
                selectedVibe = prompt;
                displayVibe.textContent = prompt;
                if (previewElement) previewElement.textContent = prompt;
            }
            if (previewElement) previewElement.classList.add('selected');
            statusElement.textContent = prompt;
            statusElement.classList.remove('status-ready', 'status-analyzing');
            statusElement.classList.add('status-done');
            statusMessage.textContent = 'Ready to generate!';
            if (generateStatus) {
                generateStatus.textContent = 'Ready to generate!';
            }
            if (trackText) {
                trackText.textContent = 'Ready to generate';
                trackText.classList.remove('playing', 'error');
            }

            // Check if both prompts are selected to enable generation
            if (selectedSubGenre && selectedVibe) {
                generateButton.style.display = 'flex';
            }

        } catch (err) {
            console.error(`Analysis failed for ${featureType}:`, err);
            statusElement.textContent = `Error: ${err.message}. Try drawing again.`;
            statusMessage.textContent = 'Analysis failed.';
            generateButton.style.display = 'none';
        }
    }

    // 6. Handle Layer Selection
    function handleLayerClick(e) {
        const target = e.target.closest('.layer-btn');
        if (!target) return;

        layerSlowBtn.classList.remove('active');
        layerFastBtn.classList.remove('active');
        target.classList.add('active');

        selectedLayer = target.dataset.value;
        previewLayer.textContent = selectedLayer;
        previewLayer.classList.add('selected');
    }

    // 7. Core Generation Function (Modified)
    async function generateAndPlay() {
        if (!selectedGenre || !selectedSubGenre || !selectedVibe || !selectedLayer) {
            statusMessage.textContent = "Please complete drawing analysis and select a layer.";
            return;
        }

        // The prompt format remains the same as your original script
        const promptText = `${selectedVibe} ${selectedSubGenre} ${selectedGenre} ${selectedLayer}`;

        generateButton.disabled = true;
        generateButton.classList.add('spinning');
        statusMessage.textContent = 'Generating...';
        audioContainer.innerHTML = "";
        // Show typewriter progress
        if (generateStatus) {
            startTypewriter(generateStatus, [
                'Submitting prompt to server...',
                'Generating audio...',
                'Preparing playback...'
            ], 28);
        }
        if (trackText) {
            trackText.textContent = 'Generating...';
            trackText.classList.remove('error');
        }

        try {
            const response = await fetch(GENERATE_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: promptText }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                if (errorData && errorData.error) {
                    throw new Error(errorData.error);
                }
                throw new Error(`Server error (HTTP ${response.status})`);
            }

            const data = await response.json();

            if (!data.audioBase64) {
                throw new Error("Server response did not include audio data.");
            }

            statusMessage.textContent = "Playing generated music!";
            if (generateStatus) {
                generateStatus.textContent = 'Playing generated music!';
            }
            if (trackText) {
                const label = `${selectedVibe} ${selectedSubGenre} ${selectedGenre} ${selectedLayer}`;
                trackText.textContent = `Playing: ${label}`;
                trackText.classList.add('playing');
                trackText.classList.remove('error');
            }
            const audioSrc = `data:audio/wav;base64,${data.audioBase64}`;
            const audioPlayer = new Audio(audioSrc);
            audioPlayer.controls = true;
            audioContainer.appendChild(audioPlayer);
            audioPlayer.play();

        } catch (err) {
            console.error(err);
            statusMessage.textContent = `Error: ${err.message}`;
            if (generateStatus) {
                generateStatus.textContent = `Error: ${err.message}`;
            }
            if (trackText) {
                trackText.textContent = `Error: ${err.message}`;
                trackText.classList.add('error');
                trackText.classList.remove('playing');
            }
        } finally {
            generateButton.disabled = false;
            generateButton.classList.remove('spinning');
        }
    }

    // Simple typewriter effect for status screen
    async function typeText(el, text, speed = 30) {
        el.textContent = '';
        for (let i = 0; i < text.length; i++) {
            el.textContent += text[i];
            await new Promise(r => setTimeout(r, speed));
        }
    }

    async function startTypewriter(el, messages, speed = 30) {
        for (const msg of messages) {
            await typeText(el, msg, speed);
            await new Promise(r => setTimeout(r, 500));
        }
    }


    // --- Initialization and Event Listeners ---
    
    if (isHouse) {
        // 1. Initialize Canvases
        initializeCanvas(styleCtx);
        initializeCanvas(vibeCtx);
        if (genreLabTitle) genreLabTitle.textContent = `${selectedGenre} Lab`;
        if (previewGenre) previewGenre.textContent = selectedGenre;
        if (previewLayer) previewLayer.textContent = selectedLayer;

        // 2. Drawing Listeners (Style Canvas)
        if (styleCanvas) {
            styleCanvas.addEventListener('mousedown', (e) => { currentTarget = 'style'; startDrawing(e, styleCtx); });
            styleCanvas.addEventListener('mousemove', (e) => draw(e, styleCtx));
            styleCanvas.addEventListener('touchstart', (e) => { currentTarget = 'style'; startDrawing(e, styleCtx); });
            styleCanvas.addEventListener('touchmove', (e) => draw(e, styleCtx));
        }
        
        // 3. Drawing Listeners (Vibe Canvas)
        if (vibeCanvas) {
            vibeCanvas.addEventListener('mousedown', (e) => { currentTarget = 'vibe'; startDrawing(e, vibeCtx); });
            vibeCanvas.addEventListener('mousemove', (e) => draw(e, vibeCtx));
            vibeCanvas.addEventListener('touchstart', (e) => { currentTarget = 'vibe'; startDrawing(e, vibeCtx); });
            vibeCanvas.addEventListener('touchmove', (e) => draw(e, vibeCtx));
        }

        // Global stop drawing listeners
        document.addEventListener('mouseup', stopDrawing);
        document.addEventListener('touchend', stopDrawing);
        document.addEventListener('mouseleave', stopDrawing);

        // 4. Control Button Listeners
        if (resetStyleBtn) resetStyleBtn.addEventListener('click', () => resetCanvas(styleCtx, styleStatus, previewSubGenre, 'Ready'));
        if (resetVibeBtn) resetVibeBtn.addEventListener('click', () => resetCanvas(vibeCtx, vibeStatus, previewVibe, 'Ready'));

        if (analyzeStyleBtn) analyzeStyleBtn.addEventListener('click', () => analyzeDrawing(styleCanvas, 'style', styleStatus, previewSubGenre));
        if (analyzeVibeBtn) analyzeVibeBtn.addEventListener('click', () => analyzeDrawing(vibeCanvas, 'vibe', vibeStatus, previewVibe));

        if (layerSwitch) layerSwitch.addEventListener('click', handleLayerClick);
        if (generateButton) generateButton.addEventListener('click', generateAndPlay);

        // 5. Populate LED bars in track screen (also called globally below)
        populateLedBars();
    }
    
    // (Your existing non-drawing logic, especially the transitions, is omitted here for focus, 
    // but should be kept in your final script.js file.)
    // --- LED Bars Generator (House screen) ---
    function populateLedBars() {
        const svg = document.querySelector('.led-bars');
        if (!svg) return;
        const glowGroup = svg.querySelector('.bars-glow');
        const crispGroup = svg.querySelector('.bars-crisp');
        if (!glowGroup || !crispGroup) return;

        glowGroup.innerHTML = '';
        crispGroup.innerHTML = '';

        // Use the viewBox size for layout
        const vbWidth = 400;
        const vbHeight = 120;
        const barWidth = 2;   // thin bars
        const gap = 2;        // spacing between bars
        const count = Math.floor(vbWidth / (barWidth + gap)); // fill full width

        // Smooth randomness for a waveform feel
        let lastHeight = vbHeight * 0.45;

        for (let i = 0; i < count; i++) {
            const x = i * (barWidth + gap);
            const jitter = (Math.random() - 0.5) * 28; // +/-14 variation
            const target = Math.max(8, Math.min(vbHeight - 12, lastHeight + jitter));
            const h = target;
            const y = (vbHeight - h) / 2; // center vertically

            // Helper to make a rect element
            const makeRect = () => {
                const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                r.setAttribute('class', 'bar');
                r.setAttribute('x', x.toFixed(2));
                r.setAttribute('y', y.toFixed(2));
                r.setAttribute('width', barWidth);
                r.setAttribute('height', h.toFixed(2));
                return r;
            };

            glowGroup.appendChild(makeRect());
            crispGroup.appendChild(makeRect());

            // Ease toward target to smooth adjacent bars
            lastHeight = target * 0.85 + lastHeight * 0.15;
        }
    }
    // Call generator regardless of page detection, in case routing differs
    populateLedBars();
});
