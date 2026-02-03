# Aplicação Cursor: Apresentações de PDF Sincronizadas

## Visão Geral

A Aplicação Cursor é uma solução para realizar apresentações de PDF de forma sincronizada em rede local ou online. Oferece experiência fluida para o apresentador e audiência, com interfaces distintas para controle e visualização. Utiliza Node.js, Express, Socket.io e PDF.js para sincronização em tempo real e exibição otimizada dos slides.

## Autenticação

*   **Login (`/login`):** Tela de entrada antes da página inicial. Acesso protegido com utilizador e palavra-passe (variáveis `LOGIN_USER` e `LOGIN_PASSWORD` no `.env`). Se não estiverem definidas, a aplicação funciona sem login.
*   **Rotas protegidas:** `/`, `/playlist` e `/admin` exigem sessão válida; `/view` e `/remote` permanecem públicos para o projetor e controlo remoto.
*   **Sessão:** express-session com cookie `httpOnly`; variável `SESSION_SECRET` no `.env`.

## Modo Online e Modo Offline

*   **Online (Supabase):** Upload na página inicial ou na Playlist → PDF vai para Supabase Storage, metadados para a tabela `presentations`. Playlist lista e carrega apresentações. Requer internet.
*   **Offline / backup:** No Apresentador (`/admin`), secção "Modo offline / backup" → "Carregar PDF do computador". O PDF é guardado no servidor (pasta `uploads/`, configurável com `UPLOAD_DIR` no `.env`). Não usa Supabase; funciona só com rede local. A sincronização de slides (WebSocket) continua a funcionar na rede local. **Em produção (HTTPS):** defina `BASE_URL=https://teu-dominio.com` no `.env` para que as URLs dos PDFs locais sejam HTTPS e o browser não bloqueie por Mixed Content.

## Funcionalidades Principais

*   **Playlist (`/playlist`):** Gerir apresentações: upload de PDF para Supabase Storage, cadastro com data, local e informações extras; editar, excluir e iniciar apresentação.
*   **Upload de PDF:** Na página inicial ou na playlist (Supabase); ou no Apresentador como backup local (modo offline).
*   **Sincronização em Tempo Real:** Todos os dispositivos conectados exibem o mesmo slide simultaneamente (Socket.io).
*   **Interface de Projetor (`/view`):** Tela limpa e em tela cheia, ideal para projetores. Transição suave entre slides (double-buffer, sem piscar).
*   **Interface de Apresentador (`/admin`):** Painel de controle com slide atual, preview do próximo (double-buffer), botões de navegação, atalhos de teclado e secção de backup local.
*   **Controle Remoto (`/remote`):** Interface para celular e tablet na rede; setas e Espaço no teclado; layout adaptável. Em mobile (≤768px) o header mostra apenas ícones (tela cheia, página inicial, slides, estado da conexão) e oculta o texto "Controle remoto".
*   **Tela cheia:** Todas as telas (página inicial, Playlist, Apresentador, Controle remoto, Login, Projetor) têm botão para alternar tela cheia (Fullscreen API).
*   **Responsividade:** Interfaces otimizadas para desktop, tablet e celular (incluindo iPad).

## Estrutura da Documentação

Esta pasta `/docs` contém a documentação completa do projeto, organizada nos seguintes arquivos:

*   [`arquitetura.md`](./arquitetura.md): Estrutura da aplicação, backend, frontend e fluxo de comunicação.
*   [`modelo_de_dados.md`](./modelo_de_dados.md): Modelo de dados do estado da apresentação.
*   [`tecnologias.md`](./tecnologias.md): Tecnologias utilizadas (Node.js, Express, Socket.io, PDF.js).
*   [`fluxo.md`](./fluxo.md): Fluxo de execução, da inicialização à sincronização dos slides.
*   [`comunicacao_rede_seguranca.md`](./comunicacao_rede_seguranca.md): Rede, portas e segurança.
*   [`supabase-setup.md`](./supabase-setup.md): Configuração do Supabase (bucket e tabela `presentations`) na VPS.
*   **[`deploy-do-zero.md`](./deploy-do-zero.md):** Deploy na VPS do zero (Node, projeto, .env, PM2, Nginx, HTTPS).
*   [`deploy-vps.md`](./deploy-vps.md): Deploy na VPS – guia detalhado.
*   [`atualizar-vps-agora.md`](./atualizar-vps-agora.md): Atualizar a VPS (código + .env) após push.
*   [`comandos-atualizar-vps.md`](./comandos-atualizar-vps.md): Comandos copy-paste para atualizar a VPS.
*   [`deploy-checklist.md`](./deploy-checklist.md): Checklist rápido de deploy.

### Arquivos de Configuração Essenciais

*   `package.json`: Define as dependências do projeto e scripts de execução.
*   `.gitignore`: Lista de arquivos e diretórios a serem ignorados pelo controle de versão (Git).
*   `.env.example`: Exemplo de arquivo para configuração de variáveis de ambiente.


## Como Usar a Aplicação

### Pré-requisitos

Certifique-se de ter o Node.js (versão LTS recomendada) e o npm instalados em sua máquina.

### Instalação

1.  **Clone o repositório (se aplicável):**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd <nome_do_repositorio>
    ```
2.  **Instale as dependências:**
    ```bash
    npm install
    ```

### Execução

1.  **Configure o `.env`:** Copie `.env.example` para `.env`. Defina pelo menos `PORT`, e para login: `LOGIN_USER`, `LOGIN_PASSWORD`, `SESSION_SECRET`. Para Supabase (modo online): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Para modo offline: `UPLOAD_DIR=./uploads`.

2.  **Inicie o servidor:**
    ```bash
    npm start
    # ou: node server.js
    # ou com nodemon: npm run dev
    ```
    O servidor inicia e exibe o IP local e a porta (ex: `http://192.168.1.x:3000`).

3.  **Login:** Aceda a `http://IP:3000` ou `http://IP:3000/login`. Se o login estiver ativo, introduza o utilizador e a palavra-passe.

4.  **Página inicial:** Após login, aceda ao menu (upload, Playlist, Apresentador, Controle remoto, Projetor).

5.  **Apresentador:** `http://IP:3000/admin` (slide atual, próximo, navegação, backup local).
6.  **Projetor:** `http://IP:3000/view` (tela cheia).
7.  **Controle remoto:** `http://IP:3000/remote` (celular/tablet na mesma rede).

### Navegação na Apresentação

Na interface do apresentador (`/admin`):

*   Use os botões **Anterior** e **Próximo** para mudar de slide.
*   Use as setas do teclado (← e →) ou a tecla **Espaço** para navegar.
*   O preview do próximo slide é exibido sem piscar (double-buffer).

Na interface do projetor (`/view`):

*   O slide será atualizado automaticamente conforme o apresentador avança ou retrocede.
*   Um botão discreto de fullscreen estará disponível para otimizar a visualização.

## Desenvolvimento

### Estrutura de Pastas

```
.
├── server.js             # Servidor Node.js (Express, Socket.io, Supabase, sessão, upload local)
├── package.json          # Dependências (express-session, multer, etc.)
├── .env.example          # Exemplo de variáveis de ambiente (LOGIN_*, SUPABASE_*, UPLOAD_DIR)
├── public/               # Frontend
│   ├── index.html        # Menu + upload de PDF (Supabase)
│   ├── login.html        # Página de login
│   ├── playlist.html     # Playlist (Supabase)
│   ├── view.html         # Interface do projetor
│   ├── admin.html        # Interface do apresentador (incl. backup local)
│   ├── remote.html       # Controle remoto (celular/tablet)
│   └── js/
│       ├── view.js
│       └── admin.js
├── uploads/              # PDFs do modo offline (se UPLOAD_DIR=./uploads)
└── docs/                 # Documentação
    ├── README.md
    ├── arquitetura.md
    ├── modelo_de_dados.md
    ├── tecnologias.md
    ├── fluxo.md
    └── comunicacao_rede_seguranca.md
```

### Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests no repositório do projeto.

### Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Autor:** Manus AI
**Data:** 02 de Fevereiro de 2026
