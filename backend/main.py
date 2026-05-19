# main.py — versión n8n
# Solo expone RAG — el agente y las tools las maneja n8n
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
import os

from Reto04_rag import construir_base_vectorial, responder_rag

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

class MensajeRequest(BaseModel):
    mensaje: str

# Endpoint RAG
@app.post("/rag")
async def endpoint_rag(request: MensajeRequest):
    # Llama a responder_rag() con el vectorstore global
    respuesta = responder_rag(request.mensaje, vectorstore)
    return {"respuesta": respuesta}
