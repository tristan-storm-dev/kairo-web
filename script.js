document.addEventListener("DOMContentLoaded", () => {
    
    
    const BACKEND_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://127.0.0.1:5001'
        : 'http://192.168.1.200:5001';
    const GENERATE_ENDPOINT = `${BACKEND_URL}/generate-music`;
    const ANALYZE_ENDPOINT = `${BACKEND_URL}/analyze-drawing`;
    const CANVAS_SIZE = 300; 

    
    const statusMessage = document.getElementById("status-message");
    const audioContainer = document.getElementById("audio-container");
    const generateButton = document.getElementById("generate-button");
    const trackPPButton = document.getElementById("track-pp-button");
    const genreLabTitle = document.getElementById("genre-lab-title");
    
    
    const previewGenre = document.getElementById("prompt-preview-genre");
    const previewSubGenre = document.getElementById("prompt-preview-subgenre");
    const previewVibe = document.getElementById("prompt-preview-vibe");
    const previewLayer = document.getElementById("prompt-preview-layer");

    
    const styleCanvas = document.getElementById('style-canvas');
    const vibeCanvas = document.getElementById('vibe-canvas');
    const styleStatus = document.getElementById('style-status');
    const vibeStatus = document.getElementById('vibe-status');
    const analyzeStyleBtn = document.getElementById('analyze-style');
    const analyzeVibeBtn = document.getElementById('analyze-vibe');
    const resetStyleBtn = document.getElementById('reset-style');
    const resetVibeBtn = document.getElementById('reset-vibe');
    const helpVibeBtn = document.getElementById('help-vibe');
    const helpStyleBtn = document.getElementById('help-style');
    const helpPopVibe = document.getElementById('help-pop-vibe');
    const helpPopStyle = document.getElementById('help-pop-style');

    
    const layerSwitch = document.getElementById('layer-switch');
    const layerSlowBtn = document.getElementById('layer-slow');
    const layerFastBtn = document.getElementById('layer-fast');
    
    
    const displayStyle = document.getElementById('display-style');
    const displayVibe = document.getElementById('display-vibe');
    const generateStatus = document.getElementById('generate-status');
    const trackText = document.getElementById('track-text');
    
    
    const path = window.location.pathname;
    const isHouse = path.endsWith('/pages/house.html');
    
    
    const selectedGenre = "House";
    
    
    let selectedSubGenre = null; 
    let selectedVibe = null;
    let selectedLayer = layerSlowBtn ? layerSlowBtn.dataset.value : 'Slow'; 
    
    let lastGeneratedAudioSrc = null;
    let lastGeneratedFileName = null;

    
    const styleCtx = styleCanvas ? styleCanvas.getContext('2d') : null;
    const vibeCtx = vibeCanvas ? vibeCanvas.getContext('2d') : null;

    
    initializeCanvas(styleCtx);
    initializeCanvas(vibeCtx);

    
    let isDrawing = false;
    let currentTarget = null; 
    
    let styleDrawColor = '#ffffff';
    let vibeDrawColor = '#ffffff';

    

    
    function initializeCanvas(ctx) {
        if (!ctx) return;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#ffffff'; 
        ctx.beginPath();
    }

    
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
    
    
    let currentAudioPlayer = null;

    function resetCanvas(ctx, statusElement, previewElement, statusText) {
        if (ctx) {
            initializeCanvas(ctx);
            
            if (ctx === styleCtx) ctx.strokeStyle = styleDrawColor;
            if (ctx === vibeCtx) ctx.strokeStyle = vibeDrawColor;
        }
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
        if (generateButton) {
            generateButton.classList.remove('ready', 'spinning');
            generateButton.disabled = false;
        }
        selectedSubGenre = selectedVibe = null;
        displayStyle.textContent = displayVibe.textContent = '?';
        if (trackText) {
            trackText.textContent = 'Ready';
            trackText.classList.remove('playing', 'error');
        }
        if (currentAudioPlayer) {
            try { currentAudioPlayer.pause(); } catch(e) {}
            currentAudioPlayer = null;
        }
        if (trackPPButton) {
            trackPPButton.disabled = true;
            trackPPButton.classList.remove('playing');
            trackPPButton.classList.remove('enabled');
            trackPPButton.style.display = 'none';
            trackPPButton.setAttribute('aria-label', 'Play');
            trackPPButton.title = 'Play';
        }
    }

    
    function getCanvasBase64(canvas) {
        
        return canvas.toDataURL("image/png").split(',')[1];
    }
    
    
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

            
            if (selectedSubGenre && selectedVibe) {
                generateButton.style.display = 'flex';
                generateButton.classList.add('ready');
                generateButton.classList.remove('spinning');
                generateButton.disabled = false;
            }

        } catch (err) {
            console.error(`Analysis failed for ${featureType}:`, err);
            statusElement.textContent = `Error: ${err.message}. Try drawing again.`;
            statusMessage.textContent = 'Analysis failed.';
            generateButton.style.display = 'none';
        }
    }

    
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

    
    async function generateAndPlay() {
        if (!selectedGenre || !selectedSubGenre || !selectedVibe || !selectedLayer) {
            statusMessage.textContent = "Please complete drawing analysis and select a layer.";
            return;
        }

        
        const promptText = `${selectedVibe} ${selectedSubGenre} ${selectedGenre} ${selectedLayer}`;

        generateButton.disabled = true;
        generateButton.classList.add('spinning');
        generateButton.classList.remove('ready');
        statusMessage.textContent = 'Generating...';
        audioContainer.innerHTML = "";
        if (currentAudioPlayer) {
            try { currentAudioPlayer.pause(); } catch(e) {}
            currentAudioPlayer = null;
        }
        if (trackPPButton) {
            trackPPButton.disabled = true;
            trackPPButton.classList.remove('playing');
            trackPPButton.classList.remove('enabled');
            trackPPButton.style.display = 'none';
            trackPPButton.setAttribute('aria-label', 'Play');
            trackPPButton.title = 'Play';
        }
        
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
            const playerWrapper = document.createElement('div');
            playerWrapper.className = 'audio-player';
            const audioPlayer = new Audio(audioSrc);
            audioPlayer.controls = false; 
            playerWrapper.appendChild(audioPlayer);
            audioContainer.appendChild(playerWrapper);

            
            currentAudioPlayer = audioPlayer;
            if (trackPPButton) {
                trackPPButton.disabled = false;
                trackPPButton.style.display = 'grid';
                trackPPButton.classList.add('enabled');
            }

            
            function syncBtnPlayingState(isPlaying) {
                if (!trackPPButton) return;
                if (isPlaying) {
                    trackPPButton.classList.add('playing');
                    trackPPButton.setAttribute('aria-label', 'Pause');
                    trackPPButton.title = 'Pause';
                } else {
                    trackPPButton.classList.remove('playing');
                    trackPPButton.setAttribute('aria-label', 'Play');
                    trackPPButton.title = 'Play';
                }
            }

            audioPlayer.addEventListener('play', () => syncBtnPlayingState(true));
            audioPlayer.addEventListener('pause', () => syncBtnPlayingState(false));
            audioPlayer.addEventListener('ended', () => syncBtnPlayingState(false));

            
            audioPlayer.play();

            
            lastGeneratedAudioSrc = audioSrc;
            const label = `${selectedVibe || ''} ${selectedSubGenre || ''} ${selectedGenre || ''} ${selectedLayer || ''}`.trim();
            lastGeneratedFileName = (label || 'Kairo House Track')
                .replace(/[^a-z0-9_\- ]/gi, '')
                .replace(/\s+/g, '_') + '.wav';

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
            if (selectedSubGenre && selectedVibe) {
                generateButton.classList.add('ready');
            }
        }
    }

    
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


    
    
    if (isHouse) {
        
        if (genreLabTitle) genreLabTitle.textContent = `${selectedGenre} Lab`;
        if (previewGenre) previewGenre.textContent = selectedGenre;
        if (previewLayer) previewLayer.textContent = selectedLayer;

        
        if (styleCanvas) {
            styleCanvas.addEventListener('mousedown', (e) => { currentTarget = 'style'; startDrawing(e, styleCtx); });
            styleCanvas.addEventListener('mousemove', (e) => draw(e, styleCtx));
            styleCanvas.addEventListener('touchstart', (e) => { currentTarget = 'style'; startDrawing(e, styleCtx); });
            styleCanvas.addEventListener('touchmove', (e) => draw(e, styleCtx));
        }
        
        
        if (vibeCanvas) {
            vibeCanvas.addEventListener('mousedown', (e) => { currentTarget = 'vibe'; startDrawing(e, vibeCtx); });
            vibeCanvas.addEventListener('mousemove', (e) => draw(e, vibeCtx));
            vibeCanvas.addEventListener('touchstart', (e) => { currentTarget = 'vibe'; startDrawing(e, vibeCtx); });
            vibeCanvas.addEventListener('touchmove', (e) => draw(e, vibeCtx));
        }

        
        document.addEventListener('mouseup', stopDrawing);
        document.addEventListener('touchend', stopDrawing);
        document.addEventListener('mouseleave', stopDrawing);

        
        if (resetStyleBtn) resetStyleBtn.addEventListener('click', () => resetCanvas(styleCtx, styleStatus, previewSubGenre, 'Ready'));
        if (resetVibeBtn) resetVibeBtn.addEventListener('click', () => resetCanvas(vibeCtx, vibeStatus, previewVibe, 'Ready'));

        if (analyzeStyleBtn) analyzeStyleBtn.addEventListener('click', () => analyzeDrawing(styleCanvas, 'style', styleStatus, previewSubGenre));
        if (analyzeVibeBtn) analyzeVibeBtn.addEventListener('click', () => analyzeDrawing(vibeCanvas, 'vibe', vibeStatus, previewVibe));

        if (layerSwitch) layerSwitch.addEventListener('click', handleLayerClick);
        if (generateButton) generateButton.addEventListener('click', generateAndPlay);
        if (trackPPButton) {
            trackPPButton.addEventListener('click', () => {
                if (!currentAudioPlayer) return;
                if (currentAudioPlayer.paused) {
                    currentAudioPlayer.play();
                } else {
                    currentAudioPlayer.pause();
                }
            });
        }

        
        const stylePads = document.querySelectorAll('#style-pads .pad');
        const vibePads = document.querySelectorAll('#vibe-pads .pad');

        function setPadActive(pads, ctx, color, isStyle) {
            pads.forEach(p => p.classList.toggle('active', p.dataset.color === color));
            if (ctx) ctx.strokeStyle = color;
            if (isStyle) styleDrawColor = color; else vibeDrawColor = color;
        }

        
        if (stylePads.length) setPadActive(stylePads, styleCtx, styleDrawColor, true);
        if (vibePads.length) setPadActive(vibePads, vibeCtx, vibeDrawColor, false);

        stylePads.forEach(pad => pad.addEventListener('click', () => setPadActive(stylePads, styleCtx, pad.dataset.color, true)));
        vibePads.forEach(pad => pad.addEventListener('click', () => setPadActive(vibePads, vibeCtx, pad.dataset.color, false)));

        
        let tourActive = false;
        let tourIndex = 0;
        let tourPop = null;
        let tourCurrentTarget = null;

        const tourSteps = [
            {
                selector: '#track-view',
                title: 'Track Preview',
                text: 'This shows your generated track. Use Play/Pause when ready.',
                placement: 'bottom'
            },
            {
                selector: '#vibe-canvas',
                title: 'Vibe Deck',
                text: 'Draw to set the mood and energy. Big strokes = bold vibe.',
                placement: 'right'
            },
            {
                selector: '#vibe-pads',
                title: 'Vibe Colors',
                text: 'Pick a color to influence the vibe palette and feel.',
                placement: 'top'
            },
            {
                selector: '#style-canvas',
                title: 'Style Deck',
                text: 'Sketch patterns to define groove and movement.',
                placement: 'left'
            },
            {
                selector: '#style-pads',
                title: 'Style Colors',
                text: 'Choose colors to shift the style tone and character.',
                placement: 'top'
            },
            {
                selector: '#layer-switch',
                title: 'Layer Speed',
                text: 'Toggle FAST/SLOW layers to shape rhythm and density.',
                placement: 'top'
            },
            {
                selector: '#generate-status',
                title: 'Status',
                text: 'Watch messages here while analyzing and generating.',
                placement: 'top'
            },
            {
                selector: '#generate-button',
                title: 'Generate',
                text: 'Tap K to create a track from your vibe + style.',
                placement: 'top'
            },
            {
                selector: '#btn-download',
                title: 'Download',
                text: 'After generation, download your audio here.',
                placement: 'left'
            }
        ];

        function tourEnsurePop() {
            if (tourPop) return tourPop;
            const pop = document.createElement('div');
            pop.className = 'deck-help-pop tour-pop';
            pop.setAttribute('role', 'dialog');
            pop.setAttribute('aria-hidden', 'true');
            pop.style.display = 'none';
            pop.innerHTML = `
              <div class="help-title">
                <div class="help-title-text"></div>
                <div class="help-step"></div>
              </div>
              <div class="help-text"></div>
              <div class="tour-actions">
                <button class="tour-btn tour-prev" data-action="prev" aria-label="Previous step">Prev</button>
                <button class="tour-btn tour-next" data-action="next" aria-label="Next step">Next</button>
                <button class="tour-btn tour-close" data-action="close" aria-label="Close tour">Close</button>
              </div>
            `;
            document.body.appendChild(pop);
            pop.addEventListener('click', (e) => {
                const b = e.target.closest('button[data-action]');
                if (!b) return;
                const action = b.getAttribute('data-action');
                if (action === 'prev') tourShowStep(tourIndex - 1);
                if (action === 'next') tourShowStep(tourIndex + 1);
                if (action === 'close') tourEnd();
            });
            tourPop = pop;
            return pop;
        }

        function tourClearHighlight() {
            if (tourCurrentTarget) tourCurrentTarget.classList.remove('tour-highlight');
            tourCurrentTarget = null;
        }

        function tourPositionPopup(el, placement) {
            const pop = tourEnsurePop();
            const r = el.getBoundingClientRect();
            const margin = 10;
            const vw = window.innerWidth; const vh = window.innerHeight;
            
            pop.style.visibility = 'hidden';
            pop.style.display = 'block';
            const pr = pop.getBoundingClientRect();
            let top = 0, left = 0;
            
            let place = placement;
            if (place === 'right' && r.right + pr.width + margin > vw) place = 'left';
            if (place === 'left' && r.left - pr.width - margin < 0) place = 'right';
            if (place === 'bottom' && r.bottom + pr.height + margin > vh) place = 'top';
            if (place === 'top' && r.top - pr.height - margin < 0) place = 'bottom';
            const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
            switch (place) {
                case 'right':
                    top = clamp(r.top + (r.height - pr.height) / 2, margin, vh - pr.height - margin);
                    left = clamp(r.right + margin, margin, vw - pr.width - margin);
                    break;
                case 'left':
                    top = clamp(r.top + (r.height - pr.height) / 2, margin, vh - pr.height - margin);
                    left = clamp(r.left - pr.width - margin, margin, vw - pr.width - margin);
                    break;
                case 'bottom':
                    top = clamp(r.bottom + margin, margin, vh - pr.height - margin);
                    left = clamp(r.left + (r.width - pr.width) / 2, margin, vw - pr.width - margin);
                    break;
                case 'top':
                default:
                    top = clamp(r.top - pr.height - margin, margin, vh - pr.height - margin);
                    left = clamp(r.left + (r.width - pr.width) / 2, margin, vw - pr.width - margin);
                    break;
            }
            pop.style.top = `${top}px`;
            pop.style.left = `${left}px`;
            pop.style.visibility = '';
        }

        function tourShowStep(idx) {
            const pop = tourEnsurePop();
            const bounded = Math.max(0, Math.min(tourSteps.length - 1, idx));
            tourIndex = bounded;
            const step = tourSteps[tourIndex];
            const el = document.querySelector(step.selector);
            if (!el) {
                if (idx < tourSteps.length - 1) return tourShowStep(idx + 1);
                return tourEnd();
            }
            tourClearHighlight();
            tourCurrentTarget = el;
            el.classList.add('tour-highlight');

            const titleEl = pop.querySelector('.help-title-text');
            const stepEl = pop.querySelector('.help-step');
            if (titleEl) titleEl.textContent = step.title;
            if (stepEl) stepEl.textContent = `${tourIndex + 1}/${tourSteps.length}`;
            pop.querySelector('.help-text').textContent = step.text;
            pop.style.display = 'block';
            pop.classList.add('open');
            pop.setAttribute('aria-hidden', 'false');
            requestAnimationFrame(() => tourPositionPopup(el, step.placement || 'top'));

            const prevBtn = pop.querySelector('.tour-prev');
            const nextBtn = pop.querySelector('.tour-next');
            prevBtn.disabled = tourIndex === 0;
            const isLast = tourIndex === tourSteps.length - 1;
            nextBtn.textContent = isLast ? 'Done' : 'Next';
            nextBtn.setAttribute('data-action', isLast ? 'close' : 'next');
        }

        function tourEnd() {
            tourActive = false;
            tourClearHighlight();
            if (tourPop) {
                tourPop.style.display = 'none';
                tourPop.classList.remove('open');
                tourPop.setAttribute('aria-hidden', 'true');
            }
            window.removeEventListener('resize', tourRelayout);
            window.removeEventListener('scroll', tourRelayout, true);
        }

        function tourStart() {
            tourActive = true;
            tourIndex = 0;
            tourEnsurePop();
            tourShowStep(0);
            window.addEventListener('resize', tourRelayout);
            window.addEventListener('scroll', tourRelayout, true);
        }

        function tourRelayout() {
            if (!tourActive || !tourCurrentTarget || !tourPop) return;
            tourPositionPopup(tourCurrentTarget, tourSteps[tourIndex]?.placement || 'top');
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && tourActive) tourEnd();
            if (e.key === 'ArrowRight' && tourActive) tourShowStep(tourIndex + 1);
            if (e.key === 'ArrowLeft' && tourActive) tourShowStep(tourIndex - 1);
        });

        
        
        const btnHome = document.getElementById('btn-home');
        const btnLabs = document.getElementById('btn-labs');
        const btnDownload = document.getElementById('btn-download');
        const btnHelp = document.getElementById('btn-help');

        if (btnHome) btnHome.addEventListener('click', () => {
            window.location.href = '../pages/home.html';
        });
        if (btnLabs) btnLabs.addEventListener('click', () => {
            window.location.href = '../pages/genre.html';
        });
        if (btnDownload) btnDownload.addEventListener('click', () => {
            if (!lastGeneratedAudioSrc) {
                if (generateStatus) generateStatus.textContent = 'No track yet — tap K to generate';
                return;
            }
            const a = document.createElement('a');
            a.href = lastGeneratedAudioSrc;
            a.download = lastGeneratedFileName || 'Kairo_House_Track.wav';
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
        if (btnHelp) btnHelp.addEventListener('click', (e) => {
            e.preventDefault();
            if (tourActive) tourEnd(); else tourStart();
        });

        
        function closeAllDeckHelps() {
            if (helpPopVibe) { helpPopVibe.classList.remove('open'); helpPopVibe.setAttribute('aria-hidden', 'true'); }
            if (helpVibeBtn) helpVibeBtn.setAttribute('aria-expanded', 'false');
            if (helpPopStyle) { helpPopStyle.classList.remove('open'); helpPopStyle.setAttribute('aria-hidden', 'true'); }
            if (helpStyleBtn) helpStyleBtn.setAttribute('aria-expanded', 'false');
        }
        function toggleDeckHelp(which) {
            const isVibe = which === 'vibe';
            const pop = isVibe ? helpPopVibe : helpPopStyle;
            const btn = isVibe ? helpVibeBtn : helpStyleBtn;
            if (!pop || !btn) return;
            const isOpen = pop.classList.contains('open');
            closeAllDeckHelps();
            if (!isOpen) {
                pop.classList.add('open');
                pop.setAttribute('aria-hidden', 'false');
                btn.setAttribute('aria-expanded', 'true');
            }
        }
        if (helpVibeBtn) helpVibeBtn.addEventListener('click', () => toggleDeckHelp('vibe'));
        if (helpStyleBtn) helpStyleBtn.addEventListener('click', () => toggleDeckHelp('style'));
        document.addEventListener('click', (e) => {
            const t = e.target;
            if (
                (helpVibeBtn && helpVibeBtn.contains(t)) ||
                (helpStyleBtn && helpStyleBtn.contains(t)) ||
                (helpPopVibe && helpPopVibe.contains(t)) ||
                (helpPopStyle && helpPopStyle.contains(t))
            ) {
                return; 
            }
            closeAllDeckHelps();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllDeckHelps();
        });

        populateLedBars();
    }
    
    
    
    
    function populateLedBars() {
        const svg = document.querySelector('.led-bars');
        if (!svg) return;
        const glowGroup = svg.querySelector('.bars-glow');
        const crispGroup = svg.querySelector('.bars-crisp');
        if (!glowGroup || !crispGroup) return;

        glowGroup.innerHTML = '';
        crispGroup.innerHTML = '';

        
        const vbWidth = 400;
        const vbHeight = 120;
        const barWidth = 2;   
        const gap = 2;        
        const count = Math.floor(vbWidth / (barWidth + gap)); 

        
        let lastHeight = vbHeight * 0.45;

        for (let i = 0; i < count; i++) {
            const x = i * (barWidth + gap);
            const jitter = (Math.random() - 0.5) * 28; 
            const target = Math.max(8, Math.min(vbHeight - 12, lastHeight + jitter));
            const h = target;
            const y = (vbHeight - h) / 2; 

            
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

            
            lastHeight = target * 0.85 + lastHeight * 0.15;
        }
    }
    
    populateLedBars();
});
