document.addEventListener("DOMContentLoaded", () => {
    
    const promptInput = document.getElementById("prompt-input");
    const generateButton = document.getElementById("generate-button");
    const statusMessage = document.getElementById("status-message");
    const audioContainer = document.getElementById("audio-container");

    const BACKEND_URL = 'http://192.168.1.200:5001/generate-music'; 

    async function generateAndPlay() {
        
        const promptText = promptInput.value;

        if (!promptText) {
            statusMessage.textContent = "Please enter a prompt!";
            return;
        }

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

    generateButton.addEventListener("click", generateAndPlay);
});

