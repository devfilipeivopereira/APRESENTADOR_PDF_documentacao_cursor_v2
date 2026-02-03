# Deploy na VPS – slides.filipeivopereira.com

Guia passo a passo para colocar a aplicação no ar na VPS com domínio, HTTPS e controle remoto online.

## Pré-requisitos

- VPS com **Ubuntu 22.04** (ou Debian 12) e IP **76.13.168.1**
- Domínio **slides.filipeivopereira.com** apontando para esse IP (registro A no DNS)
- Acesso SSH à VPS como utilizador com sudo

---

## 1. Conectar à VPS e instalar Node.js

```bash
ssh root@76.13.168.1
# ou: ssh seu_user@76.13.168.1
```

Instalar Node.js 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # deve mostrar v20.x
npm -v
```

---

## 2. Colocar o projeto na VPS

### Opção A: Git (recomendado)

```bash
sudo apt-get install -y git
cd /var/www   # ou outro diretório à tua escolha
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/SEU_USER/APRESENTADOR_PDF_documentacao_cursor_v2.git slides-app
cd slides-app
```

Se o repositório for privado, configura acesso por SSH key ou token.

### Opção B: Enviar ficheiros com SCP (do teu PC)

No **teu PC** (PowerShell ou terminal), na pasta do projeto:

```bash
scp -r . usuario@76.13.168.1:/var/www/slides-app
```

Depois na VPS:

```bash
ssh usuario@76.13.168.1
cd /var/www/slides-app
```

### Instalar dependências

```bash
cd /var/www/slides-app   # ou o caminho que usaste
npm install --production
```

---

## 3. Ficheiro `.env` na VPS

Criar o `.env` na raiz do projeto (mesma pasta do `server.js`):

```bash
nano .env
```

Conteúdo recomendado (ajusta com os teus valores reais):

```env
PORT=3000

# Login (obrigatório para aceder à página inicial, Playlist e Apresentador)
LOGIN_USER=pastorfilipeivopereira
LOGIN_PASSWORD=@Drf22062014
SESSION_SECRET=uma_frase_secreta_longa_altere_em_producao

BASE_URL=https://slides.filipeivopereira.com

SUPABASE_URL=https://teu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_BUCKET=presentations

# Modo offline / backup (opcional): ativa "Carregar PDF do computador" no Apresentador
UPLOAD_DIR=./uploads
```

Guardar: `Ctrl+O`, Enter, `Ctrl+X`.

**Importante:** O `BASE_URL` deve ser **https://** quando acedes ao site por HTTPS (ex.: `BASE_URL=https://slides.filipeivopereira.com`). Assim os links e o QR no Apresentador ficam corretos e as URLs dos PDFs do modo offline são HTTPS (evita Mixed Content). Não faças commit do `.env`; ele não deve estar no Git.

---

## 4. Testar a aplicação

```bash
npm start
```

Noutro terminal (ou no browser na VPS), testar: `http://76.13.168.1:3000`.  
Parar com `Ctrl+C` e seguir para deixar a app a correr em background com PM2.

---

## 5. PM2 – manter a app sempre a correr

Instalar PM2 e iniciar a aplicação:

```bash
sudo npm install -g pm2
cd /var/www/slides-app
pm2 start ecosystem.config.cjs
# ou: pm2 start server.js --name slides
pm2 save
pm2 startup
```

O último comando mostra uma linha `sudo env ...`; **executa-a** para a app arrancar após reinício da VPS.

Comandos úteis:

```bash
pm2 status        # ver estado
pm2 logs slides   # ver logs
pm2 restart slides
pm2 stop slides
```

---

## 6. Nginx – proxy e HTTPS

Instalar Nginx e Certbot (Let's Encrypt):

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Criar o ficheiro de configuração do site. Podes copiar o ficheiro do projeto para o Nginx:

```bash
# Na VPS, a partir da pasta do projeto
sudo cp /var/www/slides-app/docs/nginx-slides.conf /etc/nginx/sites-available/slides
# Editar se precisar: sudo nano /etc/nginx/sites-available/slides
```

Ou criar manualmente com `sudo nano /etc/nginx/sites-available/slides` e colar o bloco **server { ... }** da secção abaixo (apenas a parte HTTP primeiro).

### Configuração Nginx (HTTP primeiro)

Conteúdo de `/etc/nginx/sites-available/slides`:

```nginx
server {
    listen 80;
    server_name slides.filipeivopereira.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar o site e testar:

```bash
sudo ln -s /etc/nginx/sites-available/slides /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

No browser: `http://slides.filipeivopereira.com`. Deve abrir a página inicial.

### Ativar HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d slides.filipeivopereira.com
```

Seguir as perguntas (email, aceitar termos). O Certbot altera o Nginx para usar HTTPS e redirecionar HTTP → HTTPS.

Depois do Certbot, o Nginx fica com algo equivalente ao que está em **`docs/nginx-slides.conf`** (com `listen 443 ssl` e certificados). Podes verificar com:

```bash
sudo cat /etc/nginx/sites-available/slides
```

Testar de novo: `https://slides.filipeivopereira.com` e `https://slides.filipeivopereira.com/remote`.

---

## 7. URLs finais

| Uso              | URL |
|------------------|-----|
| Página inicial  | https://slides.filipeivopereira.com |
| Controle remoto | https://slides.filipeivopereira.com/remote |
| Apresentador    | https://slides.filipeivopereira.com/admin |
| Projetor        | https://slides.filipeivopereira.com/view |
| Playlist        | https://slides.filipeivopereira.com/playlist |

---

## 8. Deploy a partir do teu PC (opcional)

Se tiveres **rsync** (Git Bash, WSL ou Linux/Mac) no PC:

```bash
rsync -avz --exclude node_modules --exclude .env --exclude .git . usuario@76.13.168.1:/var/www/slides-app/
ssh usuario@76.13.168.1 "cd /var/www/slides-app && npm install --production && pm2 restart slides"
```

Com **SCP** (PowerShell/Windows):

```powershell
scp -r server.js public package.json package-lock.json ecosystem.config.cjs docs usuario@76.13.168.1:/var/www/slides-app/
```

Depois, na VPS: `cd /var/www/slides-app && npm install --production && pm2 restart slides`.

---

## 9. Atualizar o projeto (deploy de nova versão)

### 9.1 Atualizar código (git pull + PM2)

Conecta à VPS e executa:

```bash
ssh root@76.13.168.1
# ou: ssh teu_user@76.13.168.1

cd /var/www/slides-app
git pull
npm install --production
pm2 restart slides
pm2 status
```

Sem Git: enviar de novo os ficheiros por SCP e depois `npm install` e `pm2 restart slides`.

### 9.2 Atualizar o `.env` na VPS (quando há novas variáveis)

Se o projeto passou a usar novas variáveis (ex.: login, modo offline), edita o `.env` na VPS e adiciona-as:

```bash
cd /var/www/slides-app
nano .env
```

Garante que existem pelo menos:

- `LOGIN_USER` e `LOGIN_PASSWORD` – para a tela de login (se vazios, a app funciona sem login)
- `SESSION_SECRET` – segredo para a sessão (altera em produção)
- `UPLOAD_DIR=./uploads` – (opcional) para ativar "Carregar PDF do computador" no Apresentador

Depois de guardar: `pm2 restart slides`.

---

## Resumo de comandos (copy-paste)

```bash
# 1) Instalar Node
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2) Projeto (ajusta o caminho e repositório)
cd /var/www && git clone <TEU_REPO> slides-app && cd slides-app
npm install --production

# 3) .env (criar manualmente: PORT, LOGIN_*, SESSION_SECRET, BASE_URL, Supabase, UPLOAD_DIR)
nano .env

# 4) PM2
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup

# 5) Nginx + SSL
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/slides   # colar config
sudo ln -s /etc/nginx/sites-available/slides /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d slides.filipeivopereira.com
```

Se algo falhar, verifica: `pm2 logs slides`, `sudo tail -f /var/log/nginx/error.log`, e que o DNS de **slides.filipeivopereira.com** aponta para **76.13.168.1**.
