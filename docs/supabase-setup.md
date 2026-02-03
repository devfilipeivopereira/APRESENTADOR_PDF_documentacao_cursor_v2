# Configuração do Supabase (VPS)

Configure o Supabase auto-hospedado na sua VPS antes de rodar o servidor.

## 1. Bucket no Storage

1. No painel do Supabase (Studio), vá em **Storage**.
2. Crie um bucket chamado **`presentations`** (ou use outro nome e defina `SUPABASE_BUCKET` no `.env`).
3. Marque o bucket como **público** (Public bucket) para que o frontend carregue os PDFs por URL, ou use signed URLs e ajuste o código para gerar URLs assinadas.
4. Em **Policies**, permita:
   - **Upload:** apenas via service role (o Node usa `SUPABASE_SERVICE_ROLE_KEY`).
   - **Leitura:** pública para o bucket (ou política que permita GET nos objetos).

## 2. Tabela `presentations` (playlist)

Execute no **SQL Editor** do Supabase:

```sql
create table if not exists presentations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  pdf_url text not null,
  file_name text,
  file_size bigint,
  pregador text,
  event_date date,
  location text,
  extra_info text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Opcional: desabilitar RLS se apenas o servidor (service_role) acessar
alter table presentations enable row level security;

-- Política: permitir tudo via service_role (o Node usa essa chave)
create policy "Service role full access"
  on presentations for all
  using (true)
  with check (true);
```

Se a tabela `presentations` já existir, adicione as colunas em falta:

```sql
alter table presentations add column if not exists pregador text;
alter table presentations add column if not exists file_size bigint;
```

Se preferir não usar RLS, desabilite:

```sql
alter table presentations disable row level security;
```

## 3. CORS no Storage (se o app estiver em outro domínio)

Se o frontend rodar em `http://IP_DA_VPS:3000` e o Supabase em outro host, configure CORS no bucket para permitir a origem do app. No Supabase auto-hospedado isso pode ser feito nas configurações do Storage ou no proxy (ex.: permitir `Access-Control-Allow-Origin` para a origem do app).

## 4. Variáveis de ambiente

No `.env` do projeto:

- `SUPABASE_URL` – URL do Supabase (ex.: `https://seu-dominio.com`).
- `SUPABASE_SERVICE_ROLE_KEY` – chave **service_role** do Supabase (não use a anon key no servidor).
- `SUPABASE_BUCKET` – (opcional) nome do bucket; padrão: `presentations`.
