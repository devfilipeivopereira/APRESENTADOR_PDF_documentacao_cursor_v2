# Arquitetura da Aplicação Cursor

## Visão Geral

A aplicação Cursor é projetada para fornecer apresentações de PDF sincronizadas em tempo real através de uma rede local. A arquitetura é dividida em duas partes principais: um **Backend** robusto em Node.js para gerenciamento de estado e comunicação, e um **Frontend** interativo para visualização e controle, com interfaces distintas para o projetor (`/view`) e o apresentador (`/admin`).

## Componentes da Arquitetura

### 1. Backend (Servidor Node.js)

O backend é o coração da aplicação, responsável por gerenciar o upload de PDFs, manter o estado global da apresentação e orquestrar a sincronização em tempo real entre todos os clientes conectados.

*   **Node.js:** Ambiente de execução JavaScript assíncrono e orientado a eventos, ideal para aplicações de rede escaláveis.
*   **Express.js:** Framework web minimalista e flexível para Node.js, utilizado para:
    *   **Roteamento:** Gerenciamento das rotas HTTP (`/`, `/view`, `/admin`).
    *   **Serviço de Arquivos Estáticos:** Servir os arquivos HTML, CSS e JavaScript do frontend.
    *   **API de Upload:** Expor um endpoint para o upload de arquivos PDF.
*   **Socket.io:** Biblioteca para comunicação bidirecional em tempo real baseada em eventos. É fundamental para:
    *   **Sincronização de Slides:** Enviar atualizações de `currentSlide` para todos os clientes instantaneamente.
    *   **Gerenciamento de Conexões:** Lidar com a entrada e saída de clientes, garantindo que novos clientes recebam o estado atual da apresentação.
*   **Multer:** Middleware para Express.js, utilizado especificamente para o tratamento de `multipart/form-data`, facilitando o upload de arquivos PDF para o servidor.

### 2. Frontend (Interfaces de Usuário)

O frontend consiste em duas interfaces distintas, cada uma otimizada para seu propósito específico, e ambas utilizam tecnologias web padrão para renderização e interatividade.

*   **Interface de Projetor (`/view`):** Tela cheia, transição suave entre slides (double-buffer).
*   **Interface de Apresentador (`/admin`):** Slide atual e preview do próximo (double-buffer), controles e atalhos de teclado.
*   **Controle Remoto (`/remote`):** Interface para celular/tablet na rede; swipe, menu retrátil com grade de slides (estilo Keynote).
*   **PDF.js:** Renderização de PDF no navegador (elementos `canvas`).
*   **CSS (Flexbox/Grid):** Layout responsivo (desktop, tablet, celular, iPad) e tema dark.
*   **JavaScript (Vanilla):** Conexão Socket.io, eventos `pageUpdated`, atalhos, Fullscreen API.

## Fluxo de Dados e Comunicação

1.  **Upload de PDF:** O apresentador acessa a rota `/` (ou uma interface de upload dedicada), faz o upload de um arquivo PDF. O Multer processa o arquivo, e o servidor armazena o PDF e atualiza o `pdfUrl` no estado global.
2.  **Conexão de Clientes:** Quando um cliente (seja `/view` ou `/admin`) se conecta via Socket.io, o servidor envia o estado atual (`currentSlide`, `pdfUrl`) para esse novo cliente.
3.  **Visualização (`/view`):** O cliente `/view` recebe o `pdfUrl`, carrega o PDF com PDF.js e renderiza o `currentSlide` em tela cheia. Ele escuta por eventos `pageUpdated` para atualizar o slide.
4.  **Controle (`/admin`):** O cliente `/admin` também recebe o estado, exibe o `currentSlide` e um preview do próximo. O apresentador interage com botões ou atalhos de teclado para mudar de página.
5.  **Sincronização:** Ao mudar de página no `/admin`, um evento `changePage` é enviado ao servidor via Socket.io. O servidor atualiza o `currentSlide` no estado global e emite um evento `pageUpdated` para *todos* os clientes conectados (incluindo o próprio `/admin` e todos os `/view`).
6.  **Atualização em Tempo Real:** Todos os clientes que recebem o evento `pageUpdated` atualizam sua exibição para o novo `currentSlide`, garantindo a sincronização.

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
