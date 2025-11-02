document.addEventListener('DOMContentLoaded', () => {

    const generateButton = document.getElementById('generate-button');
    const promptInput = document.getElementById('prompt-input');
    const bpmInput = document.getElementById('bpm-input');
    const durationInput = document.getElementById('duration-input');
    const statusMessage = document.getElementById('status-message');
    const audioContainer = document.getElementById('audio-container');

    const BACKEND_URL = 'http://192.168.1.200:5001/generate-music';

    generateButton.addEventListener('click', async () => {
        

        if (generateButton.classList.contains('loading')) {
            return;
        }

        try {
            statusMessage.textContent = 'Generating... This may take a minute.';
            generateButton.textContent = 'Generating...';
            generateButton.classList.add('loading');
            audioContainer.innerHTML = '';

            const prompt = promptInput.value;
            const bpm = parseInt(bpmInput.value);
            const duration_sec = parseInt(durationInput.value);

            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    bpm: bpm,
                    duration_sec: duration_sec
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Server error');
            }

            const data = await response.json();

            statusMessage.textContent = 'Audio generated! Playing...';

            const audioUri = `data:audio/wav;base64,${data.audioBase64}`;
            
            const audio = new Audio(audioUri);
            audio.controls = true;
            audio.autoplay = true;

            audioContainer.appendChild(audio);

        } catch (error) {
            console.error('Generation failed:', error);
            statusMessage.textContent = `Error: ${error.message}`;
        } finally {

            generateButton.textContent = 'Generate & Play';
            generateButton.classList.remove('loading');
        }
    });
});
