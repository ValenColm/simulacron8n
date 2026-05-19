# Reto04-rag.py
import os
from dotenv import load_dotenv
from langchain_community.document_loaders import WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.messages import HumanMessage, SystemMessage

load_dotenv()

# URL that we are going to index — documented here
# We chose the El Chapulín Colorado wiki for the ValentinaBot agent
URL = "https://chespirito.fandom.com/es/wiki/El_Chapul%C3%ADn_Colorado"

# =============================================================================
# Phase 1 — Ingestion (runs only once on startup)
# =============================================================================
    
def construir_base_vectorial():
    # 1. Load the content of the URL with WebBaseLoader
    loader = WebBaseLoader(URL)
    documentos = loader.load()

    # 2. Split the text into chunks with overlap
    #    chunk_size=500, chunk_overlap=50
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_documents(documentos)

    # 3. Generate embeddings with OpenAIEmbeddings
    embeddings = OpenAIEmbeddings()

    # 4. Save in FAISS and return the vectorstore
    vectorstore = FAISS.from_documents(chunks, embeddings)
    return vectorstore

# =============================================================================
# Phase 2 — Query (returns raw context)
# =============================================================================

def consultar_rag(pregunta: str, vectorstore) -> str:
    # 1. Search for the 3 most relevant chunks in the vectorstore
    docs_relevantes = vectorstore.similarity_search(pregunta, k=3)

    # 2. Join the text of the chunks as context
    contexto = "\n\n".join(doc.page_content for doc in docs_relevantes)

    # 3. Return the context so the agent can use it
    return contexto

# =============================================================================
# Phase 3 — Response (Full RAG: retrieval + generation)
# =============================================================================

def responder_rag(pregunta: str, vectorstore) -> str:
    # 1. Retrieve the relevant context
    contexto = consultar_rag(pregunta, vectorstore)

    # 2. Build the prompt with the context
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    messages = [
        SystemMessage(content=(
"""Eres ValentinaBot, un asistente de conocimiento general y entretenimiento.

Personalidad y tono:
- Mantén un tono amigable, curioso y entusiasta.
- Sé claro, preciso y divertido sin perder el profesionalismo.
- Responde siempre en el idioma que usa el usuario.

Detección automática de idioma:
- Si el usuario escribe en español, responde en español.
- If the user writes in English, respond in English.

Temas que puedes responder:
1. Trivia y cultura pop: series, personajes, datos curiosos.
2. Clima actual en cualquier ciudad del mundo.
3. Cálculos matemáticos generales.
4. Información sobre El Chapulín Colorado y Chespirito.
- Cuando el usuario se presenta, recuerda su nombre.
- Cuando pida un resumen, resume los temas tratados en la conversación.

Restricción:
- Si preguntan algo fuera de estos temas, declina amablemente.
- En español: "Lo siento, solo puedo ayudarte con trivia, clima y cálculos."
- In English: "I'm sorry, I can only help with trivia, weather and calculations."

Contexto recuperado de la wiki de El Chapulín Colorado:
""" + contexto
        )),
        HumanMessage(content=pregunta)
    ]

    # 3. Generate and return the coherent response
    respuesta = llm.invoke(messages)
    return respuesta.content

# =============================================================================
# Test
# =============================================================================
if __name__ == "__main__":
    print("Building vector base...")
    vs = construir_base_vectorial()
    print("\n✅ Base ready. Type your question (or 'exit' to quit)\n")

    while True:
        pregunta = input("Your question: ").strip()
        if pregunta.lower() in ("salir", "exit", "q"):
            print("Goodbye!")
            break
        if not pregunta:
            continue
        print("-" * 50)
        respuesta = responder_rag(pregunta, vs)
        print(respuesta)
        print("-" * 50 + "\n")