/**
 * admin.js - Lógica da interface do Apresentador
 * Versão 3 - Correção definitiva do preview
 */

const currentCanvasA = document.getElementById('currentCanvasA');
const currentCanvasB = document.getElementById('currentCanvasB');
const previewCanvasA = document.getElementById('previewCanvasA');
const previewCanvasB = document.getElementById('previewCanvasB');
const waitingMessage = document.getElementById('waitingMessage');
const connectionStatus = document.getElementById('connectionStatus');
const fileNameEl = document.getElementById('fileName');
const currentSlideEl = document.getElementById('currentSlide');
const totalSlidesEl = document.getElementById('totalSlides');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const endPresentationBtn = document.getElementById('endPresentationBtn');
const openSlidesDrawerBtn = document.getElementById('openSlidesDrawerBtn');
const slidesDrawer = document.getElementById('slidesDrawer');
const slidesDrawerOverlay = document.getElementById('slidesDrawerOverlay');
const adminSlidesGrid = document.getElementById('adminSlidesGrid');
const closeSlidesDrawerBtn = document.getElementById('closeSlidesDrawerBtn');
const mainSlide = document.getElementById('mainSlide');
const openViewBtn = document.getElementById('openViewBtn');
const previewSlideContainer = document.getElementById('previewSlideContainer');
const playlistSelect = document.getElementById('playlistSelect');
const playlistSearch = document.getElementById('playlistSearch');
const playlistSearchResults = document.getElementById('playlistSearchResults');
const playlistEmpty = document.getElementById('playlistEmpty');
const playlistError = document.getElementById('playlistError');
const playlistRefresh = document.getElementById('playlistRefresh');

/** Lista completa da playlist (para filtrar no "Procurar") */
let playlistItems = [];
const backupLocalSection = document.getElementById('backupLocalSection');
const backupLocalInput = document.getElementById('backupLocalInput');
const backupLocalBtn = document.getElementById('backupLocalBtn');
const backupLocalStatus = document.getElementById('backupLocalStatus');

// Double-buffer: slide principal e preview sem piscar
let displayedCanvas = currentCanvasA;
let bufferCanvas = currentCanvasB;
let displayedPreview = previewCanvasA;
let bufferPreview = previewCanvasB;

let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let projectorWindow = null;
let gridSlidesRendered = false;

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
    console.log('Estado inicial:', state);
    if (!state.pdfUrl) {
        clearPresentation();
        return;
    }
    await loadPDF(state.pdfUrl, state.fileName);
    currentPage = state.currentSlide || 1;
    totalPages = state.totalSlides || pdfDoc?.numPages || 0;
    updateUI();
    await safeRender();
});

socket.on('pageUpdated', async (data) => {
    console.log('Página atualizada:', data);
    if (data.currentSlide) {
        currentPage = data.currentSlide;
        if (data.totalSlides) totalPages = data.totalSlides;
        updateUI();
        await safeRender();
        highlightSlidesGrid();
    }
});

socket.on('pdfLoaded', async (data) => {
    console.log('Novo PDF:', data);
    if (data.pdfUrl) {
        await loadPDF(data.pdfUrl, data.fileName);
        currentPage = data.currentSlide || 1;
        updateUI();
        await safeRender();
    }
});

// Renderização segura com retry para iPad
async function safeRender() {
    await delay(200);
    await renderAll();
    await delay(400);
    await renderAll();
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

socket.on('stateUpdated', (state) => {
    if (!state.pdfUrl) {
        clearPresentation();
        return;
    }
    if (state.totalSlides) {
        totalPages = state.totalSlides;
        updateUI();
    }
});

function clearPresentation() {
    pdfDoc = null;
    currentPage = 1;
    totalPages = 0;
    if (waitingMessage) {
        waitingMessage.innerHTML = '<h2>Nenhuma apresentação carregada</h2><p><a href="/">Clique aqui</a> para fazer upload de um PDF</p>';
        waitingMessage.style.display = 'block';
    }
    currentCanvasA.style.display = 'none';
    currentCanvasB.style.display = 'none';
    previewCanvasA.style.display = 'none';
    previewCanvasB.style.display = 'none';
    if (fileNameEl) fileNameEl.textContent = '-';
    if (currentSlideEl) currentSlideEl.textContent = '-';
    if (totalSlidesEl) totalSlidesEl.textContent = '-';
    if (playlistError) {
        playlistError.style.display = 'none';
        playlistError.textContent = '';
    }
    gridSlidesRendered = false;
    updateButtons();
}

// --- Playlist: lista suspensa + procurar ---
function fillPlaylistSelect(items) {
    if (!playlistSelect) return;
    const opts = playlistSelect.querySelectorAll('option');
    for (let i = opts.length - 1; i >= 1; i--) opts[i].remove();
    items.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.title || p.file_name || 'Sem título';
        opt.title = p.event_date ? `${p.title || ''} – ${p.event_date}` : (p.title || '');
        playlistSelect.appendChild(opt);
    });
}

function filterPlaylistBySearch(q) {
    const qn = (q || '').trim().toLowerCase();
    if (!qn) return playlistItems;
    return playlistItems.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const file = (p.file_name || '').toLowerCase();
        const date = (p.event_date || '').toLowerCase();
        const location = (p.location || '').toLowerCase();
        const pregador = (p.pregador || '').toLowerCase();
        const extra = (p.extra_info || '').toLowerCase();
        return title.includes(qn) || file.includes(qn) || date.includes(qn) || location.includes(qn) || pregador.includes(qn) || extra.includes(qn);
    });
}

async function loadPlaylist() {
    if (!playlistSelect) return;
    playlistEmpty.style.display = 'none';
    playlistError.style.display = 'none';
    if (playlistSearch) playlistSearch.value = '';
    try {
        const res = await fetch('/api/playlist');
        if (!res.ok) throw new Error(res.statusText || 'Erro ao carregar');
        const items = await res.json();
        playlistItems = items || [];
        if (playlistItems.length === 0) {
            playlistEmpty.style.display = 'block';
            fillPlaylistSelect([]);
            return;
        }
        fillPlaylistSelect(playlistItems);
    } catch (err) {
        console.error('Playlist:', err);
        const msg = (err && err.message === 'Failed to fetch')
            ? 'Não foi possível contactar o servidor. Verifique a ligação e tente novamente (Atualizar).'
            : (err && err.message) || 'Erro ao carregar.';
        playlistError.textContent = msg;
        playlistError.style.display = 'block';
    }
}

async function loadPresentationFromPlaylist(id) {
    if (!playlistSelect) return;
    playlistEmpty.style.display = 'none';
    playlistError.style.display = 'none';
    playlistSelect.disabled = true;
    try {
        const res = await fetch('/api/playlist/load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || res.statusText || 'Erro ao carregar');
        }
        // pdfLoaded será emitido pelo servidor; admin já escuta e chama loadPDF
    } catch (err) {
        console.error('Load playlist:', err);
        const msg = (err && err.message === 'Failed to fetch')
            ? 'Não foi possível contactar o servidor. Verifique a ligação e se o servidor está a correr. Tente Atualizar.'
            : (err && err.message) || 'Erro ao carregar apresentação.';
        playlistError.textContent = msg;
        playlistError.style.display = 'block';
    } finally {
        playlistSelect.disabled = false;
    }
}

if (playlistRefresh) playlistRefresh.addEventListener('click', loadPlaylist);
if (playlistSelect) {
    playlistSelect.addEventListener('change', () => {
        const id = playlistSelect.value;
        if (id) loadPresentationFromPlaylist(id);
    });
}
function updateSearchResults() {
    const q = (playlistSearch && playlistSearch.value) ? playlistSearch.value.trim() : '';
    if (!playlistSearchResults) return;
    if (!q) {
        playlistSearchResults.classList.remove('visible');
        playlistSearchResults.innerHTML = '';
        return;
    }
    const filtered = filterPlaylistBySearch(playlistSearch.value);
    playlistSearchResults.classList.add('visible');
    if (filtered.length === 0) {
        playlistSearchResults.innerHTML = '<div class="playlist-result-empty">Nenhuma correspondência</div>';
        return;
    }
    playlistSearchResults.innerHTML = '';
    filtered.forEach((p) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'playlist-result-item';
        btn.textContent = p.title || p.file_name || 'Sem título';
        btn.title = [p.event_date, p.location, p.pregador].filter(Boolean).join(' · ') || (p.title || '');
        btn.addEventListener('click', () => {
            loadPresentationFromPlaylist(p.id);
            if (playlistSearch) playlistSearch.value = '';
            updateSearchResults();
        });
        playlistSearchResults.appendChild(btn);
    });
}

if (playlistSearch) {
    playlistSearch.addEventListener('input', () => {
        const filtered = filterPlaylistBySearch(playlistSearch.value);
        fillPlaylistSelect(filtered);
        updateSearchResults();
    });
    playlistSearch.addEventListener('focus', () => {
        if (playlistSearch.value.trim()) updateSearchResults();
    });
    playlistSearch.addEventListener('blur', () => {
        setTimeout(() => {
            if (playlistSearchResults) playlistSearchResults.classList.remove('visible');
        }, 200);
    });
}
loadPlaylist();

document.getElementById('adminLogoutLink')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await fetch('/api/logout', { method: 'POST' }); } catch (_) {}
    window.location.href = '/login';
});

(function() {
    const btn = document.getElementById('fullscreenBtn');
    if (!btn) return;
    function toggle() {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen();
    }
    function updateText() { btn.textContent = document.fullscreenElement ? '⛶ Sair da tela cheia' : '⛶ Tela cheia'; }
    btn.addEventListener('click', toggle);
    document.addEventListener('fullscreenchange', updateText);
})();

// Modo offline / backup: mostrar secção se o servidor tiver UPLOAD_DIR
(async function initBackupLocal() {
    if (!backupLocalSection || !backupLocalBtn || !backupLocalInput) return;
    try {
        const res = await fetch('/api/upload-local');
        const data = await res.json().catch(() => ({}));
        if (data.available) {
            backupLocalSection.style.display = 'block';
            backupLocalBtn.addEventListener('click', () => backupLocalInput.click());
            backupLocalInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                backupLocalStatus.textContent = 'A enviar...';
                backupLocalBtn.disabled = true;
                try {
                    const form = new FormData();
                    form.append('pdf', file);
                    const up = await fetch('/upload-local', { method: 'POST', body: form });
                    const result = await up.json().catch(() => ({}));
                    if (up.ok && result.success) {
                        backupLocalStatus.textContent = 'Carregado: ' + (result.fileName || file.name);
                    } else {
                        backupLocalStatus.textContent = 'Erro: ' + (result.error || up.statusText);
                    }
                } catch (err) {
                    backupLocalStatus.textContent = 'Erro: ' + (err.message || 'Falha de rede');
                } finally {
                    backupLocalBtn.disabled = false;
                    backupLocalInput.value = '';
                }
            });
        }
    } catch (_) {}
})();

async function loadPDF(url, fileName) {
    try {
        console.log('Carregando PDF:', url);
        waitingMessage.style.display = 'none';
        currentCanvasA.style.display = 'block';
        currentCanvasB.style.display = 'block';
        
        // Cache buster
        const cacheBuster = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
        pdfDoc = await pdfjsLib.getDocument(cacheBuster).promise;
        totalPages = pdfDoc.numPages;
        
        console.log('PDF carregado. Páginas:', totalPages);
        
        // Pré-carregar primeiras páginas para garantir metadados
        for (let i = 1; i <= Math.min(3, totalPages); i++) {
            const page = await pdfDoc.getPage(i);
            console.log(`Página ${i} pré-carregada, rotate: ${page.rotate || 0}`);
        }
        
        if (fileName) fileNameEl.textContent = fileName;
        socket.emit('setTotalSlides', { totalSlides: totalPages });
        updateButtons();
        
        return true;
    } catch (error) {
        console.error('Erro:', error);
        waitingMessage.innerHTML = `<h2>Erro ao carregar PDF</h2><p>${error.message}</p>`;
        waitingMessage.style.display = 'block';
        currentCanvasA.style.display = 'none';
        currentCanvasB.style.display = 'none';
        return false;
    }
}

/**
 * Renderiza slide atual (no buffer, depois troca) e preview
 */
async function renderAll() {
    if (!pdfDoc) return;
    
    // Slide atual: renderizar no buffer e trocar (transição suave)
    await renderSlide(currentPage, bufferCanvas, mainSlide, false);
    swapMainCanvases();
    
    // Preview do próximo: render no buffer e troca (transição suave)
    if (currentPage < totalPages) {
        previewCanvasA.style.display = 'block';
        previewCanvasB.style.display = 'block';
        await renderSlide(currentPage + 1, bufferPreview, previewSlideContainer, true);
        swapPreviewCanvases();
    } else {
        previewCanvasA.style.display = 'none';
        previewCanvasB.style.display = 'none';
    }
}

function swapMainCanvases() {
    bufferCanvas.style.zIndex = '1';
    displayedCanvas.style.zIndex = '0';
    const t = displayedCanvas;
    displayedCanvas = bufferCanvas;
    bufferCanvas = t;
}

function swapPreviewCanvases() {
    bufferPreview.style.zIndex = '1';
    displayedPreview.style.zIndex = '0';
    const t = displayedPreview;
    displayedPreview = bufferPreview;
    bufferPreview = t;
}

/**
 * Renderiza um slide em um canvas
 * isPreview: true para o preview (usa dimensões menores)
 * Compatível com todos dispositivos incluindo iPad
 */
async function renderSlide(pageNum, canvas, container, isPreview) {
    if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return;
    
    try {
        const page = await pdfDoc.getPage(pageNum);
        const ctx = canvas.getContext('2d');
        
        // Log da rotação original
        const pageRotation = page.rotate || 0;
        console.log(`Página ${pageNum} - rotação original: ${pageRotation}`);
        
        // Compensar rotação do PDF
        const compensateRotation = (360 - pageRotation) % 360;
        
        const baseViewport = page.getViewport({ scale: 1, rotation: compensateRotation });
        
        // Obter dimensões do container
        let maxWidth, maxHeight;
        
        if (isPreview) {
            const rect = previewSlideContainer.getBoundingClientRect();
            maxWidth = rect.width > 0 ? rect.width - 15 : 250;
            maxHeight = rect.height > 0 ? rect.height - 15 : 180;
        } else {
            const rect = container.getBoundingClientRect();
            maxWidth = rect.width > 0 ? rect.width - 20 : window.innerWidth * 0.6;
            maxHeight = rect.height > 0 ? rect.height - 20 : window.innerHeight * 0.6;
        }
        
        maxWidth = Math.max(maxWidth, 150);
        maxHeight = Math.max(maxHeight, 100);
        
        const scaleX = maxWidth / baseViewport.width;
        const scaleY = maxHeight / baseViewport.height;
        const scale = Math.min(scaleX, scaleY) * (isPreview ? 0.88 : 0.94);
        
        const viewport = page.getViewport({ scale: scale, rotation: compensateRotation });
        
        // Configurar canvas SEM pixel ratio para máxima compatibilidade
        const finalW = Math.floor(viewport.width);
        const finalH = Math.floor(viewport.height);
        
        canvas.width = finalW;
        canvas.height = finalH;
        canvas.style.width = finalW + 'px';
        canvas.style.height = finalH + 'px';
        
        // Reset completo do contexto
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, finalW, finalH);
        
        await page.render({
            canvasContext: ctx,
            viewport: viewport,
            intent: 'display'
        }).promise;
        
        console.log(`Página ${pageNum} ${isPreview ? '(preview)' : ''}: ${finalW}x${finalH}, rotation: ${compensateRotation}`);
        
    } catch (error) {
        console.error(`Erro página ${pageNum}:`, error);
    }
}

function updateUI() {
    currentSlideEl.textContent = currentPage;
    totalSlidesEl.textContent = totalPages;
    updateButtons();
}

function updateButtons() {
    prevBtn.disabled = !pdfDoc || currentPage <= 1;
    nextBtn.disabled = !pdfDoc || currentPage >= totalPages;
    if (endPresentationBtn) endPresentationBtn.disabled = !pdfDoc;
    if (openSlidesDrawerBtn) openSlidesDrawerBtn.disabled = !pdfDoc;
}

function updateConnectionStatus(connected) {
    connectionStatus.textContent = connected ? 'Conectado' : 'Desconectado';
    connectionStatus.className = 'connection-status ' + (connected ? 'connected' : 'disconnected');
}

function previousPage() {
    if (currentPage > 1) goToPage(currentPage - 1);
}

function nextPage() {
    if (currentPage < totalPages) goToPage(currentPage + 1);
}

async function goToPage(pageNum) {
    if (!pdfDoc || pageNum < 1 || pageNum > totalPages) return;
    currentPage = pageNum;
    socket.emit('changePage', { page: currentPage });
    updateUI();
    await renderAll();
    highlightSlidesGrid();
}

// Drawer: todos os slides
function openSlidesDrawer() {
    if (!slidesDrawer || !slidesDrawerOverlay) return;
    slidesDrawer.classList.add('open');
    slidesDrawerOverlay.classList.add('open');
    if (!gridSlidesRendered) buildSlidesGrid();
    else highlightSlidesGrid();
}

function closeSlidesDrawer() {
    if (slidesDrawer) slidesDrawer.classList.remove('open');
    if (slidesDrawerOverlay) slidesDrawerOverlay.classList.remove('open');
}

async function buildSlidesGrid() {
    if (!pdfDoc || !adminSlidesGrid) return;
    adminSlidesGrid.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const div = document.createElement('div');
        div.className = 'admin-grid-slide' + (i === currentPage ? ' active' : '');
        div.dataset.page = i;
        div.innerHTML = '<div class="admin-grid-slide-canvas"><canvas></canvas></div><div class="admin-grid-slide-num">' + i + '</div>';
        const canvas = div.querySelector('canvas');
        div.addEventListener('click', () => {
            goToPage(i);
            closeSlidesDrawer();
        });
        adminSlidesGrid.appendChild(div);
        await renderThumbnailAdmin(i, canvas);
    }
    gridSlidesRendered = true;
}

async function renderThumbnailAdmin(pageNum, canvas) {
    if (!pdfDoc || pageNum < 1 || pageNum > totalPages || !canvas) return;
    try {
        const page = await pdfDoc.getPage(pageNum);
        const pageRotation = page.rotate || 0;
        const compensateRotation = (360 - pageRotation) % 360;
        const baseViewport = page.getViewport({ scale: 1, rotation: compensateRotation });
        const scale = 100 / Math.max(baseViewport.width, baseViewport.height);
        const viewport = page.getViewport({ scale: scale, rotation: compensateRotation });
        const finalW = Math.floor(viewport.width);
        const finalH = Math.floor(viewport.height);
        canvas.width = finalW;
        canvas.height = finalH;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'contain';
        canvas.style.display = 'block';
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, finalW, finalH);
        await page.render({ canvasContext: ctx, viewport: viewport, intent: 'display' }).promise;
    } catch (err) {
        console.error('Erro thumb apresentador', pageNum, err);
    }
}

function highlightSlidesGrid() {
    if (!adminSlidesGrid) return;
    adminSlidesGrid.querySelectorAll('.admin-grid-slide').forEach(el => {
        el.classList.toggle('active', +el.dataset.page === currentPage);
    });
}

function openProjectorWindow() {
    if (projectorWindow && !projectorWindow.closed) {
        projectorWindow.focus();
        return;
    }
    
    projectorWindow = window.open(
        '/view',
        'CursorProjetor',
        `width=1024,height=768,left=${window.screen.availWidth},top=0,menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
    
    if (projectorWindow) {
        projectorWindow.focus();
        const check = setInterval(() => {
            if (projectorWindow?.closed) {
                projectorWindow = null;
                clearInterval(check);
                updateOpenViewButton();
            }
        }, 1000);
        updateOpenViewButton();
    } else {
        alert('Bloqueador de pop-ups ativo. Permita pop-ups para este site.');
    }
}

function updateOpenViewButton() {
    if (openViewBtn) {
        openViewBtn.textContent = (projectorWindow && !projectorWindow.closed) 
            ? '🖥️ Focar Projetor' 
            : '🖥️ Abrir Projetor';
    }
}

// Event Listeners
prevBtn.addEventListener('click', previousPage);
nextBtn.addEventListener('click', nextPage);
if (openSlidesDrawerBtn) openSlidesDrawerBtn.addEventListener('click', openSlidesDrawer);
if (closeSlidesDrawerBtn) closeSlidesDrawerBtn.addEventListener('click', closeSlidesDrawer);
if (slidesDrawerOverlay) slidesDrawerOverlay.addEventListener('click', closeSlidesDrawer);
if (endPresentationBtn) {
    endPresentationBtn.addEventListener('click', () => {
        if (!pdfDoc) return;
        if (confirm('Encerrar a apresentação? O projetor e o controle remoto voltarão ao estado vazio.')) {
            socket.emit('endPresentation');
            clearPresentation();
        }
    });
}
if (openViewBtn) openViewBtn.addEventListener('click', openProjectorWindow);

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
            e.preventDefault();
            previousPage();
            break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
            e.preventDefault();
            nextPage();
            break;
        case 'Home':
            e.preventDefault();
            goToPage(1);
            break;
        case 'End':
            e.preventDefault();
            goToPage(totalPages);
            break;
        case 'p':
        case 'P':
            e.preventDefault();
            openProjectorWindow();
            break;
    }
});

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (pdfDoc) renderAll();
    }, 300);
});

// Touch
let touchStartX = 0;
mainSlide.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

mainSlide.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) {
        diff > 0 ? nextPage() : previousPage();
    }
}, { passive: true });

updateOpenViewButton();
console.log('Admin.js - Apresentador com transição suave');
