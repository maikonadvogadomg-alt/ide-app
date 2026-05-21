import React, { useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface ManualModalProps {
  visible: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: "appide",      icon: "🧩", title: "AppIDE" },
  { id: "inicio",      icon: "🚀", title: "Início" },
  { id: "editor",      icon: "✏️", title: "Editor" },
  { id: "terminal",    icon: "🖥️", title: "Terminal" },
  { id: "online",      icon: "🌐", title: "Terminal Online" },
  { id: "plugins",     icon: "📦", title: "Bibliotecas" },
  { id: "extrator",    icon: "🕸️", title: "Extrator" },
  { id: "db",          icon: "🗄️", title: "Banco" },
  { id: "ia",          icon: "🤖", title: "IA Jasmim" },
  { id: "github",      icon: "🐙", title: "GitHub" },
  { id: "preview",     icon: "👁️", title: "Preview" },
  { id: "importexport",icon: "📤", title: "Import/Export" },
  { id: "projetos",    icon: "🗂️", title: "Projetos" },
  { id: "termux",      icon: "📡", title: "Modo Termux" },
  { id: "apis",        icon: "🔌", title: "APIs/Rotas" },
  { id: "apikeys",     icon: "🔑", title: "API Keys" },
  { id: "advogado",    icon: "⚖️", title: "Advogado" },
];

export default function ManualModal({ visible, onClose }: ManualModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState("appide");
  const [copied, setCopied] = useState("");

  const copyText = useCallback(async (text: string, key: string) => {
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1800);
    } catch {}
  }, []);

  const bg = colors.background;
  const card = colors.card;
  const border = colors.border;
  const fg = colors.foreground;
  const muted = colors.mutedForeground;
  const green = "#22c55e";
  const purple = "#7c3aed";
  const mono = Platform.OS === "ios" ? "Menlo" : "monospace";

  const H1 = ({ children }: { children: string }) => (
    <Text style={{ color: "#60a5fa", fontWeight: "800", fontSize: 16, marginTop: 6, marginBottom: 10 }}>
      {children}
    </Text>
  );

  const H2 = ({ children }: { children: string }) => (
    <Text style={{ color: green, fontWeight: "700", fontSize: 14, marginTop: 18, marginBottom: 6 }}>
      {children}
    </Text>
  );

  const H3 = ({ children }: { children: string }) => (
    <Text style={{ color: "#86efac", fontWeight: "600", fontSize: 13, marginTop: 12, marginBottom: 4 }}>
      {children}
    </Text>
  );

  const P = ({ children }: { children: string }) => (
    <Text style={{ color: muted, fontSize: 13, lineHeight: 20, marginBottom: 6 }}>{children}</Text>
  );

  const Li = ({ children }: { children: string }) => (
    <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
      <Text style={{ color: green, fontSize: 13 }}>›</Text>
      <Text style={{ color: muted, fontSize: 13, lineHeight: 20, flex: 1 }}>{children}</Text>
    </View>
  );

  const Step = ({ n, children }: { n: number; children: string }) => (
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#1a3d14", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
        <Text style={{ color: green, fontWeight: "700", fontSize: 11 }}>{n}</Text>
      </View>
      <Text style={{ color: muted, fontSize: 13, lineHeight: 20, flex: 1 }}>{children}</Text>
    </View>
  );

  const Warn = ({ children }: { children: string }) => (
    <View style={{ backgroundColor: "#1e1500", borderWidth: 1, borderColor: "#4a3800", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <Text style={{ color: "#fcd34d", fontSize: 13, lineHeight: 20 }}>{children}</Text>
    </View>
  );

  const Info = ({ children }: { children: string }) => (
    <View style={{ backgroundColor: "#0a1530", borderWidth: 1, borderColor: "#1e3d7a", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <Text style={{ color: "#60a5fa", fontSize: 13, lineHeight: 20 }}>{children}</Text>
    </View>
  );

  const Ok = ({ children }: { children: string }) => (
    <View style={{ backgroundColor: "#0d2210", borderWidth: 1, borderColor: "#2d5a1e", borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <Text style={{ color: "#4ade80", fontSize: 13, lineHeight: 20 }}>{children}</Text>
    </View>
  );

  const Code = ({ children, copyKey }: { children: string; copyKey?: string }) => (
    <View style={{ backgroundColor: "#0d1117", borderWidth: 1, borderColor: "#1e2d1e", borderRadius: 8, padding: 12, marginBottom: 10, position: "relative" }}>
      <Text style={{ color: "#a8d5a2", fontFamily: mono, fontSize: 12, lineHeight: 19 }}>{children}</Text>
      {copyKey && (
        <TouchableOpacity
          onPress={() => copyText(children, copyKey)}
          style={{ position: "absolute", top: 8, right: 8, backgroundColor: "#1a3d14", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}
        >
          <Text style={{ color: green, fontSize: 11, fontWeight: "600" }}>
            {copied === copyKey ? "✓ Copiado" : "Copiar"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const Badge = ({ label, color, bg: bgColor }: { label: string; color: string; bg: string }) => (
    <View style={{ display: "flex", flexDirection: "row" }}>
      <View style={{ backgroundColor: bgColor, borderWidth: 1, borderColor: color + "66", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 6 }}>
        <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{label}</Text>
      </View>
    </View>
  );

  const renderSection = () => {
    switch (activeSection) {

      // ── APPIDE — VISÃO GERAL ──
      case "appide": return (
        <View>
          <H1>{"AppIDE v2.9.0 — IDE Completo no Android"}</H1>
          <P>{"AppIDE é um ambiente de desenvolvimento integrado (IDE) que roda diretamente no seu celular Android. Não precisa de computador para criar, editar, testar e publicar código."}</P>

          <Ok>{"✅ Funciona 100% offline com Termux instalado no celular. Sem necessidade de nenhum servidor externo."}</Ok>

          <H2>{"🧩 O que o AppIDE oferece"}</H2>
          <Li>{"Editor Monaco — mesmo engine do VS Code, com syntax highlight para 40+ linguagens"}</Li>
          <Li>{"Terminal com 3 modos: JavaScript local (offline), SQLite local, e bash via servidor"}</Li>
          <Li>{"Terminal Linux real no navegador: WebVM (Alpine), Copy.sh v86 (Linux 2.6) — ambos offline"}</Li>
          <Li>{"IDEs na nuvem: StackBlitz, Gitpod, GitHub Codespaces (requerem internet)"}</Li>
          <Li>{"Instalação de bibliotecas: npm, pip, cargo, nix — via servidor local ou assistida via Termux"}</Li>
          <Li>{"Extrator de sites: copia HTML completo, rotas, scripts JS, CSS, fontes, imagens, links e meta tags"}</Li>
          <Li>{"Banco de dados local (SQLite no celular) e nuvem (PostgreSQL Neon)"}</Li>
          <Li>{"IA Jasmim: cria projetos completos, corrige código, configura banco, faz push no GitHub"}</Li>
          <Li>{"GitHub integrado: clone, push, pull, diff, branch — direto no app"}</Li>
          <Li>{"Preview HTML ao vivo no app — sem abrir o navegador"}</Li>
          <Li>{"Playground HTML/React/JavaScript com renderização em tempo real"}</Li>
          <Li>{"Import/Export de projetos via ZIP, TAR, GitHub"}</Li>
          <Li>{"Árvore de arquivos sem limite — suporta 50.000+ arquivos"}</Li>

          <H2>{"🏗️ Arquitetura técnica"}</H2>

          <H3>{"App (React Native + Expo)"}</H3>
          <Li>{"Framework: React Native com Expo SDK"}</Li>
          <Li>{"Engine JavaScript: Hermes (motor nativo do Android — rápido e offline)"}</Li>
          <Li>{"Editor: Monaco Editor via WebView (mesmo engine do VS Code)"}</Li>
          <Li>{"Armazenamento: AsyncStorage para projetos, expo-sqlite para banco local"}</Li>
          <Li>{"Navegação: Expo Router (file-based routing)"}</Li>

          <H3>{"Servidor local (opcional, via Termux)"}</H3>
          <Li>{"Runtime: Node.js 20+ rodando no Termux"}</Li>
          <Li>{"Framework: Express.js"}</Li>
          <Li>{"Execução de comandos: child_process.spawn com streaming via SSE (Server-Sent Events)"}</Li>
          <Li>{"Porta padrão: 8080 — acessível em 127.0.0.1:8080 dentro do celular"}</Li>
          <Li>{"Sem limite de tempo de execução — processos rodam até concluir"}</Li>

          <H3>{"Comunicação App ↔ Servidor"}</H3>
          <Li>{"Protocolo: HTTP REST para comandos simples, SSE para streaming de output do terminal"}</Li>
          <Li>{"Rota terminal: POST /api/terminal/exec → retorna output em streaming SSE"}</Li>
          <Li>{"Rota saúde: GET /api/healthz → confirma se o servidor está online"}</Li>
          <Li>{"Rota IA: POST /api/ai/chat → proxy para Gemini/OpenAI/Groq"}</Li>
          <Li>{"Detecção automática: app verifica 127.0.0.1:8080 a cada 15 segundos"}</Li>

          <H2>{"📡 Proxy para acesso público (endereço online)"}</H2>
          <P>{"Para acessar o servidor do Termux de fora da rede local (ou publicar uma URL pública), use um serviço de túnel:"}</P>
          <H3>{"ngrok (mais popular)"}</H3>
          <Code copyKey="ngrok-setup">{"# No Termux — instalar ngrok\ncurl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | tee /etc/apt/trusted.gpg.d/ngrok.asc\n# Alternativa simples:\npkg install wget -y\nwget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz\ntar xvzf ngrok-v3-stable-linux-arm64.tgz\n\n# Depois de instalar e autenticar:\nngrok http 8080"}</Code>
          <P>{"O ngrok gera uma URL pública como https://xxxx.ngrok.io — cole em Configurações → URL do Servidor."}</P>
          <H3>{"Alternativas gratuitas de túnel"}</H3>
          <Li>{"localhost.run: ssh -R 80:localhost:8080 ssh.localhost.run"}</Li>
          <Li>{"cloudflared: cloudflare tunnel para porta 8080"}</Li>
          <Li>{"Tailscale: VPN ponto-a-ponto entre seus dispositivos"}</Li>

          <H2>{"⚠️ Limites e capacidades"}</H2>
          <Li>{"Árvore de arquivos: sem limite (AsyncStorage)"}</Li>
          <Li>{"Clone GitHub: 38.000+ arquivos via zipball em uma única requisição"}</Li>
          <Li>{"ZIP/TAR import: 50.000+ arquivos com extração paralela (200 simultâneos)"}</Li>
          <Li>{"Terminal: sem timeout — processos rodam até o fim"}</Li>
          <Li>{"Instalação de pacotes: sem limite de tempo — aguarda conclusão completa"}</Li>
          <Li>{"Banco local SQLite: limitado pelo armazenamento do celular"}</Li>
          <Li>{"Banco Neon: limitado pelo plano gratuito (0,5 GB storage)"}</Li>
        </View>
      );

      // ── INÍCIO RÁPIDO ──
      case "inicio": return (
        <View>
          <P>{"Bem-vindo ao AppIDE. Você tem um IDE profissional completo no celular. Veja como começar do zero."}</P>

          <H2>{"⚡ Primeira vez — faça isso"}</H2>
          <Step n={1}>{"Toque em + na tela inicial ou na aba CRIAR"}</Step>
          <Step n={2}>{"Escolha um modelo: React, Node.js, Python, HTML..."}</Step>
          <Step n={3}>{"O editor abre com os arquivos do modelo prontos"}</Step>
          <Step n={4}>{"Toque em ☰ (menu canto superior direito) para ver todas as funções"}</Step>
          <Step n={5}>{"Toque no ícone 🤖 para chamar a Jasmim (IA assistente)"}</Step>

          <H2>{"📱 Como instalar o AppIDE como app nativo"}</H2>
          <H3>{"Android — APK (recomendado)"}</H3>
          <Li>{"O APK foi gerado via EAS Build (Expo Application Services)"}</Li>
          <Li>{"Receba o arquivo .apk e transfira para o celular (Drive, WhatsApp, cabo)"}</Li>
          <Li>{"Android: Configurações → Privacidade → Instalar apps desconhecidos → permitir"}</Li>
          <Li>{"Abra o .apk e toque Instalar"}</Li>
          <H3>{"Android — PWA (sem baixar .apk)"}</H3>
          <Li>{"Chrome → menu ⋮ → 'Adicionar à tela inicial' → funciona como app"}</Li>
          <H3>{"iPhone/iPad — PWA"}</H3>
          <Li>{"Safari → botão Compartilhar → 'Adicionar à Tela de Início'"}</Li>
          <H3>{"Computador — PWA"}</H3>
          <Li>{"Chrome → ícone ⊕ na barra de endereço → Instalar"}</Li>

          <H2>{"⌨️ Atalhos do editor"}</H2>
          <Li>{"Toque longo no código → menu de ações rápidas"}</Li>
          <Li>{"Barra ⚡ acima do teclado → inserir {}, (), [], ;, => e mais"}</Li>
          <Li>{"Botão ↑/↓ no terminal → navegar histórico de comandos"}</Li>
          <Li>{"Microfone 🎙️ na barra do terminal → ditar comandos por voz"}</Li>
        </View>
      );

      // ── EDITOR ──
      case "editor": return (
        <View>
          <P>{"O editor usa Monaco — o mesmo engine do VS Code. Funciona completamente offline, sem internet."}</P>

          <H2>{"✏️ Funcionalidades do editor"}</H2>
          <Li>{"Syntax highlight para 40+ linguagens: JS, TS, Python, Go, Rust, Java, PHP, C/C++, HTML, CSS, SQL..."}</Li>
          <Li>{"Autocompletar inteligente com IntelliSense"}</Li>
          <Li>{"Múltiplos cursores: toque longo → Adicionar Cursor"}</Li>
          <Li>{"Find & Replace: ☰ → Buscar no Arquivo"}</Li>
          <Li>{"Formatação automática: ☰ → Formatar Arquivo"}</Li>
          <Li>{"Comentar/descomentar: botão // na barra de atalhos"}</Li>

          <H2>{"📁 Árvore de Arquivos (Nugget)"}</H2>
          <P>{"A árvore de arquivos fica no painel lateral esquerdo. Sem limite de arquivos."}</P>
          <Li>{"Criar arquivo: + → nome.extensão"}</Li>
          <Li>{"Criar pasta: + → nomeDaPasta/ (com barra no final)"}</Li>
          <Li>{"Renomear: toque longo no arquivo → Renomear"}</Li>
          <Li>{"Mover: arraste o arquivo para outra pasta"}</Li>
          <Li>{"Excluir: toque longo → Excluir"}</Li>
          <Li>{"50.000+ arquivos suportados — extração paralela de 200 simultâneos"}</Li>

          <H2>{"📋 Menu ☰ — Todas as funções"}</H2>
          <Li>{"📦 Novo Projeto — cria projeto do zero com modelo"}</Li>
          <Li>{"📂 Abrir Projeto — abre um projeto salvo"}</Li>
          <Li>{"💾 Salvar — salva o arquivo atual"}</Li>
          <Li>{"📤 Exportar ZIP — baixa o projeto como arquivo .zip"}</Li>
          <Li>{"📥 Importar ZIP / TAR — abre projeto de um arquivo compactado"}</Li>
          <Li>{"🐙 GitHub — clone, push, pull, diff, branch"}</Li>
          <Li>{"🗄️ Banco de Dados — SQLite local ou Neon PostgreSQL"}</Li>
          <Li>{"🎮 Playground HTML — editor com preview ao vivo"}</Li>
          <Li>{"🌐 Extrator de Sites — copia HTML, rotas, scripts de qualquer URL"}</Li>
          <Li>{"📖 Manual — este documento"}</Li>

          <H2>{"🔄 Upload/Download de pasta para o servidor"}</H2>
          <P>{"Quando o servidor Termux está conectado, você pode sincronizar o projeto:"}</P>
          <H3>{"↑ Enviar projeto para o servidor"}</H3>
          <Li>{"No terminal: toque no botão ↑ UPLOAD ou use ☰ → Enviar para Servidor"}</Li>
          <Li>{"Todos os arquivos do projeto ativo são enviados para o servidor"}</Li>
          <Li>{"Cria a pasta do projeto no servidor automaticamente"}</Li>
          <H3>{"↓ Baixar do servidor para o celular"}</H3>
          <Li>{"No terminal: toque no botão ↓ DOWNLOAD ou use ☰ → Baixar do Servidor"}</Li>
          <Li>{"Busca os arquivos modificados no servidor e atualiza o projeto"}</Li>
          <Ok>{"✅ Fluxo completo: edite no servidor (via VS Code online) → baixe para o celular → edite offline → envie de volta."}</Ok>
        </View>
      );

      // ── TERMINAL ──
      case "terminal": return (
        <View>
          <P>{"O terminal do AppIDE tem 4 modos de operação. Cada modo funciona de forma diferente. Entenda qual usar em cada situação."}</P>

          <H2>{"⚡ Modo 1 — JavaScript Local (offline, sem servidor)"}</H2>
          <P>{"Executa JavaScript diretamente na engine Hermes do Android. Zero dependência de internet ou servidor."}</P>
          <Code copyKey="js-local">{"js> 1 + 1                         → 2\njs> Math.sqrt(144)                → 12\njs> [1,2,3].map(x => x*x)        → [1,4,9]\njs> JSON.stringify({nome: 'Ana'}) → '{\"nome\":\"Ana\"}'\njs> new Date().toLocaleString('pt-BR')\njs> fetch('https://api.exemplo.com').then(r=>r.json()).then(console.log)"}</Code>
          <Li>{"Prefixo: js> (ou use o modo JS do terminal)"}</Li>
          <Li>{"Hermes Engine — engine nativa do Android, não Chrome V8"}</Li>
          <Li>{"fetch() funciona para requisições HTTP mesmo no modo local"}</Li>
          <Li>{"Sem acesso ao sistema de arquivos do servidor"}</Li>
          <Li>{"Sem timeout — calcula o que precisar"}</Li>

          <H2>{"🗃️ Modo 2 — SQLite Local (banco no celular, offline)"}</H2>
          <P>{"Banco de dados SQLite que fica salvo no próprio celular. Sem internet, sem servidor."}</P>
          <Code copyKey="sql-local">{"sql> CREATE TABLE clientes (id INTEGER PRIMARY KEY, nome TEXT)\nsql> INSERT INTO clientes (nome) VALUES ('João')\nsql> SELECT * FROM clientes\n.tabelas        → lista todas as tabelas\n.db nomeBanco   → cria/troca banco de dados\n.exportar       → exporta os dados como JSON"}</Code>
          <Li>{"Prefixo: sql> (modo SQL)"}</Li>
          <Li>{"Dados persistem entre sessões — ficam no armazenamento do celular"}</Li>
          <Li>{"Suporta JOINs, transações, índices, triggers"}</Li>
          <Li>{"Tamanho limitado pelo armazenamento do celular"}</Li>

          <H2>{"📂 Modo 3 — Bash Offline (comandos de arquivo, sem servidor)"}</H2>
          <P>{"Comandos que o app emula localmente sobre a árvore de arquivos do projeto."}</P>
          <Code copyKey="bash-offline">{"ls           → lista arquivos do projeto\npwd          → diretório atual\ncat arquivo  → mostra conteúdo de um arquivo\ngrep texto . → busca texto nos arquivos\necho texto   → imprime texto\ncd pasta     → entra na pasta\ntree         → árvore de arquivos"}</Code>
          <Li>{"Funciona sem internet e sem servidor"}</Li>
          <Li>{"Não executa processos reais — apenas navega a árvore de arquivos"}</Li>
          <Li>{"Não suporta: npm, python, node, git (para isso: modo 4)"}</Li>

          <H2>{"🔧 Modo 4 — Bash Real via Servidor (requer Termux ou servidor)"}</H2>
          <P>{"Executa comandos Linux reais via servidor. Requer o servidor AppIDE rodando no Termux (localhost:8080) ou outro servidor configurado."}</P>
          <Code copyKey="bash-server">{"# Gerenciar pacotes\nnpm install express axios cors\npip3 install flask requests pandas\ncargo install ripgrep\n\n# Executar código\nnode index.js\npython3 script.py\nbash script.sh\n\n# Processos\nps aux | grep node\nkill -9 PID\nlsof -i :3000\n\n# Sistema\ndf -h       → espaço em disco\nfree -m     → memória\nuname -a    → info do sistema\nwhich node  → localiza binário"}</Code>
          <Li>{"Sem timeout — instalações longas rodam até o fim"}</Li>
          <Li>{"Output em streaming via SSE — você vê cada linha conforme sai"}</Li>
          <Li>{"Sessões independentes — cada aba do terminal mantém seu estado"}</Li>
          <Li>{"Histórico de comandos: botões ↑ ↓ ou swipe na barra de histórico"}</Li>

          <H2>{"📡 Como o streaming funciona (SSE)"}</H2>
          <P>{"Quando você digita um comando com servidor ativo:"}</P>
          <Step n={1}>{"App envia: POST /api/terminal/exec com {command, sessionId}"}</Step>
          <Step n={2}>{"Servidor inicia o processo com child_process.spawn"}</Step>
          <Step n={3}>{"Cada linha de stdout/stderr é enviada como SSE: data: {type: 'stdout', data: '...'}"}</Step>
          <Step n={4}>{"App recebe e exibe cada linha em tempo real"}</Step>
          <Step n={5}>{"Ao final: data: {type: 'exit', data: '0'} — comando concluído"}</Step>
          <Info>{"💡 Não há timeout no frontend. O processo roda até terminar naturalmente ou até você fechar o app."}</Info>

          <H2>{"💡 Dicas do terminal"}</H2>
          <Li>{"Ctrl+C → cancela o processo atual"}</Li>
          <Li>{"Use ↑ / ↓ para navegar no histórico de comandos"}</Li>
          <Li>{"Microfone 🎙️ → dite o comando"}</Li>
          <Li>{"Toque no output → seleciona e copia"}</Li>
          <Li>{"Multiplos terminais: abas Terminal 1, 2, 3 no topo"}</Li>
        </View>
      );

      // ── TERMINAL ONLINE ──
      case "online": return (
        <View>
          <P>{"Sem servidor Termux? Sem problema. O AppIDE oferece acesso a terminais Linux reais online e offline — direto no navegador."}</P>

          <H2>{"🖥️ Opção 1 — WebVM (Alpine Linux, 100% offline)"}</H2>
          <Ok>{"✅ Funciona sem internet após carregar. Linux Alpine completo rodando em WebAssembly no navegador."}</Ok>
          <Li>{"URL: webvm.io"}</Li>
          <Li>{"Sistema: Alpine Linux (Debian também disponível)"}</Li>
          <Li>{"Tecnologia: CheerpX — executa binários x86 reais no navegador via WebAssembly"}</Li>
          <Li>{"Comandos disponíveis: bash, python3, node, gcc, vim, nano, curl, git"}</Li>
          <Li>{"Sem necessidade de conta ou cadastro"}</Li>
          <Li>{"Funciona offline depois que a página carrega (Service Worker)"}</Li>
          <Li>{"Memória: compartilhada com o navegador (tipicamente 512MB–2GB)"}</Li>
          <Warn>{"⚠️ Dados do WebVM são resetados quando você fecha a aba (filesystem em memória)."}</Warn>

          <H2>{"💾 Opção 2 — Copy.sh v86 (Linux 2.6, 100% offline)"}</H2>
          <Li>{"URL: copy.sh/v86/?profile=linux26"}</Li>
          <Li>{"Sistema: Linux kernel 2.6 com busybox e compilador gcc"}</Li>
          <Li>{"Tecnologia: v86 — emulador x86 completo em JavaScript"}</Li>
          <Li>{"Ideal para: compilar C/C++, testar scripts bash antigos"}</Li>
          <Li>{"Sem cadastro, sem servidor, funciona offline"}</Li>

          <H2>{"☁️ Opção 3 — CoCalc (Python e Jupyter na nuvem)"}</H2>
          <Li>{"URL: cocalc.com/features/terminal"}</Li>
          <Li>{"Especializado em Python científico: NumPy, Pandas, Matplotlib, SciPy já instalados"}</Li>
          <Li>{"Jupyter Notebook integrado"}</Li>
          <Li>{"Requer internet e conta gratuita"}</Li>
          <Li>{"Ideal para: ciência de dados, machine learning, cálculo"}</Li>

          <H2>{"⚡ Opção 4 — StackBlitz (Node.js completo)"}</H2>
          <Li>{"URL: stackblitz.com — ou diretamente com seu repo do GitHub"}</Li>
          <Li>{"Terminal Node.js completo: npm install, node, npx"}</Li>
          <Li>{"Se você tiver um projeto no GitHub: abre direto no repo"}</Li>
          <Li>{"Preview de apps web em tempo real"}</Li>
          <Li>{"Requer internet"}</Li>
          <Code copyKey="stackblitz-url">{"https://stackblitz.com/github/SEU_USUARIO/SEU_REPO"}</Code>

          <H2>{"🟠 Opção 5 — Gitpod (Linux completo, Docker)"}</H2>
          <Li>{"URL: gitpod.io — abre seu repo GitHub numa VM completa"}</Li>
          <Li>{"Ubuntu completo com 16GB RAM, 50GB disco"}</Li>
          <Li>{"sudo, Docker, qualquer linguagem"}</Li>
          <Li>{"50 horas grátis por mês"}</Li>
          <Code copyKey="gitpod-url">{"https://gitpod.io/#https://github.com/SEU_USUARIO/SEU_REPO"}</Code>

          <H2>{"🐙 Opção 6 — GitHub Codespaces"}</H2>
          <Li>{"URL: github.com/codespaces"}</Li>
          <Li>{"VS Code no navegador com terminal Linux completo"}</Li>
          <Li>{"60 horas grátis por mês (plano gratuito do GitHub)"}</Li>
          <Li>{"Acesso direto ao seu repositório"}</Li>
          <Code copyKey="codespaces-url">{"https://github.com/codespaces/new?repo=SEU_USUARIO/SEU_REPO"}</Code>

          <H2>{"💻 Opção 7 — VS Code online (vscode.dev)"}</H2>
          <Li>{"Editor VS Code completo no navegador, sem terminal"}</Li>
          <Li>{"Edição de arquivos via GitHub, GitLab ou pasta local"}</Li>
          <Li>{"URL: vscode.dev"}</Li>

          <H2>{"🔄 Fluxo recomendado sem servidor local"}</H2>
          <Step n={1}>{"Envie seu projeto para o GitHub (☰ → GitHub → Push)"}</Step>
          <Step n={2}>{"Abra o Gitpod ou Codespaces com a URL do seu repo"}</Step>
          <Step n={3}>{"Trabalhe no terminal Linux completo — npm install, git, python..."}</Step>
          <Step n={4}>{"Faça push das mudanças de volta ao GitHub"}</Step>
          <Step n={5}>{"No AppIDE: ☰ → GitHub → Pull para trazer as mudanças"}</Step>
        </View>
      );

      // ── PLUGINS / BIBLIOTECAS ──
      case "plugins": return (
        <View>
          <P>{"A aba Plugins permite instalar qualquer biblioteca ou ferramenta de desenvolvimento. Entenda como funciona cada tipo de instalação."}</P>

          <H2>{"🏷️ Tipos de instalação — o que cada badge significa"}</H2>

          <Badge label="⚡ Servidor (npm)" color="#4ade80" bg="#001a0a" />
          <P>{"Executa npm install no servidor Termux (localhost:8080). A biblioteca fica disponível no projeto do servidor. Requer servidor rodando."}</P>

          <Badge label="⚡ Servidor (pip)" color="#00d4aa" bg="#001a14" />
          <P>{"Executa pip3 install no servidor Termux. Pacote Python instalado no servidor. Requer servidor rodando."}</P>

          <Badge label="❄️ Nix (servidor)" color="#7ec8e3" bg="#001a2d" />
          <P>{"Instala via gerenciador Nix — linguagens como Go, Rust, Ruby, Lua. Mais lento mas mais confiável para linguagens completas."}</P>

          <Badge label="📱 Assistida Termux" color="#a78bfa" bg="#1a0d3d" />
          <P>{"O comando é COPIADO para a área de transferência. Você precisa colar no Termux manualmente. O AppIDE não executa — apenas ajuda."}</P>

          <Ok>{"✅ Com servidor rodando: a instalação acontece no servidor, você vê o output em tempo real. Sem servidor: o comando é copiado e você instala no Termux."}</Ok>

          <H2>{"📦 Como instalar uma biblioteca"}</H2>
          <Step n={1}>{"Na aba Plugins, encontre a biblioteca (use a busca no topo)"}</Step>
          <Step n={2}>{"Toque no card da biblioteca"}</Step>
          <Step n={3}>{"Veja as versões disponíveis — cada uma mostra o badge do tipo"}</Step>
          <Step n={4}>{"Toque na versão desejada (Recomendada = ⭐)"}</Step>
          <Step n={5}>{"Se servidor ativo: a instalação roda e você vê o output ao vivo"}</Step>
          <Step n={6}>{"Se sem servidor: o comando é copiado → abra o Termux e cole"}</Step>

          <H2>{"🔍 Onde buscar mais bibliotecas"}</H2>
          <H3>{"JavaScript / Node.js"}</H3>
          <Li>{"npmjs.com — repositório oficial de pacotes npm"}</Li>
          <Li>{"Busque o nome e copie: npm install nome-do-pacote"}</Li>
          <Code copyKey="npm-install">{"npm install nome-do-pacote\nnpm install nome@versão\nnpm install -g pacote-global"}</Code>

          <H3>{"Python"}</H3>
          <Li>{"pypi.org — repositório oficial PyPI"}</Li>
          <Li>{"Busque o nome e copie: pip3 install nome"}</Li>
          <Code copyKey="pip-install">{"pip3 install nome-do-pacote\npip3 install nome==1.2.3\npip3 install -r requirements.txt"}</Code>

          <H3>{"Rust"}</H3>
          <Li>{"crates.io — repositório de crates Rust"}</Li>
          <Code copyKey="cargo-install">{"cargo install nome\n# ou adicione ao Cargo.toml:\n[dependencies]\nnome = \"1.0\""}</Code>

          <H3>{"Go"}</H3>
          <Code copyKey="go-install">{"go get github.com/autor/pacote\ngo install github.com/autor/tool@latest"}</Code>

          <H2>{"📋 Ver o que está instalado"}</H2>
          <P>{"Na aba Plugins, toque em '📦 Instalados' para ver os pacotes reais no servidor:"}</P>
          <Code copyKey="check-installed">{"# O botão executa esses comandos no servidor:\nnpm list -g --depth=0     # pacotes Node.js globais\npip3 list                 # pacotes Python\nwhich node npm python3 git go rustc java  # binários"}</Code>

          <H2>{"⚙️ Instalar tudo de uma vez"}</H2>
          <P>{"Botão 'Instalar Todos' no topo dos Plugins — instala sequencialmente todos os pacotes disponíveis. Pode demorar 15-30 minutos. Requer servidor ativo."}</P>
          <Warn>{"⚠️ Sem servidor: o botão 'Instalar Todos' não funciona. Você precisaria instalar cada um pelo Termux."}</Warn>

          <H2>{"🔧 Diagnóstico do sistema"}</H2>
          <P>{"Toque em '🩺 Diagnóstico' na aba Plugins para verificar em tempo real:"}</P>
          <Li>{"✅ Internet (via 1.1.1.1)"}</Li>
          <Li>{"✅ Servidor local (via /api/healthz)"}</Li>
          <Li>{"✅ Node.js, npm, Python, pip3, Git, Bash"}</Li>
          <Li>{"✅ Memória RAM disponível"}</Li>
          <Li>{"✅ Espaço em disco"}</Li>
          <Li>{"✅ IA Gemini (direto ou via servidor)"}</Li>
          <Li>{"✅ Conta GitHub configurada"}</Li>
          <Li>{"✅ Projeto ativo e arquivos"}</Li>
        </View>
      );

      // ── EXTRATOR DE SITES ──
      case "extrator": return (
        <View>
          <P>{"O Extrator de Sites analisa qualquer URL e extrai a estrutura completa: HTML, rotas, scripts, CSS, fontes, imagens, links e meta tags. Acesse em: ☰ → Extrator de Sites."}</P>

          <H2>{"🌐 Como funciona — Tecnicamente"}</H2>
          <P>{"O extrator usa proxies CORS públicos para contornar a política de segurança do navegador (same-origin policy):"}</P>
          <Li>{"Proxy 1: api.allorigins.win/get?url=URL_CODIFICADA"}</Li>
          <Li>{"Proxy 2 (fallback): corsproxy.io/?URL_CODIFICADA"}</Li>
          <P>{"Se o primeiro falhar, tenta automaticamente o segundo. O HTML completo é baixado pelo proxy e analisado localmente no celular."}</P>

          <H2>{"📊 O que é extraído"}</H2>
          <H3>{"🗺️ Rotas (até 50)"}</H3>
          <P>{"Todos os href= que apontam para o mesmo domínio. Mapa completo das páginas do site."}</P>
          <Code copyKey="rotas-ex">{"/\n/sobre\n/contato\n/blog\n/blog/post-1\n/produto/123\n/api/..."}</Code>

          <H3>{"📜 Scripts JavaScript (até 30)"}</H3>
          <P>{"URLs completas de todos os arquivos .js referenciados no HTML."}</P>
          <Code copyKey="scripts-ex">{"https://site.com/static/js/main.abc123.js\nhttps://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js\nhttps://site.com/js/analytics.js"}</Code>

          <H3>{"🎨 Folhas de Estilo CSS (até 20)"}</H3>
          <P>{"URLs completas de todos os arquivos .css linkados."}</P>

          <H3>{"🔤 Fontes (até 10)"}</H3>
          <P>{"Links de fontes: Google Fonts, Adobe Fonts, fonts.googleapis.com..."}</P>

          <H3>{"🖼️ Imagens (até 30)"}</H3>
          <P>{"URLs de .png, .jpg, .jpeg, .gif, .webp, .svg, .ico."}</P>

          <H3>{"🔗 Links gerais (até 50)"}</H3>
          <P>{"Todos os href= — inclui links externos, redes sociais, recursos."}</P>

          <H3>{"🏷️ Meta Tags"}</H3>
          <P>{"Todas as meta tags: description, og:title, og:image, robots, viewport..."}</P>

          <H3>{"📄 HTML Completo"}</H3>
          <P>{"O HTML bruto completo da página — fonte real como o servidor retornou."}</P>

          <H2>{"💾 Copiar a fonte do site"}</H2>
          <P>{"Na aba HTML do resultado, você vê o código-fonte completo da página. Toque no texto para selecionar e copiar qualquer parte."}</P>
          <Info>{"💡 O HTML mostrado é o que o servidor retorna — o HTML estático. Para sites gerados dinamicamente por JavaScript (React, Vue, Next.js), o HTML pode não incluir o conteúdo renderizado."}</Info>

          <H2>{"📥 Importar para o projeto"}</H2>
          <P>{"Após a extração, toque em 'Importar HTML + Relatório'. O AppIDE cria 2 arquivos no projeto ativo:"}</P>
          <Li>{"dominio_index.html — HTML completo da página"}</Li>
          <Li>{"dominio_extração.md — relatório Markdown com todas as rotas, scripts, links, fontes, imagens e meta tags"}</Li>

          <H2>{"📋 Exemplo de relatório gerado"}</H2>
          <Code copyKey="relatorio-ex">{"# 🌐 Extração: Meu Site\nURL: https://meusite.com.br\nData: 21/05/2026 10:30\n\n## 🗺️ Rotas encontradas (12)\n- /\n- /sobre\n- /contato\n\n## 📜 Scripts JS (5)\n- https://meusite.com.br/js/app.js\n\n## 🔤 Fontes (2)\n- https://fonts.googleapis.com/...\n\n## 🏷️ Meta Tags (8)\n- description: Meu site de exemplo..."}</Code>

          <H2>{"⚠️ Limitações"}</H2>
          <Li>{"Sites com proteção anti-bot (Cloudflare, reCAPTCHA) podem bloquear"}</Li>
          <Li>{"Conteúdo gerado por JavaScript (SPAs) pode não aparecer no HTML"}</Li>
          <Li>{"Sites HTTPS com HSTS podem rejeitar o proxy"}</Li>
          <Li>{"Arquivos muito grandes (>5MB) são truncados no modo HTML"}</Li>
          <Warn>{"⚠️ Use apenas em sites públicos. Não use para copiar conteúdo protegido por direitos autorais."}</Warn>
        </View>
      );

      // ── BANCO DE DADOS ──
      case "db": return (
        <View>
          <H2>{"📱 SQLite Local — banco no celular (offline)"}</H2>
          <P>{"SQLite é um banco de dados que fica salvo como arquivo no celular. Funciona 100% offline, sem internet, sem servidor. Os dados são seus."}</P>
          <Li>{"Ideal para: clientes, processos, agenda, notas, prazos"}</Li>
          <Li>{"Persiste entre sessões — dados ficam no celular mesmo fechando o app"}</Li>
          <Li>{"Acesso: ☰ → Banco de Dados → aba LOCAL"}</Li>

          <H3>{"Criar tabela"}</H3>
          <Code copyKey="db-create">{"CREATE TABLE IF NOT EXISTS clientes (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  nome TEXT NOT NULL,\n  telefone TEXT,\n  email TEXT,\n  criado_em TEXT DEFAULT (datetime('now','localtime'))\n);"}</Code>

          <H3>{"Inserir dados"}</H3>
          <Code copyKey="db-insert">{"INSERT INTO clientes (nome, telefone, email)\nVALUES ('João Silva', '31999990001', 'joao@email.com');"}</Code>

          <H3>{"Consultar"}</H3>
          <Code copyKey="db-select">{"SELECT * FROM clientes ORDER BY nome;\nSELECT * FROM clientes WHERE nome LIKE '%João%';\nSELECT COUNT(*) AS total FROM clientes;"}</Code>

          <H3>{"Atualizar / Excluir"}</H3>
          <Code copyKey="db-upd">{"UPDATE clientes SET telefone='31888880001' WHERE id=1;\nDELETE FROM clientes WHERE id=1;"}</Code>

          <H2>{"☁️ Neon DB — PostgreSQL na nuvem"}</H2>
          <P>{"Banco PostgreSQL gratuito na nuvem. Acessa de qualquer dispositivo. Requer internet."}</P>
          <Step n={1}>{"Acesse neon.tech → crie conta gratuita (sem cartão)"}</Step>
          <Step n={2}>{"Clique em 'New Project' → dê um nome"}</Step>
          <Step n={3}>{"Vá em 'Connection Details' → copie a Connection String"}</Step>
          <Step n={4}>{"No AppIDE: ☰ → Banco de Dados → aba NEON → cole a URL"}</Step>
          <Step n={5}>{"Toque em 'Testar Conexão' → ✅"}</Step>
          <Code copyKey="neon-url">{"postgresql://usuario:senha@ep-nome-projeto.us-east-2.aws.neon.tech/neondb?sslmode=require"}</Code>

          <H2>{"🤖 Peça à Jasmim para criar o SQL"}</H2>
          <P>{"No painel Banco de Dados, toque em 🤖 Perguntar à IA. Exemplos:"}</P>
          <Li>{"\"Crie tabelas para escritório de advocacia com processos e prazos\""}</Li>
          <Li>{"\"Liste os processos vencendo essa semana\""}</Li>
          <Li>{"\"Corrija o erro nessa query\""}</Li>

          <H2>{"⚠️ Diferenças importantes"}</H2>
          <Li>{"SQLite: dados ficam no celular — se desinstalar o app, perde os dados. Faça backup!"}</Li>
          <Li>{"Neon: dados na nuvem, acessa de qualquer lugar, mas requer internet"}</Li>
          <Li>{"NUNCA compartilhe a Connection String do Neon — ela dá acesso total"}</Li>
        </View>
      );

      // ── IA JASMIM ──
      case "ia": return (
        <View>
          <P>{"Jasmim é a IA assistente do AppIDE — uma desenvolvedora sênior virtual. Toque no ícone 🤖 no editor para abrir."}</P>

          <H2>{"🎯 O que a Jasmim faz"}</H2>
          <Li>{"Cria projetos completos do zero em qualquer linguagem"}</Li>
          <Li>{"Cria e modifica arquivos do projeto diretamente"}</Li>
          <Li>{"Instala dependências (npm, pip) via terminal"}</Li>
          <Li>{"Configura banco de dados completo (schema, tabelas, queries)"}</Li>
          <Li>{"Corrige erros automaticamente lendo o output do terminal"}</Li>
          <Li>{"Faz push para GitHub quando você pedir"}</Li>
          <Li>{"Explica código linha por linha"}</Li>

          <H2>{"🧠 Como a Jasmim funciona tecnicamente"}</H2>
          <Li>{"API: Gemini (padrão), OpenAI, Groq, Anthropic, Grok, Perplexity"}</Li>
          <Li>{"Contexto: vê os arquivos do projeto aberto + output do terminal"}</Li>
          <Li>{"Aplica arquivos: quando cria código, envia para o editor automaticamente (com sua confirmação)"}</Li>
          <Li>{"Memória: arquivo .jasmim-memory.json no projeto com decisões técnicas"}</Li>
          <Li>{"Modo Campo Livre: ☰ → Campo Livre — conversa sem contexto de código"}</Li>

          <H2>{"⚙️ Configurar a chave de IA"}</H2>
          <H3>{"Gemini (Google) — recomendado"}</H3>
          <Step n={1}>{"Acesse aistudio.google.com"}</Step>
          <Step n={2}>{"Clique em 'Get API key' → Create API Key"}</Step>
          <Step n={3}>{"Copie a chave (começa com AIza...)"}</Step>
          <Step n={4}>{"No AppIDE: painel Jasmim → ⚙️ → Cole a chave no campo GEMINI DIRETO"}</Step>
          <Ok>{"✅ Gemini tem plano gratuito generoso — ideal para começar."}</Ok>

          <H3>{"Outros provedores"}</H3>
          <Code copyKey="providers">{"AIza...  → Google Gemini\nsk-...   → OpenAI (GPT-4)\ngsk_...  → Groq (rápido e gratuito)\nsk-ant   → Anthropic Claude\nxai-...  → Grok (xAI)\npplx-... → Perplexity"}</Code>

          <H2>{"📋 Exemplos de comandos"}</H2>
          <Code copyKey="j-full">{"\"Crie um app de lista de tarefas com React, Node.js/Express e PostgreSQL. Interface em português.\"\n\n\"Tem um erro no terminal acima. Corrija sem reescrever o que estava funcionando.\"\n\n\"Adicione autenticação JWT com login, registro e logout.\"\n\n\"Explique o que esse código faz linha por linha.\"\n\n\"Faça push para o GitHub e crie um README.\""}</Code>
        </View>
      );

      // ── GITHUB ──
      case "github": return (
        <View>
          <P>{"GitHub integrado diretamente no AppIDE. Clone, push, pull, diff, branch — sem precisar do terminal."}</P>

          <H2>{"🔑 Criar Personal Access Token"}</H2>
          <Step n={1}>{"github.com → Settings (perfil) → Developer Settings"}</Step>
          <Step n={2}>{"Personal access tokens → Tokens (classic) → Generate new token"}</Step>
          <Step n={3}>{"Permissões: marque 'repo' (todas) e 'workflow'"}</Step>
          <Step n={4}>{"Copie o token — começa com ghp_..."}</Step>
          <Step n={5}>{"AppIDE: ☰ → GitHub → cole o token → Conectar"}</Step>

          <H2>{"📦 Operações disponíveis"}</H2>
          <Li>{"Clone: baixa o repositório inteiro via zipball (1 requisição, até 38.000+ arquivos)"}</Li>
          <Li>{"Push: commit e envio de arquivos modificados"}</Li>
          <Li>{"Pull: atualiza o projeto com o repositório remoto"}</Li>
          <Li>{"Diff: ver quais arquivos mudaram"}</Li>
          <Li>{"Branch: criar e trocar de branch"}</Li>

          <H2>{"🖥️ Git via Terminal"}</H2>
          <Code copyKey="git-full">{"# Configurar identidade (primeira vez)\ngit config --global user.name \"Seu Nome\"\ngit config --global user.email \"seu@email.com\"\n\n# Clonar (público)\ngit clone https://github.com/usuario/repo.git\n\n# Clonar repositório privado (com token)\ngit clone https://SEU_TOKEN@github.com/usuario/repo.git\n\n# Commit e push\ngit add .\ngit commit -m \"descrição da mudança\"\ngit push origin main\n\n# Branch\ngit checkout -b nova-feature\ngit push -u origin nova-feature"}</Code>

          <Warn>{"⚠️ Nunca commite arquivos .env com senhas. Adicione .env ao .gitignore ANTES do primeiro commit."}</Warn>
        </View>
      );

      // ── PREVIEW ──
      case "preview": return (
        <View>
          <P>{"O AppIDE renderiza HTML, CSS e JS diretamente no app — sem abrir o navegador."}</P>

          <H2>{"👁️ Preview de arquivo HTML"}</H2>
          <Li>{"Com arquivo .html aberto: toque em '🌐 Preview' na barra inferior"}</Li>
          <Li>{"CSS e JS inline ou em &lt;script&gt; e &lt;style&gt; são executados"}</Li>
          <Li>{"alert(), confirm(), prompt() — todos funcionam"}</Li>
          <Li>{"O preview carrega o arquivo atual sem precisar de servidor"}</Li>

          <H2>{"🎮 Playground HTML/React/JS"}</H2>
          <P>{"Para escrever e testar código sem criar arquivo: ☰ → Playground HTML"}</P>

          <H3>{"Modo HTML"}</H3>
          <Code copyKey="html-ex">{"<!DOCTYPE html>\n<html>\n<body>\n  <button onclick=\"alert('Funcionou!')\">Clique</button>\n  <script>\n    document.write('AppIDE Playground!');\n  </script>\n</body>\n</html>"}</Code>

          <H3>{"Modo React (sem npm — usa CDN)"}</H3>
          <Code copyKey="react-ex">{"function App() {\n  const [n, setN] = React.useState(0);\n  return (\n    <div>\n      <h1>Contador: {n}</h1>\n      <button onClick={() => setN(n+1)}>+1</button>\n    </div>\n  );\n}"}</Code>

          <H3>{"Modo JavaScript (com console visual)"}</H3>
          <Code copyKey="js-ex">{"const nums = [1,2,3,4,5];\nconsole.log('Soma:', nums.reduce((a,b) => a+b, 0));\nconsole.log('Pares:', nums.filter(n => n%2 === 0));"}</Code>

          <H2>{"🚀 Preview de app Node.js/React completo"}</H2>
          <P>{"Com servidor Termux ativo:"}</P>
          <Code copyKey="preview-node">{"# No terminal do AppIDE:\nnpm install\nnpm run dev\n# O servidor inicia → toque no botão 'Preview' no canto superior"}</Code>
        </View>
      );

      // ── IMPORT / EXPORT ──
      case "importexport": return (
        <View>
          <Ok>{"✅ Importação sem limite: 50.000+ arquivos com extração paralela de 200 simultâneos."}</Ok>

          <H2>{"📥 Importar ZIP"}</H2>
          <Step n={1}>{"☰ → Importar ZIP"}</Step>
          <Step n={2}>{"Selecione o arquivo .zip do seu projeto"}</Step>
          <Step n={3}>{"Todos os arquivos são extraídos em paralelo (200 simultâneos)"}</Step>
          <Step n={4}>{"Compatível com: VS Code, GitHub Download ZIP, qualquer projeto"}</Step>

          <H2>{"📤 Exportar ZIP"}</H2>
          <Step n={1}>{"Abra o projeto"}</Step>
          <Step n={2}>{"☰ → Exportar ZIP"}</Step>
          <Step n={3}>{"Compartilhe via WhatsApp, Google Drive, cabo..."}</Step>
          <Li>{"node_modules NÃO é incluído (muito pesado)"}</Li>
          <Li>{"Arquivos .env SÃO incluídos — cuidado ao compartilhar"}</Li>

          <H2>{"🐙 Importar do GitHub (clone)"}</H2>
          <Step n={1}>{"☰ → GitHub → Clonar repositório"}</Step>
          <Step n={2}>{"Cole a URL: https://github.com/usuario/repo"}</Step>
          <Step n={3}>{"O AppIDE baixa o repo via zipball em 1 requisição"}</Step>
          <Step n={4}>{"Suporta 38.000+ arquivos sem rate limit"}</Step>

          <H2>{"📦 Importar TAR / TAR.GZ"}</H2>
          <Li>{"☰ → Importar TAR — suporta .tar e .tar.gz"}</Li>
          <Li>{"Extração paralela, mesmo comportamento do ZIP"}</Li>

          <H2>{"⚡ Tecnologia de extração"}</H2>
          <Li>{"Leitura de ZIP: XHR com responseType=blob (sem truncamento)"}</Li>
          <Li>{"Suporta ZIPs de 200MB+ sem problemas"}</Li>
          <Li>{"Extração paralela: Promise.all com lotes de 200 arquivos"}</Li>
          <Li>{"Salvamento em background: projeto aparece imediatamente, disco salva em paralelo"}</Li>
        </View>
      );

      // ── PROJETOS ──
      case "projetos": return (
        <View>
          <H2>{"📂 Gerenciar projetos"}</H2>
          <Li>{"Criar: + na tela inicial ou aba CRIAR"}</Li>
          <Li>{"Abrir: toque no projeto na lista"}</Li>
          <Li>{"Duplicar: ☰ → Duplicar Projeto → cópia independente"}</Li>
          <Li>{"Excluir: segure o projeto na lista → Excluir"}</Li>

          <H2>{"⏱️ Checkpoints (snapshots)"}</H2>
          <Li>{"☰ → Salvar Checkpoint → cria snapshot do projeto atual"}</Li>
          <Li>{"☰ → Histórico de Checkpoints → ver e restaurar versões antigas"}</Li>
          <Li>{"Salve antes de mudanças grandes ou experimentos arriscados"}</Li>

          <H2>{"🔗 Juntar vários projetos"}</H2>
          <Step n={1}>{"Importe todos os projetos via ZIP ou GitHub (um por vez)"}</Step>
          <Step n={2}>{"Abra a Jasmim → descreva o que cada um tem de bom"}</Step>
          <Step n={3}>{"Peça: 'Una os projetos aproveitando o código que já funciona'"}</Step>
          <Code copyKey="juntar">{"\"Tenho 3 projetos. O login está em app1/, os relatórios em app2/ e o chat em app3/. Una num único projeto. Não reescreva — aproveite o código existente.\""}</Code>
          <Warn>{"⚠️ Sempre diga 'não reescreva o que já funciona'. Com isso a Jasmim copia e adapta o existente."}</Warn>

          <H2>{"📊 Organizar múltiplos apps"}</H2>
          <P>{"Para cada app, mapeie:"}</P>
          <Code copyKey="mapeamento">{"App 1: ___________\n✅ O que funciona: ___________\n❌ O que não funciona: ___________\n\n(repita para cada app)"}</Code>
          <P>{"Depois defina o app final e peça à Jasmim para unir as partes funcionais."}</P>
        </View>
      );

      // ── TERMUX / SERVIDOR LOCAL ──
      case "termux": return (
        <View>
          <Info>{"📡 Modo Termux: servidor Node.js rodando no próprio celular via Termux. Terminal Linux real, offline, sem internet."}</Info>

          <H2>{"📲 Passo 1 — Instalar o Termux"}</H2>
          <Warn>{"⚠️ Instale APENAS pelo F-Droid. A versão da Play Store está desatualizada e não funciona corretamente."}</Warn>
          <Step n={1}>{"Abra o navegador → acesse f-droid.org"}</Step>
          <Step n={2}>{"Busque 'Termux' → instale"}</Step>
          <Step n={3}>{"Se aparecer aviso de segurança: permitir instalar fontes desconhecidas"}</Step>

          <H2>{"⚙️ Passo 2 — Preparar o Termux"}</H2>
          <Code copyKey="termux-update">{"pkg update && pkg upgrade -y"}</Code>
          <Code copyKey="termux-node">{"pkg install nodejs git curl -y"}</Code>
          <Code copyKey="termux-check">{"node --version && npm --version && git --version"}</Code>
          <Ok>{"✅ Se aparecer as versões dos 3 comandos, está pronto."}</Ok>

          <H2>{"📥 Passo 3 — Instalar o servidor AppIDE"}</H2>
          <P>{"Crie a pasta e instale as dependências:"}</P>
          <Code copyKey="termux-server-install">{"mkdir -p ~/appide-server && cd ~/appide-server\nnpm init -y\nnpm install express cors"}</Code>
          <P>{"Crie o arquivo do servidor server.mjs:"}</P>
          <Code copyKey="termux-server-code">{"# Baixe o servidor ou crie manualmente.\n# O servidor deve rodar na porta 8080 e expor:\n# GET  /api/healthz\n# POST /api/terminal/exec  (SSE streaming)\n# POST /api/ai/chat\n\nPORT=8080 node ~/appide-server/server.mjs"}</Code>

          <H2>{"▶️ Passo 4 — Iniciar o servidor"}</H2>
          <Code copyKey="termux-start">{"cd ~/appide-server && node server.mjs"}</Code>
          <Ok>{"✅ Deixe o Termux aberto em segundo plano (minimize, NÃO feche)."}</Ok>

          <H2>{"🔗 Passo 5 — Conectar o AppIDE"}</H2>
          <Step n={1}>{"Abra o AppIDE → aba Configurações (⚙️)"}</Step>
          <Step n={2}>{"Role até 'SERVIDOR BACKEND'"}</Step>
          <Step n={3}>{"Ative 'Modo Termux' — detecta 127.0.0.1:8080 automaticamente"}</Step>
          <Step n={4}>{"Ou: cole a URL manualmente (útil se mudar a porta)"}</Step>
          <Ok>{"✅ Terminal, IA e instalação de plugins agora usam o Termux."}</Ok>

          <H2>{"⚙️ Porta diferente de 8080"}</H2>
          <Code copyKey="termux-custom-port">{"PORT=3000 node ~/appide-server/server.mjs"}</Code>
          <P>{"No AppIDE: Configurações → Porta do Termux → altere para 3000."}</P>

          <H2>{"📡 Usar em rede local (outro celular/computador)"}</H2>
          <P>{"Para acessar o servidor de outro dispositivo na mesma rede Wi-Fi:"}</P>
          <Step n={1}>{"No Termux: descubra o IP do celular — ip addr show | grep 192"}</Step>
          <Step n={2}>{"No AppIDE do outro dispositivo: Configurações → URL do Servidor → http://192.168.x.x:8080"}</Step>
          <Info>{"💡 Assim você pode usar o AppIDE no tablet ou computador conectando ao servidor do celular."}</Info>

          <H2>{"📡 Expor para internet (URL pública)"}</H2>
          <P>{"Para acessar de fora da rede local, use um serviço de túnel:"}</P>
          <H3>{"localhost.run (sem instalação)"}</H3>
          <Code copyKey="lt-run">{"ssh -R 80:localhost:8080 ssh.localhost.run"}</Code>
          <P>{"Gera uma URL pública como https://abc.lhr.life — cole em Configurações → URL do Servidor."}</P>

          <H2>{"❓ Problemas comuns"}</H2>
          <H3>{"Porta já em uso"}</H3>
          <Code copyKey="fix-port">{"pkill -f server.mjs\nnode ~/appide-server/server.mjs"}</Code>
          <H3>{"App não conecta"}</H3>
          <Li>{"Verifique se o Termux está aberto (não fechado)"}</Li>
          <Li>{"Confirme a porta em Configurações → Porta do Termux"}</Li>
          <Li>{"O app verifica 127.0.0.1:8080 a cada 15 segundos automaticamente"}</Li>
          <H3>{"Voltar ao modo sem servidor"}</H3>
          <Li>{"Configurações → URL do Servidor → toque em Limpar"}</Li>
        </View>
      );

      // ── APIs / ROTAS ──
      case "apis": return (
        <View>
          <P>{"Mapeamento completo de todos os endpoints, APIs e rotas do AppIDE. Apenas o que existe de verdade no código."}</P>

          <H2>{"🔧 Servidor local (Termux — Express)"}</H2>
          <P>{"O servidor Node.js/Express que roda no Termux expõe estas rotas na porta 8080:"}</P>

          <H3>{"GET /api/healthz"}</H3>
          <P>{"Verifica se o servidor está vivo. Retorna {\"status\":\"ok\"}. Chamado a cada 15 segundos pelo app."}</P>
          <Code copyKey="healthz">{"curl http://127.0.0.1:8080/api/healthz\n# Resposta: {\"status\":\"ok\"}"}</Code>

          <H3>{"POST /api/terminal/exec"}</H3>
          <P>{"Executa qualquer comando bash no servidor. Retorna output em streaming SSE (linha por linha em tempo real). Sem timeout — aguarda o processo terminar."}</P>
          <Code copyKey="exec">{"curl -X POST http://127.0.0.1:8080/api/terminal/exec \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"command\":\"npm install express\",\"sessionId\":\"t1\"}'\n\n# Formato SSE da resposta:\n# data: {\"type\":\"stdout\",\"data\":\"linha\\n\"}\n# data: {\"type\":\"stderr\",\"data\":\"aviso\\n\"}\n# data: {\"type\":\"exit\",\"data\":\"0\"}\n# data: {\"done\":true}"}</Code>

          <H3>{"POST /api/terminal/write"}</H3>
          <P>{"Envia arquivos do projeto (do celular) para o servidor. Usado pelo botão ↑ UPLOAD no terminal."}</P>
          <Code copyKey="write">{"# Corpo: {sessionId, files: [{path, content}]}\n# Resposta: {\"ok\":true, \"written\":42}"}</Code>

          <H3>{"GET /api/terminal/read"}</H3>
          <P>{"Baixa arquivos do servidor para o app. Usado pelo botão ↓ DOWNLOAD no terminal."}</P>
          <Code copyKey="read-api">{"# Resposta: {\"files\":[{\"path\":\"src/index.js\",\"content\":\"...\"}]}"}</Code>

          <H3>{"POST /api/ai/chat"}</H3>
          <P>{"Proxy para a IA Gemini. O servidor tem a chave configurada. Retorna a resposta completa (não streaming)."}</P>
          <Code copyKey="ai-chat">{"# Corpo:\n{\n  \"messages\": [{\"role\":\"user\",\"content\":\"Olá\"}],\n  \"systemPrompt\": \"Você é...\",\n  \"model\": \"gemini-2.5-flash\"\n}\n\n# Resposta:\n{\"content\":\"resposta da IA\"}\n\n# Limite: 65.536 tokens de output (máximo do modelo)"}</Code>

          <H2>{"☁️ APIs externas usadas pelo app"}</H2>

          <H3>{"Google Gemini"}</H3>
          <Li>{"URL: generativelanguage.googleapis.com"}</Li>
          <Li>{"Modelo: gemini-2.5-flash (padrão)"}</Li>
          <Li>{"Chamado por: JasmimPanel (direto) e /api/ai/chat (via servidor)"}</Li>
          <Li>{"Auth: API Key AIza..."}</Li>

          <H3>{"GitHub REST API"}</H3>
          <Li>{"URL: api.github.com"}</Li>
          <Li>{"Clone: GET /repos/{owner}/{repo}/zipball/{branch}"}</Li>
          <Li>{"Push: PUT /repos/{owner}/{repo}/contents/{path}"}</Li>
          <Li>{"Auth: Token ghp_... no header Authorization"}</Li>

          <H3>{"CORS Proxies (Extrator de Sites)"}</H3>
          <Li>{"Proxy 1: api.allorigins.win/get?url=URL"}</Li>
          <Li>{"Proxy 2: corsproxy.io/?URL (fallback automático)"}</Li>
          <Li>{"Sem autenticação — serviços públicos gratuitos"}</Li>

          <H3>{"Neon PostgreSQL"}</H3>
          <Li>{"URL: *.neon.tech (endpoint gerado pelo Neon)"}</Li>
          <Li>{"Auth: Connection String completa com usuário e senha"}</Li>
          <Li>{"Chamado por: DatabasePanel.tsx diretamente do app"}</Li>

          <H2>{"🗺️ Quem chama o quê"}</H2>
          <Code copyKey="mapa">{"Terminal.tsx      → POST /api/terminal/exec  (bash)\nTerminal.tsx      → POST /api/terminal/write (upload)\nTerminal.tsx      → GET  /api/terminal/read  (download)\nTerminal.tsx      → GET  /api/healthz        (check 15s)\nplugins.tsx       → POST /api/terminal/exec  (install)\nplugins.tsx       → GET  /api/healthz        (check install)\nSystemStatus.tsx  → GET  /api/healthz        (diagnóstico)\nJasmimPanel.tsx   → POST /api/ai/chat        (IA servidor)\nJasmimPanel.tsx   → Gemini/OpenAI/Groq direto (key configurada)\nSiteExtractor.tsx → allorigins.win / corsproxy.io\ngitHubService.ts  → api.github.com\nDatabasePanel.tsx → expo-sqlite (local) / neon.tech (nuvem)"}</Code>

          <Info>{"💡 Todas as rotas do servidor local passam pelo prefixo /api. O servidor de desenvolvimento (api-server do monorepo) só tem /api/healthz e /api/ai/chat. As rotas /api/terminal/* são implementadas pelo servidor do Termux."}</Info>
        </View>
      );

      // ── API KEYS ──
      case "apikeys": return (
        <View>
          <P>{"O AppIDE usa chaves de API para conectar serviços externos. Todas ficam armazenadas localmente no dispositivo — nunca saem do celular."}</P>

          <H2>{"🔑 Onde configurar cada credencial"}</H2>
          <Li>{"IA (Gemini, OpenAI, Groq...): painel Jasmim → ⚙️ Configurações → campo da chave"}</Li>
          <Li>{"GitHub Token: ☰ → GitHub → inserir token"}</Li>
          <Li>{"Banco Neon: ☰ → Banco de Dados → aba NEON → Connection String"}</Li>

          <H2>{"⚡ Detecção automática de provedor"}</H2>
          <Code copyKey="providers">{"AIza...    → Google Gemini\nsk-...     → OpenAI (GPT-4)\ngsk_...    → Groq (llama, mistral — gratuito)\nsk-ant...  → Anthropic Claude\nxai-...    → Grok (xAI)\npplx-...   → Perplexity\nsk-or-...  → OpenRouter"}</Code>

          <H2>{"🔒 Segurança"}</H2>
          <Li>{"Chaves ficam no AsyncStorage local — criptografado pelo sistema Android"}</Li>
          <Li>{"Chaves são enviadas apenas ao serviço externo correspondente (Gemini, GitHub...)"}</Li>
          <Li>{"Para revogar: delete a key no site do serviço (GitHub, Google AI Studio...)"}</Li>
          <Warn>{"⚠️ NUNCA compartilhe o celular com suas chaves sem limpar as credenciais primeiro."}</Warn>
        </View>
      );

      // ── ADVOGADO ──
      case "advogado": return (
        <View>
          <P>{"Templates de banco de dados SQL prontos para escritório de advocacia. Cole no ☰ → Banco de Dados → aba LOCAL."}</P>

          <H2>{"⚖️ Estrutura completa"}</H2>

          <H3>{"1. Clientes"}</H3>
          <Code copyKey="adv-clientes">{"CREATE TABLE IF NOT EXISTS clientes (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  nome TEXT NOT NULL,\n  cpf TEXT,\n  email TEXT,\n  telefone TEXT,\n  endereco TEXT,\n  observacoes TEXT,\n  criado_em TEXT DEFAULT (datetime('now'))\n);"}</Code>

          <H3>{"2. Processos"}</H3>
          <Code copyKey="adv-processos">{"CREATE TABLE IF NOT EXISTS processos (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  numero TEXT NOT NULL,\n  cliente_id INTEGER,\n  vara TEXT,\n  comarca TEXT,\n  assunto TEXT,\n  status TEXT DEFAULT 'ativo',\n  valor_causa REAL,\n  data_distribuicao TEXT,\n  observacoes TEXT,\n  criado_em TEXT DEFAULT (datetime('now')),\n  FOREIGN KEY (cliente_id) REFERENCES clientes(id)\n);"}</Code>

          <H3>{"3. Audiências"}</H3>
          <Code copyKey="adv-audiencias">{"CREATE TABLE IF NOT EXISTS audiencias (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  processo_id INTEGER,\n  data_hora TEXT NOT NULL,\n  local TEXT,\n  tipo TEXT,\n  resultado TEXT,\n  criado_em TEXT DEFAULT (datetime('now')),\n  FOREIGN KEY (processo_id) REFERENCES processos(id)\n);"}</Code>

          <H3>{"4. Prazos"}</H3>
          <Code copyKey="adv-prazos">{"CREATE TABLE IF NOT EXISTS prazos (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  processo_id INTEGER,\n  descricao TEXT NOT NULL,\n  data_limite TEXT NOT NULL,\n  concluido INTEGER DEFAULT 0,\n  criado_em TEXT DEFAULT (datetime('now')),\n  FOREIGN KEY (processo_id) REFERENCES processos(id)\n);"}</Code>

          <H2>{"🔍 Consultas úteis"}</H2>

          <H3>{"Ver todos os clientes"}</H3>
          <Code copyKey="adv-q1">{"SELECT * FROM clientes ORDER BY nome;"}</Code>

          <H3>{"Processos de um cliente"}</H3>
          <Code copyKey="adv-q2">{"SELECT p.numero, p.assunto, p.status, c.nome\nFROM processos p\nJOIN clientes c ON p.cliente_id = c.id\nWHERE c.nome LIKE '%João%';"}</Code>

          <H3>{"Prazos vencendo em 7 dias"}</H3>
          <Code copyKey="adv-q3">{"SELECT pz.descricao, pz.data_limite, p.numero\nFROM prazos pz\nJOIN processos p ON pz.processo_id = p.id\nWHERE pz.concluido = 0\n  AND pz.data_limite <= date('now', '+7 days')\nORDER BY pz.data_limite;"}</Code>

          <H3>{"Adicionar cliente"}</H3>
          <Code copyKey="adv-q4">{"INSERT INTO clientes (nome, telefone, email)\nVALUES ('Maria da Silva', '31999990000', 'maria@email.com');"}</Code>

          <Info>{"💡 Na aba IA, peça: 'Crie SQL para listar todos os processos ativos do cliente João com prazos vencendo essa semana' — a IA escreve o SQL para você."}</Info>
        </View>
      );

      default: return <P>{"Seção não encontrada."}</P>;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: bg }}>

        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: insets.top + 6, paddingBottom: 10, backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border, gap: 10 }}>
          <Text style={{ color: fg, fontWeight: "700", fontSize: 17, flex: 1 }}>📖 Manual AppIDE v2.9.0</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="x" size={22} color={muted} />
          </TouchableOpacity>
        </View>

        {/* Section Tabs */}
        <View style={{ backgroundColor: card, borderBottomWidth: 1, borderBottomColor: border }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 8, gap: 6 }}>
            {SECTIONS.map((sec) => (
              <TouchableOpacity
                key={sec.id}
                onPress={() => setActiveSection(sec.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: activeSection === sec.id ? purple : `${purple}22`,
                  borderWidth: 1,
                  borderColor: activeSection === sec.id ? purple : border,
                }}
              >
                <Text style={{ fontSize: 12 }}>{sec.icon}</Text>
                <Text style={{ color: activeSection === sec.id ? "#fff" : muted, fontSize: 12, fontWeight: activeSection === sec.id ? "700" : "500" }}>
                  {sec.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {renderSection()}
        </ScrollView>

      </View>
    </Modal>
  );
}
