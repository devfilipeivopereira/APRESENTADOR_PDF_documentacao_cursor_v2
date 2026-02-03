# Comunicação de Rede e Segurança da Aplicação Cursor

## Visão Geral da Comunicação de Rede

A aplicação Cursor opera em uma rede local, utilizando uma combinação de protocolos HTTP e WebSockets para garantir a funcionalidade completa de upload, visualização e sincronização de apresentações de PDF. A comunicação é projetada para ser eficiente e em tempo real, com uma clara distinção entre as interfaces de controle e visualização.

### 1. Protocolos Utilizados

*   **HTTP/HTTPS:** Utilizado para o carregamento inicial das páginas web (HTML, CSS, JavaScript) das interfaces `/`, `/view` e `/admin`, bem como para o processo de upload de arquivos PDF. O Express.js no backend gerencia essas requisições.
*   **WebSockets (via Socket.io):** O protocolo principal para a comunicação em tempo real. Uma vez que as páginas são carregadas, o Socket.io estabelece uma conexão persistente e bidirecional entre o servidor e todos os clientes conectados. Esta conexão é usada para:
    *   Enviar o estado inicial da apresentação para novos clientes.
    *   Propagar eventos de mudança de página (`pageUpdated`) do servidor para todos os clientes.
    *   Receber eventos de controle (`changePage`) do cliente apresentador para o servidor.

### 2. Portas de Comunicação

Por padrão, a aplicação Node.js será executada em uma porta específica. Recomenda-se a porta `3000` para desenvolvimento, mas pode ser configurada para qualquer porta disponível (e.g., `80` para HTTP padrão ou `443` para HTTPS em produção).

*   **Porta do Servidor:** `3000` (configurável via variável de ambiente `PORT`).
    *   Todas as requisições HTTP (GET para páginas, POST para upload) e conexões WebSocket serão estabelecidas através desta porta.

### 3. Endereçamento IP

O servidor irá logar seu endereço IP local (e.g., `192.168.1.x`) no startup, facilitando o acesso dos clientes na mesma rede local. Os clientes devem acessar a aplicação usando este IP e a porta configurada (ex: `http://192.168.1.x:3000`).

## Considerações de Segurança

Dado que a aplicação é projetada para operar em uma rede local, as preocupações de segurança são mitigadas em comparação com aplicações expostas publicamente na internet. No entanto, algumas práticas e considerações são importantes:

### 1. Ambiente de Rede Local

*   **Acesso Restrito:** A aplicação deve ser acessada apenas por dispositivos dentro da rede local. Expor a aplicação diretamente à internet sem medidas de segurança adicionais não é recomendado.
*   **Firewall:** Certifique-se de que o firewall do servidor permite o tráfego na porta configurada para a aplicação.

### 2. Upload de Arquivos

*   **Validação de Tipo de Arquivo:** O Multer deve ser configurado para aceitar apenas arquivos PDF. Isso previne o upload de arquivos maliciosos (e.g., executáveis, scripts) que poderiam comprometer o servidor.
*   **Limitação de Tamanho:** Implementar um limite de tamanho para os arquivos PDF para evitar ataques de negação de serviço (DoS) por meio de uploads excessivamente grandes.
*   **Armazenamento Seguro:** Os arquivos PDF devem ser armazenados em um diretório dedicado e não diretamente acessível via URL sem validação, embora para este projeto o acesso direto seja parte da funcionalidade.

### 3. Autenticação e Autorização

*   **Interface `/view` (Projetor):** Não requer autenticação, pois é destinada à exibição pública. Qualquer dispositivo na rede local pode acessá-la.
*   **Interface `/admin` (Apresentador):** Para a versão inicial, não há autenticação. Qualquer dispositivo que acesse `/admin` pode controlar a apresentação. **Recomendação para Futuras Melhorias:** Implementar um sistema de autenticação simples (e.g., senha via variável de ambiente ou token) para proteger o acesso à interface do apresentador e evitar controle não autorizado.
*   **Upload (`/`):** Similar à interface `/admin`, o upload não possui autenticação na versão inicial. **Recomendação para Futuras Melhorias:** Proteger o endpoint de upload com autenticação para garantir que apenas usuários autorizados possam carregar PDFs.

### 4. Validação de Entrada

*   **Eventos Socket.io:** Embora o Socket.io seja robusto, é uma boa prática validar os dados recebidos nos eventos (`changePage`) para garantir que os valores (`currentSlide`) estejam dentro dos limites esperados (e.g., número da página válido).

### 5. HTTPS

*   Para ambientes onde a segurança da comunicação é crítica, mesmo em rede local, a implementação de HTTPS é recomendada. Isso exigiria a configuração de certificados SSL/TLS no servidor Express.js. Para uma rede local controlada, HTTP pode ser aceitável, mas HTTPS oferece criptografia e integridade dos dados.

## Conclusão

A comunicação de rede da aplicação Cursor é direta e funcional para seu propósito em rede local. As considerações de segurança destacam áreas para validação de entrada e futuras implementações de autenticação para fortalecer a robustez da aplicação, especialmente se houver planos de expô-la além do ambiente local controlado.
