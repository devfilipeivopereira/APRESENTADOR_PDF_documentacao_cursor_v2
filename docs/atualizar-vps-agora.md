# Atualizar a VPS agora (código + .env)

Siga estes passos na ordem. Use o IP e o utilizador da tua VPS (ex.: `76.13.168.1`, `root` ou o teu user).

---

## 1. Ligar à VPS por SSH

No teu PC (PowerShell ou terminal):

```bash
ssh root@76.13.168.1
```

(Substitui `root` pelo teu utilizador se for diferente.)

---

## 2. Atualizar o código (git pull + PM2)

Dentro da VPS:

```bash
cd /var/www/slides-app
git pull
npm install --production
pm2 restart slides
pm2 status
```

Se `git pull` pedir credenciais e o repo for GitHub, usa um token ou chave SSH configurada na VPS.

---

## 3. Atualizar o `.env` na VPS

O projeto passou a usar **login** e **modo offline**. O `.env` na VPS precisa destas variáveis:

```bash
cd /var/www/slides-app
nano .env
```

**Adiciona ou confirma** estas linhas (com os teus valores reais):

```env
# Login (obrigatório para aceder à página inicial, Playlist e Apresentador)
LOGIN_USER=pastorfilipeivopereira
LOGIN_PASSWORD=@Drf22062014
SESSION_SECRET=uma_frase_secreta_longa_altere_em_producao

# Modo offline / backup (opcional): ativa "Carregar PDF do computador" no Apresentador
UPLOAD_DIR=./uploads
```

Mantém o resto do teu `.env` (PORT, BASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET).

**Importante:** Se acedes ao site por **HTTPS** (ex.: https://slides.filipeivopereira.com), o `BASE_URL` no `.env` da VPS deve ser **https://** (ex.: `BASE_URL=https://slides.filipeivopereira.com`). Assim os PDFs do modo offline são servidos com URL HTTPS e o browser não bloqueia por Mixed Content.

Guardar no nano: `Ctrl+O`, Enter, `Ctrl+X`.

---

## 4. Reiniciar a app para carregar o novo .env

```bash
pm2 restart slides
pm2 logs slides --lines 20
```

(Verifica nos logs se não há erros.)

---

## 5. Testar

Abre no browser:

- **https://slides.filipeivopereira.com/login** – deve aparecer a tela de login.
- Após login (pastorfilipeivopereira / tua palavra-passe), deves entrar na página inicial.

---

## Resumo (copy-paste)

```bash
ssh root@76.13.168.1
cd /var/www/slides-app
git pull
npm install --production
nano .env
# Adiciona LOGIN_USER, LOGIN_PASSWORD, SESSION_SECRET, UPLOAD_DIR (ver secção 3 acima)
pm2 restart slides
pm2 status
```
