import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from google.cloud import aiplatform
from google.protobuf import json_format
from google.protobuf.struct_pb2 import Value

load_dotenv()
app = Flask(__name__)
CORS(app)

GOOGLE_PROJECT_ID = "gen-lang-client-0362204679"
GOOGLE_REGION = "us-central1"
PUBLISHER = "google"
MODEL_ID = "lyria-002"

API_ENDPOINT = f"{GOOGLE_REGION}-aiplatform.googleapis.com"
CLIENT_OPTIONS = {"api_endpoint": API_ENDPOINT}

client = aiplatform.gapic.PredictionServiceClient(client_options=CLIENT_OPTIONS)

endpoint_path = f"projects/{GOOGLE_PROJECT_ID}/locations/{GOOGLE_REGION}/publishers/{PUBLISHER}/models/{MODEL_ID}"


@app.route('/generate-music', methods=['POST'])
def handle_generate_music():
    """
    This is the HTTP endpoint the JavaScript frontend will call.
    It uses the Vertex AI (non-streaming) model.
    """
    try:
        data = request.json
        if not data or 'prompt' not in data:
            return jsonify({"error": "No prompt provided"}), 400
        
        prompt_text = data.get('prompt', 'minimal techno')
        bpm = data.get('bpm', 90)
        if 'config' in data and 'bpm' in data['config']:
            bpm = data['config']['bpm']
        
        duration = data.get('duration_sec', 15)
        
        full_prompt = f"{prompt_text} at {bpm} BPM"
        
        print(f"Starting Vertex AI generation for: '{full_prompt}'")
        
        instances_dict = {
            "prompt": full_prompt,
            "duration_seconds": duration,
        }
        
        instances = [json_format.ParseDict(instances_dict, Value())]
        
        response = client.predict(
            endpoint=endpoint_path, 
            instances=instances, 
            parameters=None
        )
        
        print("Generation complete. Processing response...")
        
        if not response.predictions:
            raise ValueError("API returned no predictions.")
            
        prediction_map = response.predictions[0]
        
        base64_audio = prediction_map['bytesBase64Encoded']
        
        if not base64_audio:
            raise ValueError("API response did not contain audio data.")
        

        return jsonify({
            "audioBase64": base64_audio
        })

    except Exception as e:
        print(f"Error in /generate-music endpoint: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print(f"Starting Vertex AI Flask server for project: {GOOGLE_PROJECT_ID}")
    app.run(host='0.0.0.0', port=5001)

