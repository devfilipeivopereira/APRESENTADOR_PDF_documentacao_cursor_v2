# Enviar o projeto para o GitHub

O repositório Git local já está criado com o primeiro commit na branch `main`.

## Passos para criar o repositório no GitHub e enviar o código

### 1. Criar o repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Em **Repository name**, use por exemplo: `APRESENTADOR_PDF_documentacao_cursor_v2`
3. Deixe **Public** e **não** marque "Add a README" (o projeto já tem conteúdo)
4. Clique em **Create repository**

### 2. Conectar e enviar (push)

No terminal, na pasta do projeto, execute (substitua `SEU_USUARIO` pelo seu usuário do GitHub):

```bash
git remote add origin https://github.com/SEU_USUARIO/APRESENTADOR_PDF_documentacao_cursor_v2.git
git push -u origin main
```

Se preferir SSH:

```bash
git remote add origin git@github.com:SEU_USUARIO/APRESENTADOR_PDF_documentacao_cursor_v2.git
git push -u origin main
```

Depois disso, o código estará no GitHub.
