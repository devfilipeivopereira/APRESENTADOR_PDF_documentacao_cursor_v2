# Apresentador PDF – Sincronizado em Rede

Aplicação Node.js para apresentações de PDF em tempo real na rede local. Controle pelo computador ou celular/tablet; exibição no projetor sem piscar (estilo PowerPoint/Keynote).

## Funcionalidades

- **Upload de PDF** na página inicial
- **Projetor** (`/view`) – tela cheia, transição suave (double-buffer)
- **Apresentador** (`/admin`) – slide atual + preview do próximo, controles e atalhos
- **Controle remoto** (`/remote`) – uso em celular/tablet, swipe, menu de slides (estilo Keynote)
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

1. **Upload** – Acesse `http://IP:3000`, faça upload do PDF.
2. **Apresentador** – `http://IP:3000/admin` (slide atual, próximo, navegação, atalhos).
3. **Projetor** – `http://IP:3000/view` (tela cheia, ideal para projetor).
4. **Controle remoto** – `http://IP:3000/remote` (celular/tablet na mesma rede).

### Atalhos (Apresentador)

- **← / →** ou **Espaço** – próximo slide  
- **P** – abrir projetor em nova janela  

## Estrutura do projeto

```
├── server.js           # Servidor Express + Socket.io
├── package.json
├── .env.example        # Exemplo: PORT, UPLOAD_DIR
├── public/
│   ├── index.html      # Menu + upload
│   ├── admin.html      # Apresentador
│   ├── view.html       # Projetor
│   ├── remote.html     # Controle remoto
│   └── js/
│       ├── admin.js
│       └── view.js
├── uploads/            # PDFs enviados (criado automaticamente)
└── docs/               # Documentação detalhada
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

Copie `.env.example` para `.env` e ajuste se necessário:

- `PORT` – porta do servidor (padrão: 3000)
- `UPLOAD_DIR` – pasta dos PDFs (padrão: `./uploads`)

## Licença

MIT.
