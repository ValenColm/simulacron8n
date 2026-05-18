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

## Flujo de Peticiones del Frontend
El frontend (`app.js`) actúa como un cliente ligero. No posee lógica de procesamiento complejo ni validaciones de RAG, su única responsabilidad es comunicarse con los servicios correspondientes:

- **Modo Texto:** Hace peticiones `POST` enviando un JSON (`{ mensaje: "..." }`) directamente al Webhook de n8n del **Workflow 1** (Agente de Texto). 
- **Modo Audio:** Hace peticiones `POST` enviando un JSON (`{ mensaje: "...", modo_audio: 'true' }`) al Webhook de n8n del **Workflow 2** (Agente Multimodal con ElevenLabs). 
- **Modo Visión (Imágenes):** Hace peticiones `POST` utilizando `FormData` para enviar la imagen y el texto directamente al endpoint `/vision` del backend de **FastAPI** en Railway, saltándose a n8n para este caso específico.

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

## Visualización de los Workflows (n8n)
La orquestación del proyecto (decisiones, transcripción y ruteo a RAG) vive completamente dentro de la plataforma de n8n. Para poder visualizar cómo están estructurados los nodos condicionales y los agentes de IA, no basta con leer código; debes importar el flujo:
1. Instala u obtén acceso a una instancia o cuenta de n8n.
2. Ve a la carpeta `n8n/` de este repositorio.
3. Importa los archivos `.json` dentro de tu cuenta de n8n para cargar los Workflows y observar el pipeline gráfico en acción.
