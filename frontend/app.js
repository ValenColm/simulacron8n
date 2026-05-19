const N8N_CHAT = 'https://valentina20.app.n8n.cloud/webhook/chat';
const N8N_VOICE = 'https://valentina20.app.n8n.cloud/webhook/voice';

let modoEntrada = 'texto', modoRespuesta = 'texto';
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
    if (!texto) return;
    document.getElementById('welcome')?.remove();
    input.value = ''; autoResize(input);

    addMessage('user', texto);
    await enviarTextoAlAgente(texto);
}

async function enviarTextoAlAgente(texto) {
    showTyping();
    try {
        let respuesta, badge = null, audioUrl = null;

        if (modoRespuesta === 'audio') {
            // Modo audio → Workflow 2 (voice)
            const res = await fetch(N8N_VOICE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje: texto, modo_audio: 'true' })
            });
            const audioBlob = await res.blob();
            audioUrl = URL.createObjectURL(audioBlob);
            respuesta = '🔊 Respuesta en audio';
        } else {
            // Modo texto → directo a n8n (Workflow 1)
            const chatRes = await fetch(N8N_CHAT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje: texto })
            });
            const chatData = await chatRes.json();
            respuesta = chatData.respuesta;

            // Detección heurística de badges para RAG/Tools
            if (detectarTool(texto)) {
                badge = 'tool';
            } else if (texto.toLowerCase().match(/(chapulín|chapulin|chespirito|colorado|personaje|episodio|frase)/)) {
                badge = 'rag';
            }
        }

        removeTyping();
        addMessage('bot', respuesta, { badge, audioUrl });
    } catch (e) {
        removeTyping();
        addMessage('bot', `⚠️ Error: ${e.message}`);
    }
}


function detectarTool(texto) {
    // Detecta uso de tools: clima o calculadora
    const kwClima = ['clima', 'tiempo', 'temperatura', 'lluvia', 'weather', 'calor', 'frío', 'frio', 'grados', 'pronóstico'];
    const kwCalc = ['calcula', 'cuánto es', 'cuanto es', 'suma', 'resta', 'multiplica', 'divide', 'resultado', 'porcentaje', '+ ', '- ', '* ', '/ '];
    return [...kwClima, ...kwCalc].some(k => texto.toLowerCase().includes(k));
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
