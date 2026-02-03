# Aplicação Cursor: Apresentações de PDF Sincronizadas

## Visão Geral

A Aplicação Cursor é uma solução inovadora para realizar apresentações de PDF de forma sincronizada em uma rede local. Ela foi projetada para oferecer uma experiência fluida tanto para o apresentador quanto para a audiência, separando claramente as interfaces de controle e visualização. Utilizando tecnologias modernas como Node.js, Express, Socket.io e PDF.js, a aplicação garante sincronização em tempo real e uma exibição otimizada dos slides.

## Funcionalidades Principais

*   **Upload de PDF:** Permite o upload de arquivos PDF para serem utilizados como apresentações.
*   **Sincronização em Tempo Real:** Garante que todos os dispositivos conectados exibam o mesmo slide simultaneamente.
*   **Interface de Projetor (`/view`):** Uma tela limpa e em tela cheia, ideal para exibição em projetores, sem controles visíveis.
*   **Interface de Apresentador (`/admin`):** Um painel de controle completo com visualização do slide atual, preview do próximo, botões de navegação e atalhos de teclado.
*   **Responsividade:** Interfaces otimizadas para desktop, tablet e celular.

## Estrutura da Documentação

Esta pasta `/docs` contém a documentação completa do projeto, organizada nos seguintes arquivos:

*   [`arquitetura.md`](./arquitetura.md): Detalha a estrutura geral da aplicação, seus componentes de backend e frontend, e o fluxo de comunicação.
*   [`modelo_de_dados.md`](./modelo_de_dados.md): Descreve o modelo de dados utilizado para gerenciar o estado da apresentação.
*   [`tecnologias.md`](./tecnologias.md): Lista e justifica as tecnologias empregadas no desenvolvimento da aplicação.
    *   [`fluxo.md`](./fluxo.md): Explica o fluxo de execução da aplicação, desde a inicialização até a sincronização dos slides.
    *   [`comunicacao_rede_seguranca.md`](./comunicacao_rede_seguranca.md): Detalha os protocolos de rede, portas e considerações de segurança.

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

1.  **Inicie o servidor:**
    ```bash
    node server.js
    # ou com nodemon para desenvolvimento:
    # nodemon server.js
    ```
    O servidor irá iniciar e exibir o IP local e a porta (ex: `http://192.168.1.x:3000`).

2.  **Acesse a Interface de Upload:**
    Abra seu navegador e acesse o endereço IP do servidor (ex: `http://192.168.1.x:3000`). Faça o upload do arquivo PDF desejado.

3.  **Acesse a Interface do Apresentador:**
    No seu dispositivo de controle (desktop, tablet, celular), acesse `http://192.168.1.x:3000/admin`.

4.  **Acesse a Interface do Projetor:**
    No dispositivo de exibição (projetor), acesse `http://192.168.1.x:3000/view`.

### Navegação na Apresentação

Na interface do apresentador (`/admin`):

*   Use os botões **
Anterior** e **Próximo** para mudar de slide.
*   Utilize as setas do teclado (← e →) ou a tecla **Espaço** para navegar entre os slides.
*   O preview do próximo slide estará visível para auxiliar na transição.

Na interface do projetor (`/view`):

*   O slide será atualizado automaticamente conforme o apresentador avança ou retrocede.
*   Um botão discreto de fullscreen estará disponível para otimizar a visualização.

## Desenvolvimento

### Estrutura de Pastas

```
. 
├── server.js             # Servidor Node.js principal
├── package.json          # Dependências e scripts do projeto
├── .gitignore            # Arquivos e diretórios ignorados pelo Git
├── .env.example          # Exemplo de variáveis de ambiente
├── public/               # Arquivos estáticos do frontend
│   ├── index.html        # Página de upload de PDF
│   ├── view.html         # Interface do projetor
│   ├── admin.html        # Interface do apresentador
│   └── js/               # Scripts JavaScript do frontend
│       ├── view.js
│       └── admin.js
├── uploads/              # Diretório para PDFs carregados
└── docs/                 # Documentação do projeto
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
