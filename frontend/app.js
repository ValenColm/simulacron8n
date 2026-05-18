const N8N_CHAT = 'https://valentina20.app.n8n.cloud/webhook/chat';
const N8N_VOICE = 'https://valentina20.app.n8n.cloud/webhook/voice';
const RAILWAY = 'https://simulacron8n-production.up.railway.app';

let modoEntrada = 'texto', modoRespuesta = 'texto';
let imagenSeleccionada = null;
let mediaRecorder = null, audioChunks = [], grabando = false;

function setModo(modo, btn) {
    modoEntrada = modo;
    btn.closest('.control-group').querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function setRespuesta(modo, btn) {
    modoRespuesta = modo;
    btn.closest('.control-group').querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    imagenSeleccionada = file;
    const reader = new FileReader();
    reader.onload = ev => {
        document.getElementById('image-preview').src = ev.target.result;
        document.getElementById('image-name').textContent = file.name;
        document.getElementById('image-preview-wrap').style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    imagenSeleccionada = null;
    document.getElementById('file-input').value = '';
    document.getElementById('image-preview-wrap').style.display = 'none';
}

async function toggleRecording() {
    if (!grabando) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = async () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                await procesarAudio(blob);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.start();
            grabando = true;
            document.getElementById('mic-btn').classList.add('recording');
            document.getElementById('recording-indicator').style.display = 'flex';
        } catch (e) { alert('Micrófono no disponible: ' + e.message); }
    } else {
        mediaRecorder.stop(); grabando = false;
        document.getElementById('mic-btn').classList.remove('recording');
        document.getElementById('recording-indicator').style.display = 'none';
    }
}

async function procesarAudio(blob) {
    const formData = new FormData();
    formData.append('audio', blob, 'audio.webm');
    formData.append('modo_audio', modoRespuesta === 'audio' ? 'true' : 'false');
    showTyping();
    try {
        const res = await fetch(N8N_VOICE, { method: 'POST', body: formData });

        if (modoRespuesta === 'audio') {
            // Respuesta en audio
            const audioBlob = await res.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            removeTyping();
            addMessage('bot', '🎙 Respuesta de voz', { audioUrl });
        } else {
            // Respuesta en texto
            const data = await res.json();
            removeTyping();
            addTranscripcion(data.transcripcion || '');
            addMessage('bot', data.respuesta);
        }
    } catch (e) {
        removeTyping();
        addMessage('bot', '⚠️ Error en pipeline de voz.');
    }
}

function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }
function sendQuick(t) { document.getElementById('msg-input').value = t; enviar(); }

async function enviar() {
    const input = document.getElementById('msg-input');
    const texto = input.value.trim();
    if (!texto && !imagenSeleccionada) return;
    document.getElementById('welcome')?.remove();
    input.value = ''; autoResize(input);

    if (imagenSeleccionada) {
        addMessage('user', texto || '(imagen adjunta)', { imagen: imagenSeleccionada });
        await enviarConImagen(texto, imagenSeleccionada);
        removeImage(); return;
    }

    addMessage('user', texto);
    await enviarTextoAlAgente(texto);
}

async function enviarTextoAlAgente(texto) {
    showTyping();
    try {
        let respuesta, badge = null, audioUrl = null;

        if (modoRespuesta === 'audio') {
            // Modo audio → Workflow 2
            const res = await fetch(N8N_VOICE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje: texto, modo_audio: 'true' })
            });
            const audioBlob = await res.blob();
            audioUrl = URL.createObjectURL(audioBlob);
            respuesta = '🔊 Respuesta en audio';
        } else {
            // Modo texto → Workflow 1
            // 1. Verificar Caché primero en Railway (Reto 06: Sin llamar al LLM)
            const cacheRes = await fetch(`${RAILWAY}/cache`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje: texto })
            });
            const cacheData = await cacheRes.json();

            if (cacheData.desde_cache) {
                respuesta = cacheData.respuesta;
                badge = 'cache';
            } else {
                // 2. Si no hay caché, se llama a n8n
                const chatRes = await fetch(N8N_CHAT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mensaje: texto })
                });
                const chatData = await chatRes.json();
                respuesta = chatData.respuesta;

                // Guardar en caché en segundo plano
                fetch(`${RAILWAY}/cache/guardar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pregunta: texto, respuesta: respuesta })
                }).catch(e => console.error('Error guardando caché:', e));

                // Detección heurística de badges para RAG/Tools
                if (detectarTool(texto)) {
                    badge = 'tool';
                } else if (texto.toLowerCase().match(/(cdt|cuenta|tarjeta|crédito|bancolombia|prestamo|préstamo|tasas)/)) {
                    badge = 'rag';
                }
            }
        }

        removeTyping();
        addMessage('bot', respuesta, { badge, audioUrl });
    } catch (e) {
        removeTyping();
        addMessage('bot', `⚠️ Error: ${e.message}`);
    }
}

async function enviarConImagen(texto, imagen) {
    showTyping();
    try {
        // Convertir imagen a Base64 para n8n
        const reader = new FileReader();
        reader.readAsDataURL(imagen);
        reader.onload = async () => {
            const base64Image = reader.result;

            // Enviar a tu Webhook de n8n (chat)
            const chatRes = await fetch(N8N_CHAT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mensaje: texto || 'Analiza esta imagen',
                    image: base64Image
                })
            });

            if (!chatRes.ok) throw new Error('Error en n8n');
            const chatData = await chatRes.json();

            removeTyping();
            addMessage('bot', chatData.respuesta);
        };
        reader.onerror = error => { throw error; };
    } catch (e) {
        removeTyping();
        console.error('enviarConImagen error:', e);
        addMessage('bot', `⚠️ Error al analizar la imagen: ${e.message}`);
    }
}



function detectarTool(texto) {
    // Fallback: solo se usa si el backend no retorna tool_used
    const kw = ['dólar', 'dollar', 'usd', 'cop', 'tasa', 'bitcoin', 'btc', 'crypto',
        'invierto', 'inversión', 'interés', 'interest', 'rendimiento'];
    return kw.some(k => texto.toLowerCase().includes(k));
}

function addTranscripcion(texto) {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = 'message user';
    div.innerHTML = `<div class="transcription">🎙 ${texto}</div>`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function addMessage(rol, texto, opts = {}) {
    const chat = document.getElementById('chat');
    const wrap = document.createElement('div');
    wrap.className = `message ${rol}`;

    if (opts.imagen) {
        const img = document.createElement('img');
        img.className = 'msg-image';
        img.src = URL.createObjectURL(opts.imagen);
        wrap.appendChild(img);
    }

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = texto;
    wrap.appendChild(bubble);

    if (opts.audioUrl) {
        const audio = document.createElement('audio');
        audio.controls = true; audio.autoplay = true; audio.src = opts.audioUrl;
        wrap.appendChild(audio);
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    const ts = document.createElement('span');
    ts.className = 'timestamp';
    ts.textContent = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    meta.appendChild(ts);

    if (opts.badge === 'tool') {
        const b = document.createElement('span');
        b.className = 'badge badge-tool';
        b.textContent = opts.badgeLabel || '⚡ Tool';
        meta.appendChild(b);
    } else if (opts.badge === 'cache') {
        const b = document.createElement('span');
        b.className = 'badge badge-cache';
        b.textContent = '■ Caché';
        meta.appendChild(b);
    } else if (opts.badge === 'rag') {
        const b = document.createElement('span');
        b.className = 'badge badge-rag';
        b.textContent = '🔍 RAG';
        meta.appendChild(b);
    }

    wrap.appendChild(meta);
    chat.appendChild(wrap);
    chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
    const chat = document.getElementById('chat');
    const t = document.createElement('div');
    t.className = 'message bot'; t.id = 'typing';
    t.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
    chat.appendChild(t);
    chat.scrollTop = chat.scrollHeight;
}

function removeTyping() { document.getElementById('typing')?.remove(); }

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
