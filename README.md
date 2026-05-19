# ValentinaBot - Multimodal Conversational Agent

## Description

ValentinaBot is a multimodal AI conversational agent built for general knowledge and entertainment. Users can interact via **text or voice**, and the agent responds accordingly. It has access to real tools (weather lookup and a math calculator) and a RAG knowledge base about **El Chapulín Colorado** (the classic Mexican TV show by Chespirito).

The project is built with **n8n** as the AI orchestrator, **FastAPI** (Python) as the backend for RAG retrieval, and a **Vanilla JS/HTML/CSS** frontend.

---

## Quick Start (No Installation Required)

The backend and n8n workflows are already deployed to the cloud. To use the app:

1. **Clone or download** this repository.
2. Open the `frontend/` folder.
3. **Double-click** `index.html` to open it in Chrome, Edge, or Firefox (or use the *Live Server* extension in VSCode).
4. **Done!** The frontend connects automatically to the cloud services.

---

## Architecture

The system has three layers:

```
[Frontend - Vanilla JS]  ->  [n8n Cloud - AI Orchestrator]  ->  [FastAPI - Railway]
        |                              |                                |
  Chat UI + Voice             GPT-4o-mini Agent                  RAG (FAISS)
  Text/Audio toggle           ElevenLabs TTS                    Chapulín Wiki
  Tool badges                 Whisper STT
```

1. **Frontend (Vanilla JS/HTML/CSS):** Lightweight chat interface. Converts images to Base64 client-side and sends them directly to n8n. Stores no state beyond the current session.

2. **n8n (Orchestrator):** Receives requests via Webhooks (`/chat` and `/voice`). Runs the AI Agent (GPT-4o-mini) with access to tools. Uses ElevenLabs for Text-to-Speech and Whisper for Speech-to-Text.

3. **FastAPI (Backend - Railway):** Exposes the `/rag` endpoint consumed by n8n as a tool. Maintains the FAISS vector database in memory for fast retrieval.

---

## Tools

The agent has access to the following tools (defined and documented in the n8n workflow):

### 1. Weather Tool (`clima` / `clima1`)
- **Name:** `clima` (chat) / `clima1` (voice)
- **Description:** Gets the current weather for any city in the world. Used when the user asks about temperature, weather conditions, or forecasts.
- **Parameters:** `ciudad` - name of the city (string, provided by the AI)
- **API:** [wttr.in](https://wttr.in) - free, no API key required
- **URL pattern:** `https://wttr.in/{ciudad}?format=3&lang=es`

### 2. Calculator Tool (`Code Tool` / `Code Tool1`)
- **Name:** `Code Tool` (chat) / `Code Tool1` (voice)
- **Description:** General-purpose math calculator. Used when the user needs to compute sums, subtractions, multiplications, divisions, percentages, or any math expression.
- **Parameters:** `expresion` - a valid JavaScript math expression (string, e.g. `"100 * 1.19"`)
- **Implementation:** JavaScript `Function` eval (sandboxed in n8n)

### 3. RAG Tool - El Chapulín Colorado (`rag` / `rag1`)
- **Name:** `rag` (chat) / `rag1` (voice)
- **Description:** Queries information about El Chapulín Colorado: characters, episodes, catchphrases, and show data. Used when the user asks about Chapulín Colorado or Chespirito.
- **Parameters:** `mensaje` - the user's question (string, extracted by the AI)
- **Endpoint:** `POST https://simulacron8n-production.up.railway.app/rag`
- **RAG Source URL:** `https://chespirito.fandom.com/es/wiki/El_Chapulín_Colorado`

---

## Dependencies & Tooling (`requirements.txt`)

This project relies on several key libraries to power the backend and AI capabilities. Here is a detailed breakdown of each tool, why it was chosen, and how it is used in the project:

### Web Framework & Server
- **`fastapi`**: A modern, fast web framework for Python.
  - *Usage*: Used in `backend/main.py` to create the REST API endpoint (`/rag`). It receives POST requests from n8n and orchestrates the backend logic.
- **`uvicorn`**: A lightning-fast ASGI server implementation.
  - *Usage*: Used to serve the FastAPI application locally and in production (Railway). It acts as the bridge between the web requests and the Python code.
- **`python-multipart`**: A streaming multipart form parser for Python.
  - *Usage*: Required by FastAPI to process form data and file uploads (even if images are sent as Base64, it's a standard FastAPI dependency for robust payload handling).

### LangChain Core & Retrieval Augmented Generation (RAG)
- **`langchain`**: The core framework for developing applications powered by language models.
  - *Usage*: Used in `backend/Reto04_rag.py` to chain together the document loader, text splitter, vector store, and the Chat model to create the complete RAG pipeline.
- **`langchain-openai`**: The official integration package for OpenAI in LangChain.
  - *Usage*: Provides the `OpenAIEmbeddings` class (used to convert text chunks into vector embeddings) and the `ChatOpenAI` class (used to instantiate the `gpt-4o-mini` model that answers the RAG queries).
- **`langchain-community`**: Community-maintained third-party integrations for LangChain.
  - *Usage*: Provides the `WebBaseLoader` class, which is essential for our ingestion phase. It scrapes the Chapulín Colorado wiki URL directly.

### Vector Database & Data Processing
- **`faiss-cpu`**: A library by Facebook AI Research for efficient similarity search and clustering of dense vectors.
  - *Usage*: Acts as our in-memory vector database. It stores the embeddings generated by OpenAI and performs the ultra-fast cosine similarity search to find the top 3 most relevant chunks when a user asks a question. We use the CPU version for easier cross-platform deployment.
- **`beautifulsoup4`**: A library for pulling data out of HTML and XML files.
  - *Usage*: Used under the hood by `WebBaseLoader` to parse the raw HTML from the wiki page, stripping away tags and extracting only the readable text for chunking.
- **`numpy`**: The fundamental package for scientific computing with Python.
  - *Usage*: A core dependency for `faiss-cpu` to handle the dense vector arrays during mathematical similarity calculations.

### APIs & Environment
- **`openai`**: The official OpenAI Python SDK.
  - *Usage*: Required by `langchain-openai` to communicate with the OpenAI API (embeddings, completions).
- **`python-dotenv`**: A library that reads key-value pairs from a `.env` file and sets them as environment variables.
  - *Usage*: Used securely load the `OPENAI_API_KEY` in local development environments so that API credentials are not hardcoded in the source files.
- **`requests`**: An elegant and simple HTTP library for Python.
  - *Usage*: Used by LangChain components to make internal HTTP requests when scraping the web or interacting with APIs.

---

## Request Flow

### Text Mode:
1. User types a message -> Frontend sends `POST /chat` to n8n.
2. n8n AI Agent decides which tool to use (weather, calculator, or RAG).
3. If RAG is needed, n8n calls `POST /rag` on the Railway backend.
4. The agent returns a response -> Frontend displays it with a tool badge.

### Voice Mode:
1. User records audio -> Frontend sends binary `.webm` to n8n `/voice`.
2. n8n uses **Whisper** to transcribe the audio.
3. Transcription passes through the AI Agent (same tools available).
4. n8n sends the text response to **ElevenLabs** for TTS synthesis.
5. The MP3 audio is returned and auto-played in the browser.

### Vision Mode:
1. User uploads an image -> Frontend converts it to **Base64**.
2. Sends the Base64 string to n8n `/chat`.
3. A conditional node (`If2`) detects the image and routes to **OpenAI Vision API**.
4. The response is returned and displayed in the chat.

---

## Running Locally (Backend Only)

**Note:** The n8n workflow runs on n8n Cloud and cannot be run locally without extra setup.

```bash
# 1. Clone the repository
git clone <repo-url>
cd simulacron8n

# 2. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create your .env file
cp .env.example .env
# Edit .env and add your API keys

# 5. Run the backend
cd backend
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`.

Test the RAG endpoint:
```bash
curl -X POST http://localhost:8000/rag \
  -H "Content-Type: application/json" \
  -d '{"mensaje": "¿Quién es el Chapulín Colorado?"}'
```

---

## Docker

```bash
# Build and run
docker-compose up --build

# The backend will be available at http://localhost:8000
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key (for embeddings, GPT-4o-mini, Whisper) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (for Text-to-Speech in voice mode) |

**Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## Project Structure

```
simulacron8n/
├── frontend/
│   ├── index.html       # Main chat interface
│   ├── styles.css       # Dark theme UI styles
│   └── app.js           # Frontend logic (fetch, recording, UI)
├── backend/
│   ├── main.py          # FastAPI app with /rag endpoint
│   └── Reto04_rag.py    # RAG pipeline (WebLoader + FAISS + LangChain)
├── n8n/
│   └── My workflow (1).json # Exported n8n workflow (import this in n8n)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

---

## Technical Decisions

- **Stateless Frontend Memory:** Since n8n Cloud uses multiple workers, session memory can be lost across requests. The `Simple Memory` node with a fixed `sessionKey` ensures conversation context is preserved.
- **FAISS In-Memory:** Instead of a managed vector DB service, FAISS runs in the Python process RAM, zero cost, zero latency on retrieval.
- **Base64 Vision:** Images are converted to Base64 client-side, eliminating the need for file upload endpoints and reducing latency.
- **wttr.in for Weather:** Free, no API key required, supports format templates and language localization.

---

*Built with n8n, FastAPI, LangChain, FAISS, ElevenLabs, and OpenAI - RIWI 2026*
