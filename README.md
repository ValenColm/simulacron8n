# FinBot — Asistente Financiero Multimodal con n8n y FastAPI

## Descripción
FinBot es un asistente financiero automatizado con capacidades avanzadas de Inteligencia Artificial. Está diseñado para interactuar con los usuarios mediante chat de texto, voz y análisis de imágenes, proporcionando información financiera en tiempo real, cálculos, y respondiendo preguntas sobre créditos usando una base de conocimientos documental (RAG) optimizada con caché semántico.

---

## 🚀 Guía Rápida para Usuarios (¡Pruébalo ahora!)

**¡No necesitas instalar servidores ni bases de datos!** 
Toda la "magia" pesada de Inteligencia Artificial, n8n y el Backend de Python **ya están levantados y corriendo en la nube 24/7**. Para usar el asistente, solo necesitas tu navegador web:

1. **Descarga o Clona** este repositorio en tu computadora.
2. **Abre la carpeta** `frontend/`.
3. **Doble clic** en el archivo `index.html` para abrirlo en Chrome, Edge o Firefox (o ábrelo usando la extensión *Live Server* de VSCode).
4. **¡Listo!** Escribe un mensaje, graba un audio con tu micrófono o sube una imagen financiera. El frontend se comunicará automáticamente con los servidores en la nube.

---

## Arquitectura y Decisiones Técnicas
El sistema está compuesto por tres capas principales:

1. **Capa Frontend (Vanilla JS/HTML/CSS)**: Interfaz de usuario ligera.
   - **Decisión Técnica:** Convierte directamente las imágenes subidas por el usuario a formato `Base64` en el lado del cliente y las envía a n8n en el payload JSON. Esto elimina la necesidad de pasar archivos binarios por un backend intermedio, optimizando la latencia.
2. **Capa de Orquestación (n8n)**: Actúa como el enrutador inteligente y ejecutor de IA.
   - **Decisión Técnica (Visión Integrada):** El procesamiento de imágenes (Visión Artificial) se realiza directamente desde n8n realizando una petición HTTP a OpenAI. Se evita delegarlo a Python para mantener el flujo conversacional unificado en el orquestador.
3. **Capa de Backend (FastAPI)**: Un servicio dedicado en Python enfocado exclusivamente en tareas computacionales pesadas.
   - **Decisión Técnica (FAISS Local):** En lugar de usar servicios externos (como Supabase), la base de datos vectorial vive en la memoria de Python (FAISS). Por lo tanto, n8n debe realizar peticiones HTTP (hacia Railway) para buscar en el contexto financiero.
   - **Decisión Técnica (Caché Semántico):** Se mantuvo el caché en Python. El caché semántico requiere convertir textos a embeddings y calcular la similitud del coseno usando `numpy`. Esta tarea matemática es ineficiente en n8n (JavaScript), por lo que delegarla a FastAPI garantiza un alto rendimiento.

---

## 🛠 Herramientas Utilizadas y su Rol en el Proyecto

A continuación se detalla exactamente cómo y para qué se empleó cada tecnología dentro del ecosistema de FinBot:

### 1. n8n (Orquestador Visual)
- **Rol:** Es el cerebro director. Hospedado en n8n Cloud.
- **Uso:** Recibe las peticiones del frontend a través de Webhooks (`/chat` y `/voice`). Contiene los Nodos de Inteligencia Artificial ("AI Agent") que deciden qué herramienta usar. También contiene lógica condicional (Nodos `If`) para desviar el flujo cuando detecta una imagen (Visión) o cuando detecta que el usuario envió un audio.

### 2. FastAPI (Microservicios en Python)
- **Rol:** Motor computacional de alta velocidad. Hospedado en Railway.
- **Uso:** Crea dos endpoints (`POST /rag` y `POST /cache`) que n8n consume como "Tools". Mantiene las bases de datos vectoriales cargadas en la memoria del servidor para dar respuestas en milisegundos.

### 3. FAISS & LangChain
- **Rol:** Recuperación de Información (RAG).
- **Uso en Python:** LangChain extrae la información oficial de Bancolombia usando `WebBaseLoader`, la divide en fragmentos (chunks) y genera *Embeddings*. FAISS guarda estos embeddings en la memoria local de la aplicación Python, permitiendo hacer búsquedas de similitud ultrarrápidas cuando n8n le hace una pregunta técnica.

### 4. Caché Semántico Custom (Numpy)
- **Rol:** Ahorrar costos y tiempo de procesamiento.
- **Uso en Python:** Antes de activar el RAG, Python guarda las respuestas previas en una lista. Cuando entra una nueva pregunta, la convierte en vector y usa la librería `numpy` para calcular la "similitud del coseno". Si la pregunta es >85% similar a una anterior, devuelve la respuesta guardada instantáneamente.

### 5. ElevenLabs
- **Rol:** Síntesis de voz dinámica (Text-to-Speech).
- **Uso en n8n:** Si el flujo condicional detecta que el usuario inició la conversación mediante una nota de voz (`modo_audio = true`), n8n toma el texto final generado por OpenAI y lo envía a la API de ElevenLabs para generar un archivo de audio MP3 de voz humana ultra-realista, el cual se devuelve al frontend.

---

## 📦 Dependencias Detalladas (requirements.txt)

Cada librería listada en `requirements.txt` tiene un propósito vital para que el backend de Python funcione:

1. **`fastapi`**: Framework web para construir los endpoints (`/rag` y `/cache`) de manera rápida, asíncrona y con validación automática. Es lo que recibe las peticiones de n8n.
2. **`uvicorn`**: Servidor web (ASGI) que ejecuta la aplicación de FastAPI y la mantiene viva escuchando peticiones (usado en Railway).
3. **`python-dotenv`**: Lee el archivo `.env` y carga las claves secretas (como `OPENAI_API_KEY`) en el entorno de forma segura para no exponerlas en el código fuente.
4. **`requests`**: Librería estándar para hacer peticiones HTTP desde Python (usada internamente por LangChain para descargas web).
5. **`langchain`**: Framework principal que estructura el sistema. Orquesta las cadenas lógicas del RAG y los Prompts.
6. **`langchain-openai`**: Paquete oficial para conectar LangChain con los modelos de OpenAI (esencial para generar los `OpenAIEmbeddings`).
7. **`langchain-community`**: Contiene herramientas de terceros, como el `WebBaseLoader`, usado para conectarse a la URL de Bancolombia.
8. **`faiss-cpu`**: La Base de Datos Vectorial local de Facebook. Guarda los embeddings en RAM para búsquedas hiper-rápidas sin requerir GPU.
9. **`beautifulsoup4`**: Analizador HTML que trabaja junto a LangChain para "limpiar" la página web de Bancolombia y extraer únicamente el texto útil.
10. **`numpy`**: Librería de matemáticas complejas. Usada en el Caché Semántico (`Reto06_cache.py`) para calcular la "similitud del coseno" entre vectores.
11. **`openai`**: SDK oficial de OpenAI. Es el motor por debajo de LangChain para hablar con la API de ChatGPT.
12. **`python-multipart`**: Dependencia de FastAPI para procesar formularios multipart/FormData (usado para la subida de archivos complejos al servidor).

---

## Flujo Detallado de Cada Petición (Frontend -> n8n -> Backend)

1. **Modo Texto (Consultas Generales):**
   - El Frontend envía un JSON (`{ mensaje: "..." }`) al Webhook `/chat` de n8n.
   - El **AI Agent** evalúa la intención. Si es información general (ej. precios de criptomonedas, TRM), usa tools internas o responde directamente.
   - Devuelve la respuesta estructurada en JSON al Frontend.

2. **Modo Visión (Análisis de Imágenes):**
   - El Frontend convierte la imagen a formato **Base64** internamente con `FileReader`.
   - Envía el JSON (`{ mensaje: "...", image: "data:image/jpeg;base64,..." }`) al mismo Webhook `/chat`.
   - Un nodo **If** en n8n detecta la presencia de la imagen, desvía el flujo para saltarse al Agente normal, formatea el prompt, y hace una petición directa a la API de **OpenAI Vision**.
   - Se devuelve el análisis visual al Frontend.

3. **Modo RAG y Caché Semántico:**
   - Si el AI Agent determina que la pregunta es especializada (ej. *"¿Qué ofrece FinBot en créditos?"*), ejecuta sus *Tools* HTTP configuradas.
   - n8n hace un `POST` al endpoint `/cache` en tu backend (FastAPI). Python calcula la similitud vectorial con peticiones anteriores; si hay un "Hit" (>0.85 de similitud), responde de inmediato.
   - Si no hay "Hit" en el caché, n8n hace un `POST` a `/rag`. Python busca en **FAISS** y extrae los fragmentos oficiales.
   - n8n formula la respuesta final conversacional usando el contexto técnico provisto por Python y la devuelve.

4. **Modo Audio (Voz Multimodal):**
   - El Frontend graba el micrófono y envía un archivo binario `.webm` junto con la variable `modo_audio: 'true'` al Webhook independiente `/voice`.
   - n8n utiliza **Whisper** para transcribir el archivo de audio a texto.
   - El texto pasa por el Agente AI (procesando RAG o caché si es necesario, tal como en texto).
   - A la salida, un nodo **If** detecta que `modo_audio` es `true`, por lo que desvía la respuesta hacia **ElevenLabs** para generar una voz sintetizada.
   - n8n devuelve el archivo binario MP3 resultante al Frontend, el cual crea un reproductor y lo reproduce automáticamente.
