const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do servidor
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Porta do servidor (configurável via variável de ambiente)
const PORT = process.env.PORT || 3000;

// Diretório de uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Garantir que o diretório de uploads existe
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Estado global da apresentação
let presentationState = {
    pdfUrl: null,
    currentSlide: 1,
    totalSlides: 0,
    fileName: null
};

// Configuração do Multer para upload de PDFs
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Usar timestamp para evitar conflitos de nome
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    // Aceitar apenas arquivos PDF
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Apenas arquivos PDF são permitidos!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // Limite de 50MB
    }
});

// Servir arquivos estáticos
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/slides', express.static('./slides')); // PDFs de teste

// Rota principal - página de upload
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota do projetor
app.get('/view', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'view.html'));
});

// Rota do apresentador
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Rota do controle remoto (celular)
app.get('/remote', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'remote.html'));
});

// API para obter IP local
app.get('/api/network', (req, res) => {
    res.json({
        ip: getLocalIP(),
        port: PORT
    });
});

// API de upload de PDF
app.post('/upload', upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado ou formato inválido.' });
    }

    // Atualizar estado global
    presentationState.pdfUrl = `/uploads/${req.file.filename}`;
    presentationState.fileName = req.file.originalname;
    presentationState.currentSlide = 1;
    // totalSlides será definido pelo cliente após carregar o PDF

    console.log(`PDF carregado: ${req.file.originalname}`);

    // Notificar todos os clientes sobre o novo PDF
    io.emit('pdfLoaded', {
        pdfUrl: presentationState.pdfUrl,
        fileName: presentationState.fileName,
        currentSlide: presentationState.currentSlide
    });

    res.json({
        success: true,
        pdfUrl: presentationState.pdfUrl,
        fileName: presentationState.fileName
    });
});

// API para obter estado atual
app.get('/api/state', (req, res) => {
    res.json(presentationState);
});

// API para listar PDFs de teste na pasta slides
app.get('/api/slides', (req, res) => {
    const slidesDir = './slides';
    if (fs.existsSync(slidesDir)) {
        const files = fs.readdirSync(slidesDir).filter(f => f.toLowerCase().endsWith('.pdf'));
        res.json(files.map(f => ({
            name: f,
            url: `/slides/${encodeURIComponent(f)}`
        })));
    } else {
        res.json([]);
    }
});

// API para carregar um PDF de teste
app.post('/api/loadTestPdf', express.json(), (req, res) => {
    const { url, fileName } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL não fornecida' });
    }
    
    // Atualizar estado global
    presentationState.pdfUrl = url;
    presentationState.fileName = fileName || url.split('/').pop();
    presentationState.currentSlide = 1;
    presentationState.totalSlides = 0; // Será atualizado pelo cliente
    
    console.log(`PDF de teste carregado: ${presentationState.fileName}`);
    
    // Notificar todos os clientes
    io.emit('pdfLoaded', {
        pdfUrl: presentationState.pdfUrl,
        fileName: presentationState.fileName,
        currentSlide: presentationState.currentSlide
    });
    
    res.json({ success: true });
});

// API para definir total de slides (chamado pelo cliente após carregar PDF)
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

// Conexão Socket.io
io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Enviar estado atual para o novo cliente
    socket.emit('initialState', presentationState);

    // Receber evento de mudança de página
    socket.on('changePage', (data) => {
        const { page } = data;
        
        // Validar página
        if (page >= 1 && (presentationState.totalSlides === 0 || page <= presentationState.totalSlides)) {
            presentationState.currentSlide = page;
            
            // Emitir para TODOS os clientes (incluindo o remetente)
            io.emit('pageUpdated', {
                currentSlide: presentationState.currentSlide,
                totalSlides: presentationState.totalSlides
            });
            
            console.log(`Página alterada para: ${page}`);
        }
    });

    // Receber total de slides do cliente
    socket.on('setTotalSlides', (data) => {
        const { totalSlides } = data;
        if (totalSlides && typeof totalSlides === 'number') {
            presentationState.totalSlides = totalSlides;
            io.emit('stateUpdated', presentationState);
            console.log(`Total de slides definido: ${totalSlides}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

// Obter IP local para exibir no console
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Pular endereços não-IPv4 e internos
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

// Iniciar servidor
server.listen(PORT, () => {
    const localIP = getLocalIP();
    console.log('\n===========================================');
    console.log('   APLICAÇÃO CURSOR - Apresentador de PDF');
    console.log('===========================================');
    console.log(`\n Servidor rodando em:`);
    console.log(`   - Local:   http://localhost:${PORT}`);
    console.log(`   - Rede:    http://${localIP}:${PORT}`);
    console.log('\n Rotas disponíveis:');
    console.log(`   - Upload:       http://${localIP}:${PORT}/`);
    console.log(`   - Projetor:     http://${localIP}:${PORT}/view`);
    console.log(`   - Apresentador: http://${localIP}:${PORT}/admin`);
    console.log('\n===========================================\n');
});
