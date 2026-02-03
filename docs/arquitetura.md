# Arquitetura da Aplicação Cursor

## Visão Geral

A aplicação Cursor é projetada para fornecer apresentações de PDF sincronizadas em tempo real através de uma rede local. A arquitetura é dividida em duas partes principais: um **Backend** robusto em Node.js para gerenciamento de estado e comunicação, e um **Frontend** interativo para visualização e controle, com interfaces distintas para o projetor (`/view`) e o apresentador (`/admin`).

## Componentes da Arquitetura

### 1. Backend (Servidor Node.js)

O backend é o coração da aplicação, responsável por gerenciar o upload de PDFs, manter o estado global da apresentação e orquestrar a sincronização em tempo real entre todos os clientes conectados.

*   **Node.js:** Ambiente de execução JavaScript assíncrono e orientado a eventos, ideal para aplicações de rede escaláveis.
*   **Express.js:** Framework web para Node.js: rotas HTTP (`/`, `/login`, `/playlist`, `/view`, `/admin`, `/remote`), arquivos estáticos, API de upload (Supabase), upload local (`POST /upload-local` quando `UPLOAD_DIR` está definido) e APIs da playlist (`GET/PATCH/DELETE /api/playlist`, `POST /api/playlist/load`).
*   **express-session:** Sessão para login; rotas `/`, `/playlist` e `/admin` protegidas por `requireAuth` quando `LOGIN_USER` e `LOGIN_PASSWORD` estão definidos no `.env`.
*   **Supabase (auto-hospedado):** Storage para PDFs (modo online); tabela `presentations` para playlist (título, pdf_url, event_date, location, extra_info). O servidor usa a chave service_role para upload e CRUD.
*   **Modo offline / backup:** Se `UPLOAD_DIR` estiver definido, o servidor grava PDFs em disco e serve em `/uploads`; no Apresentador aparece "Carregar PDF do computador" (sem Supabase).
*   **Socket.io:** Biblioteca para comunicação bidirecional em tempo real baseada em eventos. É fundamental para:
    *   **Sincronização de Slides:** Enviar atualizações de `currentSlide` para todos os clientes instantaneamente.
    *   **Gerenciamento de Conexões:** Lidar com a entrada e saída de clientes, garantindo que novos clientes recebam o estado atual da apresentação.
*   **Multer:** Middleware para Express.js, utilizado especificamente para o tratamento de `multipart/form-data`, facilitando o upload de arquivos PDF para o servidor.

### 2. Frontend (Interfaces de Usuário)

O frontend consiste em duas interfaces distintas, cada uma otimizada para seu propósito específico, e ambas utilizam tecnologias web padrão para renderização e interatividade.

*   **Interface de Projetor (`/view`):** Tela cheia, transição suave entre slides (double-buffer).
*   **Interface de Apresentador (`/admin`):** Slide atual e preview do próximo (double-buffer), controles e atalhos de teclado.
*   **Controle Remoto (`/remote`):** Interface para celular/tablet na rede; swipe, menu retrátil com grade de slides (estilo Keynote).
*   **Playlist (`/playlist`):** Tela para gerenciar apresentações: upload para Supabase Storage, metadata (data, local, informações extras), editar, excluir e iniciar apresentação (carrega o PDF na sessão atual).
*   **PDF.js:** Renderização de PDF no navegador (elementos `canvas`).
*   **CSS (Flexbox/Grid):** Layout responsivo (desktop, tablet, celular, iPad) e tema dark.
*   **JavaScript (Vanilla):** Conexão Socket.io, eventos `pageUpdated`, atalhos, Fullscreen API.

## Fluxo de Dados e Comunicação

1.  **Login:** Se `LOGIN_USER` e `LOGIN_PASSWORD` estiverem definidos, o utilizador acede a `/login`, autentica-se e a sessão é guardada (cookie). Rotas `/`, `/playlist` e `/admin` exigem sessão válida; `/view` e `/remote` permanecem públicos.
2.  **Upload de PDF (modo online):** O apresentador acede a `/` ou `/playlist`, faz o upload de um PDF. O servidor envia o PDF para o Supabase Storage, insere um registro na tabela `presentations` (playlist) com data, local e informações extras, e atualiza o estado global (`pdfUrl` = URL pública do Supabase).
3.  **Upload de PDF (modo offline):** No Apresentador (`/admin`), secção "Modo offline / backup", o utilizador carrega um PDF do computador. O servidor grava o ficheiro em `UPLOAD_DIR` (ex.: `uploads/`), define `pdfUrl` como URL local (ex.: `http://servidor/uploads/ficheiro.pdf`) e emite `pdfLoaded`; não usa Supabase.
4.  **Conexão de Clientes:** Quando um cliente (seja `/view` ou `/admin`) se conecta via Socket.io, o servidor envia o estado atual (`currentSlide`, `pdfUrl`) para esse novo cliente.
5.  **Visualização (`/view`):** O cliente `/view` recebe o `pdfUrl`, carrega o PDF com PDF.js e renderiza o `currentSlide` em tela cheia. Ele escuta por eventos `pageUpdated` para atualizar o slide.
6.  **Controle (`/admin`):** O cliente `/admin` também recebe o estado, exibe o `currentSlide` e um preview do próximo. O apresentador interage com botões ou atalhos de teclado para mudar de página.
7.  **Sincronização:** Ao mudar de página no `/admin`, um evento `changePage` é enviado ao servidor via Socket.io. O servidor atualiza o `currentSlide` no estado global e emite um evento `pageUpdated` para *todos* os clientes conectados (incluindo o próprio `/admin` e todos os `/view`).
8.  **Atualização em Tempo Real:** Todos os clientes que recebem o evento `pageUpdated` atualizam sua exibição para o novo `currentSlide`, garantindo a sincronização.

## Diagrama de Arquitetura (Conceitual)

```mermaid
graph TD
    A[Apresentador (Browser)] -->|Upload PDF| B(Servidor Node.js)
    A -->|Eventos de Controle (Socket.io)| B
    P[Projetor (Browser)] -->|Conexão (Socket.io)| B
    B -->|Estado Inicial / pageUpdated (Socket.io)| A
    B -->|Estado Inicial / pageUpdated (Socket.io)| P
    B -->|Servir Frontend| A
    B -->|Servir Frontend| P
    subgraph Frontend
        A_UI[Interface /admin] -- PDF.js --> A_Canvas[Canvas HTML5]
        P_UI[Interface /view] -- PDF.js --> P_Canvas[Canvas HTML5]
    end
    subgraph Backend
        B_Express(Express.js) -- Multer --> B_Upload[Gerenciamento de Upload]
        B_Express -- Socket.io --> B_Sync[Sincronização de Estado]
        B_Sync -- Estado Global --> B_Upload
    end
    A_UI -- Teclado/Botões --> A
    P_UI -- Fullscreen API --> P
```

Esta arquitetura garante uma separação clara de responsabilidades, escalabilidade para múltiplos clientes e uma experiência de usuário fluida com sincronização em tempo real.
