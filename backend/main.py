# main.py — n8n version
# Only exposes RAG — the agent and tools are managed by n8n
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
    # 1. Build the RAG vector base
    print("Building RAG vector base...")
    vectorstore = construir_base_vectorial()
    print("✅ Vector base ready.")

class MensajeRequest(BaseModel):
    mensaje: str

# RAG Endpoint
@app.post("/rag")
async def endpoint_rag(request: MensajeRequest):
    # Call responder_rag() with the global vectorstore
    respuesta = responder_rag(request.mensaje, vectorstore)
    return {"respuesta": respuesta}
