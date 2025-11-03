import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import aiplatform
from google.cloud import vision 

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

def analyze_drawing_with_vision(image_base64: str, feature_type: str):
    """
    Sends the Base64 image to Google Cloud Vision AI for label detection 
    and maps the results to a music prompt.
    """
    if not image_base64:
        return "Unknown" 

    try:
        client = vision.ImageAnnotatorClient()
        
        image_content = base64.b64decode(image_base64)
        image = vision.Image(content=image_content)
        
        response = client.label_detection(image=image)
        
        labels = {}
        for label in response.label_annotations:
            labels[label.description] = label.score
        
        print(f"Vision AI Labels for {feature_type} drawing: {labels}")
        
        
        if feature_type == "style":
            if labels.get("Scribble", 0) > 0.7 or labels.get("Chaos", 0) > 0.6:
                return "Progressive" 
            if labels.get("Line", 0) > 0.8 and labels.get("Curve", 0) < 0.5:
                return "Afro"
            if labels.get("Wave", 0) > 0.7 and labels.get("Pattern", 0) > 0.5:
                return "Funky"
            if labels.get("Simple", 0) > 0.6 or labels.get("Minimal", 0) > 0.6:
                return "Deep"
            return "Melodic" # Default catch-all

        elif feature_type == "vibe":
            if labels.get("Darkness", 0) > 0.8 or labels.get("Shadow", 0) > 0.7:
                return "Dark"
            if labels.get("Energy", 0) > 0.7 or labels.get("Scribble", 0) > 0.7:
                return "Energetic"
            if labels.get("Water", 0) > 0.7 or labels.get("Calm", 0) > 0.6:
                return "Calm"
            if labels.get("Geometric shape", 0) > 0.6 and labels.get("Line", 0) > 0.6:
                return "Futuristic"
            if labels.get("Spiral", 0) > 0.6:
                return "Mysterious"
            return "Euphoric" # Default catch-all
        
        return "Unknown" 

    except Exception as e:
        print(f"Error calling Vision AI for {feature_type}: {e}")
        if feature_type == "style":
            return "Melodic" 
        elif feature_type == "vibe":
            return "Calm"
        return "Unknown"

@app.route('/analyze-drawing', methods=['POST'])
def handle_analyze_drawing():
    """Receives a base64 image and returns the mapped musical prompt."""
    try:
        data = request.json
        if not data or 'imageBase64' not in data or 'featureType' not in data:
            return jsonify({"error": "Missing image or feature type in request"}), 400
        
        image_base64 = data.get('imageBase64')
        feature_type = data.get('featureType').lower() # 'style' or 'vibe'

        if feature_type not in ["style", "vibe"]:
             return jsonify({"error": "Invalid featureType. Must be 'style' or 'vibe'."}), 400
        
        prompt_result = analyze_drawing_with_vision(image_base64, feature_type)
        
        if prompt_result == "Unknown":
            return jsonify({"error": f"Failed to determine prompt for {feature_type}"}), 500
            
        return jsonify({
            "featureType": feature_type,
            "promptResult": prompt_result
        })

    except Exception as e:
        print(f"Error in /analyze-drawing endpoint: {e}")
        return jsonify({"error": str(e)}), 500


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
    print(f"Listening on http://0.0.0.0:5001") # Updated host for access
    app.run(host='0.0.0.0', port=5001)
