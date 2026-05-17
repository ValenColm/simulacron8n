# FinBot — Versión n8n

## Descripción
FinBot es un asistente financiero automatizado con capacidades de Inteligencia Artificial. Está diseñado para interactuar con los usuarios mediante chat y voz, proporcionando información financiera en tiempo real (como la tasa representativa del USD o el precio de Bitcoin), realizando cálculos de intereses, y respondiendo preguntas específicas sobre créditos usando una base de conocimientos documental (RAG).

## Arquitectura
El sistema está compuesto por dos capas principales que interactúan entre sí:

1. **Capa de Orquestación (n8n Cloud)**: Es el cerebro de las operaciones. Gestiona los flujos conversacionales y de voz. Recibe las peticiones del usuario, procesa audios con Whisper y sintetiza respuestas de voz con ElevenLabs. Además, decide dinámicamente cuándo llamar a APIs públicas (CoinGecko, tasas de cambio) o a nuestro propio backend.
2. **Capa de Backend Inteligente (FastAPI)**: Un servicio dedicado en Python que proporciona funciones avanzadas de IA. Incluye un sistema RAG (Retrieval-Augmented Generation) construido con LangChain y FAISS para buscar información sobre productos financieros (como créditos de Bancolombia), un sistema de caché semántico para optimizar consultas repetitivas, y capacidades de visión artificial.

## Stack
- n8n Cloud — agente y voz
- FastAPI — RAG, caché y visión
- OpenAI — GPT-4o, Whisper, embeddings
- ElevenLabs — síntesis de voz
- FAISS — base vectorial
- LangChain — scraping y chunking

## Workflows n8n
- **Workflow 1** — Chat + Tools
  - Tool: calculate_interest (Code)
  - Tool: get_usd_rate (HTTP → open.er-api.com)
  - Tool: get_bitcoin_price (HTTP → CoinGecko)
  - Tool: consultar_rag (HTTP → FastAPI /rag)
  - Tool: consultar_cache (HTTP → FastAPI /cache)

- **Workflow 2** — Voz
  - Whisper → AI Agent → ElevenLabs
  - Mismas 5 tools del Workflow 1

## Endpoints FastAPI
- `POST /rag` — RAG sobre Bancolombia
- `POST /cache` — Caché semántico
- `POST /vision` — Análisis de imágenes

## Limitación conocida
n8n.cloud bloquea IPs privadas y localhost por protección SSRF.
Las tools de RAG y caché están configuradas en los workflows
pero requieren desplegar FastAPI en Railway o similar para funcionar.
En producción se resolvería con Railway, Render o ngrok.

## Instalación

### Requisitos Previos
- [Docker y Docker Compose](https://docs.docker.com/get-docker/) instalados en tu sistema.
- [Git](https://git-scm.com/) instalado.

### Clonar y preparar el entorno
Independientemente de tu sistema operativo, el primer paso es clonar el repositorio y configurar las variables de entorno:

```bash
git clone <URL_DEL_REPOSITORIO>
cd simulacron8n

# Copiar el archivo de ejemplo para las variables de entorno
cp .env.example .env
```
*(Abre el archivo `.env` recién creado en tu editor de código y completa tus API Keys de OpenAI, etc.)*

### Instalación en Windows
Si utilizas **Docker Desktop** en Windows, los pasos son muy sencillos:

1. Asegúrate de tener Docker Desktop abierto y ejecutándose (el icono de la ballena debe aparecer en tu barra de tareas).
2. Abre PowerShell, Git Bash o el Símbolo del Sistema (CMD) en la carpeta del proyecto (`simulacron8n`).
3. Ejecuta el siguiente comando para construir y levantar el contenedor en segundo plano:
   ```powershell
   docker compose up -d --build
   ```
4. Puedes revisar que esté funcionando correctamente abriendo tu navegador en `http://localhost:8000`.

### Instalación en Ubuntu Linux
1. Asegúrate de tener instalado `docker` y `docker-compose-plugin` (o `docker-compose`).
2. Abre tu terminal en la ruta del proyecto.
3. Ejecuta el comando (es probable que necesites usar `sudo` dependiendo de tu configuración de permisos de Docker):
   ```bash
   sudo docker compose up -d --build
   ```
4. Verifica que el contenedor esté corriendo de manera exitosa ejecutando:
   ```bash
   sudo docker compose ps
   ```
5. El backend estará listo y escuchando peticiones en `http://localhost:8000`.
