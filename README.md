# Apresentador PDF – VPS + Supabase

Aplicação Node.js para apresentações de PDF em tempo real. PDFs no Supabase Storage; playlist com data, local e informações extras; roda na VPS Ubuntu (sem Nginx). Controle pelo computador ou celular/tablet; exibição no projetor sem piscar (estilo PowerPoint/Keynote).

## Funcionalidades

- **Login** (`/login`) – tela de entrada antes da página inicial (variáveis `LOGIN_USER`, `LOGIN_PASSWORD`, `SESSION_SECRET` no `.env`); rotas `/`, `/playlist` e `/admin` protegidas
- **Playlist** (`/playlist`) – minhas apresentações: upload de PDF para Supabase Storage, data, local, informações extras; editar, excluir, iniciar apresentação
- **Upload de PDF** na página inicial ou na playlist (Supabase); ou no Apresentador como **modo offline** (PDF no servidor, sem internet)
- **Modo online (Supabase)** – upload e playlist na nuvem; requer internet
- **Modo offline / backup** – no Apresentador, "Carregar PDF do computador" (PDF em `uploads/`, `UPLOAD_DIR` no `.env`); sincronização de slides na rede local
- **Projetor** (`/view`) – tela cheia, transição suave (double-buffer)
- **Apresentador** (`/admin`) – slide atual + preview do próximo, controles, atalhos e secção de backup local
- **Controle remoto** (`/remote`) – uso em celular/tablet, setas e Espaço no teclado
- **Tela cheia** – botão em todas as telas (página inicial, Playlist, Apresentador, Controle remoto, Login, Projetor)
- **Sincronização em tempo real** via Socket.io
- **Acesso na rede** – links por IP para projetor e controle remoto

## Pré-requisitos

- Node.js (LTS recomendado)
- npm

## Instalação

```bash
git clone https://github.com/devfilipeivopereira/APRESENTADOR_PDF_documentacao_cursor_v2.git
cd APRESENTADOR_PDF_documentacao_cursor_v2
npm install
```

## Execução

```bash
npm start
```

Ou em modo desenvolvimento (reinício automático):

```bash
npm run dev
```

O servidor inicia na porta 3000 e exibe o IP da rede no console.

## Uso

1. **Login** – Aceda a `http://IP:3000` ou `http://IP:3000/login`; introduza o utilizador e a palavra-passe (se configurado no `.env`).
2. **Página inicial** – Menu com Playlist, Apresentador, Controle remoto, Projetor e upload de PDF (Supabase).
3. **Playlist** – `http://IP:3000/playlist` para adicionar apresentações (PDF + data, local, extras), editar, excluir e iniciar.
4. **Upload** – Na página inicial ou na playlist: envie o PDF (grava no Supabase e na playlist). Ou no Apresentador: "Carregar PDF do computador" (modo offline).
5. **Apresentador** – `http://IP:3000/admin` (slide atual, próximo, navegação, atalhos, backup local).
6. **Projetor** – `http://IP:3000/view` (tela cheia, ideal para projetor).
7. **Controle remoto** – `http://IP:3000/remote` (celular/tablet na mesma rede).

### Atalhos (Apresentador)

- **← / →** ou **Espaço** – próximo slide  
- **P** – abrir projetor em nova janela  

## Estrutura do projeto

```
├── server.js           # Servidor Express + Socket.io + Supabase
├── package.json
├── .env.example        # PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
├── public/
│   ├── index.html      # Menu + upload (Supabase)
│   ├── login.html      # Página de login
│   ├── playlist.html   # Playlist (data, local, extras)
│   ├── admin.html     # Apresentador (incl. backup local)
│   ├── view.html      # Projetor
│   ├── remote.html    # Controle remoto
│   └── js/
│       ├── admin.js
│       └── view.js
├── uploads/            # PDFs do modo offline (se UPLOAD_DIR=./uploads)
└── docs/               # Documentação (incl. supabase-setup.md)
```

## Documentação

Documentação completa em **[docs/](docs/)**:

- [Visão geral e como usar](docs/README.md)
- [Arquitetura](docs/arquitetura.md)
- [Modelo de dados](docs/modelo_de_dados.md)
- [Tecnologias](docs/tecnologias.md)
- [Fluxo](docs/fluxo.md)
- [Rede e segurança](docs/comunicacao_rede_seguranca.md)

## Configuração

1. Copie `.env.example` para `.env`.
2. **Login (opcional):** Defina `LOGIN_USER`, `LOGIN_PASSWORD` e `SESSION_SECRET` para proteger a página inicial, Playlist e Apresentador. Se não definir, a app funciona sem login.
3. **Modo offline (opcional):** Defina `UPLOAD_DIR=./uploads` para ativar "Carregar PDF do computador" no Apresentador (PDF guardado no servidor, sem Supabase).
4. **Supabase (modo online):** Crie o bucket e a tabela conforme [docs/supabase-setup.md](docs/supabase-setup.md). No `.env`:
   - `PORT` – porta do servidor (padrão: 3000)
   - `BASE_URL` – em produção com HTTPS, use `https://teu-dominio.com` (evita Mixed Content nos PDFs do modo offline)
   - `SUPABASE_URL` – URL do Supabase na VPS
   - `SUPABASE_SERVICE_ROLE_KEY` – chave service_role do Supabase
   - `SUPABASE_BUCKET` – (opcional) nome do bucket; padrão: `presentations`

## Deploy na VPS (Ubuntu)

Sem Nginx: o Node serve o frontend e as APIs.

```bash
git clone <URL_DO_REPO>
cd <nome_do_repo>
npm install
cp .env.example .env
# Edite .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
npm start
# Ou com PM2: pm2 start server.js --name apresentador-pdf
```

Acesso: `http://IP_DA_VPS:3000`.

## Licença

MIT.
