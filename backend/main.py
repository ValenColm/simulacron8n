# main.py — versión n8n
# Solo expone RAG y caché — el agente y las tools las maneja n8n
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
import os

from Reto04_rag import construir_base_vectorial, responder_rag
from Reto06_cache import responder_con_cache, poblar_cache, cache

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

vectorstore = None

@app.on_event("startup")
async def startup():
    global vectorstore
    # 1. Construye la base vectorial del RAG
    print("Construyendo base vectorial RAG...")
    vectorstore = construir_base_vectorial()
    print("✅ Base vectorial lista.")

    # 2. Pobla el caché semántico
    print("Poblando caché semántico...")
    poblar_cache()
    print(f"✅ Caché listo ({len(cache)} entradas).")


class MensajeRequest(BaseModel):
    mensaje: str

# Endpoint RAG
@app.post("/rag")
async def endpoint_rag(request: MensajeRequest):
    # Llama a responder_rag() con el vectorstore global
    respuesta = responder_rag(request.mensaje, vectorstore)
    return {"respuesta": respuesta}

# Endpoint caché
@app.post("/cache")
async def endpoint_cache(request: MensajeRequest):
    respuesta, desde_cache = responder_con_cache(request.mensaje)
    return {"respuesta": respuesta, "desde_cache": desde_cache}

# Guarda una respuesta en el caché (llamado por el frontend tras recibir respuesta del agente real)
class GuardarCacheRequest(BaseModel):
    pregunta: str
    respuesta: str

@app.post("/cache/guardar")
async def endpoint_guardar_cache(request: GuardarCacheRequest):
    guardar_en_cache(request.pregunta, request.respuesta)
    return {"guardado": True}


