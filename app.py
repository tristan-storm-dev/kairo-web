import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import aiplatform

app = Flask(__name__)
CORS(app)

GOOGLE_PROJECT_ID = "gen-lang-client-0362204679"
LOCATION = "us-central1"

try:
    aiplatform.init(project=GOOGLE_PROJECT_ID, location=LOCATION)
except Exception as e:
    print(f"Error initializing Vertex AI. Make sure you are authenticated with 'gcloud auth application-default login'. Error: {e}")

MODEL_ID = "publishers/google/models/lyria-002"
ENDPOINT = f"projects/{GOOGLE_PROJECT_ID}/locations/{LOCATION}/{MODEL_ID}"

def generate_audio_from_prompt(prompt_text: str):
    print(f"Starting Vertex AI generation for: '{prompt_text}'")

    client_options = {"api_endpoint": f"{LOCATION}-aiplatform.googleapis.com"}
    client = aiplatform.gapic.PredictionServiceClient(client_options=client_options)

    instances = [{"prompt": prompt_text}]
    parameters = {"output_format": "wav", "duration_seconds": 30.0}

    response = client.predict(
        endpoint=ENDPOINT,
        instances=instances,
        parameters=parameters
    )

    print("Generation complete. Processing response...")

    if not response.predictions:
        raise ValueError("API returned no predictions.")

    prediction_map = response.predictions[0]
    
    if 'bytesBase64Encoded' not in prediction_map:
        if 'error' in prediction_map:
            error_message = prediction_map['error'].get('message', 'Unknown error')
            if "recitation" in error_message.lower():
                 raise ValueError(f"Audio generation failed with the following error: {error_message}. Please modify your prompt and try again.")
            raise ValueError(f"API Error: {error_message}")
        raise ValueError("API response did not contain 'bytesBase64Encoded' field.")

    base64_audio = prediction_map['bytesBase64Encoded']
    
    return base64_audio

@app.route('/generate-music', methods=['POST'])
def handle_generate_music():
    try:
        data = request.json
        if not data or 'prompt' not in data:
            return jsonify({"error": "No prompt provided"}), 400
        
        prompt = data.get('prompt')
        base64_audio = generate_audio_from_prompt(prompt)
        
        if not base64_audio:
            return jsonify({"error": "Failed to generate audio"}), 500
            
        return jsonify({
            "audioBase64": base64_audio
        })

    except ValueError as ve:
        print(f"Known error in /generate-music: {ve}")
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print(f"Unknown error in /generate-music endpoint: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print(f"Starting Vertex AI Flask server for project: {GOOGLE_PROJECT_ID}")
    print(f"Listening on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001)
