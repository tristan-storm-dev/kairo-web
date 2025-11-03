document.addEventListener("DOMContentLoaded", () => {
    const BACKEND_URL = 'http://192.168.1.200:5001/generate-music';

    const labGenreGrid = document.getElementById("lab-genre-grid");
    const subGenreGrid = document.getElementById("subgenre-grid");
    const vibeGrid = document.getElementById("vibe-grid");
    const step2SubGenre = document.getElementById("step-2-subgenre");
    const step3Vibe = document.getElementById("step-3-vibe");
    const generateButton = document.getElementById("generate-button");
    const statusMessage = document.getElementById("status-message");
    const audioContainer = document.getElementById("audio-container");
    const genreLabTitle = document.getElementById("genre-lab-title");
    const previewGenre = document.getElementById("prompt-preview-genre");
    const previewSubGenre = document.getElementById("prompt-preview-subgenre");
    const previewVibe = document.getElementById("prompt-preview-vibe");
    const arrow1 = document.getElementById("arrow-1");
    const arrow2 = document.getElementById("arrow-2");

    const promptData = {
        "Techno": ["Minimal", "Hard", "Melodic", "Dark", "Ambient"],
        "House": ["Afro", "Deep", "Progressive", "Funky", "Melodic"],
        "Hip Hop": ["Lo-Fi", "Boom Bap", "Trap", "Chillhop", "Old School"],
        "Drum & Bass": ["Energetic", "Dark", "Liquid", "Minimal"],
        "Ambient": ["Calm", "Dark", "Generative", "Melodic"]
    };

    const vibes = ["Dark", "Energetic", "Calm", "Sad", "Euphoric", "Futuristic", "Mysterious"];

    let selectedGenre = null;
    let selectedSubGenre = null;
    let selectedVibe = null;

    function createButtons(items, gridElement, type) {
        gridElement.innerHTML = "";
        for (const item of items) {
            const button = document.createElement("button");
            button.className = "grid-button";
            button.textContent = item;
            button.dataset.value = item;
            button.dataset.type = type;
            gridElement.appendChild(button);
        }
    }

    function resetStep(stepElement, previewElement, arrowElement) {
        stepElement.style.display = "none";
        previewElement.textContent = previewElement.id.replace('prompt-preview-', '');
        previewElement.classList.remove('selected');
        if (arrowElement) arrowElement.style.display = "none";
    }

    function enterLabSelect() {
        if (!labGenreGrid) return;
        createButtons(Object.keys(promptData), labGenreGrid, "genre");
        labGenreGrid.addEventListener("click", handleLabGenreClick);
    }

    function enterGenreLab(genre) {
        if (!previewGenre || !subGenreGrid) return;
        selectedGenre = genre;
        previewGenre.textContent = genre;
        previewGenre.classList.add('selected');
        if (arrow1) arrow1.style.display = "inline";
        if (genreLabTitle) genreLabTitle.textContent = `${genre} Lab`;

        const subGenres = promptData[genre] || [];
        createButtons(subGenres, subGenreGrid, "subgenre");
        step2SubGenre.style.display = "block";
        resetStep(step3Vibe, previewVibe, arrow2);
        if (generateButton) generateButton.style.display = "none";
    }

    function handleLabGenreClick(e) {
        const target = e.target.closest('.grid-button');
        if (!target) return;
        const value = target.dataset.value;
        const filenameMap = {
            'Techno': 'techno.html',
            'House': 'house.html',
            'Hip Hop': 'hiphop.html',
            'Drum & Bass': 'drum-and-bass.html',
            'Ambient': 'ambient.html'
        };
        const targetFile = filenameMap[value] || `genre.html?genre=${encodeURIComponent(value)}`;
        window.location.href = targetFile;
    }

    function handleSubGenreClick(e) {
        const target = e.target.closest('.grid-button');
        if (!target) return;

        const value = target.dataset.value;
        selectedSubGenre = value;

        subGenreGrid.querySelectorAll('.grid-button').forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');

        previewSubGenre.textContent = value;
        previewSubGenre.classList.add('selected');
        arrow2.style.display = "inline";

        createButtons(vibes, vibeGrid, "vibe");
        step3Vibe.style.display = "block";
    }

    function handleVibeClick(e) {
        const target = e.target.closest('.grid-button');
        if (!target) return;

        const value = target.dataset.value;
        selectedVibe = value;

        vibeGrid.querySelectorAll('.grid-button').forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');

        previewVibe.textContent = value;
        previewVibe.classList.add('selected');

        generateButton.style.display = "flex";
    }

    async function generateAndPlay() {
        if (!selectedGenre || !selectedSubGenre || !selectedVibe) {
            statusMessage.textContent = "Please complete all 3 steps.";
            return;
        }

        const promptText = `${selectedVibe} ${selectedSubGenre} ${selectedGenre}`;

        generateButton.disabled = true;
        statusMessage.innerHTML = '<span class="loader"></span>Generating... This may take 20-30 seconds.';
        audioContainer.innerHTML = "";

        try {
            const response = await fetch(BACKEND_URL, {
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
            const audioSrc = `data:audio/wav;base64,${data.audioBase64}`;
            const audioPlayer = new Audio(audioSrc);
            audioPlayer.controls = true;
            audioContainer.appendChild(audioPlayer);
            audioPlayer.play();

        } catch (err) {
            console.error(err);
            statusMessage.textContent = `Error: ${err.message}`;
        } finally {
            generateButton.disabled = false;
        }
    }

    
    const path = window.location.pathname;
    const isGenreLab = path.endsWith('/pages/genre.html');
    const isHome = path.endsWith('/pages/home.html');
    const isTechno = path.endsWith('/pages/techno.html');
    const isHouse = path.endsWith('/pages/house.html');
    const isHipHop = path.endsWith('/pages/hiphop.html');
    const isDnB = path.endsWith('/pages/drum-and-bass.html');
    const isAmbient = path.endsWith('/pages/ambient.html');


    if (isGenreLab) {
        const params = new URLSearchParams(window.location.search);
        const genre = params.get('genre');
        if (genre) {
            enterGenreLab(genre);
        }
        if (subGenreGrid) subGenreGrid.addEventListener("click", handleSubGenreClick);
        if (vibeGrid) vibeGrid.addEventListener("click", handleVibeClick);
        if (generateButton) generateButton.addEventListener("click", generateAndPlay);
    }

    if (isTechno) {
        enterGenreLab('Techno');
    }
    if (isHouse) {
        enterGenreLab('House');
    }
    if (isHipHop) {
        enterGenreLab('Hip Hop');
    }
    if (isDnB) {
        enterGenreLab('Drum & Bass');
    }
    if (isAmbient) {
        enterGenreLab('Ambient');
    }

    if (isTechno || isHouse || isHipHop || isDnB || isAmbient) {
        if (subGenreGrid) subGenreGrid.addEventListener("click", handleSubGenreClick);
        if (vibeGrid) vibeGrid.addEventListener("click", handleVibeClick);
        if (generateButton) generateButton.addEventListener("click", generateAndPlay);
    }

    if (isHome) {
        const panelVideo = document.querySelector('.panel-video') || document.querySelector('.bg-video');
        if (panelVideo) {
            const tryPlay = () => {
                panelVideo.play().catch(() => {});
            };
            panelVideo.muted = true;
            panelVideo.volume = 0;
            panelVideo.autoplay = true;
            panelVideo.loop = true;
            panelVideo.setAttribute('playsinline', '');
            if (panelVideo.readyState >= 2) {
                tryPlay();
            } else {
                panelVideo.addEventListener('loadeddata', tryPlay, { once: true });
            }
        }

        
        if (window.feather && typeof window.feather.replace === 'function') {
            window.feather.replace();
        }

        
        const heroCenter = document.querySelector('.hero-center');
        const exploreLink = document.querySelector('[data-open="labs"]');
        const howLink = document.querySelector('[data-open="how"]');
        const labsOverlay = document.getElementById('overlay-labs');
        const howOverlay = document.getElementById('overlay-how');

        
        const homeEntry = sessionStorage.getItem('homeEntry');
        if (heroCenter && homeEntry) {
            document.documentElement.classList.add('transitioning');
            document.body.classList.add('transitioning');
            heroCenter.classList.add(homeEntry === 'bottom' ? 'slide-in-bottom' : 'slide-in-top');
            heroCenter.addEventListener('animationend', () => {
                document.documentElement.classList.remove('transitioning');
                document.body.classList.remove('transitioning');
            }, { once: true });
            sessionStorage.removeItem('homeEntry');
        }

        const showOverlay = (overlayEl, dir) => {
            if (!overlayEl) return;
            document.documentElement.classList.add('transitioning');
            document.body.classList.add('transitioning');
            overlayEl.classList.add('visible');
            overlayEl.classList.remove('slide-in-top','slide-in-bottom','slide-out-top','slide-out-bottom');
            overlayEl.classList.add(dir === 'bottom' ? 'slide-in-bottom' : 'slide-in-top');

            
            if (heroCenter) {
                heroCenter.classList.remove('slide-in-top','slide-in-bottom');
                heroCenter.classList.add(dir === 'bottom' ? 'slide-out-top' : 'slide-out-bottom');
            }

            
            if (overlayEl === labsOverlay) {
                const doors = overlayEl.querySelectorAll('.door');
                doors.forEach((door, idx) => {
                    door.classList.remove('door-wave-out');
                    door.style.setProperty('--wave-delay', `${80 * idx}ms`);
                    door.classList.add('door-wave-in');
                });
            }

            overlayEl.addEventListener('animationend', () => {
                document.documentElement.classList.remove('transitioning');
                document.body.classList.remove('transitioning');
            }, { once: true });
        };

        const hideOverlay = (overlayEl, dir) => new Promise((resolve) => {
            if (!overlayEl) { resolve(); return; }
            document.documentElement.classList.add('transitioning');
            document.body.classList.add('transitioning');
            overlayEl.classList.remove('slide-in-top','slide-in-bottom');
            overlayEl.classList.add(dir === 'bottom' ? 'slide-out-bottom' : 'slide-out-top');
            overlayEl.addEventListener('animationend', () => {
                overlayEl.classList.remove('visible','slide-out-top','slide-out-bottom');
                document.documentElement.classList.remove('transitioning');
                document.body.classList.remove('transitioning');
                
                if (heroCenter) {
                    heroCenter.classList.remove('slide-out-top','slide-out-bottom');
                    heroCenter.classList.add(dir === 'bottom' ? 'slide-in-bottom' : 'slide-in-top');
                }
                resolve();
            }, { once: true });

            
            if (overlayEl === labsOverlay) {
                const doors = Array.from(overlayEl.querySelectorAll('.door'));
                doors.forEach((door, idx) => {
                    const delay = 80 * (doors.length - 1 - idx);
                    door.classList.remove('door-wave-in');
                    door.style.setProperty('--wave-delay', `${delay}ms`);
                    door.classList.add('door-wave-out');
                });
            }
        });

        if (exploreLink) {
            exploreLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (labsOverlay) showOverlay(labsOverlay, 'bottom');
            });
        }

        if (howLink) {
            howLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (howOverlay) showOverlay(howOverlay, 'top');
            });
        }

        
        document.querySelectorAll('.overlay-close').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const which = btn.dataset.close;
                if (which === 'labs' && labsOverlay) {
                    await hideOverlay(labsOverlay, 'bottom');
                } else if (which === 'how' && howOverlay) {
                    await hideOverlay(howOverlay, 'top');
                }
            });
        });

        
        if (labsOverlay) {
            labsOverlay.addEventListener('click', async (e) => {
                const doorLink = e.target.closest('.door');
                if (!doorLink || !doorLink.href) return;
                e.preventDefault();
                const href = doorLink.getAttribute('href');
                sessionStorage.setItem('nextEntry', 'bottom');
                await hideOverlay(labsOverlay, 'bottom');
                window.location.href = href;
            });
        }
    }

    
    if (isTechno || isHouse || isHipHop || isDnB || isAmbient || isGenreLab) {
        const containerEl = document.querySelector('.screen');
        const entry = sessionStorage.getItem('nextEntry');
        if (containerEl) {
            document.documentElement.classList.add('transitioning');
            document.body.classList.add('transitioning');
            const dirClass = (entry ? (entry === 'bottom' ? 'slide-in-bottom' : 'slide-in-top') : 'slide-in-bottom');
            containerEl.classList.add(dirClass);
            containerEl.addEventListener('animationend', () => {
                document.documentElement.classList.remove('transitioning');
                document.body.classList.remove('transitioning');
            }, { once: true });
            sessionStorage.removeItem('nextEntry');
        }

        const backLink = document.querySelector('a[href="home.html"].ghost-btn');
        if (backLink && containerEl) {
            backLink.addEventListener('click', (e) => {
                e.preventDefault();
                const currentDir = entry || 'bottom';
                const opposite = currentDir === 'bottom' ? 'top' : 'bottom';
                sessionStorage.setItem('homeEntry', opposite);
                document.documentElement.classList.add('transitioning');
                document.body.classList.add('transitioning');
                containerEl.classList.remove('slide-in-top','slide-in-bottom');
                containerEl.classList.add(opposite === 'bottom' ? 'slide-out-bottom' : 'slide-out-top');
                containerEl.addEventListener('animationend', () => {
                    window.location.href = backLink.getAttribute('href');
                }, { once: true });
            });
        }
    }
});

