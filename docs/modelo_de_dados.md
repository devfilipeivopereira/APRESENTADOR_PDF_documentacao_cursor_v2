# Modelo de Dados da Aplicação Cursor

## Visão Geral

O modelo de dados da aplicação Cursor é relativamente simples, focado em manter o estado da apresentação de PDF sincronizado entre o servidor e todos os clientes conectados. O estado principal é mantido no backend e propagado via WebSockets. Não há um banco de dados persistente complexo, pois o foco é a sincronização em tempo real de uma apresentação ativa.

## Entidades Principais

### 1. Estado Global da Apresentação

Esta é a entidade central que armazena as informações cruciais sobre a apresentação atualmente ativa. É mantida em memória no servidor Node.js.

| Campo         | Tipo    | Descrição                                                                 | Exemplo                                   |
| :------------ | :------ | :------------------------------------------------------------------------ | :---------------------------------------- |
| `pdfUrl`      | String  | URL ou caminho para o arquivo PDF atualmente em exibição.                 | `/uploads/minha_apresentacao.pdf`         |
| `currentSlide`| Integer | Número da página (slide) atual que está sendo exibida. Base 1.            | `5`                                       |
| `totalSlides` | Integer | Número total de slides no PDF carregado.                                  | `20`                                      |
| `fileName`    | String  | Nome original do arquivo PDF.                                             | `minha_apresentacao.pdf`                  |

**Observações:**
*   O `pdfUrl` pode ser um caminho local no servidor ou uma URL pública, dependendo da implementação do upload e armazenamento.
*   `currentSlide` é atualizado pelo apresentador e propagado para todos os clientes.
*   `totalSlides` é determinado após o upload e processamento inicial do PDF (e.g., usando PDF.js no servidor ou uma biblioteca similar para extrair metadados).

### 2. Arquivo PDF

Embora não seja uma 
entidade de dados no sentido tradicional de um banco de dados, o arquivo PDF é um componente essencial do modelo. Ele é armazenado no sistema de arquivos do servidor após o upload.

| Campo         | Tipo de Armazenamento | Descrição                                                                 |
| :------------ | :-------------------- | :------------------------------------------------------------------------ |
| `Arquivo PDF` | Sistema de Arquivos   | O conteúdo binário do arquivo PDF.                                        |

## Relacionamentos

*   O **Estado Global da Apresentação** referencia um **Arquivo PDF** através do `pdfUrl` e `fileName`.

## Fluxo de Atualização do Estado

1.  **Upload de PDF:** Quando um PDF é carregado, o servidor:
    *   Salva o arquivo no diretório `/uploads` (ou similar).
    *   Atualiza o `pdfUrl` e `fileName` no **Estado Global da Apresentação**.
    *   Extrai o número total de páginas (`totalSlides`) do PDF e atualiza o estado.
    *   Define `currentSlide` como `1` (primeira página).
    *   Emite um evento Socket.io para todos os clientes com o estado atualizado.
2.  **Mudança de Página:** Quando o apresentador solicita a mudança de página (próximo/anterior):
    *   O servidor atualiza `currentSlide` no **Estado Global da Apresentação**.
    *   Emite um evento Socket.io (`pageUpdated`) para todos os clientes com o novo `currentSlide`.
3.  **Nova Conexão de Cliente:** Quando um novo cliente se conecta via Socket.io:
    *   O servidor envia o **Estado Global da Apresentação** completo para o cliente, garantindo que ele esteja sincronizado desde o início.

## Considerações de Persistência

Para a versão inicial, o estado global é mantido em memória. Isso significa que, se o servidor for reiniciado, o estado da apresentação atual será perdido. Para futuras melhorias, pode-se considerar:

*   **Persistência Simples:** Salvar o estado global em um arquivo JSON no disco.
*   **Banco de Dados Leve:** Utilizar um banco de dados NoSQL embarcado (e.g., NeDB, LowDB) para persistir o estado e permitir múltiplas apresentações ou histórico.

Este modelo de dados, embora simples, é eficaz para o objetivo de sincronização em tempo real de apresentações de PDF em uma rede local.
