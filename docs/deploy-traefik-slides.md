# Slides no Traefik (porta 80 já em uso)

Quando a porta 80 está ocupada pelo **Traefik** no Docker, configura o domínio **slides.filipeivopereira.com** no Traefik em vez do Nginx.

---

## 1. Onde o Traefik carrega ficheiros dinâmicos

O Traefik precisa de carregar o ficheiro `traefik-slides.yml`. Tens duas hipóteses.

### A) Já tens uma pasta de dynamic config no host

Se o teu stack/compose do Traefik monta uma pasta (ex.: `/etc/traefik/dynamic` ou `/opt/traefik/dynamic`):

```bash
sudo cp /var/www/slides-app/docs/traefik-slides.yml /CAMINHO_DA_PASTA_DYNAMIC/slides.yml
```

Substitui `CAMINHO_DA_PASTA_DYNAMIC` pelo caminho real.

### B) Ainda não tens pasta de dynamic config

1. Cria uma pasta no host:

```bash
sudo mkdir -p /etc/traefik/dynamic
sudo cp /var/www/slides-app/docs/traefik-slides.yml /etc/traefik/dynamic/slides.yml
```

2. No **stack ou docker-compose do Traefik**, adiciona o volume e o file provider.

**Exemplo de docker-compose (Traefik v2):**

No ficheiro do Traefik, em `command` (ou em `args`), garante que tens:

```yaml
command:
  - "--providers.file.directory=/etc/traefik/dynamic"
  - "--providers.file.watch=true"
```

E em `volumes`:

```yaml
volumes:
  - /etc/traefik/dynamic:/etc/traefik/dynamic:ro
```

3. Se usas **Docker Stack**, edita o ficheiro do stack e adiciona o volume ao serviço `traefik` e o argumento `--providers.file.directory=/etc/traefik/dynamic`. Depois:

```bash
docker stack deploy -c TEU_FICHEIRO_STACK.yml traefik
```

---

## 2. Backend (app no host na porta 3000)

O ficheiro `traefik-slides.yml` usa por defeito:

- `http://76.13.168.1:3000` (IP da tua VPS)

Se o Traefik estiver noutra rede e esse IP não for acessível, podes usar:

- `http://host.docker.internal:3000`  
  (só funciona se o container do Traefik tiver `extra_hosts: - "host.docker.internal:host-gateway"` ou equivalente)

Edita `/etc/traefik/dynamic/slides.yml` (ou o ficheiro que copiares) e altera o `url` em `services.slides-app.loadBalancer.servers` se precisares.

---

## 3. HTTPS (Let's Encrypt) no Traefik

Se o Traefik já tem um **certificateResolver** para Let's Encrypt (por exemplo `letsencrypt`):

1. Abre o ficheiro que copiaste (ex.: `/etc/traefik/dynamic/slides.yml`).
2. No router `slides-https`, descomenta o bloco `tls` e ajusta o nome do resolver:

```yaml
    slides-https:
      rule: "Host(`slides.filipeivopereira.com`)"
      service: slides-app
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
```

3. Guarda e reinicia o Traefik (ou deixa-o a recarregar sozinho se tiver `watch=true`).

Se ainda não tens certificateResolver no Traefik, configura-o na **configuração estática** do Traefik (ex.: `traefik.yml` ou `command` do compose) e depois adiciona o bloco `tls` acima no router `slides-https`.

---

## 4. Aplicar e reiniciar o Traefik (Docker Swarm)

Depois de o ficheiro estar na pasta de dynamic e (se quiseres) o HTTPS configurado:

```bash
docker service update --force traefik_traefik
```

(Substitui `traefik_traefik` pelo nome do teu serviço se for diferente; vê com `docker service ls`.)

---

## 5. Testar

- HTTP: **http://slides.filipeivopereira.com**
- HTTPS: **https://slides.filipeivopereira.com** (se tiveres configurado o certResolver)

Se algo falhar: `docker service logs traefik_traefik` e confirma que o ficheiro está em `/etc/traefik/dynamic/` (ou no caminho que montaste) e que o Traefik tem `--providers.file.directory` apontando para essa pasta.
