# FinBot — Asistente Financiero Multimodal con n8n y FastAPI

## Descripción
FinBot es un asistente financiero automatizado con capacidades avanzadas de Inteligencia Artificial. Está diseñado para interactuar con los usuarios mediante chat de texto y voz, proporcionando información financiera en tiempo real (como la tasa representativa del USD o el precio de Bitcoin), realizando cálculos de intereses compuestos, y respondiendo preguntas específicas sobre créditos usando una base de conocimientos documental (RAG) optimizada con caché semántico.

## Arquitectura
El sistema está compuesto por dos capas principales que interactúan entre sí y un frontend para el usuario final:

1. **Capa de Orquestación (n8n)**: Es el cerebro de las operaciones de enrutamiento. Gestiona los flujos conversacionales y de voz. Recibe las peticiones del usuario, procesa audios con Whisper, decide dinámicamente qué "Tools" ejecutar, y sintetiza respuestas de voz con ElevenLabs si el usuario lo requiere.
2. **Capa de Backend Inteligente (FastAPI)**: Un servicio dedicado en Python que proporciona funciones avanzadas de IA. Incluye un sistema RAG construido con LangChain y FAISS para buscar información sobre productos financieros, un sistema de caché semántico para optimizar consultas repetitivas, y capacidades de visión artificial.
3. **Capa Frontend (Vanilla JS/HTML/CSS)**: Interfaz de usuario intuitiva que soporta grabación de audio nativa, envío de imágenes y renderizado de respuestas dinámicas según el formato esperado (audio o texto).

## Stack Tecnológico
- **n8n** — Orquestación de agentes, lógica condicional y webhooks.
- **FastAPI** — Endpoints RAG, caché y visión.
- **OpenAI** — GPT-4o-mini, Whisper, Embeddings.
- **ElevenLabs** — Síntesis de voz dinámica.
- **FAISS & LangChain** — Motor de búsqueda vectorial y chunking.

---

## Ejecución Local (Frontend)

El backend inteligente y la orquestación (n8n) **ya se encuentran desplegados y configurados en la nube**, por lo que cualquier usuario u otro desarrollador solo necesita clonar el proyecto y correr el frontend localmente para utilizar la aplicación.

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd simulacron8n
```

### 2. Ejecutar el Frontend
Para levantar la interfaz de usuario de chat y probar el bot en tu computadora:

1. Asegúrate de tener Python instalado en tu sistema.
2. Abre tu terminal, navega a la carpeta del frontend y levanta un servidor local:
   ```bash
   cd frontend
   python -m http.server 3000
   ```
3. Abre tu navegador en `http://localhost:3000` y ¡empieza a interactuar con FinBot!

*(Nota: Las credenciales y URLs de los webhooks de n8n ya están preconfiguradas y centralizadas, por lo que no es necesario crear archivos `.env` locales para usar el frontend).*-

## Estructura del Proyecto
El repositorio está organizado de la siguiente manera:
```text
simulacron8n/
│
├── frontend/           # Capa de presentación (HTML, CSS, JS)
│   ├── app.js          # Lógica principal del frontend y ruteo de peticiones
│   ├── index.html      # Interfaz de usuario del chat
│   └── styles.css      # (Si aplica) Estilos de la aplicación
│
├── backend/            # Capa de Inteligencia Artificial (FastAPI)
│   ├── main.py         # Archivo principal de FastAPI (orquestador de rutas)
│   ├── Reto04_rag.py   # Lógica RAG (faiss, embeddings, langchain)
│   ├── Reto05_vision.py# Endpoint para procesar y describir imágenes
│   └── Reto06_cache.py # Caché semántico (evita procesar la misma pregunta)
│
├── n8n/                # Configuración de los Workflows
│   └── *.json          # Exportables de los agentes y flujos condicionales
│
└── requirements.txt    # Dependencias del backend
```
## Interacción entre las 3 Capas (El Ciclo de Vida de una Petición)
Para entender cómo funciona el proyecto, es fundamental comprender la relación dinámica entre el Frontend, n8n (Orquestador) y el Backend (FastAPI).

1. **El Frontend (Punto de Entrada):** Cuando el usuario escribe o graba un mensaje (ej. *"¿Qué es un CDT?"*), el frontend (`app.js`) **no evalúa** esa información. Simplemente la envuelve en una petición y la envía directamente al Webhook de n8n. El frontend no sabe qué es el RAG, ni el caché, ni las tasas de interés.
2. **n8n (El Cerebro Analítico):** El Webhook de n8n recibe el mensaje y se lo pasa al nodo **AI Agent**. El Agente (usando GPT) analiza la intención del usuario.
   - El Agente cuenta con una lista de "Tools" (herramientas de n8n), cada una con una descripción clara (ej. *"Úsala para consultar productos bancarios"*).
   - Si el usuario dice *"Hola"*, el Agente decide responder con un saludo directamente desde su conocimiento base.
   - Si el usuario pregunta *"¿Qué ofrece FinBot en cuentas de ahorro?"*, el Agente lee las descripciones y deduce autónomamente que **necesita ejecutar la herramienta de RAG**.
3. **Petición al Backend (La Tool en Acción):** Una vez que el Agente decide usar la herramienta de RAG (o de Caché), dispara internamente un nodo `HTTP Request`. Este nodo hace una petición `POST` vía HTTP a tu servidor de FastAPI (ej. `https://tu-backend-railway.app/rag`) pasándole el mensaje del usuario.
4. **El Backend (FastAPI):** Recibe la petición HTTP de n8n. El código en Python procesa la búsqueda semántica en su base de datos vectorial local (FAISS), extrae los fragmentos de texto exactos de la documentación oficial, y le devuelve esta información "cruda" a n8n en formato JSON.
5. **n8n -> Frontend (Respuesta Final):** El AI Agent en n8n lee la respuesta técnica del backend, la transforma en una respuesta conversacional y empática, y se la envía de vuelta al Frontend (en formato JSON para texto, o la pasa por ElevenLabs si el frontend pidió audio binario).

## Flujo de Peticiones del Frontend
El frontend (`app.js`) actúa como un cliente ligero. No posee lógica de procesamiento complejo ni validaciones de RAG, su única responsabilidad es comunicarse con los servicios correspondientes y pintar en pantalla las respuestas:

- **Modo Texto (Workflow 1):** Hace una petición `POST` enviando el texto (`{ mensaje: "..." }`) al Webhook del Agente de Texto en n8n.
  - **Manejo de Respuesta:** n8n responde con un objeto JSON que contiene la clave `respuesta`. El frontend lee este JSON y lo muestra en una burbuja de chat. (Nota: En caso de que n8n retorne metadatos indicando el uso de una "Tool", el frontend está preparado para renderizar etiquetas o "badges" informativos).
- **Modo Audio (Workflow 2):** Hace una petición `POST` enviando un JSON (`{ mensaje: "...", modo_audio: 'true' }`) al Webhook del Agente Multimodal.
  - **Manejo de Respuesta Binaria:** Como se envía explícitamente `modo_audio: 'true'`, n8n sabe que debe pasar el resultado por ElevenLabs y retornar un archivo de audio. El frontend recibe este binario mediante `.blob()`, genera una URL local temporal y crea un reproductor `<audio>` nativo en el chat.
- **Modo Visión (Imágenes):** Hace una petición `POST` utilizando `FormData` para enviar la imagen y el texto adjunto directamente al endpoint `/vision` del backend de **FastAPI** (Railway), saltándose a n8n, ya que el procesamiento y análisis de imágenes se maneja de forma local y directa por rendimiento.

## Dependencias Principales (requirements.txt)
Las herramientas utilizadas en el entorno de Python cumplen roles específicos dentro de la arquitectura del backend:
- `fastapi` / `uvicorn` / `python-multipart`: Permiten construir el servidor web y manejar las peticiones HTTP asíncronas y subida de archivos (imágenes).
- `langchain` / `langchain-openai` / `langchain-community`: Proveen el framework de desarrollo de IA (cargadores de documentos, creación de prompts, división de texto y cadenas lógicas RAG).
- `faiss-cpu`: La base de datos vectorial local. Almacena en memoria el texto de los documentos convertido en vectores matemáticos (embeddings) tanto para el sistema RAG como para el caché semántico.
- `openai`: El SDK oficial para interactuar directamente con los modelos visuales (`gpt-4o-mini`) en el endpoint de análisis de imágenes.
- `beautifulsoup4`: Analizador web usado en la etapa de preparación de datos para limpiar y extraer el contenido en texto plano de las páginas objetivo.
- `python-dotenv`: Carga de forma segura las credenciales (API Keys) desde el archivo `.env`.

## Endpoints de FastAPI (Backend)
Si deseas probar el backend de forma estrictamente local sin n8n (ejecutando `uvicorn main:app --reload` en la carpeta `backend/`), estos son los endpoints expuestos:
- `POST /rag` — Responde preguntas buscando en la base vectorial con el contexto extraído.
- `POST /cache` — Busca similitudes semánticas en preguntas previas para responder al instante.
- `POST /vision` — Analiza imágenes recibidas por FormData usando modelos de visión.

## Arquitectura y Flujo de los Workflows (n8n)
La orquestación del proyecto (decisiones, transcripción y ruteo a RAG) vive completamente dentro de la plataforma de n8n. El flujo de datos está diseñado de la siguiente manera:

### Workflow 1: Agente de Texto y Tools
1. **Entrada:** Un Webhook recibe la petición JSON desde el frontend.
2. **AI Agent:** Un agente reactivo basado en LangChain recibe el mensaje. Este agente tiene acceso a múltiples "Tools" (Herramientas):
   - **Herramientas Nativas:** Ejecuta JavaScript para calcular interés compuesto, o hace peticiones HTTP a APIs externas (ej. obtener el precio de Bitcoin en CoinGecko o la TRM del dólar en open.er-api.com).
   - **Herramientas de Backend:** Si detecta una pregunta sobre los servicios de la entidad financiera, hace un llamado HTTP POST directamente a nuestro endpoint de FastAPI (`/rag` o `/cache`) en Railway.
3. **Memoria:** Una ventana de buffer (Simple Memory) mantiene el historial de la sesión para que el bot pueda recordar el contexto de la conversación.
4. **Salida:** Retorna la respuesta final en un objeto JSON al frontend.

### Workflow 2: Agente Multimodal (Voz y Texto)
Este flujo es el más avanzado y posee una arquitectura de enrutamiento condicional:
1. **Bifurcación de Entrada (If Node):** Evalúa si el frontend envió texto o si está vacío (lo que implica un archivo binario de voz).
   - Si es **Voz**, envía el audio por un nodo de **OpenAI Whisper** para obtener la transcripción a texto, y luego se la pasa al AI Agent.
   - Si es **Texto**, hace un "bypass", saltándose Whisper para ir directamente al AI Agent (ahorrando tiempo y créditos de API).
2. **AI Agent:** Ejecuta la misma lógica y herramientas que el Workflow 1. Lee dinámicamente el mensaje usando la expresión `{{ $json.text || $json.body.mensaje }}`.
3. **Bifurcación de Salida (If Node):** Revisa la variable `modo_audio` enviada por el frontend.
   - Si evalúa como `true`, envía la respuesta del Agente a **ElevenLabs** para sintetizar un archivo de voz de alta calidad y lo devuelve al frontend como un binario (MP3).
   - Si evalúa como `false`, salta la conversión a audio y devuelve el texto estructurado en JSON.

Para visualizar estos flujos gráficamente, debes importar los archivos `.json` ubicados en la carpeta `n8n/` de este repositorio dentro de tu cuenta o instancia local de n8n.
