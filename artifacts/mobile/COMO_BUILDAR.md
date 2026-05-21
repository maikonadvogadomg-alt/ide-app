# 📱 DevMobile — Como Gerar o APK

## Opção 1 — EAS Build (Expo Application Services) ✅ Recomendado

### Pré-requisitos
- Conta gratuita em https://expo.dev
- Node.js 20+ instalado
- `npm install -g eas-cli`

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Login no EAS
eas login

# 3. Configurar projeto (apenas primeira vez)
eas build:configure

# 4. Build APK (para testar — modo preview)
eas build --platform android --profile preview

# 5. Build AAB (para publicar na Play Store)
eas build --platform android --profile production
```

O APK/AAB fica disponível para download no painel do EAS em ~10 minutos.

---

## Opção 2 — Capacitor (build local) ✅ Para quem tem Android Studio

### Pré-requisitos
- Node.js 20+
- Android Studio + SDK instalado
- Java 17+

```bash
# 1. Instalar dependências
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Build web
npx expo export -p web

# 3. Inicializar Capacitor (apenas primeira vez)
npx cap init DevMobile com.devmobile.ide --web-dir dist

# 4. Adicionar plataforma Android
npx cap add android

# 5. Sincronizar assets
npx cap sync android

# 6. Abrir no Android Studio para gerar APK
npx cap open android
# No Android Studio: Build → Generate Signed APK
```

---

## Opção 3 — GitHub Actions (build automático no GitHub)

O arquivo `.github/workflows/build-apk-eas.yml` já está configurado.

### Configurar secrets no GitHub:
- `EXPO_TOKEN` → https://expo.dev/accounts/[user]/settings/access-tokens

### Fazer o build:
- Push para o branch `main` aciona o build automaticamente
- Ou vá em Actions → Build APK (EAS) → Run workflow

---

## Opção 4 — Build local com Gradle (sem EAS)

O arquivo `.github/workflows/build-apk-local.yml` usa Capacitor + Gradle localmente.

```bash
# Requer Android SDK configurado com ANDROID_HOME
npm run build:apk  # se configurado no package.json
```

---

## 🔧 Configuração antes de buildar

1. Copie `.env.example` para `.env`
2. Preencha as chaves de IA que desejar
3. Configure `EXPO_PUBLIC_DOMAIN` se usar servidor
4. Para Neon DB: preencha `DATABASE_URL`

---

## 📦 Estrutura de rotas diretas (sem servidor Replit)

O app funciona 100% offline. As IAs chamam diretamente os provedores:

| Provedor | Detecção | Endpoint direto |
|---|---|---|
| Google Gemini | `AIza...` | `generativelanguage.googleapis.com` |
| Groq | `gsk_...` | `api.groq.com/openai/v1` |
| OpenAI | `sk-...` | `api.openai.com/v1` |
| Anthropic | `sk-ant-...` | `api.anthropic.com/v1` |
| OpenRouter | `sk-or-...` | `openrouter.ai/api/v1` |
| Perplexity | `pplx-...` | `api.perplexity.ai` |
| xAI/Grok | `xai-...` | `api.x.ai/v1` |
| DeepSeek | `sk-...` (deepseek) | `api.deepseek.com/v1` |

Todos os dados ficam localmente no dispositivo via AsyncStorage + SQLite.
# Como Gerar o APK do DevMobile com EAS Build

## Pré-requisitos

1. Conta no Expo (https://expo.dev) — owner: `maikonrocha`
2. EAS CLI instalado: `npm install -g eas-cli`
3. Node.js 20+
4. Conectado à internet

---

## Passo a Passo: Gerar APK

### 1. Entrar na conta Expo
```bash
eas login
# Email: (sua conta Expo)
# Senha: (sua senha)
```

### 2. Instalar dependências
```bash
cd DevMobile  # pasta do projeto
npm install   # ou pnpm install
```

### 3. Gerar APK (perfil "preview")
```bash
eas build --platform android --profile preview
```

- O EAS vai subir o código para os servidores Expo
- A build demora ~10-20 minutos
- Ao final, aparece um link para baixar o `.apk`

### 4. Baixar e instalar no celular
- Acesse o link gerado (ou veja em https://expo.dev/accounts/maikonrocha/projects)
- Baixe o `.apk` no celular
- Habilite "Instalar de fontes desconhecidas" nas configurações
- Instale o APK

---

## Perfis de Build

| Perfil | Formato | Uso |
|--------|---------|-----|
| `preview` | APK | Testes no celular (recomendado) |
| `production` | AAB | Publicar na Play Store |
| `development` | APK | Desenvolvimento com DevClient |

---

## Configuração do Servidor (Opcional)

O DevMobile funciona **100% sem servidor** com:
- JavaScript local via Hermes Engine (`js> código`)
- SQLite local no celular (`sql> query`)
- Editor de código completo offline

Se quiser conectar um servidor para `npm install`, `node`, `python`:
1. Abra o app → ⚙️ Configurações
2. Seção "Servidor API"
3. Cole a URL do seu servidor (ex: VPS, Railway, Render)
4. Salvar e testar conexão

O app nunca ficará vinculado ao Replit — use qualquer servidor.

---

## Informações do Projeto

- **Package:** `com.devmobile.ide`
- **Expo Owner:** `maikonrocha`
- **Project ID:** `13df5db9-8f1a-421b-aadc-976799facd31`
- **SDK:** Expo 54
- **Versão:** 2.7.7 (versionCode: 42)

# DevMobile — Manual Completo de Build
**App:** DevMobile IDE  
**Versão:** 2.8.0  
**Package:** `com.devmobile.ide`  
**Owner Expo:** `maikon12`  
**Project ID:** `57007145-e348-4887-84e6-3c20644f5ec4`

---

## SUMÁRIO

1. [Pré-requisitos](#1-pré-requisitos)
2. [Configurar variáveis de ambiente (.env)](#2-configurar-variáveis-de-ambiente)
3. [Método 1 — EAS Build (Expo) — APK na nuvem](#3-método-1--eas-build-expo)
4. [Método 2 — Capacitor — APK local no PC](#4-método-2--capacitor-apk-local)
5. [Solução de problemas comuns](#5-solução-de-problemas-comuns)
6. [Estrutura do projeto](#6-estrutura-do-projeto)
7. [Chaves de API necessárias](#7-chaves-de-api)

---

## 1. Pré-requisitos

### Para os dois métodos:
- **Node.js 20+** → https://nodejs.org
- **pnpm** → `npm install -g pnpm`
- **Git** → https://git-scm.com

### Só para Método 1 (EAS):
- Conta no **Expo** → https://expo.dev (gratuita)
- **EXPO_TOKEN** → https://expo.dev/accounts/maikon12/settings/access-tokens

### Só para Método 2 (Capacitor):
- **Android Studio** → https://developer.android.com/studio
- **JDK 17+** (vem com Android Studio)
- **Android SDK** configurado (SDK 33 ou superior)

---

## 2. Configurar variáveis de ambiente

### 2.1 Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

### 2.2 Edite o `.env` com suas chaves:

```env
# Modo do app (deixe como cloud para usar o servidor)
EXPO_PUBLIC_APP_MODE=cloud
EXPO_PUBLIC_API_STRATEGY=cloud

# Sua chave de IA favorita (pelo menos uma):
EXPO_PUBLIC_GEMINI_KEY=AIzaSy...       # Grátis: https://aistudio.google.com/apikey
EXPO_PUBLIC_GROQ_KEY=gsk_...           # Grátis: https://console.groq.com
EXPO_PUBLIC_OPENAI_KEY=sk-...          # Pago: https://platform.openai.com
EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-...   # Pago: https://console.anthropic.com

# GitHub (opcional, para push/import de projetos):
EXPO_PUBLIC_GITHUB_TOKEN=ghp_...
EXPO_PUBLIC_GITHUB_USER=seu_usuario

# EAS (só para Método 1):
EXPO_TOKEN=seu_expo_token_aqui
```

> **Dica grátis:** Use Gemini (Google) ou Groq — ambos têm plano gratuito generoso.

---

## 3. Método 1 — EAS Build (Expo)

Gera o APK na nuvem da Expo. Não precisa de Android Studio instalado.

### 3.1 Instalar dependências:
```bash
# Dentro da pasta do projeto (artifacts/mobile ou raiz se extraiu o zip):
npm install
```

### 3.2 Fazer login no Expo:
```bash
npx eas-cli login
# ou com token:
export EXPO_TOKEN=seu_token_aqui
```

### 3.3 Verificar login:
```bash
npx eas-cli whoami
# Deve mostrar: maikon12
```

### 3.4 Disparar o build (APK):
```bash
EAS_NO_VCS=1 EXPO_TOKEN=$EXPO_TOKEN npx eas-cli build \
  --platform android \
  --profile preview \
  --non-interactive \
  --no-wait
```

> `--no-wait` retorna imediatamente. Acompanhe em:
> https://expo.dev/accounts/maikon12/projects/app-ide/builds

### 3.5 Ver status do build:
```bash
npx eas-cli build:list --platform android --limit 5
```

### 3.6 Quando terminar:
- Acesse o link do build no painel Expo
- Clique em **Download** para baixar o `.apk`
- Transfira para o Android e instale (habilite "fontes desconhecidas" nas configurações)

### Perfis disponíveis no eas.json:
| Perfil | Tipo | Uso |
|--------|------|-----|
| `preview` | APK | Teste rápido, instala direto |
| `development` | APK + Dev Client | Desenvolvimento com hot-reload |
| `production` | AAB | Publicar na Play Store |

---

## 4. Método 2 — Capacitor (APK local)

Gera o APK diretamente no seu PC com Android Studio. **Não usa créditos EAS.**

### 4.1 Pré-requisito: Android Studio
1. Baixe e instale: https://developer.android.com/studio
2. Abra o Android Studio → SDK Manager → instale **Android SDK 33**
3. Configure as variáveis de ambiente:

```bash
# Linux/Mac — adicione no ~/.bashrc ou ~/.zshrc:
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator

# Windows — adicione nas variáveis de sistema:
# ANDROID_HOME = C:\Users\SeuNome\AppData\Local\Android\Sdk
# PATH += %ANDROID_HOME%\platform-tools
```

### 4.2 Instalar dependências:
```bash
npm install
```

### 4.3 Instalar CLI do Capacitor:
```bash
npm install -g @capacitor/cli
```

### 4.4 Gerar o build web (Expo → HTML/JS):
```bash
npx expo export --platform web
```
> Isso cria a pasta `dist/` com o app compilado.

### 4.5 Sincronizar com Capacitor:
```bash
npx cap sync android
```
> Se a pasta `android/` não existir ainda:
> ```bash
> npx cap add android
> npx cap sync android
> ```

### 4.6 Gerar o APK pelo Android Studio:
```bash
npx cap open android
```
Isso abre o Android Studio. Dentro dele:
1. Aguarde o projeto carregar (Gradle sync)
2. Menu: **Build → Build Bundle(s)/APK(s) → Build APK(s)**
3. Quando terminar: clique em **locate** para encontrar o APK

**Localização do APK gerado:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 4.7 Gerar APK de release (assinado):
```bash
# Dentro do Android Studio:
# Build → Generate Signed Bundle/APK → APK → preencha keystore → Release
```

### 4.8 Instalar via linha de comando (se tiver ADB):
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Solução de problemas comuns

### EAS Build — "Unable to resolve module react-native"
**Causa:** metro.config.js procurava na pasta errada.
**Status:** JÁ CORRIGIDO no `metro.config.js` deste projeto.

### EAS Build — "Invalid project ID"
```bash
npx eas-cli init
# Confirme: owner=maikon12, slug=app-ide
```

### EAS Build — "Not logged in"
```bash
export EXPO_TOKEN=seu_token
npx eas-cli whoami
```

### Capacitor — "SDK location not found"
1. Crie o arquivo `android/local.properties`:
```
sdk.dir=/home/SEU_USUARIO/Android/Sdk
# Windows: sdk.dir=C\:\\Users\\SEU_USUARIO\\AppData\\Local\\Android\\Sdk
```

### Capacitor — Gradle sync falhou
```bash
cd android
./gradlew clean
cd ..
npx cap sync android
```

### App abre tela branca
- Verifique se o `dist/` foi gerado antes do `cap sync`
- Reexecute: `npx expo export --platform web && npx cap sync android`

### Erro de permissão no Android (instalar APK):
- Vá em Configurações → Segurança → **Instalar apps desconhecidos**
- Habilite para o gerenciador de arquivos ou navegador

---

## 6. Estrutura do projeto

```
artifacts/mobile/           ← Raiz do projeto mobile
├── app/                    ← Telas (Expo Router)
│   └── (tabs)/
│       ├── index.tsx       ← Tela inicial / Explorer de projetos
│       ├── editor.tsx      ← Editor de código (Monaco)
│       ├── ai.tsx          ← Chat com IA
│       ├── terminal.tsx    ← Terminal
│       ├── browser.tsx     ← Navegador embutido
│       ├── tasks.tsx       ← Gerenciador de tarefas
│       ├── plugins.tsx     ← Plugins e extensões
│       ├── pwa.tsx         ← Gerenciador de PWA
│       └── settings.tsx    ← Configurações (tokens, API etc)
├── components/             ← Componentes reutilizáveis
│   ├── APKBuilderModal.tsx ← Modal de build APK (dispara EAS)
│   ├── AIChat.tsx          ← Interface de IA
│   ├── CodeEditor.tsx      ← Editor principal
│   ├── GitHubModal.tsx     ← Push/Import GitHub
│   └── Terminal.tsx        ← Terminal embutido
├── context/
│   └── AppContext.tsx      ← Estado global (projetos, configs)
├── services/
│   ├── githubService.ts    ← Integração GitHub API
│   ├── storageService.ts   ← Persistência local (SQLite)
│   └── runtimeMode.ts      ← Detecção de ambiente
├── app.json                ← Configuração Expo
├── eas.json                ← Perfis de build EAS
├── capacitor.config.ts     ← Configuração Capacitor
├── metro.config.js         ← Config Metro (monorepo-aware)
├── .env.example            ← Modelo de variáveis de ambiente
└── package.json            ← Dependências
```

---

## 7. Chaves de API

### IA (pelo menos uma):

| Provedor | Onde obter | Custo |
|----------|-----------|-------|
| **Google Gemini** | https://aistudio.google.com/apikey | Grátis |
| **Groq** | https://console.groq.com/keys | Grátis |
| OpenAI | https://platform.openai.com/api-keys | Pago |
| Anthropic | https://console.anthropic.com/settings/keys | Pago |
| OpenRouter | https://openrouter.ai/keys | Grátis + Pago |
| xAI / Grok | https://console.x.ai | Pago |

### GitHub (opcional):
- Acesse: https://github.com/settings/tokens
- Crie um token com permissões: `repo`, `workflow`
- Cole em: `EXPO_PUBLIC_GITHUB_TOKEN`

### Expo (só EAS Build):
- Acesse: https://expo.dev/accounts/maikon12/settings/access-tokens
- Crie um token de acesso
- Cole em: `EXPO_TOKEN`

---

## Comandos rápidos (resumo)

```bash
# Instalar tudo:
npm install

# Rodar localmente (precisa do Expo Go no celular):
npx expo start

# Build APK via EAS (nuvem):
EAS_NO_VCS=1 EXPO_TOKEN=seu_token npx eas-cli build --platform android --profile preview

# Build via Capacitor (local):
npx expo export --platform web
npx cap sync android
npx cap open android   # abre Android Studio → Build APK

# Ver builds EAS:
npx eas-cli build:list --platform android --limit 5

# Verificar login EAS:
npx eas-cli whoami
```

---

**DevMobile v2.8.0** | IDE mobile completo para Android

# Como gerar o APK do DevMobile (instalar no celular sem Expo Go)

## O que você precisa
- Computador ou notebook com internet
- Conta gratuita no Expo (expo.dev)
- Node.js instalado (nodejs.org)

---

## Passo a passo

### 1. Crie sua conta gratuita no Expo
Acesse https://expo.dev e clique em **Sign Up** (é grátis).

### 2. Instale o EAS CLI no computador
Abra o terminal (Prompt de Comando ou PowerShell no Windows) e rode:
```
npm install -g eas-cli
```

### 3. Entre na sua conta Expo
```
eas login
```
Digite seu e-mail e senha do expo.dev.

### 4. Vá até a pasta do DevMobile
```
cd DevMobile-CORRIGIDO
```
(ou onde você descompactou o ZIP)

### 5. Gere o APK na nuvem (GRÁTIS)
```
eas build --platform android --profile preview
```

Responda as perguntas:
- "Would you like to automatically create an EAS project?" → **Y**
- "Generate a new Android Keystore?" → **Y**

O processo leva uns **15 a 20 minutos** na nuvem da Expo.

### 6. Baixe e instale o APK
Quando terminar, o terminal vai mostrar um link para baixar o `.apk`.
Transfira o arquivo para o celular e instale.

> No Android: Configurações → Segurança → Permitir fontes desconhecidas

---

## Plano gratuito da Expo
- 30 builds por mês gratuitamente
- APK gerado na nuvem sem precisar instalar Android Studio
- Não precisa do Replit para nada

---

## Dúvidas?
O APK gerado é um app real, independente, sem precisar de Expo Go nem Replit.
Funciona igual qualquer app instalado da Play Store.


# DevMobile — Plano de Arquitetura Local
**Versão 2.6.0 | Documento principal de referência**

---

## OBJETIVO PRINCIPAL

O DevMobile é um IDE completo que roda **diretamente no celular**.
Todos os dados são salvos **no próprio celular** (AsyncStorage).
O app **não depende do servidor Replit** para funcionar — o Replit é apenas ambiente de desenvolvimento.

---

## ONDE OS DADOS SÃO SALVOS

**Tudo fica salvo no celular, dentro do app, em AsyncStorage:**

| O que | Chave no AsyncStorage |
|---|---|
| Projetos + arquivos | `@devmobile/projects` |
| Provedores de IA | `@devmobile/ai_providers` |
| Config Git/GitHub | `@devmobile/git_configs` |
| Configurações | `@devmobile/settings` |
| Memória da Jasmim | `@devmobile/ai_memory` |
| Projeto/arquivo ativos | `@devmobile/active_project_id` |

Salvamento automático: a cada 1,5 segundos durante digitação + imediatamente ao trocar de arquivo + imediatamente ao fechar/minimizar o app (`AppState`).

---

## MODOS DE OPERAÇÃO

### Modo LOCAL (padrão — sem nenhum servidor)
O que funciona SEM o servidor Replit:
- Editor de código completo (com syntax highlight)
- Todos os projetos e arquivos
- Gerenciador de projetos
- GitHub / GitLab (clone, push, pull) — API direto do GitHub, sem backend
- Assistente de IA Jasmim — com qualquer provedor configurado
- IA Gratuita (Gemini Cortesia) — sem precisar de chave
- Tarefas (Taski)
- Checkpoints / histórico
- Exportar ZIP
- Importar ZIP / TAR / arquivos
- Preview HTML local
- Playground HTML
- Manual completo

### Modo REMOTO (opcional — com servidor)
Funciona APENAS se houver servidor configurado (Replit ativo, ou Termux local):
- Terminal Linux real
- Preview de servidor (Node.js / Python rodando)
- VS Code (code-server) via WebView
- Upload/download de arquivos para o servidor
- Banco de dados remoto (Neon/PostgreSQL)

---

## CONFIGURAÇÃO DE PORTAS

```
Porta local padrão (API/terminal): 8080
Porta code-server (VS Code):       3001
Porta preview:                     8080

URL local (Termux ou API no celular):
  http://127.0.0.1:8080

URL auto-detectada pelo app (prioridade):
  1. EXPO_PUBLIC_API_BASE_URL  (env var fixa — se definida)
  2. customServerUrl           (configurado nas settings do app)
  3. http://localhost:8080     (Termux local — ping automático)
  4. https://<EXPO_PUBLIC_DOMAIN> (servidor Replit — fallback)
  5. vazio                     (modo offline puro)
```

**IMPORTANTE:** A porta correta para o servidor local é **8080**, não 18115.
O arquivo `runtimeMode.ts` foi corrigido para usar 8080 como padrão.

---

## EDITORES E VISUALIZADORES (funcionam sem o servidor Replit)

### Editor local embutido
- Componente `CodeEditor.tsx`
- Syntax highlighting para JS, TS, Python, HTML, CSS, JSON, etc.
- Auto-save robusto (1,5s + troca de arquivo + background)
- **Roda 100% local, sem nenhum servidor**

### VS Code Web (via WebView — sem instalar nada)
- URL: `https://github.dev/{usuario}/{repo}`
- Roda no navegador/WebView do celular
- Requer internet (acessa github.dev), mas NÃO requer o servidor Replit
- Disponível na aba "Push para GitHub" após enviar o projeto

### StackBlitz (via WebView — sem instalar nada)
- URL: `https://stackblitz.com/github/{usuario}/{repo}`
- VS Code + Node.js + npm rodando no navegador
- Requer internet, NÃO requer o servidor Replit

### Gitpod (via WebView — sem instalar nada)
- URL: `https://gitpod.io/#https://github.com/{usuario}/{repo}`
- Terminal Linux completo (50h grátis/mês)
- Requer internet, NÃO requer o servidor Replit

### code-server real (VS Code completo — requer servidor local)
- Precisa do processo `code-server` rodando localmente
- No Replit: roda na porta 3001, proxied pelo api-server
- No celular: possível via Termux (futuro)
- Sem processo servindo = sem code-server. Não tem como contornar.

---

## TERMINAL

### Sem servidor (modo atual no APK)
- Mostra banner "Sem servidor"
- Permite digitar e copiar comandos (para colar no Termux separado)
- Não trava nem mostra tela vermelha

### Com servidor Termux (futuro)
- Instalar Termux pelo F-Droid (NÃO pela Play Store — versão desatualizada)
- Configurar servidor local na porta 8080
- O app detecta automaticamente via ping em `localhost:8080`

### Com servidor Replit (desenvolvimento)
- URL: `https://<seu-domínio>.replit.dev`
- Configurar em Settings > URL do servidor customizado

---

## GITHUB / REPOSITÓRIO (funciona sem o servidor Replit)

O GitHub é chamado **diretamente** pelo app, sem passar pelo backend:
- Clone público/privado → `api.github.com` direto
- Push → `api.github.com` direto
- GitHub Pages → `api.github.com` direto
- Arquivos binários → armazenados como base64

Token necessário apenas para repos privados e para push/Pages.

---

## ARQUIVOS CRÍTICOS

```
artifacts/mobile/
├── context/AppContext.tsx        — persistência, projetos, arquivos, save
├── components/CodeEditor.tsx     — editor local, auto-save robusto
├── hooks/useApiBase.ts           — URL da API (local/remoto/offline)
├── services/apiBase.ts           — lógica de URL por estratégia
├── services/runtimeMode.ts       — portas e modo de operação (PORTA: 8080)
├── services/githubService.ts     — GitHub direto (sem backend)
├── components/Terminal.tsx       — terminal (graceful sem servidor)
├── components/PreviewPanel.tsx   — preview (graceful sem servidor)
├── components/VSCodeView.tsx     — code-server WebView
├── app/(tabs)/plugins.tsx        — plugins (modo simulação sem servidor)
├── app/(tabs)/settings.tsx       — configurações locais
└── app.json                      — v2.6.0, versionCode 34, owner maikon1
```

---

## RESULTADO ESPERADO DO APK

- App abre sem depender do servidor Replit
- Editor funciona 100% offline
- Projetos e arquivos salvos no celular (não somem ao fechar)
- GitHub funciona direto (clone, push, Pages)
- Terminal mostra aviso elegante quando sem servidor
- VS Code / StackBlitz / Gitpod abrem no navegador após push para GitHub
- IA funciona com provedor configurado (Gemini Cortesia é gratuito sem chave)

---

## BUILD EAS

```bash
cd artifacts/mobile
EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 \
  eas build --platform android --profile preview --non-interactive --no-wait
```

Conta: maikon1 (meulegale1@gmail.com)
Projeto EAS: 494d3229-54ec-4f5e-842e-93cc706a6b21
Acompanhar: https://expo.dev/accounts/maikon1/projects/app-ide/builds

# DevMobile — Manual Completo de Build
**App:** DevMobile IDE  
**Versão:** 2.8.0  
**Package:** `com.devmobile.ide`  
**Owner Expo:** `maikon12`  
**Project ID:** `57007145-e348-4887-84e6-3c20644f5ec4`

---

## SUMÁRIO

1. [Pré-requisitos](#1-pré-requisitos)
2. [Configurar variáveis de ambiente (.env)](#2-configurar-variáveis-de-ambiente)
3. [Método 1 — EAS Build (Expo) — APK na nuvem](#3-método-1--eas-build-expo)
4. [Método 2 — Capacitor — APK local no PC](#4-método-2--capacitor-apk-local)
5. [Solução de problemas comuns](#5-solução-de-problemas-comuns)
6. [Estrutura do projeto](#6-estrutura-do-projeto)
7. [Chaves de API necessárias](#7-chaves-de-api)

---

## 1. Pré-requisitos

### Para os dois métodos:
- **Node.js 20+** → https://nodejs.org
- **pnpm** → `npm install -g pnpm`
- **Git** → https://git-scm.com

### Só para Método 1 (EAS):
- Conta no **Expo** → https://expo.dev (gratuita)
- **EXPO_TOKEN** → https://expo.dev/accounts/maikon12/settings/access-tokens

### Só para Método 2 (Capacitor):
- **Android Studio** → https://developer.android.com/studio
- **JDK 17+** (vem com Android Studio)
- **Android SDK** configurado (SDK 33 ou superior)

---

## 2. Configurar variáveis de ambiente

### 2.1 Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

### 2.2 Edite o `.env` com suas chaves:

```env
# Modo do app (deixe como cloud para usar o servidor)
EXPO_PUBLIC_APP_MODE=cloud
EXPO_PUBLIC_API_STRATEGY=cloud

# Sua chave de IA favorita (pelo menos uma):
EXPO_PUBLIC_GEMINI_KEY=AIzaSy...       # Grátis: https://aistudio.google.com/apikey
EXPO_PUBLIC_GROQ_KEY=gsk_...           # Grátis: https://console.groq.com
EXPO_PUBLIC_OPENAI_KEY=sk-...          # Pago: https://platform.openai.com
EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-...   # Pago: https://console.anthropic.com

# GitHub (opcional, para push/import de projetos):
EXPO_PUBLIC_GITHUB_TOKEN=ghp_...
EXPO_PUBLIC_GITHUB_USER=seu_usuario

# EAS (só para Método 1):
EXPO_TOKEN=seu_expo_token_aqui
```

> **Dica grátis:** Use Gemini (Google) ou Groq — ambos têm plano gratuito generoso.

---

## 3. Método 1 — EAS Build (Expo)

Gera o APK na nuvem da Expo. Não precisa de Android Studio instalado.

### 3.1 Instalar dependências:
```bash
# Dentro da pasta do projeto (artifacts/mobile ou raiz se extraiu o zip):
npm install
```

### 3.2 Fazer login no Expo:
```bash
npx eas-cli login
# ou com token:
export EXPO_TOKEN=seu_token_aqui
```

### 3.3 Verificar login:
```bash
npx eas-cli whoami
# Deve mostrar: maikon12
```

### 3.4 Disparar o build (APK):
```bash
EAS_NO_VCS=1 EXPO_TOKEN=$EXPO_TOKEN npx eas-cli build \
  --platform android \
  --profile preview \
  --non-interactive \
  --no-wait
```

> `--no-wait` retorna imediatamente. Acompanhe em:
> https://expo.dev/accounts/maikon12/projects/app-ide/builds

### 3.5 Ver status do build:
```bash
npx eas-cli build:list --platform android --limit 5
```

### 3.6 Quando terminar:
- Acesse o link do build no painel Expo
- Clique em **Download** para baixar o `.apk`
- Transfira para o Android e instale (habilite "fontes desconhecidas" nas configurações)

### Perfis disponíveis no eas.json:
| Perfil | Tipo | Uso |
|--------|------|-----|
| `preview` | APK | Teste rápido, instala direto |
| `development` | APK + Dev Client | Desenvolvimento com hot-reload |
| `production` | AAB | Publicar na Play Store |

---

## 4. Método 2 — Capacitor (APK local)

Gera o APK diretamente no seu PC com Android Studio. **Não usa créditos EAS.**

### 4.1 Pré-requisito: Android Studio
1. Baixe e instale: https://developer.android.com/studio
2. Abra o Android Studio → SDK Manager → instale **Android SDK 33**
3. Configure as variáveis de ambiente:

```bash
# Linux/Mac — adicione no ~/.bashrc ou ~/.zshrc:
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator

# Windows — adicione nas variáveis de sistema:
# ANDROID_HOME = C:\Users\SeuNome\AppData\Local\Android\Sdk
# PATH += %ANDROID_HOME%\platform-tools
```

### 4.2 Instalar dependências:
```bash
npm install
```

### 4.3 Instalar CLI do Capacitor:
```bash
npm install -g @capacitor/cli
```

### 4.4 Gerar o build web (Expo → HTML/JS):
```bash
npx expo export --platform web
```
> Isso cria a pasta `dist/` com o app compilado.

### 4.5 Sincronizar com Capacitor:
```bash
npx cap sync android
```
> Se a pasta `android/` não existir ainda:
> ```bash
> npx cap add android
> npx cap sync android
> ```

### 4.6 Gerar o APK pelo Android Studio:
```bash
npx cap open android
```
Isso abre o Android Studio. Dentro dele:
1. Aguarde o projeto carregar (Gradle sync)
2. Menu: **Build → Build Bundle(s)/APK(s) → Build APK(s)**
3. Quando terminar: clique em **locate** para encontrar o APK

**Localização do APK gerado:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 4.7 Gerar APK de release (assinado):
```bash
# Dentro do Android Studio:
# Build → Generate Signed Bundle/APK → APK → preencha keystore → Release
```

### 4.8 Instalar via linha de comando (se tiver ADB):
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Solução de problemas comuns

### EAS Build — "Unable to resolve module react-native"
**Causa:** metro.config.js procurava na pasta errada.
**Status:** JÁ CORRIGIDO no `metro.config.js` deste projeto.

### EAS Build — "Invalid project ID"
```bash
npx eas-cli init
# Confirme: owner=maikon12, slug=app-ide
```

### EAS Build — "Not logged in"
```bash
export EXPO_TOKEN=seu_token
npx eas-cli whoami
```

### Capacitor — "SDK location not found"
1. Crie o arquivo `android/local.properties`:
```
sdk.dir=/home/SEU_USUARIO/Android/Sdk
# Windows: sdk.dir=C\:\\Users\\SEU_USUARIO\\AppData\\Local\\Android\\Sdk
```

### Capacitor — Gradle sync falhou
```bash
cd android
./gradlew clean
cd ..
npx cap sync android
```

### App abre tela branca
- Verifique se o `dist/` foi gerado antes do `cap sync`
- Reexecute: `npx expo export --platform web && npx cap sync android`

### Erro de permissão no Android (instalar APK):
- Vá em Configurações → Segurança → **Instalar apps desconhecidos**
- Habilite para o gerenciador de arquivos ou navegador

---

## 6. Estrutura do projeto

```
artifacts/mobile/           ← Raiz do projeto mobile
├── app/                    ← Telas (Expo Router)
│   └── (tabs)/
│       ├── index.tsx       ← Tela inicial / Explorer de projetos
│       ├── editor.tsx      ← Editor de código (Monaco)
│       ├── ai.tsx          ← Chat com IA
│       ├── terminal.tsx    ← Terminal
│       ├── browser.tsx     ← Navegador embutido
│       ├── tasks.tsx       ← Gerenciador de tarefas
│       ├── plugins.tsx     ← Plugins e extensões
│       ├── pwa.tsx         ← Gerenciador de PWA
│       └── settings.tsx    ← Configurações (tokens, API etc)
├── components/             ← Componentes reutilizáveis
│   ├── APKBuilderModal.tsx ← Modal de build APK (dispara EAS)
│   ├── AIChat.tsx          ← Interface de IA
│   ├── CodeEditor.tsx      ← Editor principal
│   ├── GitHubModal.tsx     ← Push/Import GitHub
│   └── Terminal.tsx        ← Terminal embutido
├── context/
│   └── AppContext.tsx      ← Estado global (projetos, configs)
├── services/
│   ├── githubService.ts    ← Integração GitHub API
│   ├── storageService.ts   ← Persistência local (SQLite)
│   └── runtimeMode.ts      ← Detecção de ambiente
├── app.json                ← Configuração Expo
├── eas.json                ← Perfis de build EAS
├── capacitor.config.ts     ← Configuração Capacitor
├── metro.config.js         ← Config Metro (monorepo-aware)
├── .env.example            ← Modelo de variáveis de ambiente
└── package.json            ← Dependências
```

---

## 7. Chaves de API

### IA (pelo menos uma):

| Provedor | Onde obter | Custo |
|----------|-----------|-------|
| **Google Gemini** | https://aistudio.google.com/apikey | Grátis |
| **Groq** | https://console.groq.com/keys | Grátis |
| OpenAI | https://platform.openai.com/api-keys | Pago |
| Anthropic | https://console.anthropic.com/settings/keys | Pago |
| OpenRouter | https://openrouter.ai/keys | Grátis + Pago |
| xAI / Grok | https://console.x.ai | Pago |

### GitHub (opcional):
- Acesse: https://github.com/settings/tokens
- Crie um token com permissões: `repo`, `workflow`
- Cole em: `EXPO_PUBLIC_GITHUB_TOKEN`

### Expo (só EAS Build):
- Acesse: https://expo.dev/accounts/maikon12/settings/access-tokens
- Crie um token de acesso
- Cole em: `EXPO_TOKEN`

---

## Comandos rápidos (resumo)

```bash
# Instalar tudo:
npm install

# Rodar localmente (precisa do Expo Go no celular):
npx expo start

# Build APK via EAS (nuvem):
EAS_NO_VCS=1 EXPO_TOKEN=seu_token npx eas-cli build --platform android --profile preview

# Build via Capacitor (local):
npx expo export --platform web
npx cap sync android
npx cap open android   # abre Android Studio → Build APK

# Ver builds EAS:
npx eas-cli build:list --platform android --limit 5

# Verificar login EAS:
npx eas-cli whoami
```

---

**DevMobile v2.8.0** | IDE mobile completo para Android
