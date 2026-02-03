># Tecnologias Utilizadas na Aplicação Cursor

## Visão Geral

A aplicação Cursor utiliza um conjunto de tecnologias modernas e bem estabelecidas no ecossistema JavaScript para construir uma solução robusta e em tempo real para apresentações de PDF sincronizadas. A escolha das tecnologias foi guiada pela necessidade de desempenho, escalabilidade e facilidade de desenvolvimento.

## Backend

| Tecnologia | Versão | Descrição |
| :--- | :--- | :--- |
| **Node.js** | LTS | Ambiente de execução JavaScript do lado do servidor, escolhido por sua natureza assíncrona e orientada a eventos, ideal para aplicações de rede e WebSockets. |
| **Express.js** | 4.x | Framework web minimalista para Node.js, utilizado para criar o servidor HTTP, gerenciar rotas e servir arquivos estáticos. |
| **Socket.io** | 4.x | Biblioteca para comunicação bidirecional em tempo real, essencial para a sincronização de slides entre o apresentador e os projetores. |
| **Multer** | 1.x | Middleware para Express.js que facilita o manuseio de `multipart/form-data`, utilizado para o upload de arquivos PDF. |

## Frontend

| Tecnologia | Versão | Descrição |
| :--- | :--- | :--- |
| **HTML5** | - | Linguagem de marcação padrão para a estruturação das páginas web (`/view` e `/admin`). |
| **CSS3** | - | Utilizado para estilização, incluindo layouts responsivos com Flexbox/Grid e o tema escuro (dark mode). |
| **JavaScript (ES6+)** | - | Linguagem de programação do lado do cliente para interatividade, manipulação do DOM e comunicação com o servidor via Socket.io. |
| **PDF.js** | Estável | Biblioteca da Mozilla para renderizar documentos PDF diretamente no navegador, utilizando o elemento `<canvas>`. Será carregada via CDN para simplicidade. |

## Ferramentas de Desenvolvimento e Ambiente

| Ferramenta | Descrição |
| :--- | :--- |
| **npm (Node Package Manager)** | Gerenciador de pacotes padrão do Node.js, utilizado para instalar e gerenciar as dependências do projeto. |
| **Nodemon** | Utilitário que monitora mudanças nos arquivos do projeto e reinicia automaticamente o servidor Node.js, agilizando o desenvolvimento. |
| **Git / GitHub** | Sistema de controle de versão para gerenciar o código-fonte do projeto. |
| **Visual Studio Code** | Editor de código recomendado, com extensões para JavaScript, Node.js e formatação de código. |

## Justificativa das Escolhas

*   **Ecossistema Node.js:** A escolha de um ecossistema unificado (JavaScript no backend e frontend) simplifica o desenvolvimento e a manutenção, permitindo que a equipe utilize um conjunto de habilidades consistente.
*   **Socket.io:** Em vez de WebSockets puros, o Socket.io foi escolhido por sua robustez, fallback para polling em ambientes restritivos e uma API de eventos mais amigável.
*   **PDF.js:** É a solução padrão de mercado para renderização de PDFs no cliente, com excelente compatibilidade e desempenho, além de ser mantida por uma grande organização (Mozilla).
*   **Sem Framework de Frontend (React/Vue/Angular):** Para este projeto específico, um framework de frontend completo seria um exagero. A manipulação direta do DOM com JavaScript (vanilla) é suficiente para a interatividade necessária, mantendo a aplicação leve e com poucas dependências.
