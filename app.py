import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import aiplatform
from google.cloud import vision 
from PIL import Image
import io
import colorsys

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
        
        try:
            with Image.open(io.BytesIO(image_content)) as im:
                im = im.convert('RGB').resize((64, 64))
                w, h = im.size
                p = im.load()
                corners = [p[0, 0], p[w - 1, 0], p[0, h - 1], p[w - 1, h - 1]]
                bg_r = sum(c[0] for c in corners) // 4
                bg_g = sum(c[1] for c in corners) // 4
                bg_b = sum(c[2] for c in corners) // 4
                if bg_r < 12 and bg_g < 12 and bg_b < 12:
                    return analyze_drawing_locally(image_base64, feature_type)
        except Exception as _:
            pass

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
            return "Melodic" 

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
            return "Euphoric" 
        
        return "Unknown" 

    except Exception as e:
        print(f"Error calling Vision AI for {feature_type}: {e}")
        
        return analyze_drawing_locally(image_base64, feature_type)

def analyze_drawing_locally(image_base64: str, feature_type: str) -> str:
    """
    Local analysis that ignores uniform canvas background and uses stroke color
    and texture to infer prompts. Works offline.
    """
    try:
        if not image_base64:
            return "Unknown"
        img_bytes = base64.b64decode(image_base64)
        with Image.open(io.BytesIO(img_bytes)) as im_rgba:
            
            im_rgba = im_rgba.convert('RGBA').resize((128, 128))
            w, h = im_rgba.size
            px = im_rgba.load()

            
            corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
            bg_r = sum(c[0] for c in corners) // 4
            bg_g = sum(c[1] for c in corners) // 4
            bg_b = sum(c[2] for c in corners) // 4
            
            dist_thr = 56

            
            mask = [[False] * w for _ in range(h)]
            ink_colors = []
            for y in range(h):
                for x in range(w):
                    r, g, b, a = px[x, y]
                    
                    dist = abs(int(r) - bg_r) + abs(int(g) - bg_g) + abs(int(b) - bg_b)
                    if dist > dist_thr:
                        mask[y][x] = True
                        ink_colors.append((r, g, b))

            total = w * h
            ink_count = len(ink_colors)
            ink_ratio = ink_count / total if total else 0.0

            
            if ink_count == 0:
                return 'Melodic' if feature_type == 'style' else 'Calm'

            
            im_gray = im_rgba.convert('L')
            pg = im_gray.load()
            grad_count = 0
            trans_count = 0
            for y in range(0, h, 2):
                for x in range(1, w):
                    
                    if mask[y][x] and mask[y][x - 1]:
                        cur = pg[x, y]
                        prev = pg[x - 1, y]
                        if abs(int(cur) - int(prev)) > 32:
                            grad_count += 1
                        trans_count += 1
            gradient_density = (grad_count / trans_count) if trans_count else 0.0

            
            def rgb_to_hsv_tuple(rgb):
                r, g, b = rgb
                return colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)

            
            bins = [0] * 12
            sat_acc = [0.0] * 12
            val_acc = [0.0] * 12
            for rgb in ink_colors:
                h, s, v = rgb_to_hsv_tuple(rgb)
                idx = int(h * 12.0) % 12
                bins[idx] += 1
                sat_acc[idx] += s
                val_acc[idx] += v
            dom_idx = max(range(12), key=lambda i: bins[i])
            dom_h = (dom_idx + 0.5) / 12.0  
            count = max(1, bins[dom_idx])
            dom_s = sat_acc[dom_idx] / count
            dom_v = val_acc[dom_idx] / count

            
            def map_color_to_vibe(h, s, v):
                hue = h * 360.0
                if s < 0.15:
                    if v < 0.35:
                        return 'Dark'
                    if v < 0.7:
                        return 'Mysterious'
                    return 'Calm'
                if hue < 20 or hue >= 345:
                    return 'Energetic'   
                if hue < 55:
                    return 'Energetic'   
                if hue < 85:
                    return 'Euphoric'    
                if hue < 165:
                    return 'Funky'       
                if hue < 205:
                    return 'Futuristic'  
                if hue < 240:
                    return 'Calm'        
                if hue < 300:
                    return 'Mysterious'  
                return 'Euphoric'        

            if feature_type == 'style':
                
                if ink_ratio < 0.02:
                    return 'Melodic'
                strong_ink = ink_ratio > 0.18
                strong_grad = gradient_density > 0.18
                if strong_ink and strong_grad:
                    return 'Progressive'
                if gradient_density > 0.12 or ink_ratio > 0.10:
                    return 'Funky'
                if ink_ratio > 0.05:
                    return 'Deep'
                return 'Melodic'
            else:
                
                color_vibe = map_color_to_vibe(dom_h, dom_s, dom_v)
                if color_vibe == 'Dark' and ink_ratio < 0.06:
                    
                    color_vibe = 'Mysterious'
                
                if color_vibe in ['Energetic', 'Euphoric'] and gradient_density > 0.09:
                    return 'Energetic'
                if color_vibe == 'Calm' and gradient_density > 0.08:
                    return 'Futuristic'
                return color_vibe
    except Exception as e:
        print(f"Local analysis failed: {e}")
        if feature_type == 'style':
            return 'Melodic'
        elif feature_type == 'vibe':
            return 'Calm'
        return 'Unknown'

@app.route('/analyze-drawing', methods=['POST'])
def handle_analyze_drawing():
    """Receives a base64 image and returns the mapped musical prompt."""
    try:
        data = request.json
        if not data or 'imageBase64' not in data or 'featureType' not in data:
            return jsonify({"error": "Missing image or feature type in request"}), 400
        
        image_base64 = data.get('imageBase64')
        feature_type = data.get('featureType').lower() 

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
    print(f"Listening on http://0.0.0.0:5001") 
    app.run(host='0.0.0.0', port=5001)
