# Deploy – Checklist rápido

**Guia completo do zero:** [deploy-do-zero.md](./deploy-do-zero.md)

Usa este checklist na ordem. Mais detalhes em [deploy-vps.md](./deploy-vps.md).

---

## Na VPS (SSH)

### 1. Conectar e instalar Node.js

```bash
ssh root@76.13.168.1
```

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

### 2. Criar pasta e receber o projeto

**Se usas Git:** (substitui o URL pelo teu repositório)

```bash
sudo apt-get install -y git
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/TEU_USER/APRESENTADOR_PDF_documentacao_cursor_v2.git slides-app
cd slides-app
```

**Se NÃO usas Git:** primeiro envia do PC (ver passo "No teu PC" abaixo), depois:

```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
# Depois do SCP, na VPS:
cd /var/www/slides-app
```

### 3. Dependências

```bash
cd /var/www/slides-app
npm install --production
```

### 4. Ficheiro .env

```bash
nano .env
```

Colar (e ajustar Supabase com os teus valores):

```env
PORT=3000
BASE_URL=https://slides.filipeivopereira.com
SUPABASE_URL=https://teu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_BUCKET=presentations
```

Guardar: `Ctrl+O`, Enter, `Ctrl+X`.

### 5. Testar

```bash
npm start
```

Abrir no browser: `http://76.13.168.1:3000`. Parar com `Ctrl+C`.

### 6. PM2

```bash
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Executar a linha que o `pm2 startup` mostrar (ex.: `sudo env PATH=...`).

### 7. Nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp /var/www/slides-app/docs/nginx-slides.conf /etc/nginx/sites-available/slides
sudo ln -sf /etc/nginx/sites-available/slides /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 8. HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d slides.filipeivopereira.com
```

Seguir as perguntas (email, aceitar termos).

---

## No teu PC (só se NÃO usas Git)

Enviar o projeto por SCP (PowerShell ou CMD na pasta do projeto):

```powershell
scp -r server.js public package.json package-lock.json ecosystem.config.cjs docs usuario@76.13.168.1:/var/www/slides-app/
```

Criar a pasta na VPS antes: `ssh usuario@76.13.168.1 "mkdir -p /var/www/slides-app"`

---

## Verificar

- https://slides.filipeivopereira.com → página inicial
- https://slides.filipeivopereira.com/remote → controle remoto
- https://slides.filipeivopereira.com/admin → apresentador

Se algo falhar: `pm2 logs slides` e `sudo tail -f /var/log/nginx/error.log`.
