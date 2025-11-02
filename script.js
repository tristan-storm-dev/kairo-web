document.addEventListener("DOMContentLoaded", () => {
    
    const BACKEND_URL = 'http://192.168.1.200:5001/generate-music';

    const genreGrid = document.getElementById("genre-grid");
    const subGenreGrid = document.getElementById("subgenre-grid");
    const vibeGrid = document.getElementById("vibe-grid");
    
    const step1Genre = document.getElementById("step-1-genre");
    const step2SubGenre = document.getElementById("step-2-subgenre");
    const step3Vibe = document.getElementById("step-3-vibe");

    const generateButton = document.getElementById("generate-button");
    const statusMessage = document.getElementById("status-message");
    const audioContainer = document.getElementById("audio-container");

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

    const vibes = [
        "Dark",
        "Energetic",
        "Calm",
        "Sad",
        "Euphoric",
        "Futuristic",
        "Mysterious"
    ];

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

    function handleGenreClick(e) {
        const target = e.target.closest('.grid-button');
        if (!target) return;

        const value = target.dataset.value;
        selectedGenre = value;

        genreGrid.querySelectorAll('.grid-button').forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');

        previewGenre.textContent = value;
        previewGenre.classList.add('selected');
        arrow1.style.display = "inline";

        const subGenres = promptData[value];
        createButtons(subGenres, subGenreGrid, "subgenre");
        step2SubGenre.style.display = "block";

        resetStep(step3Vibe, previewVibe, arrow2);
        generateButton.style.display = "none";
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
                body: JSON.stringify({
                    prompt: promptText
                }),
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

    createButtons(Object.keys(promptData), genreGrid, "genre");


    genreGrid.addEventListener("click", handleGenreClick);
    subGenreGrid.addEventListener("click", handleSubGenreClick);
    vibeGrid.addEventListener("click", handleVibeClick);
    generateButton.addEventListener("click", generateAndPlay);
});

