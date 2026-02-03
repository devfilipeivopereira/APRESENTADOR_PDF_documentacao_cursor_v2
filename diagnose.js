/**
 * Script de diagnóstico para analisar propriedades dos PDFs
 */

const fs = require('fs');
const path = require('path');

// Simular carregamento do PDF.js no Node
const pdfjsLib = require('pdfjs-dist');

async function analyzePDF(filePath) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Analisando: ${path.basename(filePath)}`);
    console.log('='.repeat(60));
    
    try {
        const data = new Uint8Array(fs.readFileSync(filePath));
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        
        console.log(`Total de páginas: ${pdf.numPages}`);
        
        for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
            const page = await pdf.getPage(i);
            
            // Propriedades da página
            const rotation = page.rotate;
            const viewport = page.getViewport({ scale: 1 });
            const viewportRotated = page.getViewport({ scale: 1, rotation: 0 });
            
            console.log(`\nPágina ${i}:`);
            console.log(`  - Rotação original (page.rotate): ${rotation}°`);
            console.log(`  - Viewport padrão: ${viewport.width.toFixed(0)} x ${viewport.height.toFixed(0)}`);
            console.log(`  - Viewport rotation=0: ${viewportRotated.width.toFixed(0)} x ${viewportRotated.height.toFixed(0)}`);
            console.log(`  - Orientação: ${viewport.width > viewport.height ? 'PAISAGEM' : 'RETRATO'}`);
            
            // MediaBox e outras propriedades
            const view = page.view; // [x, y, width, height]
            if (view) {
                console.log(`  - View (mediaBox): [${view.join(', ')}]`);
                console.log(`  - Dimensões reais: ${view[2]} x ${view[3]}`);
            }
        }
        
    } catch (error) {
        console.error(`Erro ao analisar ${filePath}:`, error.message);
    }
}

async function main() {
    const slidesDir = path.join(__dirname, 'slides');
    
    if (!fs.existsSync(slidesDir)) {
        console.log('Pasta slides não encontrada');
        return;
    }
    
    const files = fs.readdirSync(slidesDir).filter(f => f.endsWith('.pdf'));
    
    console.log(`\nEncontrados ${files.length} PDFs na pasta slides\n`);
    
    for (const file of files) {
        await analyzePDF(path.join(slidesDir, file));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Diagnóstico concluído');
    console.log('='.repeat(60));
}

main();
