# Deploy do zero – slides.filipeivopereira.com

Guia único para colocar a app na VPS **do zero**: Ubuntu limpo → Node, projeto, .env, PM2, Nginx, HTTPS.

**Pré-requisitos:** VPS Ubuntu (ex.: 22.04) com IP **76.13.168.1**; domínio **slides.filipeivopereira.com** com registro **A** apontando para esse IP; acesso SSH (root ou user com sudo).

---

## Passo 1 – Conectar à VPS

No teu PC:

```bash
ssh root@76.13.168.1
```

(Substitui `root` pelo teu user se usares outro.)

---

## Passo 2 – Instalar Node.js 20

Na VPS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

Deve aparecer `v20.x` e a versão do npm.

---

## Passo 3 – Criar pasta e colocar o projeto

### 3a) Se usas Git

Na VPS (substitui o URL pelo teu repositório):

```bash
sudo apt-get install -y git
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
cd /var/www
git clone https://github.com/TEU_USER/APRESENTADOR_PDF_documentacao_cursor_v2.git slides-app
cd slides-app
```

### 3b) Se NÃO usas Git – enviar do PC

**No teu PC** (PowerShell ou CMD), na pasta raiz do projeto:

```powershell
ssh root@76.13.168.1 "mkdir -p /var/www/slides-app"
scp -r server.js public package.json package-lock.json ecosystem.config.cjs docs root@76.13.168.1:/var/www/slides-app/
```

**Na VPS** (entrar se ainda não estiveres):

```bash
ssh root@76.13.168.1
cd /var/www/slides-app
```

### 3c) Instalar dependências (sempre)

Na VPS, na pasta do projeto:

```bash
cd /var/www/slides-app
npm install --production
```

---

## Passo 4 – Ficheiro .env

Na VPS:

```bash
nano /var/www/slides-app/.env
```

Colar o seguinte e **ajustar** as variáveis do Supabase com os teus valores reais:

```env
PORT=3000
BASE_URL=https://slides.filipeivopereira.com
SUPABASE_URL=https://teu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET=presentations
```

Guardar: `Ctrl+O`, Enter, `Ctrl+X`.

---

## Passo 5 – Testar a aplicação

Na VPS:

```bash
cd /var/www/slides-app
npm start
```

Abrir no browser: **http://76.13.168.1:3000**. Deve aparecer a página inicial.

Parar o servidor: `Ctrl+C`.

---

## Passo 6 – PM2 (app a correr em background)

Na VPS:

```bash
sudo npm install -g pm2
cd /var/www/slides-app
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

O `pm2 startup` mostra uma linha que começa com `sudo env PATH=...`. **Copia e executa essa linha** para a app arrancar após reinício da VPS.

Verificar: `pm2 status` (deve mostrar `slides` como online).

---

## Passo 7 – Nginx (proxy para o domínio)

Na VPS:

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp /var/www/slides-app/docs/nginx-slides.conf /etc/nginx/sites-available/slides
sudo ln -sf /etc/nginx/sites-available/slides /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Abrir no browser: **http://slides.filipeivopereira.com**. Deve mostrar a mesma página inicial (por HTTP).

---

## Passo 8 – HTTPS (Let's Encrypt)

Na VPS:

```bash
sudo certbot --nginx -d slides.filipeivopereira.com
```

Indicar um email e aceitar os termos. O Certbot configura HTTPS e redireciona HTTP → HTTPS.

Depois, testar: **https://slides.filipeivopereira.com**

---

## URLs finais

| Uso             | URL |
|-----------------|-----|
| Página inicial  | https://slides.filipeivopereira.com |
| Controle remoto | https://slides.filipeivopereira.com/remote |
| Apresentador    | https://slides.filipeivopereira.com/admin |
| Projetor        | https://slides.filipeivopereira.com/view |
| Playlist        | https://slides.filipeivopereira.com/playlist |

---

## Resumo – comandos na ordem (VPS)

Para quem já tem o projeto em `/var/www/slides-app` e o `.env` criado:

```bash
# Node (só na primeira vez)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Projeto + deps (ajusta clone ou usa SCP)
cd /var/www && git clone <REPO> slides-app && cd slides-app
npm install --production

# .env (criar manualmente: nano .env)
# Testar: npm start → Ctrl+C

# PM2
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
# Executar a linha que pm2 startup mostrar

# Nginx + HTTPS
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp /var/www/slides-app/docs/nginx-slides.conf /etc/nginx/sites-available/slides
sudo ln -sf /etc/nginx/sites-available/slides /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d slides.filipeivopereira.com
```

---

## Problemas comuns

- **502 Bad Gateway:** a app não está a correr. Verificar: `pm2 status` e `pm2 logs slides`.
- **Domínio não abre:** confirmar DNS (registro A de slides.filipeivopereira.com para 76.13.168.1). Pode demorar alguns minutos.
- **Certbot falha:** garantir que o domínio já aponta para a VPS e que a porta 80 está aberta no firewall.
- **Socket/controle remoto não sincroniza:** Nginx já inclui suporte a WebSocket; se usares outro proxy, é preciso `Upgrade` e `Connection "upgrade"`.

Logs úteis: `pm2 logs slides`, `sudo tail -f /var/log/nginx/error.log`.
