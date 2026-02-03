/**
 * view.js - Projetor com transição suave (double-buffer)
 * Sem piscar / tela branca ao trocar slide
 */

const canvasA = document.getElementById('pdfCanvasA');
const canvasB = document.getElementById('pdfCanvasB');
const waitingMessage = document.getElementById('waitingMessage');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const connectionStatus = document.getElementById('connectionStatus');
const container = document.getElementById('container');

// Double-buffer: um canvas visível, outro usado para pré-renderizar
let displayedCanvas = canvasA;
let bufferCanvas = canvasB;

let pdfDoc = null;
let currentPage = 1;
let isRendering = false;
let pendingPage = null;

const socket = io();

socket.on('connect', () => {
    console.log('Conectado ao servidor');
    updateConnectionStatus(true);
});

socket.on('disconnect', () => {
    console.log('Desconectado do servidor');
    updateConnectionStatus(false);
});

socket.on('initialState', async (state) => {
    console.log('Estado inicial recebido:', state);
    if (state.pdfUrl) {
        await loadPDF(state.pdfUrl);
        if (state.currentSlide) {
            currentPage = state.currentSlide;
            await safeRender();
        }
    }
});

socket.on('pageUpdated', async (data) => {
    console.log('Página atualizada:', data);
    if (data.currentSlide && data.currentSlide !== currentPage) {
        currentPage = data.currentSlide;
        await safeRender();
    }
});

socket.on('pdfLoaded', async (data) => {
    console.log('Novo PDF carregado:', data);
    if (data.pdfUrl) {
        await loadPDF(data.pdfUrl);
        currentPage = data.currentSlide || 1;
        await safeRender();
    }
});

// Renderização segura com retry para iPad
async function safeRender() {
    await delay(200);
    await renderPage(currentPage);
    await delay(400);
    await renderPage(currentPage);
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

socket.on('stateUpdated', (state) => {
    console.log('Estado atualizado:', state);
});

async function loadPDF(url) {
    try {
        console.log('Carregando PDF:', url);
        waitingMessage.style.display = 'none';
        canvasA.style.display = 'block';
        canvasB.style.display = 'block';
        
        // Cache buster
        const cacheBuster = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
        pdfDoc = await pdfjsLib.getDocument(cacheBuster).promise;
        console.log('PDF carregado. Páginas:', pdfDoc.numPages);
        
        // Pré-carregar primeiras páginas para garantir metadados
        for (let i = 1; i <= Math.min(3, pdfDoc.numPages); i++) {
            const page = await pdfDoc.getPage(i);
            console.log(`Página ${i} pré-carregada, rotate: ${page.rotate || 0}`);
        }
        
        socket.emit('setTotalSlides', { totalSlides: pdfDoc.numPages });
        return true;
    } catch (error) {
        console.error('Erro ao carregar PDF:', error);
        waitingMessage.innerHTML = `<h2>Erro ao carregar PDF</h2><p>${error.message}</p>`;
        waitingMessage.style.display = 'block';
        canvasA.style.display = 'none';
        canvasB.style.display = 'none';
        return false;
    }
}

/**
 * Renderiza a página no canvas de buffer e troca para exibição (sem piscar).
 */
async function renderPage(pageNum) {
    if (!pdfDoc) return;
    
    if (isRendering) {
        pendingPage = pageNum;
        return;
    }
    
    isRendering = true;
    
    try {
        const page = await pdfDoc.getPage(pageNum);
        
        const pageRotation = page.rotate || 0;
        const compensateRotation = (360 - pageRotation) % 360;
        
        let containerWidth = container.clientWidth || window.innerWidth;
        let containerHeight = container.clientHeight || window.innerHeight;
        containerWidth = Math.max(containerWidth - 10, 200);
        containerHeight = Math.max(containerHeight - 10, 150);
        
        const baseViewport = page.getViewport({ scale: 1, rotation: compensateRotation });
        const scaleX = containerWidth / baseViewport.width;
        const scaleY = containerHeight / baseViewport.height;
        const scale = Math.min(scaleX, scaleY) * 0.98;
        const viewport = page.getViewport({ scale: scale, rotation: compensateRotation });
        
        const finalW = Math.floor(viewport.width);
        const finalH = Math.floor(viewport.height);
        
        // Renderizar SEMPRE no buffer (nunca no canvas visível)
        bufferCanvas.width = finalW;
        bufferCanvas.height = finalH;
        bufferCanvas.style.width = finalW + 'px';
        bufferCanvas.style.height = finalH + 'px';
        
        const bufCtx = bufferCanvas.getContext('2d');
        bufCtx.setTransform(1, 0, 0, 1, 0, 0);
        bufCtx.clearRect(0, 0, finalW, finalH);
        
        await page.render({
            canvasContext: bufCtx,
            viewport: viewport,
            intent: 'display'
        }).promise;
        
        // Troca instantânea: buffer vira visível (sem clear no que está na tela)
        swapCanvases();
        
    } catch (error) {
        console.error('Erro ao renderizar:', error);
    }
    
    isRendering = false;
    
    if (pendingPage !== null && pendingPage !== pageNum) {
        const next = pendingPage;
        pendingPage = null;
        await renderPage(next);
    }
}

/** Troca qual canvas está na frente (z-index) e atualiza refs buffer/displayed */
function swapCanvases() {
    bufferCanvas.style.zIndex = '1';
    displayedCanvas.style.zIndex = '0';
    
    const prevDisplayed = displayedCanvas;
    displayedCanvas = bufferCanvas;
    bufferCanvas = prevDisplayed;
}

function updateConnectionStatus(connected) {
    connectionStatus.textContent = connected ? 'Conectado' : 'Desconectado';
    connectionStatus.className = 'connection-status ' + (connected ? 'connected' : 'disconnected');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(console.log);
        fullscreenBtn.textContent = 'Sair da Tela Cheia';
    } else {
        document.exitFullscreen();
        fullscreenBtn.textContent = 'Tela Cheia';
    }
}

fullscreenBtn.addEventListener('click', toggleFullscreen);
container.addEventListener('dblclick', toggleFullscreen);

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (pdfDoc && currentPage) renderPage(currentPage);
    }, 250);
});

document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.textContent = document.fullscreenElement ? 'Sair da Tela Cheia' : 'Tela Cheia';
    setTimeout(() => {
        if (pdfDoc && currentPage) renderPage(currentPage);
    }, 300);
});

console.log('View.js - Projetor com transição suave (double-buffer)');
