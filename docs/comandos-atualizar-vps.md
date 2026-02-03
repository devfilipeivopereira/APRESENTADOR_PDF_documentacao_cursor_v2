# Comandos para atualizar a VPS

Copia e cola no terminal, na ordem. Ajusta o utilizador e o IP se forem diferentes (`root`, `76.13.168.1`).

---

## 1. Ligar à VPS (no teu PC)

```bash
ssh root@76.13.168.1
```

---

## 2. Atualizar código e reiniciar a app (dentro da VPS)

```bash
cd /var/www/slides-app
git pull
npm install --production
pm2 restart slides
pm2 status
```

---

## 3. Se precisares de editar o `.env` (login, BASE_URL, UPLOAD_DIR)

```bash
cd /var/www/slides-app
nano .env
```

Confirma ou adiciona (com os teus valores):

- `LOGIN_USER=pastorfilipeivopereira`
- `LOGIN_PASSWORD=@Drf22062014`
- `SESSION_SECRET=uma_frase_secreta_longa_altere_em_producao`
- `BASE_URL=https://slides.filipeivopereira.com`
- `UPLOAD_DIR=./uploads`

Guardar: `Ctrl+O`, Enter, `Ctrl+X`.

Depois:

```bash
pm2 restart slides
```

---

## 4. Ver logs (opcional)

```bash
pm2 logs slides --lines 30
```

Sair dos logs: `Ctrl+C`.

---

## Tudo seguido (só atualizar código, sem editar .env)

```bash
ssh root@76.13.168.1
cd /var/www/slides-app && git pull && npm install --production && pm2 restart slides && pm2 status
```

(Um comando por linha, se preferires:)

```bash
ssh root@76.13.168.1
```

Depois, dentro da VPS:

```bash
cd /var/www/slides-app
git pull
npm install --production
pm2 restart slides
pm2 status
```
