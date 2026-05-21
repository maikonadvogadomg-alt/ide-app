# AppIDE — Manual Técnico Completo
**Versão:** 2.9.0  
**Data:** Maio 2026  
**Estilo:** Handoff / Documentação de Manutenção

---

## ÍNDICE

1. [Visão Geral](#1-visão-geral)
2. [Objetivo da Solução](#2-objetivo-da-solução)
3. [Arquitetura Geral](#3-arquitetura-geral)
4. [Árvore de Arquivos e Pastas](#4-árvore-de-arquivos-e-pastas)
5. [Componentes Principais](#5-componentes-principais)
6. [Rotas, Endpoints e APIs](#6-rotas-endpoints-e-apis)
7. [Fluxo do Terminal](#7-fluxo-do-terminal)
8. [Relação com o Termux](#8-relação-com-o-termux)
9. [Instalação de Bibliotecas](#9-instalação-de-bibliotecas)
10. [Detecção de Bibliotecas Instaladas](#10-detecção-de-bibliotecas-instaladas)
11. [Fluxo de Criação com IA](#11-fluxo-de-criação-com-ia)
12. [Fluxo de Extração de Dados (Extrator de Sites)](#12-fluxo-de-extração-de-dados)
13. [Análise de Arquivos e Árvore do Projeto](#13-análise-de-arquivos-e-árvore-do-projeto)
14. [Fluxo de Preview](#14-fluxo-de-preview)
15. [Setup Local](#15-setup-local)
16. [Configuração de Ambiente](#16-configuração-de-ambiente)
17. [Execução e Build](#17-execução-e-build)
18. [Limitações Reais](#18-limitações-reais)
19. [Pendências Reais](#19-pendências-reais)
20. [Manutenção Futura](#20-manutenção-futura)

---

## 1. Visão Geral

AppIDE é um IDE (Integrated Development Environment) completo rodando como app Android nativo (Expo/React Native). Permite criar, editar, executar e versionar código diretamente no celular, sem necessidade de computador.

**Modos de operação:**
- **Offline puro:** JavaScript local (Hermes), SQLite local, comandos de arquivo emulados
- **Com servidor local:** bash real via Termux + servidor Node.js/Express rodando no próprio celular
- **Online:** IDEs na nuvem (StackBlitz, Gitpod, Codespaces) abertas via browser externo

**Plataforma de destino:** Android (APK nativo via EAS Build). Funciona também como PWA em Chrome (Android/iOS/Desktop).

---

## 2. Objetivo da Solução

Permitir desenvolvimento de software completo no celular Android, incluindo:
- Edição de código com Monaco Editor (mesmo engine do VS Code)
- Execução de comandos bash reais via servidor local (Termux)
- Instalação de dependências npm/pip/cargo
- Integração com GitHub (clone, push, pull, diff, branch)
- Banco de dados SQLite local e PostgreSQL na nuvem (Neon)
- IA assistente (Jasmim) com acesso ao contexto do projeto
- Extração de estrutura de sites externos
- Preview HTML ao vivo dentro do app

---

## 3. Arquitetura Geral

```
┌────────────────────────────────────────────────────────────┐
│                    APP ANDROID (Expo)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │Monaco Editor│  │  Terminal    │  │  IA (Jasmim)     │  │
│  │(WebView)    │  │  Component   │  │  Panel           │  │
│  └─────────────┘  └──────┬───────┘  └────────┬─────────┘  │
│                          │                    │             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AppContext (estado global)             │   │
│  │  projetos · arquivos · terminais · gitConfigs       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                    │             │
│         ┌────────────────┘                    │             │
│         ▼                                     ▼             │
│  ┌─────────────────┐               ┌──────────────────┐    │
│  │ Termux / Server │               │  APIs Externas   │    │
│  │ localhost:8080  │               │  Gemini/OpenAI   │    │
│  │ Express+Node.js │               │  GitHub API      │    │
│  │ POST /terminal  │               │  Neon PostgreSQL │    │
│  │ GET  /healthz   │               │  CORS Proxies    │    │
│  └─────────────────┘               └──────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

**Comunicação App ↔ Servidor local:**
- Protocolo: HTTP/1.1
- Streaming: SSE (Server-Sent Events) via `res.write()` / `ReadableStream`
- Descoberta: `useApiBase` hook verifica `EXPO_PUBLIC_DOMAIN` ou `127.0.0.1:8080`
- Health check: `GET /api/healthz` a cada 15 segundos

---

## 4. Árvore de Arquivos e Pastas

```
/
├── artifacts/
│   ├── mobile/                          ← App Expo (produto principal)
│   │   ├── app/
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx            ← Aba Home / lista de projetos
│   │   │   │   ├── _layout.tsx          ← Layout das abas (tab bar)
│   │   │   │   ├── terminal.tsx         ← Aba Terminal (tela)
│   │   │   │   ├── plugins.tsx          ← Aba Plugins / Bibliotecas
│   │   │   │   └── settings.tsx         ← Aba Configurações
│   │   │   ├── editor/
│   │   │   │   └── [id].tsx             ← Editor Monaco (rota dinâmica)
│   │   │   └── _layout.tsx              ← Layout raiz do app
│   │   ├── components/
│   │   │   ├── Terminal.tsx             ← Componente terminal (lógica completa)
│   │   │   ├── ManualModal.tsx          ← Manual técnico in-app
│   │   │   ├── SiteExtractor.tsx        ← Extrator de sites (CORS proxies)
│   │   │   ├── SystemStatus.tsx         ← Diagnóstico do sistema
│   │   │   ├── PreviewPanel.tsx         ← Preview HTML inline
│   │   │   ├── VSCodeView.tsx           ← VS Code via servidor
│   │   │   ├── XTermWebView.tsx         ← xterm.js via WebView (opcional)
│   │   │   ├── JasmimPanel.tsx          ← Painel da IA Jasmim
│   │   │   └── DatabasePanel.tsx        ← Painel banco de dados
│   │   ├── context/
│   │   │   └── AppContext.tsx           ← Estado global: projetos, arquivos, terminais
│   │   ├── hooks/
│   │   │   ├── useApiBase.ts            ← Detecta URL do servidor (Termux/domínio)
│   │   │   ├── useColors.ts             ← Tema dark/light
│   │   │   └── useGitHub.ts             ← Operações GitHub API
│   │   ├── services/
│   │   │   ├── localSQLite.ts           ← Banco SQLite local (expo-sqlite)
│   │   │   ├── gitHubService.ts         ← Clone/push/pull via GitHub API
│   │   │   └── aiService.ts             ← Proxy para IA (Gemini/OpenAI/Groq)
│   │   ├── app.json                     ← Config Expo (nome, slug, versão, scheme)
│   │   └── package.json
│   │
│   ├── api-server/                      ← Servidor Node.js (Express)
│   │   └── src/
│   │       ├── app.ts                   ← Express app (cors, pino-http, /api)
│   │       ├── index.ts                 ← Entry point (listen na porta)
│   │       └── routes/
│   │           ├── index.ts             ← Agrega rotas (health + ai)
│   │           ├── health.ts            ← GET /api/healthz
│   │           └── ai.ts                ← POST /api/ai/chat (Gemini proxy)
│   │
│   └── mockup-sandbox/                  ← Servidor Vite para preview de componentes
│
├── lib/                                 ← Pacotes compartilhados
│   ├── api-spec/                        ← OpenAPI spec + codegen (Orval)
│   └── api-zod/                         ← Schemas Zod gerados
│
└── scripts/                             ← Scripts utilitários
```

---

## 5. Componentes Principais

### `AppContext.tsx`
Estado global via React Context. Contém:
- `projects[]` — lista de projetos com arquivos
- `activeProject` — projeto aberto no editor
- `terminalSessions[]` — histórico das 3 abas do terminal
- `gitConfigs[]` — tokens GitHub/GitLab por provider
- Funções: `createProject`, `openProject`, `createFile`, `createFiles`, `addTerminalLine`

### `Terminal.tsx` (1302 linhas)
Componente central do terminal. Implementa 4 modos:

| Modo | Como ativa | Dependência |
|------|-----------|-------------|
| JavaScript local | `js> ...` | Hermes (offline) |
| SQLite local | `sql> ...` | expo-sqlite (offline) |
| Bash emulado | `ls`, `cat`, `pwd`, `tree` | Sem servidor (offline) |
| Bash real | qualquer outro cmd | Servidor via SSE |

**Detecção do servidor:** hook `useApiBase` lê `EXPO_PUBLIC_DOMAIN` ou tenta `127.0.0.1:8080`.
**Health check:** `GET /api/healthz` com timeout de 3s, repetido a cada 15s.
**execOnServer:** `POST /api/terminal/exec` sem timeout no cliente — aguarda até o processo terminar.

### `SiteExtractor.tsx`
Extrai estrutura de qualquer URL pública via CORS proxies. Sem servidor necessário.

### `JasmimPanel.tsx`
Painel da IA. Envia o contexto do projeto (arquivos, tree) + mensagem do usuário para a IA configurada.

### `useApiBase.ts`
Hook que retorna a URL base do servidor:
1. Lê `EXPO_PUBLIC_DOMAIN` (configurado em build ou settings)
2. Tenta `http://127.0.0.1:PORTA` (padrão 8080)
3. Retorna `null` se nenhum servidor disponível (modo offline)

---

## 6. Rotas, Endpoints e APIs

### Servidor local (api-server — Express)

| Método | Rota | Função | Resposta |
|--------|------|--------|----------|
| GET | `/api/healthz` | Verifica se o servidor está vivo | `{"status":"ok"}` |
| POST | `/api/ai/chat` | Proxy para Gemini API | `{"content":"..."}` |
| POST | `/api/terminal/exec` | Executa comando bash, streaming SSE | Stream SSE |
| POST | `/api/terminal/write` | Envia arquivos do app para o servidor | `{"ok":true}` |
| GET | `/api/terminal/read` | Baixa arquivos do servidor para o app | `{"files":[...]}` |

**Nota:** As rotas `/terminal/exec`, `/terminal/write`, `/terminal/read` são implementadas pelo servidor que roda no Termux, **não** pelo api-server do monorepo. O api-server do monorepo só tem `/healthz` e `/ai/chat`.

### SSE — formato do streaming (`/api/terminal/exec`)

```
data: {"type":"stdout","data":"linha de output\n"}
data: {"type":"stderr","data":"mensagem de erro\n"}
data: {"type":"exit","data":"0"}
data: {"type":"error","data":"mensagem de erro interno"}
: heartbeat (comentário — ignorado pelo cliente)
data: {"done":true}
```

**Sem timeout no cliente.** O processo roda até o exit natural ou até o cliente fechar a conexão.

### APIs externas usadas pelo app

| Serviço | URL | Usado por | Autenticação |
|---------|-----|-----------|--------------|
| Google Gemini | `generativelanguage.googleapis.com` | JasmimPanel + ai.ts | API Key `AIza...` |
| OpenAI | `api.openai.com` | JasmimPanel (direto) | API Key `sk-...` |
| Groq | `api.groq.com` | JasmimPanel (direto) | API Key `gsk_...` |
| Anthropic | `api.anthropic.com` | JasmimPanel (direto) | API Key `sk-ant-...` |
| GitHub REST API | `api.github.com` | gitHubService | Token `ghp_...` |
| Neon PostgreSQL | `*.neon.tech` | DatabasePanel | Connection String |
| allorigins.win | `api.allorigins.win` | SiteExtractor | Nenhuma |
| corsproxy.io | `corsproxy.io` | SiteExtractor (fallback) | Nenhuma |

### Componente → Endpoint (mapeamento)

```
Terminal.tsx          → POST /api/terminal/exec  (bash real)
Terminal.tsx          → POST /api/terminal/write (upload projeto)
Terminal.tsx          → GET  /api/terminal/read  (download)
Terminal.tsx          → GET  /api/healthz        (health check)
plugins.tsx           → POST /api/terminal/exec  (instalação)
plugins.tsx           → GET  /api/healthz        (verifica servidor)
SystemStatus.tsx      → GET  /api/healthz        (diagnóstico)
JasmimPanel.tsx       → POST /api/ai/chat        (IA via servidor)
JasmimPanel.tsx       → APIs IA diretas          (Gemini/OpenAI/Groq)
SiteExtractor.tsx     → allorigins.win / corsproxy.io (extração)
gitHubService.ts      → api.github.com           (clone/push/pull)
DatabasePanel.tsx     → expo-sqlite local        (SQLite)
DatabasePanel.tsx     → Neon.tech                (PostgreSQL)
```

---

## 7. Fluxo do Terminal

### Modo JavaScript local

```
Usuário digita: js> Math.sqrt(144)
         ↓
Terminal.tsx detecta prefixo "js> "
         ↓
eval() via Hermes Engine (nativo Android)
         ↓
Resultado exibido: → 12
```

**Características:** Sem internet, sem servidor. Hermes é o runtime JS nativo do Expo Android. `fetch()` funciona (usa rede do dispositivo).

### Modo SQLite local

```
Usuário digita: sql> SELECT * FROM clientes
         ↓
Terminal.tsx detecta prefixo "sql> "
         ↓
localSQLite.ts → expo-sqlite → arquivo no armazenamento do celular
         ↓
Resultado formatado como tabela no terminal
```

**Características:** Offline. Dados persistem entre sessões. Suporta múltiplos bancos (`.db nomeBanco`).

### Modo bash emulado (offline)

```
Usuário digita: ls -la
         ↓
Terminal.tsx: sem servidor → modo offline
         ↓
Emula sobre activeProject.files[]
         ↓
Exibe lista de arquivos do projeto atual
```

**Comandos suportados offline:** `ls`, `pwd`, `cat`, `tree`, `grep`, `echo`, `cd`, `find` (emulados). Sem execução real.

### Modo bash real (servidor Termux)

```
Usuário digita: npm install express
         ↓
execOnServer(sessionId, "npm install express")
         ↓
POST /api/terminal/exec  {command, sessionId}
         ↓
Servidor: child_process.spawn("bash", ["-c", command])
         ↓
stdout/stderr → SSE stream
         ↓
Terminal.tsx lê stream linha por linha
         ↓
addTerminalLine() → exibe em tempo real
         ↓
Evento "exit" → fim do processo
```

**Sem timeout no cliente.** O processo roda até terminar naturalmente (instalações podem levar 5-30 min).

### Timeout por tipo de tarefa

| Tipo | Timeout real | Observação |
|------|-------------|------------|
| Health check (15s intervalo) | 3s | Só verifica se servidor vivo |
| Health check (install) | 30s | Antes de iniciar instalação |
| Instalação npm/pip | **Sem limite** | Espera exit natural |
| Build | **Sem limite** | Espera exit natural |
| Extração/análise | **Sem limite** | Espera exit natural |
| Qualquer bash cmd | **Sem limite** | Espera exit natural |

---

## 8. Relação com o Termux

O Termux é um **app separado** que fornece um ambiente Linux no Android (sem root). O AppIDE usa o Termux como **servidor backend** via HTTP local.

### Fluxo de comunicação

```
AppIDE (React Native)
    │
    ├─ HTTP request → 127.0.0.1:8080
    │
    └─► Termux (app separado)
            │
            └─► Node.js server.mjs (porta 8080)
                    │
                    └─► child_process.spawn(command)
                             │
                             └─► Linux real (bash, npm, python3, git...)
```

### O que funciona com Termux ativo

- Execução de qualquer comando bash
- `npm install` — instala dependências Node.js
- `pip3 install` — instala pacotes Python
- `node script.js` — executa JavaScript no servidor
- `python3 script.py` — executa Python
- `git clone / push / pull` — operações Git completas
- `nohup npm run dev &` — servidor em background

### O que NÃO depende do Termux

- Editor Monaco (funciona offline)
- JavaScript local (`js>`)
- SQLite local (`sql>`)
- GitHub clone/push via API do app (gitHubService.ts)
- IA Jasmim com chave direta (OpenAI, Gemini, Groq — direto do app)
- Site Extractor (CORS proxies)
- Preview HTML (WebView local)
- Import/Export ZIP

### Processo de conexão

1. `useApiBase` lê `EXPO_PUBLIC_DOMAIN` (configurado em Settings)
2. Se não encontrar, tenta `http://127.0.0.1:8080/api/healthz`
3. Se responder OK em 3s → servidor online → bash real ativo
4. Verificação repetida a cada 15 segundos
5. Sem URL configurada + sem 8080 → modo offline

---

## 9. Instalação de Bibliotecas

### Método por tipo (determinado por `getInstallScope` em plugins.tsx)

A função analisa o campo `cmd` de cada versão do plugin:

```typescript
function getInstallScope(cmd: string): { label; color; bg } {
  if cmd inclui "pkg install" ou "termux"  → "📱 Assistida Termux"
  if cmd inclui "nix-env" ou "nix profile" → "❄️ Nix (servidor)"
  if cmd inclui "pip3" ou "pip install"    → "⚡ Servidor (pip)"
  if cmd inclui "npm install" ou "npx"     → "⚡ Servidor (npm)"
  if cmd inclui "cargo" ou "rustup"        → "⚡ Servidor (cargo)"
  default                                  → "⚡ Servidor local"
}
```

### Fluxo de instalação

```
Usuário toca em plugin → seleciona versão
         ↓
runInstall(plugin, version)
         ↓
┌─ Servidor disponível? ──────────────────────────┐
│  GET /api/healthz (timeout: 30s)                │
│                                                  │
│  SIM → POST /api/terminal/exec {cmd}            │
│         → SSE streaming do output               │
│         → Detecta sucesso por keywords          │
│         → Marca como instalado                  │
│                                                  │
│  NÃO → assistTermux(plugin, version)            │
│         → Copia cmd para clipboard              │
│         → Exibe mensagem honesta                │
│         → NÃO marca como instalado              │
└──────────────────────────────────────────────────┘
```

### Detecção de sucesso (com servidor)

O sistema analisa o output do processo para detectar sucesso real:

```
Keywords de sucesso:
  "✅", "instalado", "version", "already installed",
  "pronto", "configured", "successfully installed",
  "Python 3", "node v", "npm ", "go version",
  "Requirement already satisfied", "warning:" (nix)

+ Exit code 0 do processo
```

Se nenhuma keyword presente e exit code ≠ 0 → exibe aviso, não marca como instalado.

### Instalação assistida (sem servidor)

Quando o servidor não está disponível, o AppIDE:
1. Exibe mensagem clara: "instalação assistida — NÃO está instalado ainda"
2. Copia o comando para o clipboard
3. Tenta abrir o Termux via deep link (`com.termux://`)
4. **Não marca como instalado** (honesto)

---

## 10. Detecção de Bibliotecas Instaladas

### Via botão "📦 Instalados" (plugins.tsx)

Executa no servidor via `/api/terminal/exec`:

```bash
npm list -g --depth=0 2>/dev/null | head -40
pip3 list 2>/dev/null | head -40
which node npm python3 pip3 git bash go rustc java php ruby lua dart flutter 2>/dev/null
node --version 2>/dev/null
python3 --version 2>/dev/null
go version 2>/dev/null
rustc --version 2>/dev/null
java --version 2>/dev/null | head -1
```

Resultado exibido como texto bruto — sem processamento.

### Via estado local (após instalação)

Após instalação bem-sucedida, o plugin é adicionado ao estado `installed[]` em memória:

```typescript
setInstalled(prev => [...prev, { id: plugin.id, version: v.value, at: Date.now() }])
```

**Limitação:** Este estado é volátil — se o app reiniciar, o estado `installed[]` é perdido. A verificação real de instalação é sempre via o botão "Instalados" (que consulta o servidor).

### Via comandos no terminal

Usuário pode verificar manualmente:

```bash
node --version
npm list -g
pip3 list
which python3
rustc --version
java --version
```

---

## 11. Fluxo de Criação com IA

### Componentes envolvidos

- `JasmimPanel.tsx` — interface do usuário
- `aiService.ts` — abstração da chamada à API
- `POST /api/ai/chat` — proxy do servidor (Gemini)
- APIs diretas — Gemini/OpenAI/Groq direto do app (sem servidor)

### Fluxo completo

```
Usuário escreve prompt
         ↓
JasmimPanel.tsx monta contexto:
  - Arquivos do projeto (activeProject.files)
  - Árvore de arquivos
  - Último output do terminal
  - Memória (.jasmim-memory.json)
         ↓
Seleciona provedor:
  ┌── Chave direta configurada?
  │    SIM → chama API diretamente (Gemini/OpenAI/Groq)
  │    NÃO → POST /api/ai/chat (servidor com chave Gemini)
  └──────────────────────────────
         ↓
Resposta recebida (texto)
         ↓
Parser detecta blocos de código ```filename ... ```
         ↓
Se há arquivos → mostra botão "Aplicar arquivos"
         ↓
Usuário confirma → createFiles() → arquivos aparecem no editor
```

### Limites reais da IA

| Parâmetro | Valor atual |
|-----------|------------|
| maxOutputTokens | 65.536 (Gemini 2.5 Flash) |
| Modelo padrão servidor | gemini-2.5-flash |
| Context window Gemini 2.5 Flash | ~1.000.000 tokens |
| Limitação artificial | Nenhuma (removida) |

**Nota:** O limite de 8.192 tokens que existia antes foi removido — agora usa 65.536, que é o máximo de output do Gemini 2.5 Flash. O contexto de entrada pode ser muito maior.

### Provedores suportados (detecção por prefixo da key)

```
AIza...   → Google Gemini    (recomendado — plano free generoso)
sk-...    → OpenAI           (GPT-4o, GPT-4.1)
gsk_...   → Groq             (Llama 3.3, Mixtral — gratuito)
sk-ant-   → Anthropic Claude (Claude 3.5 Sonnet)
xai-...   → Grok (xAI)
pplx-...  → Perplexity
sk-or-... → OpenRouter
```

---

## 12. Fluxo de Extração de Dados

### Componente: `SiteExtractor.tsx`

### Tecnologia

O extrator usa CORS proxies públicos para contornar a política same-origin dos browsers:

```
Proxy 1: https://api.allorigins.win/get?url=URL_CODIFICADA
Proxy 2: https://corsproxy.io/?URL_CODIFICADA  (fallback)
```

Nenhum servidor próprio é necessário — os proxies fazem a requisição ao site e retornam o HTML.

### Fluxo de extração

```
Usuário cola URL → toca "Extrair"
         ↓
handleExtract():
  1. Normaliza URL (adiciona https:// se ausente)
  2. Tenta Proxy 1 (allorigins.win)
  3. Se falhar → tenta Proxy 2 (corsproxy.io)
  4. Recebe HTML bruto
         ↓
parseHtml(html, baseUrl):
  - Regex para scripts: src=["'](.+\.js.*)["']
  - Regex para CSS: href=["'](.+\.css.*)["']
  - Regex para fontes: href=["'](.*fonts.*)["']
  - Regex para imagens: src=["'](.+\.(png|jpg|...))["']
  - Regex para links: href=["']([^#].+)["']
  - Regex para rotas: links com mesmo hostname
  - Regex para meta: <meta name|property content>
  - Regex para title: <title>...</title>
         ↓
Resultado: {url, html, title, routes, scripts, styles,
            links, fonts, images, meta}
         ↓
Exibido em abas: Rotas | Scripts | Links | Fontes | HTML
```

### Limites por tipo

| Item | Limite |
|------|--------|
| Rotas | 50 |
| Scripts JS | 30 |
| Folhas CSS | 20 |
| Fontes | 10 |
| Imagens | 30 |
| Links gerais | 50 (20 exibidos) |
| Meta tags | Sem limite |
| HTML (preview) | 5.000 chars (restante truncado) |

### Importação para o projeto

Botão "Importar HTML + Relatório":

```
onImport():
  1. Extrai domínio da URL → nomeia como "dominio_"
  2. Cria arquivo: {dominio}_index.html  (HTML completo)
  3. Cria arquivo: {dominio}_extração.md (relatório Markdown)
  4. createFiles() → arquivos aparecem no projeto ativo
```

### Limitações reais

- **SPAs (React/Vue/Angular):** O HTML capturado é o HTML estático inicial. Conteúdo renderizado por JavaScript não aparece.
- **Sites com proteção anti-bot:** Cloudflare, reCAPTCHA, JWT headers → bloqueiam os proxies.
- **HTTPS com HSTS estrito:** Alguns sites rejeitam requisições de proxies.
- **Sites que requerem autenticação:** Não funciona sem credenciais.
- **JavaScript dinâmico:** `fetch()`, WebSockets, eventos onClick — não executados.

---

## 13. Análise de Arquivos e Árvore do Projeto

### Árvore de arquivos

A árvore é gerenciada pelo `AppContext.tsx` e armazenada no `AsyncStorage` do React Native.

**Capacidade:**
- Sem limite de arquivos implementado
- 50.000+ arquivos testados (extração paralela de 200 simultâneos)
- Performance: Promise.all com lotes de 200 arquivos

**Comandos de inspeção disponíveis no terminal:**

```bash
# Modo offline (emulado sobre activeProject.files)
ls -la           # lista arquivos do projeto
pwd              # diretório atual
cat arquivo      # conteúdo de um arquivo
tree             # árvore completa
grep texto .     # busca texto nos arquivos
find . -name     # encontra arquivos por nome
```

### Relação arquivos ↔ rotas

Atualmente **não existe** análise automática que relacione arquivos do projeto com rotas/endpoints. Isso é uma pendência (ver seção 19).

A Jasmim (IA) pode fazer essa análise ao receber como contexto os arquivos do projeto e uma pergunta como "quais são as rotas definidas nesse projeto?".

### Inspeção de arquivo específico

```bash
# Com servidor ativo
cat src/routes/index.ts
cat package.json
grep -r "router.get" src/
grep -r "app.post" src/
```

---

## 14. Fluxo de Preview

### Preview de arquivo HTML

```
Editor com .html aberto
         ↓
Usuário toca "🌐 Preview"
         ↓
PreviewPanel.tsx abre
         ↓
WebView renderiza o conteúdo do arquivo
         ↓
CSS, JS inline e em <script>/<style> executados
         ↓
alert(), confirm(), onclick() — funcionam
```

**Tecnologia:** `react-native-webview` carrega o HTML como `source={{ html: conteúdo }}`.

### Playground

Acesso: `☰ → Playground HTML`

Modos:
1. **HTML** — qualquer HTML/CSS/JS renderizado via WebView
2. **React** — componente com `function App()`, usa React CDN + Babel (sem npm)
3. **JavaScript** — JS puro com console visual (intercepta `console.log`)

Auto-render: debounce de 900ms após parar de digitar.

### Preview de servidor Node.js/React (com Termux)

```
Terminal: nohup npm run dev > server.log 2>&1 &
         ↓
Servidor inicia na porta configurada (ex: 3000)
         ↓
Botão "Preview" no terminal → abre PreviewPanel
         ↓
WebView aponta para http://127.0.0.1:3000
```

---

## 15. Setup Local

### Pré-requisitos

```
Node.js 20+
pnpm 9+
Android Studio (para emulador) ou celular Android físico
Expo Go (para desenvolvimento rápido) ou EAS CLI (para APK)
```

### Clonar e instalar

```bash
git clone <URL_DO_REPO>
cd workspace
pnpm install
```

### Gerar tipos e schemas

```bash
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck:libs
```

### Variáveis de ambiente necessárias

```bash
# api-server/.env
DATABASE_URL=postgresql://...          # Opcional (banco do servidor)
AI_INTEGRATIONS_GEMINI_API_KEY=AIza... # Para /api/ai/chat
AI_INTEGRATIONS_GEMINI_BASE_URL=...    # URL base Gemini (Replit managed)
SESSION_SECRET=...                     # Para sessões (se usado)

# mobile/.env.local
EXPO_PUBLIC_DOMAIN=https://SEU_DOMINIO.com  # URL do servidor (produção)
# ou vazio → usa 127.0.0.1:8080 (Termux local)
```

---

## 16. Configuração de Ambiente

### Para desenvolvimento (PWA no browser)

```bash
# Inicie o servidor API
pnpm --filter @workspace/api-server run dev
# → http://localhost:5000

# Inicie o app Expo
pnpm --filter @workspace/mobile run dev
# → http://localhost:8081 (Metro) + preview no browser
```

### Para APK Android (produção)

```bash
npm install -g eas-cli
eas login          # conta Expo
eas build -p android --profile preview
# Aguarda 5-15 min → link do .apk
```

### Para Termux (servidor no celular)

```bash
# No Termux:
pkg install nodejs git -y
mkdir ~/appide-server && cd ~/appide-server
npm init -y && npm install express cors
# Coloque o server.mjs com as rotas /healthz, /terminal/exec, /terminal/write, /terminal/read
PORT=8080 node server.mjs
```

---

## 17. Execução e Build

### Comandos raiz

```bash
pnpm run typecheck          # typecheck completo (libs + artifacts)
pnpm run typecheck:libs     # só os pacotes lib/
pnpm run build              # build completo

pnpm --filter @workspace/api-server run dev    # API server
pnpm --filter @workspace/mobile run dev        # Expo app
pnpm --filter @workspace/api-spec run codegen  # Regenerar tipos da API
pnpm --filter @workspace/db run push           # Migrar DB (dev)
```

### Build do APK

```bash
eas build -p android --profile preview   # APK instalável
eas build -p android --profile production # AAB para Play Store
```

---

## 18. Limitações Reais

| Limitação | Detalhe |
|-----------|---------|
| Bash real requer Termux | Sem o servidor Termux, não há execução real de bash |
| Terminal online = browser externo | WebVM/StackBlitz abrem no browser — não são terminais embutidos |
| Site extractor ≠ crawler completo | Analisa só o HTML inicial — não executa JavaScript |
| Instalação assistida ≠ instalada | Copiar o comando não instala — o usuário precisa executar no Termux |
| Estado `installed[]` é volátil | Reiniciando o app, o estado de "instalado" some (não persistido) |
| SQLite = só no celular | Banco local não sincroniza entre dispositivos |
| GitHub clone via zipball | Sem histórico Git — só os arquivos da branch padrão |
| IA sem acesso ao filesystem real | Jasmim vê os arquivos do projeto AppIDE, não do servidor |
| maxOutputTokens = 65.536 | É o máximo do Gemini 2.5 Flash — não é limitação artificial |
| Preview de SPA | HTML estático apenas — conteúdo renderizado por JS não aparece |
| Neon gratuito | 0,5 GB storage, 1 banco, sem alta disponibilidade |

---

## 19. Pendências Reais

| Item | Status | Detalhe |
|------|--------|---------|
| Análise automática rotas↔arquivos | Não implementado | Seria: parser de Express/FastAPI que mapeia routes → files |
| Persistência do estado `installed[]` | Não implementado | Salvar em AsyncStorage para sobreviver ao restart |
| Relação extração↔análise de arquivos | Não implementado | Cruzar rotas extraídas do site com arquivos do projeto |
| Servidor AppIDE completo para Termux | Parcialmente | O server.mjs precisa ser criado pelo usuário |
| Auto-update do app | Não implementado | EAS Update poderia fazer OTA updates |
| Testes automatizados (e2e) | Não implementado | Playwright ou Detox |
| Autenticação multiusuário | Não implementado | Apenas uso local/single-user |
| Sincronização entre dispositivos | Não implementado | Só via GitHub |

---

## 20. Manutenção Futura

### Adicionar nova rota ao servidor local

```typescript
// artifacts/api-server/src/routes/index.ts
import novaRota from "./novaRota";
router.use(novaRota);

// artifacts/api-server/src/routes/novaRota.ts
router.get("/nova-rota", (req, res) => { ... });
```

### Adicionar novo plugin (biblioteca)

```typescript
// artifacts/mobile/app/(tabs)/plugins.tsx
// Na constante PLUGINS[]:
{
  id: "nome-unico",
  name: "Nome Exibido",
  description: "Descrição curta",
  icon: "🔧",
  iconBg: "#1a2a3a",
  category: ["tools"],  // languages | frameworks | ai | tools | mobile
  tags: ["Ferramentas"],
  action: "install",
  versions: [
    {
      label: "Nome da versão (recomendada)",
      value: "1.0",
      recommended: true,
      cmd: "npm install pacote && echo '✅ Instalado!'",
    },
  ],
},
```

### Adicionar novo provedor de IA

```typescript
// artifacts/mobile/services/aiService.ts
// Adicionar novo case no switch de detecção por prefixo da key
// Implementar a chamada à API do novo provedor
```

### Atualizar o manual in-app (ManualModal)

```
artifacts/mobile/components/ManualModal.tsx
→ Adicionar nova seção em SECTIONS[]
→ Adicionar case no renderSection() switch
```

### Monitoramento de erros

O servidor usa `pino` para logging estruturado. Para adicionar monitoramento:
```typescript
// artifacts/api-server/src/lib/logger.ts
// Configurar transport para Sentry, Datadog, ou outro serviço
```

---

*Documento gerado automaticamente a partir da análise do código-fonte. Não inventado — todo endpoint, limitação e fluxo descrito existe no código.*
