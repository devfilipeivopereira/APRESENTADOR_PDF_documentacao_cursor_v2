require('dotenv').config();
const express = require('express');
const session = require('express-session');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const LOGIN_USER = process.env.LOGIN_USER || '';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';
const AUTH_ENABLED = !!(LOGIN_USER && LOGIN_PASSWORD);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'presentations';
/** Diretório local para modo offline/backup: PDFs carregados do computador sem Supabase */
const UPLOAD_DIR = process.env.UPLOAD_DIR || '';

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

let presentationState = {
    pdfUrl: null,
    currentSlide: 1,
    totalSlides: 0,
    fileName: null
};

const multerMemory = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Apenas arquivos PDF são permitidos!'), false);
    },
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Multer para upload local (modo offline) — só existe se UPLOAD_DIR estiver definido
let multerDisk = null;
if (UPLOAD_DIR) {
    const fs = require('fs');
    const uploadPath = path.resolve(__dirname, UPLOAD_DIR);
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log('[upload-local] Diretório criado:', uploadPath);
    }
    multerDisk = multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => cb(null, uploadPath),
            filename: (req, file, cb) => {
                const safe = (file.originalname || 'slide.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
                cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`);
            }
        }),
        fileFilter: (req, file, cb) => {
            if (file.mimetype === 'application/pdf') cb(null, true);
            else cb(new Error('Apenas arquivos PDF são permitidos!'), false);
        },
        limits: { fileSize: 50 * 1024 * 1024 }
    });
}

function getBaseUrl(req) {
    return process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
}

app.use(express.json());
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
    if (!AUTH_ENABLED || (req.session && req.session.user)) return next();
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Não autenticado.' });
    }
    const redirect = encodeURIComponent(req.originalUrl || '/');
    return res.redirect('/login?redirect=' + redirect);
}

app.get('/login', (req, res) => {
    if (AUTH_ENABLED && req.session && req.session.user) {
        return res.redirect(req.query.redirect || '/');
    }
    const fs = require('fs');
    const loginPath = path.join(__dirname, 'public', 'login.html');
    try {
        const html = fs.readFileSync(loginPath, 'utf8');
        res.set({
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
        }).send(html);
    } catch (err) {
        console.error('[login] readFile error:', err);
        res.status(500).set('Content-Type', 'text/html; charset=utf-8').send('<h1>Erro</h1><p>Página de login não encontrada.</p>');
    }
});
app.get('/login/', (req, res) => res.redirect(301, '/login'));

app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use('/.well-known', (req, res) => res.status(204).end());

app.use(express.static('public'));
if (UPLOAD_DIR) {
    app.use('/uploads', express.static(path.resolve(__dirname, UPLOAD_DIR)));
}

app.post('/api/login', express.json(), (req, res) => {
    if (!AUTH_ENABLED) {
        return res.json({ success: true, user: 'admin' });
    }
    const { username, password } = req.body || {};
    if (username === LOGIN_USER && password === LOGIN_PASSWORD) {
        req.session.user = username;
        return res.json({ success: true, user: username });
    }
    res.status(401).json({ error: 'Utilizador ou palavra-passe incorretos.' });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {});
    res.json({ success: true });
});

app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/view', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view.html'));
});
app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/remote', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'remote.html'));
});
app.get('/playlist', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'playlist.html'));
});

app.get('/api/network', (req, res) => {
    res.json({ ip: getLocalIP(), port: PORT });
});

/** URL base para acesso online (opcional: BASE_URL no .env, ex. https://meuservidor.com) */
app.get('/api/base-url', (req, res) => {
    const baseUrl = process.env.BASE_URL || null;
    res.json({ baseUrl });
});

app.get('/api/state', (req, res) => {
    res.json(presentationState);
});

app.get('/api/health', (req, res) => {
    res.json({ ok: true, supabase: !!supabase });
});

/** Modo offline/backup: indica se é possível carregar PDF do computador para o servidor (sem internet/Supabase) */
app.get('/api/upload-local', (req, res) => {
    res.json({ available: !!UPLOAD_DIR });
});

app.post('/upload', requireAuth, (req, res, next) => {
    console.log('[upload] POST /upload recebido (antes do multer)');
    next();
}, multerMemory.single('pdf'), async (req, res) => {
    console.log('[upload] Requisição recebida. File:', !!req.file, 'body keys:', req.body ? Object.keys(req.body) : []);

    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado ou formato inválido.' });
    }
    if (!supabase) {
        return res.status(503).json({ error: 'Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.' });
    }

    const title = req.body.title || req.file.originalname;
    const preacher = req.body.pregador || null;
    const eventDate = req.body.event_date || null;
    const location = req.body.location || null;
    const extraInfo = req.body.extra_info || null;

        const storagePath = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${req.file.originalname}`;
        const fileSizeBytes = req.file.size != null ? Number(req.file.size) : null;
        console.log('[upload] Título:', title, '| Storage path:', storagePath, '| Tamanho:', fileSizeBytes, 'bytes');

    try {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(storagePath, req.file.buffer, {
                contentType: 'application/pdf',
                upsert: false
            });

        if (uploadError) {
            console.error('[upload] Supabase Storage erro:', JSON.stringify(uploadError, null, 2));
            return res.status(500).json({
                error: 'Erro ao enviar PDF: ' + (uploadError.message || uploadError.error || String(uploadError)),
                code: uploadError.error || uploadError.code
            });
        }

        const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(uploadData.path);
        const pdfUrl = urlData.publicUrl;
        console.log('[upload] Storage OK. pdfUrl:', pdfUrl);

        const { data: row, error: insertError } = await supabase
            .from('presentations')
            .insert({
                title,
                pdf_url: pdfUrl,
                file_name: req.file.originalname,
                file_size: fileSizeBytes,
                pregador: preacher || null,
                event_date: eventDate || null,
                location: location || null,
                extra_info: extraInfo || null
            })
            .select('id, file_size')
            .single();

        if (insertError) {
            console.error('[upload] Supabase insert erro:', JSON.stringify(insertError, null, 2));
            if (insertError.message && insertError.message.includes('file_size')) {
                return res.status(500).json({
                    error: 'A coluna file_size não existe na tabela. Execute no Supabase: alter table presentations add column if not exists file_size bigint;'
                });
            }
            return res.status(500).json({
                error: 'Erro ao salvar na playlist: ' + (insertError.message || insertError.details || String(insertError)),
                code: insertError.code
            });
        }

        presentationState.pdfUrl = pdfUrl;
        presentationState.fileName = req.file.originalname;
        presentationState.currentSlide = 1;
        presentationState.totalSlides = 0;

        io.emit('pdfLoaded', {
            pdfUrl: presentationState.pdfUrl,
            fileName: presentationState.fileName,
            currentSlide: presentationState.currentSlide
        });

        console.log('PDF carregado (playlist):', req.file.originalname, '| file_size gravado:', row?.file_size);
        // Enviar sempre o tamanho do ficheiro na resposta (req.file.size) para o frontend exibir
        const responseFileSize = (fileSizeBytes != null && !isNaN(Number(fileSizeBytes))) ? Number(fileSizeBytes) : (row?.file_size ?? null);
        res.json({
            success: true,
            pdfUrl,
            fileName: req.file.originalname,
            id: row.id,
            file_size: responseFileSize
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Erro ao processar upload.' });
    }
});

// Upload local (modo offline/backup): grava PDF no servidor sem Supabase; sincronização de slides via rede local
if (multerDisk) {
    app.post('/upload-local', requireAuth, multerDisk.single('pdf'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado ou formato inválido.' });
        }
        const baseUrl = getBaseUrl(req);
        const savedName = path.basename(req.file.path);
        const pdfUrl = baseUrl + '/uploads/' + savedName;
        const fileName = req.file.originalname || savedName || 'Apresentação.pdf';
        presentationState.pdfUrl = pdfUrl;
        presentationState.fileName = fileName;
        presentationState.currentSlide = 1;
        presentationState.totalSlides = 0;
        io.emit('pdfLoaded', {
            pdfUrl: presentationState.pdfUrl,
            fileName: presentationState.fileName,
            currentSlide: presentationState.currentSlide
        });
        console.log('[upload-local] PDF carregado (backup local):', fileName, '| url:', pdfUrl);
        res.json({ success: true, pdfUrl, fileName });
    });
}

// Erros do Multer (ficheiro grande, tipo inválido, etc.)
app.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        console.error('[upload] Multer: ficheiro demasiado grande');
        return res.status(413).json({ error: 'Ficheiro demasiado grande. Máximo 50MB.' });
    }
    if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
        console.error('[upload] Multer: campo inesperado (use o nome "pdf")');
        return res.status(400).json({ error: 'Envie o PDF no campo "pdf".' });
    }
    if (err && err.message && err.message.includes('PDF')) {
        console.error('[upload] Multer:', err.message);
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

/** HEAD request para obter Content-Length do PDF (fallback quando file_size não está na BD). */
function getPdfSizeFromUrl(pdfUrl, timeoutMs = 6000) {
    if (!pdfUrl || typeof pdfUrl !== 'string') return Promise.resolve(null);
    return new Promise((resolve) => {
        let url;
        try { url = new URL(pdfUrl); } catch (_) { return resolve(null); }
        const lib = url.protocol === 'https:' ? https : http;

        const req = lib.request({
            method: 'HEAD',
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port || undefined,
            path: url.pathname + url.search,
            headers: {
                // alguns CDNs exigem User-Agent para devolver Content-Length
                'User-Agent': 'apresentador-pdf/1.0'
            }
        }, (r) => {
            const cl = r.headers && (r.headers['content-length'] || r.headers['Content-Length']);
            if (cl != null && cl !== '') {
                const n = parseInt(String(cl), 10);
                return resolve(!isNaN(n) && n >= 0 ? n : null);
            }
            resolve(null);
        });

        req.on('error', () => resolve(null));
        req.setTimeout(timeoutMs, () => {
            try { req.destroy(); } catch (_) {}
            resolve(null);
        });
        req.end();
    });
}

app.get('/api/playlist', requireAuth, async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Supabase não configurado.' });
    }
    try {
        const { data, error } = await supabase
            .from('presentations')
            .select('*')
            .order('event_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) throw error;
        let list = data || [];

        // Auto-preencher e SALVAR file_size quando faltar:
        // 1) tentar HEAD no PDF (Content-Length)
        // 2) se obtiver tamanho, atualizar a coluna file_size no Supabase
        const needSize = list.filter(p => (p.file_size == null || p.file_size === '') && p.pdf_url && p.id);
        if (needSize.length > 0) {
            await Promise.all(needSize.map(async (p) => {
                const size = await getPdfSizeFromUrl(p.pdf_url);
                if (size == null) return;
                p.file_size = size;
                try {
                    const { error: upErr } = await supabase
                        .from('presentations')
                        .update({ file_size: size })
                        .eq('id', p.id);
                    if (upErr) {
                        // Se a coluna não existir / schema cache, não quebrar a API
                        console.warn('[playlist] não foi possível salvar file_size para id', p.id, '-', upErr.message || upErr);
                    }
                } catch (_) { /* ignorar */ }
            }));
        }

        res.json(list);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/playlist/:id', requireAuth, async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Supabase não configurado.' });
    }
    const { id } = req.params;
    const { title, event_date, location, extra_info, pregador } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (event_date !== undefined) updates.event_date = event_date || null;
    if (location !== undefined) updates.location = location || null;
    if (extra_info !== undefined) updates.extra_info = extra_info || null;
    if (pregador !== undefined) updates.pregador = pregador || null;

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    }
    try {
        const { data, error } = await supabase
            .from('presentations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/playlist/:id', requireAuth, async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Supabase não configurado.' });
    }
    const { id } = req.params;
    try {
        const { data: row, error: fetchError } = await supabase
            .from('presentations')
            .select('pdf_url')
            .eq('id', id)
            .single();

        if (fetchError || !row) {
            return res.status(404).json({ error: 'Apresentação não encontrada.' });
        }

        const { error: deleteRowError } = await supabase
            .from('presentations')
            .delete()
            .eq('id', id);

        if (deleteRowError) throw deleteRowError;

        const pathMatch = row.pdf_url && row.pdf_url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
        if (pathMatch && pathMatch[1]) {
            await supabase.storage.from(SUPABASE_BUCKET).remove([pathMatch[1]]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/playlist/:id/refresh-size', requireAuth, async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Supabase não configurado.' });
    }
    const { id } = req.params;
    try {
        const { data: row, error: fetchError } = await supabase
            .from('presentations')
            .select('pdf_url')
            .eq('id', id)
            .single();

        if (fetchError || !row || !row.pdf_url) {
            return res.status(404).json({ error: 'Apresentação não encontrada ou sem URL.' });
        }

        const fileSize = await getPdfSizeFromUrl(row.pdf_url);
        if (fileSize == null) {
            return res.status(400).json({ error: 'Não foi possível obter o tamanho do ficheiro.' });
        }

        const { data: updated, error: updateError } = await supabase
            .from('presentations')
            .update({ file_size: fileSize })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/playlist/load', requireAuth, async (req, res) => {
    if (!supabase) {
        return res.status(503).json({ error: 'Supabase não configurado.' });
    }
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'id não fornecido.' });
    }
    try {
        const { data, error } = await supabase
            .from('presentations')
            .select('pdf_url, file_name, title')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Apresentação não encontrada.' });
        }

        presentationState.pdfUrl = data.pdf_url;
        presentationState.fileName = data.file_name || data.title || 'Apresentação';
        presentationState.currentSlide = 1;
        presentationState.totalSlides = 0;

        io.emit('pdfLoaded', {
            pdfUrl: presentationState.pdfUrl,
            fileName: presentationState.fileName,
            currentSlide: presentationState.currentSlide
        });

        console.log('Playlist carregada:', presentationState.fileName);
        res.json({ success: true, pdfUrl: presentationState.pdfUrl, fileName: presentationState.fileName });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/totalSlides', express.json(), (req, res) => {
    const { totalSlides } = req.body;
    if (totalSlides && typeof totalSlides === 'number') {
        presentationState.totalSlides = totalSlides;
        io.emit('stateUpdated', presentationState);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'totalSlides inválido' });
    }
});

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    socket.emit('initialState', presentationState);

    socket.on('changePage', (data) => {
        const { page } = data;
        if (page >= 1 && (presentationState.totalSlides === 0 || page <= presentationState.totalSlides)) {
            presentationState.currentSlide = page;
            io.emit('pageUpdated', {
                currentSlide: presentationState.currentSlide,
                totalSlides: presentationState.totalSlides
            });
            console.log('Página alterada para:', page);
        }
    });

    socket.on('setTotalSlides', (data) => {
        const { totalSlides } = data;
        if (totalSlides && typeof totalSlides === 'number') {
            presentationState.totalSlides = totalSlides;
            io.emit('stateUpdated', presentationState);
            console.log('Total de slides definido:', totalSlides);
        }
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return 'localhost';
}

app.use((req, res) => {
    console.log('[404]', req.method, req.originalUrl);
    res.status(404).type('html').send('<h1>404</h1><p>Não encontrado: ' + escapeHtml(req.originalUrl) + '</p>');
});
function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

server.listen(PORT, () => {
    const localIP = getLocalIP();
    console.log('\n===========================================');
    console.log('   APRESENTADOR PDF - VPS + Supabase');
    console.log('===========================================');
    console.log('\n Servidor rodando em:');
    console.log('   - Local:   http://localhost:' + PORT);
    console.log('   - Rede:    http://' + localIP + ':' + PORT);
    console.log('\n Rotas: /  /playlist  /admin  /remote  /view');
    console.log('===========================================\n');
});
