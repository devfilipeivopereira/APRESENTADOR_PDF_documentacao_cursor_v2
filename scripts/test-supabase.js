/**
 * Testa conexão com Supabase, tabela presentations e bucket.
 * Uso: node scripts/test-supabase.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'presentations';

function log(msg, type = 'info') {
    const prefix = type === 'ok' ? '[OK]' : type === 'err' ? '[ERRO]' : '[INFO]';
    console.log(prefix, msg);
}

async function main() {
    console.log('\n=== Teste de conexão Supabase ===\n');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        log('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos no .env', 'err');
        log('SUPABASE_URL presente: ' + !!SUPABASE_URL);
        log('SUPABASE_SERVICE_ROLE_KEY presente: ' + !!SUPABASE_SERVICE_ROLE_KEY);
        log('');
        log('No seu .env (na raiz do projeto) adicione:');
        log('  SUPABASE_URL=https://seu-projeto.supabase.co');
        log('  SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role');
        log('  SUPABASE_BUCKET=presentations');
        log('Depois rode de novo: node scripts/test-supabase.js');
        process.exit(1);
    }

    log('SUPABASE_URL: ' + SUPABASE_URL);
    log('SUPABASE_BUCKET: ' + SUPABASE_BUCKET);
    log('Chave (service_role) definida: ' + (SUPABASE_SERVICE_ROLE_KEY ? 'sim' : 'não') + '\n');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1) Testar acesso à API (qualquer request)
    try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) {
            log('Storage (listBuckets): ' + bucketsError.message, 'err');
            log('Código: ' + bucketsError.name || '');
        } else {
            log('Conexão com Supabase: OK');
            log('Buckets existentes: ' + (buckets && buckets.length ? buckets.map(b => b.name).join(', ') : 'nenhum'));
        }
    } catch (e) {
        log('Exceção ao testar Storage: ' + e.message, 'err');
    }

    // 2) Verificar se o bucket existe e listar arquivos (opcional)
    try {
        const { data: files, error: listError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .list('', { limit: 5 });
        if (listError) {
            log('Bucket "' + SUPABASE_BUCKET + '": ' + listError.message, 'err');
            log('Crie o bucket em Storage no painel do Supabase e marque como público se necessário.');
        } else {
            log('Bucket "' + SUPABASE_BUCKET + '" acessível. Arquivos (até 5): ' + (files && files.length ? files.length : 0), 'ok');
        }
    } catch (e) {
        log('Bucket: ' + e.message, 'err');
    }

    // 3) Tabela presentations: SELECT
    try {
        const { data: rows, error: selectError } = await supabase
            .from('presentations')
            .select('id, title, file_name, event_date, location, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (selectError) {
            log('Tabela presentations: ' + selectError.message, 'err');
            log('Código Supabase: ' + (selectError.code || selectError.details || ''));
            log('Crie a tabela com o SQL em docs/supabase-setup.md');
        } else {
            log('Tabela presentations: OK. Registros (até 5): ' + (rows ? rows.length : 0), 'ok');
            if (rows && rows.length > 0) {
                rows.forEach((r, i) => console.log('  ' + (i + 1) + ') ' + (r.title || r.file_name) + ' (id: ' + r.id + ')'));
            }
        }
    } catch (e) {
        log('Tabela presentations (exceção): ' + e.message, 'err');
    }

    // 4) Teste de INSERT (opcional, apenas se quiser validar escrita)
    try {
        const { data: insertData, error: insertError } = await supabase
            .from('presentations')
            .insert({
                title: 'Teste conexão ' + new Date().toISOString(),
                pdf_url: 'https://example.com/test.pdf',
                file_name: 'test.pdf',
                event_date: null,
                location: null,
                extra_info: null
            })
            .select('id')
            .single();

        if (insertError) {
            log('INSERT de teste: ' + insertError.message, 'err');
        } else {
            log('INSERT de teste: OK (id: ' + insertData.id + ')', 'ok');
            await supabase.from('presentations').delete().eq('id', insertData.id);
        }
    } catch (e) {
        log('INSERT de teste (exceção): ' + e.message, 'err');
    }

    // 5) Teste de UPLOAD para Storage (buffer PDF mínimo)
    try {
        const testPath = 'test-' + Date.now() + '-upload.pdf';
        const minimalPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n%%EOF', 'utf8');
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(testPath, minimalPdf, { contentType: 'application/pdf', upsert: false });

        if (uploadError) {
            log('UPLOAD Storage: ' + (uploadError.message || uploadError.error || JSON.stringify(uploadError)), 'err');
            if (uploadError.message) log('Detalhes: ' + uploadError.message);
        } else {
            log('UPLOAD Storage: OK (path: ' + (uploadData && uploadData.path) + ')', 'ok');
            const { data: urlData } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(uploadData.path);
            log('URL pública: ' + urlData.publicUrl);
            await supabase.storage.from(SUPABASE_BUCKET).remove([testPath]);
        }
    } catch (e) {
        log('UPLOAD Storage (exceção): ' + e.message, 'err');
    }

    console.log('\n=== Fim do teste ===\n');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
