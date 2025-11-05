# Kairo: Turn Chaos into Sound

**Kairo** is a creative application that transforms hand-drawn visual inputs into unique musical compositions. By combining artistic expression with Google's Cloud AI technologies (Cloud Vision and Vertex AI Lyria), Kairo helps artists and enthusiasts overcome creative blocks by visualizing their ideas and immediately hearing the resulting music.

## Core Features

| Feature | Description | Key Technology |
| :--- | :--- | :--- |
| **Drawing-to-Music** | Users sketch on two separate digital "decks" (Vibe & Style) using touch or mouse input to visually define a track's key parameters. | HTML Canvas, JavaScript |
| **Cloud-Powered Analysis** | Drawings are analyzed using **Google Cloud Vision AI** for core attributes (e.g., 'Scribble', 'Darkness', 'Geometric shape'). A robust local algorithm serves as a fast, offline fallback. | Google Cloud Vision API, Python PIL, HSV Color Analysis |
| **AI Music Generation** | The analyzed visual prompts (e.g., `techno dark deep slow`) are combined with the selected genre and layer speed to generate a full 30-second WAV audio file. | **Google Cloud Vertex AI (Lyria Model)** |
| **DJ Deck UI** | An immersive, full-screen front-end experience simulating a DJ mixing board, complete with color pads, status readouts, and track playback controls. | HTML/CSS Grid, JavaScript DOM |
| **Genre Labs** | Dedicated workspaces (House, Techno, Hip Hop, Ambient, Drum & Bass) with genre-specific vocabularies and synonym mapping to ensure musically relevant output. | JavaScript (Synonym Mapping Logic) |

## Architecture

The application follows a simple client-server architecture: the Flask backend handles all computation and AI calls, while the JavaScript frontend manages the user interface and drawing logic.

### Technology Stack

* **Backend:** Python 3.10+ (Flask)
* **Google Cloud:** Vertex AI (Lyria), Cloud Vision AI
* **Frontend:** HTML5, CSS3, Vanilla JavaScript (including `script.js` for all interactivity)
* **Development:** `livereload` for a smooth development workflow

## Getting Started

### Prerequisites

1.  **Python 3.8+** installed locally.
2.  An active **Google Cloud Project** with **Billing enabled**.
3.  The **Vertex AI API** and **Cloud Vision API** must be enabled in your Google Cloud Project.
4.  **Google Cloud Authentication:** You must authenticate locally using Application Default Credentials:
    ```bash
    gcloud auth application-default login
    ```

### Setup Instructions

1.  **Clone the Repository:**
    ```bash
    git clone <YOUR_REPO_URL>
    cd kairo
    ```

2.  **Install Dependencies:**
    ```bash
    pip install Flask flask-cors google-cloud-aiplatform google-cloud-vision Pillow python-dotenv livereload
    ```

3.  **Configure Project ID:**
    Replace the placeholder project ID in the `app.py` file with your actual Google Cloud Project ID:
    ```python
    # app.py snippet
    GOOGLE_PROJECT_ID = "gen-lang-client-0362204679"  # <-- REPLACE THIS VALUE
    LOCATION = "us-central1"
    ```

### Running the Application

Kairo requires two processes to run simultaneously: the Flask backend API and the Livereload web server.

1.  **Start the Backend API:**
    Open the first terminal window. This API serves the drawing analysis and music generation endpoints on port `5001`.

    ```bash
    python app.py
    ```

2.  **Start the Development Web Server:**
    Open a second terminal window. This server serves the static web content and handles hot-reloading on port `8010`.

    ```bash
    python dev_server.py
    ```

Navigate to **`http://127.0.0.1:8010`** in your web browser to access the Kairo application.

## How to Use the Lab

1.  **Select a Genre Lab:** Choose a genre (e.g., House, Techno) from the Labs page.
2.  **Draw your Vibe:** Use the **Vibe Deck** canvas to draw large shapes, lines, or colors that represent the *mood* or *energy* (e.g., Dark, Euphoric, Calm).
3.  **Draw your Style:** Use the **Style Deck** canvas to draw patterns or scribbles that represent the *groove* or *rhythm* (e.g., Progressive, Funky, Deep).
4.  **Select Layer Speed:** Toggle the **Slow/Fast** switch to influence the rhythm and density.
5.  **Generate:** Click the **Generate** button (the star icon) to send your complete prompt to the AI model.
6.  **Play:** Once the track is generated, use the Play button to listen to your unique creation!