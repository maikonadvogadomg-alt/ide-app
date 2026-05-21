import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AIChat from "@/components/AIChat";
import HtmlPlayground from "@/components/HtmlPlayground";
import AIMemoryModal from "@/components/AIMemoryModal";
import DatabasePanel from "@/components/DatabasePanel";
import PreviewPanel from "@/components/PreviewPanel";
import CampoLivreModal from "@/components/CampoLivreModal";
import CheckpointsModal from "@/components/CheckpointsModal";
import CodeEditor from "@/components/CodeEditor";
import FileSidebar from "@/components/FileSidebar";
import GitHubModal from "@/components/GitHubModal";
import LibrarySearch from "@/components/LibrarySearch";
import ProjectPlanModal from "@/components/ProjectPlanModal";
import ManualModal from "@/components/ManualModal";
import CombinarAppsModal from "@/components/CombinarAppsModal";
import APKBuilderModal from "@/components/APKBuilderModal";
import VSCodeWebModal from "@/components/VSCodeWebModal";
import SystemStatus from "@/components/SystemStatus";
import Terminal from "@/components/Terminal";
import { useApp } from "@/context/AppContext";
import type { ProjectFile } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { exportZip, importZip, importTar, importSingleFile } from "@/utils/zipUtils";

// WebView só no nativo — react-native-webview não funciona no browser
const WebView = Platform.OS !== "web"
  ? require("react-native-webview").WebView
  : null;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SIDEBAR_W = 215;

// Menu Completo — mesmas opções do SK Code Editor
const MENU_ITEMS = [
  { icon: "plus-circle",    label: "Criar Novo Projeto",              desc: "Wizard com modelos prontos",                  key: "criar" },
  { icon: "message-circle", label: "💬 Campo Livre",                  desc: "Chat sem restrições com qualquer IA",         key: "campolivre" },
  { icon: "cpu",            label: "Assistente IA — Jasmim",          desc: "Converse, peça código, debug...",             key: "jasmim" },
  { icon: "file",           label: "Importar Arquivo",                desc: "Abrir qualquer .js .py .html .txt etc.",      key: "importFile" },
  { icon: "download",       label: "Importar ZIP",                    desc: "Abrir arquivo .zip do dispositivo",           key: "importZip" },
  { icon: "download",       label: "Importar TAR.GZ",                 desc: "Abrir arquivo .tar.gz / .tgz",               key: "importTar" },
  { icon: "upload",         label: "Exportar ZIP",                    desc: "Baixar projeto como .zip",                   key: "exportZip" },
  { icon: "link",           label: "Importar via Link Público",        desc: "Clonar qualquer repo público sem token",      key: "importUrl" },
  { icon: "github",         label: "GitHub — Clonar / Enviar",        desc: "Importar ou exportar para GitHub",            key: "github" },
  { icon: "send",           label: "Publicar no Repositório",          desc: "Enviar projeto para repositório GitHub",      key: "publishRepo" },
  { icon: "monitor",        label: "Abrir no VSCode Web",              desc: "Editar no vscode.dev direto pelo navegador",  key: "vscodeWeb" },
  { icon: "package",        label: "Instalar Biblioteca",             desc: "npm install, pip install...",                 key: "libs" },
  { icon: "database",       label: "Banco de Dados (Neon/Postgres)",  desc: "Conectar e rodar SQL",                        key: "db" },
  { icon: "camera",         label: "Salvar Checkpoint",               desc: "Criar ponto de restauração",                  key: "saveCheckpoint" },
  { icon: "clock",          label: "Histórico de Checkpoints",        desc: "Ver e restaurar versões salvas",              key: "checkpoints" },
  { icon: "check-square",   label: "Lista de Tarefas — Taski",        desc: "Organizar to-dos do projeto",                 key: "taski" },
  { icon: "layers",         label: "Memória da Jasmim",               desc: "O que ela sabe sobre você e o projeto",       key: "memory" },
  { icon: "layout",         label: "Gerar Plano do Projeto",          desc: "Gera PLANO.md com estrutura e stack",         key: "plan" },
  { icon: "smartphone",     label: "Gerar APK Android",               desc: "Converte o projeto em app instalável",        key: "apkBuilder" },
  { icon: "book-open",      label: "Manual do DevMobile",             desc: "Guia completo de uso em português",           key: "manual" },
  { icon: "globe",          label: "Preview HTML",                    desc: "Visualizar arquivo .html no painel",          key: "preview" },
  { icon: "monitor",        label: "Preview Servidor",                desc: "Ver app Node.js/Python rodando ao vivo",      key: "serverpreview" },
  { icon: "terminal",       label: "Abrir Terminal",                  desc: "Rodar comandos bash",                         key: "terminal" },
  { icon: "play-circle",    label: "Playground HTML",                 desc: "Escrever e visualizar HTML na hora",          key: "playground" },
  { icon: "activity",       label: "Status do Sistema",               desc: "Ver se tudo está funcionando",               key: "status" },
  { icon: "git-merge",      label: "Combinar Apps",                   desc: "Une o melhor de vários projetos num só",      key: "combinar" },
  { icon: "copy",           label: "Duplicar Projeto",                desc: "Cria uma cópia exata do projeto atual",       key: "duplicate" },
  { icon: "folder",         label: "Meus Projetos",                   desc: "Voltar à lista de projetos",                  key: "projetos" },
  { icon: "trash-2",        label: "Limpar Projeto",                  desc: "Apaga todos os arquivos",                     key: "clear" },
];

export default function EditorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    activeProject,
    projects,
    activeFile,
    setActiveFile,
    createFile,
    createFiles,
    createProject,
    updateProject,
    saveCheckpoint,
    deleteFile,
    dbConfigs,
    addDBConfig,
    setActiveProject,
  } = useApp();

  // Drawers
  const [showAI, setShowAI] = useState(false);
  const [showMenuCompleto, setShowMenuCompleto] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);


  // Bottom panel — resizable
  const [bottomTab, setBottomTab] = useState<"none" | "terminal" | "preview">("none");
  const PANEL_MIN = 50;
  const PANEL_DEFAULT = 230;
  const PANEL_MAX = Math.floor(SCREEN_HEIGHT * 0.65);
  const [panelH, setPanelH] = useState(PANEL_DEFAULT);
  const panelHRef = useRef(PANEL_DEFAULT);
  const startHRef = useRef(PANEL_DEFAULT);

  const resizePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { startHRef.current = panelHRef.current; },
      onPanResponderMove: (_, { dy }) => {
        const next = Math.max(PANEL_MIN, Math.min(PANEL_MAX, startHRef.current - dy));
        panelHRef.current = next;
        setPanelH(next);
      },
      onPanResponderRelease: (_, { dy }) => {
        const raw = startHRef.current - dy;
        const snapped = raw < 60 ? PANEL_MIN : Math.max(PANEL_MIN, Math.min(PANEL_MAX, raw));
        panelHRef.current = snapped;
        setPanelH(snapped);
      },
    })
  ).current;

  // Modals
  const [showLibSearch, setShowLibSearch] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCombinarApps, setShowCombinarApps] = useState(false);
  const [pendingJasmimMsg, setPendingJasmimMsg] = useState("");
  const [showDB, setShowDB] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showLangTools, setShowLangTools] = useState(false);
  const [showCampoLivre, setShowCampoLivre] = useState(false);
  const [showGitHub, setShowGitHub] = useState(false);
  const [showAPKBuilder, setShowAPKBuilder] = useState(false);
  const [showVSCodeWeb, setShowVSCodeWeb] = useState(false);
  const [githubInitialView, setGithubInitialView] = useState<"main" | "import" | "create" | "push-existing" | "token" | undefined>(undefined);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showPlayground, setShowPlayground] = useState(false);


  // Responsive screen width
  const { width: screenW } = useWindowDimensions();
  const isSmallScreen = screenW < 390;

  // Terminal command to run from editor
  const [terminalCmd, setTerminalCmd] = useState<string | null>(null);

  // DB panel state
  const [dbUrl, setDbUrl] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbTesting, setDbTesting] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [dbSql, setDbSql] = useState("SELECT NOW();");
  const [dbSqlResult, setDbSqlResult] = useState<string>("");
  const [dbRunning, setDbRunning] = useState(false);

  // Language/encoding state
  const [selectedEncoding, setSelectedEncoding] = useState("UTF-8");
  const ENCODINGS = ["UTF-8", "UTF-16", "Latin-1 (ISO-8859-1)", "ASCII", "UTF-8 BOM", "Windows-1252"];
  const LANGUAGES = ["typescript","javascript","python","html","css","json","markdown","sql","bash","go","rust","java","php","xml","yaml","toml","plaintext"];

  const topPadding = Platform.OS === "web" ? 14 : insets.top;


  const handleAnalyzeWithAI = (file: ProjectFile) => {
    setActiveFile(file);
    setShowAI(true);
  };

  const handleMemoryPress = () => {
    if (!activeProject) return;
    const memFile = activeProject.files.find((f) => f.name === ".jasmim-memory.json");
    if (memFile) {
      setActiveFile(memFile);
    } else {
      const newMem = createFile(activeProject.id, ".jasmim-memory.json",
        JSON.stringify({
          projeto: activeProject.name,
          criado: new Date().toLocaleDateString("pt-BR"),
          decisoes: [],
          tecnologias: [],
          progresso: "",
          notas: ""
        }, null, 2)
      );
      setActiveFile(newMem);
    }
  };

  const openAI = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMenuCompleto(false);
    setShowAI((v) => !v);
  };
  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAI(false);
    setShowMenuCompleto((v) => !v);
  };

  const handleMenuAction = async (key: string) => {
    setShowMenuCompleto(false);
    await new Promise((r) => setTimeout(r, 250));
    switch (key) {
      case "criar":
        router.navigate("/" as never);
        break;
      case "importFile":
        if (!activeProject) { Alert.alert("Aviso", "Abra um projeto primeiro."); return; }
        try {
          const file = await importSingleFile();
          if (!file) return;
          createFile(activeProject.id, file.name, file.content);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("✅ Arquivo importado!", `"${file.name}" adicionado ao projeto.`);
        } catch (e: any) {
          Alert.alert("Erro ao importar arquivo", e?.message || "Não foi possível ler o arquivo.");
        }
        break;
      case "importZip":
        if (!activeProject) { Alert.alert("Aviso", "Abra um projeto primeiro."); return; }
        try {
          const data = await importZip();
          if (!data) return;
          // usa path completo (preserva árvore de pastas)
          createFiles(activeProject.id, data.files.map((f) => ({ path: f.path || f.name, content: f.content })));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("✅ ZIP importado!", `${data.files.length} arquivo(s) adicionado(s) com estrutura de pastas.`);
        } catch (e: any) {
          Alert.alert("Erro ao importar ZIP", e?.message || "Arquivo ZIP inválido ou corrompido.");
        }
        break;
      case "importTar":
        if (!activeProject) { Alert.alert("Aviso", "Abra um projeto primeiro."); return; }
        try {
          const data = await importTar();
          if (!data) return;
          // usa path completo (preserva árvore de pastas)
          createFiles(activeProject.id, data.files.map((f) => ({ path: f.path || f.name, content: f.content })));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("✅ TAR importado!", `${data.files.length} arquivo(s) adicionado(s) com estrutura de pastas.`);
        } catch (e: any) {
          Alert.alert("Erro ao importar TAR", e?.message || "Arquivo TAR/TAR.GZ inválido ou corrompido.");
        }
        break;
      case "exportZip":
        if (!activeProject) { Alert.alert("Aviso", "Abra um projeto primeiro."); return; }
        try {
          const ok = await exportZip(activeProject);
          if (!ok) Alert.alert("Erro", "Não foi possível exportar.");
        } catch { Alert.alert("Erro", "Falha ao exportar."); }
        break;
      case "jasmim":
        setShowAI(true);
        break;
      case "importUrl":
        setShowMenuCompleto(false);
        setGithubInitialView("import");
        setShowGitHub(true);
        break;
      case "github":
        setShowMenuCompleto(false);
        setGithubInitialView(undefined);
        setShowGitHub(true);
        break;
      case "publishRepo":
        setShowMenuCompleto(false);
        setGithubInitialView("push-existing");
        setShowGitHub(true);
        break;
      case "vscodeWeb":
        setShowVSCodeWeb(true);
        break;
      case "libs":
        setShowLibSearch(true);
        break;
      case "saveCheckpoint":
        if (!activeProject) { Alert.alert("Aviso", "Abra um projeto primeiro."); return; }
        saveCheckpoint(activeProject.id, `Checkpoint ${new Date().toLocaleString("pt-BR")}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("✅ Checkpoint salvo!", "Ponto de restauração criado com sucesso.");
        break;
      case "checkpoints":
        setShowCheckpoints(true);
        break;
      case "memory":
        setShowMemory(true);
        break;
      case "plan":
        if (!activeProject) { Alert.alert("Aviso", "Abra um projeto primeiro."); return; }
        setShowPlan(true);
        break;
      case "preview":
        if (activeFile && (activeFile.language === "html" || activeFile.name.endsWith(".html"))) {
          setBottomTab("preview");
          if (panelH <= PANEL_MIN + 2) { panelHRef.current = PANEL_DEFAULT; setPanelH(PANEL_DEFAULT); }
        } else if (activeFile) {
          Alert.alert("Preview", "Funciona para arquivos .html e .svg.");
        } else {
          Alert.alert("Preview", "Selecione um arquivo HTML primeiro.");
        }
        break;
      case "terminal":
        setBottomTab(bottomTab === "terminal" ? "none" : "terminal");
        break;
      case "serverpreview":
        setShowPreview(true);
        break;
      case "playground":
        setShowPlayground(true);
        break;
      case "campolivre":
        setShowCampoLivre(true);
        break;
      case "status":
        setShowStatus(true);
        break;
      case "combinar":
        setShowCombinarApps(true);
        break;
      case "duplicate":
        if (!activeProject) {
          Alert.alert("Nenhum projeto aberto", "Abra um projeto antes de duplicar.");
          return;
        }
        Alert.alert(
          "Duplicar Projeto",
          `Criar uma cópia de "${activeProject.name}"?`,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Duplicar",
              onPress: () => {
                const copy = createProject(
                  `${activeProject.name} (cópia)`,
                  activeProject.description || ""
                );
                // usa path completo para preservar estrutura de pastas
                createFiles(copy.id, activeProject.files.map((f) => ({ path: f.path || f.name, content: f.content || "" })));
                setActiveProject(copy);
                Alert.alert("✅ Duplicado!", `"${copy.name}" foi criado com ${activeProject.files.length} arquivo(s) com estrutura completa.`);
              },
            },
          ]
        );
        break;
      case "projetos":
        router.navigate("/" as never);
        break;
      case "db":
        // Pre-fill with first saved config if exists
        if (dbConfigs.length > 0) {
          setDbUrl(dbConfigs[0].connectionString);
          setDbName(dbConfigs[0].name);
        }
        setDbTestResult(null);
        setDbSqlResult("");
        setShowDB(true);
        break;
      case "taski":
        router.navigate("/(tabs)/tasks" as never);
        break;
      case "apkBuilder":
        setShowAPKBuilder(true);
        break;
      case "manual":
        setShowManual(true);
        break;
      case "clear":
        if (!activeProject) return;
        Alert.alert(
          "⚠️ Limpar Projeto",
          `Apagar todos os ${activeProject.files.length} arquivo(s) de "${activeProject.name}"?\n\nEssa ação não pode ser desfeita.`,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Apagar tudo",
              style: "destructive",
              onPress: () => {
                activeProject.files.forEach((f) => deleteFile(activeProject.id, f.id));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("✅ Projeto limpo!", "Todos os arquivos foram removidos.");
              },
            },
          ]
        );
        break;
    }
  };

  // ── DB: Testar Conexão ──
  const handleTestDB = async () => {
    if (!dbUrl.trim()) return;
    setDbTesting(true);
    setDbTestResult(null);
    try {
      const apiBase = `http://localhost:8080/api`;
      const res = await fetch(`${apiBase}/db/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString: dbUrl.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setDbTestResult({ ok: true, msg: `✅ Conectado! ${data.version || "PostgreSQL OK"}` });
        // Salva config
        const cfg = { provider: "postgres" as const, connectionString: dbUrl.trim(), name: dbName.trim() || "Banco Principal" };
        addDBConfig(cfg);
      } else {
        setDbTestResult({ ok: false, msg: "❌ Falha na conexão. Verifique a URL." });
      }
    } catch {
      setDbTestResult({ ok: false, msg: "❌ Erro de rede. Verifique a URL e conexão." });
    } finally {
      setDbTesting(false);
    }
  };

  // ── DB: Executar SQL ──
  const handleRunSQL = async (sql?: string) => {
    const query = sql || dbSql;
    if (!dbUrl.trim() || !query.trim()) return;
    setDbRunning(true);
    setDbSqlResult("");
    try {
      const apiBase = `http://localhost:8080/api`;
      const res = await fetch(`${apiBase}/db/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString: dbUrl.trim(), query: query.trim() }),
      });
      const data = await res.json();
      if (data.rows) {
        setDbSqlResult(JSON.stringify(data.rows, null, 2));
      } else if (data.error) {
        setDbSqlResult("Erro: " + data.error);
      } else {
        setDbSqlResult(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      setDbSqlResult("Erro: " + String(e));
    } finally {
      setDbRunning(false);
    }
  };

  const handleRunFile = () => {
    if (!activeFile) return;
    const name = activeFile.name;
    const lang = (activeFile.language || "").toLowerCase();

    const openPanel = (tab: "terminal" | "preview") => {
      setBottomTab(tab);
      if (panelH <= PANEL_MIN + 2) {
        panelHRef.current = PANEL_DEFAULT;
        setPanelH(PANEL_DEFAULT);
      }
    };

    if (lang === "html" || name.endsWith(".html") || name.endsWith(".svg")) {
      setShowPlayground(true);
      return;
    }

    openPanel("terminal");

    let cmd = "";
    if (name.endsWith(".js") || lang === "javascript") {
      cmd = `node ${name}`;
    } else if (name.endsWith(".ts") || lang === "typescript") {
      cmd = `npx ts-node ${name}`;
    } else if (name.endsWith(".py") || lang === "python") {
      cmd = `python3 ${name}`;
    } else if (name.endsWith(".sh") || lang === "bash") {
      cmd = `bash ${name}`;
    } else if (name.endsWith(".go") || lang === "go") {
      cmd = `go run ${name}`;
    } else if (name.endsWith(".rb") || lang === "ruby") {
      cmd = `ruby ${name}`;
    } else if (name.endsWith(".php") || lang === "php") {
      cmd = `php ${name}`;
    } else if (name.endsWith(".java") || lang === "java") {
      cmd = `javac ${name} && java ${name.replace(".java", "")}`;
    } else if (name.endsWith(".rs") || lang === "rust") {
      cmd = `rustc ${name} && ./${name.replace(".rs", "")}`;
    } else {
      cmd = `cat ${name}`;
    }
    setTerminalCmd(cmd);
  };

  const isHtmlFile = activeFile && (activeFile.language === "html" || activeFile.name.endsWith(".html") || activeFile.name.endsWith(".svg"));
  const isRunnableFile = activeFile && (
    isHtmlFile ||
    /\.(js|ts|py|sh|go|rb|php|java|rs|mjs|cjs)$/.test(activeFile.name) ||
    ["javascript", "typescript", "python", "bash", "go", "ruby", "php", "java", "rust"].includes((activeFile.language || "").toLowerCase())
  );

  const tabBarBottom = Platform.OS === "web" ? 62 : Math.max(insets.bottom, 16) + 60;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: tabBarBottom }]}>

      {/* ── HEADER SK CODE EDITOR ── */}
      <View style={[styles.header, {
        paddingTop: topPadding + 2,
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
      }]}>
        {/* ☰ Toggle árvore de arquivos */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowSidebar(v => !v); }}
          style={[styles.hdrBtn, showSidebar && { backgroundColor: colors.primary + "22" }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="sidebar" size={19} color={showSidebar ? colors.primary : colors.foreground} />
        </TouchableOpacity>

        {/* 📁 Projetos — volta para lista */}
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.navigate("/(tabs)/" as never); }}
          style={styles.hdrBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="folder" size={19} color={colors.foreground} />
        </TouchableOpacity>

        {/* Arquivo ativo */}
        {activeFile ? (
          <Text style={[styles.fileName, { color: colors.foreground, marginLeft: 4, maxWidth: 140 }]} numberOfLines={1}>
            {activeFile.name}
          </Text>
        ) : (
          <Text style={[styles.fileName, { color: colors.mutedForeground, marginLeft: 4 }]} numberOfLines={1}>
            DevMobile
          </Text>
        )}

        <View style={{ flex: 1 }} />

        {/* ▶ Rodar / Preview — ícone compacto sem texto */}
        {isRunnableFile && (
          <TouchableOpacity
            onPress={handleRunFile}
            style={[styles.hdrIcon, { backgroundColor: isHtmlFile ? "#22c55e22" : "#f9731622" }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="play" size={15} color={isHtmlFile ? "#22c55e" : "#f97316"} />
          </TouchableOpacity>
        )}

        {/* 🖥️ Preview servidor */}
        <TouchableOpacity
          onPress={() => setShowPreview(true)}
          style={[styles.hdrIcon, { backgroundColor: "#007acc18" }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="monitor" size={16} color="#007acc" />
        </TouchableOpacity>

        {/* ··· Ações rápidas */}
        {activeProject && (
          <TouchableOpacity
            onPress={() => setShowQuickActions(true)}
            style={styles.hdrIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="more-horizontal" size={17} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        {/* 🤖 Jasmim AI */}
        <TouchableOpacity onPress={openAI} style={[styles.hdrIcon, showAI && { backgroundColor: "#7c3aed33" }]}>
          <Feather name="cpu" size={17} color={showAI ? "#7c3aed" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* ── ÁREA PRINCIPAL: Sidebar permanente + Editor ── */}
      <View style={{ flex: 1, flexDirection: "row", overflow: "hidden" }}>

        {/* ── SIDEBAR DE ARQUIVOS (árvore) — toggle com botão no header ── */}
        {showSidebar && (
          <View style={{
            width: SIDEBAR_W,
            borderRightWidth: 1,
            borderRightColor: colors.border,
            backgroundColor: colors.card,
          }}>
            <FileSidebar
              onAnalyzeWithAI={handleAnalyzeWithAI}
              onMemoryPress={handleMemoryPress}
              onMenuPress={openMenu}
              onJasminPress={() => { setShowAI(true); }}
            />
          </View>
        )}

        {/* ── COLUNA DIREITA: Editor + painel inferior ── */}
        <View style={{ flex: 1, overflow: "hidden" }}>

        {/* Editor */}
        <View style={{ flex: 1 }}>
          <CodeEditor />
        </View>

        {/* Painel inferior: Terminal / Preview — redimensionável */}
        {bottomTab !== "none" && (
          <View style={[styles.bottomPanel, { backgroundColor: colors.card, borderTopColor: colors.border, height: panelH }]}>

            {/* ── Alça de arrastar (topo do painel) ── */}
            <View style={[styles.resizeHandle, { borderBottomColor: colors.border }]}>
              {/* Barra de drag — só ela responde ao PanResponder */}
              <View {...resizePan.panHandlers} style={styles.resizeDragArea}>
                <View style={[styles.resizeBar, { backgroundColor: colors.mutedForeground + "55" }]} />
              </View>

              {/* Colapsado: clique para expandir */}
              {panelH <= PANEL_MIN + 2 ? (
                <TouchableOpacity
                  onPress={() => { const next = PANEL_DEFAULT; panelHRef.current = next; setPanelH(next); }}
                  style={styles.collapsedRow}
                >
                  <Feather name="terminal" size={12} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
                    {bottomTab === "terminal" ? "⬛ TERMINAL" : "🌐 PREVIEW"}
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>— toque ou arraste para cima</Text>
                  <View style={{ flex: 1 }} />
                  <Feather name="chevron-up" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              ) : (
                /* Expandido: tabs + controles */
                <View style={styles.panelTabsRow}>
                  <TouchableOpacity
                    onPress={() => setBottomTab("terminal")}
                    style={[styles.bottomTabBtn, bottomTab === "terminal" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: bottomTab === "terminal" ? colors.primary : colors.mutedForeground }}>⬛ Terminal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (isHtmlFile) {
                        setBottomTab("preview");
                      } else {
                        handleRunFile();
                      }
                    }}
                    style={[styles.bottomTabBtn, bottomTab === "preview" && { borderBottomColor: "#22c55e", borderBottomWidth: 2 }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: bottomTab === "preview" ? "#22c55e" : colors.mutedForeground }}>
                      {isHtmlFile ? "🌐 Preview" : "▶ Rodar"}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity onPress={() => { const n = PANEL_MIN; panelHRef.current = n; setPanelH(n); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 5 }}>
                    <Feather name="minus" size={13} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { const n = PANEL_MAX; panelHRef.current = n; setPanelH(n); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 5 }}>
                    <Feather name="maximize-2" size={12} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setBottomTab("none")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 5 }}>
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Conteúdo — só mostra se não colapsado */}
            {panelH > PANEL_MIN + 2 && (
              <View style={{ flex: 1 }}>
                {bottomTab === "terminal" && (
                  <Terminal
                    runCmd={terminalCmd}
                    onCmdRan={() => setTerminalCmd(null)}
                  />
                )}
                {bottomTab === "preview" && (
                  isHtmlFile && activeFile ? (
                    Platform.OS === "web" ? (
                      <iframe
                        srcDoc={activeFile.content}
                        style={{ flex: 1, border: "none", width: "100%", height: "100%" } as never}
                        sandbox="allow-scripts allow-same-origin allow-forms"
                        title="Preview"
                      />
                    ) : (
                      <WebView
                        source={{ html: activeFile.content }}
                        style={{ flex: 1, backgroundColor: "#fff" }}
                        originWhitelist={["*"]}
                        javaScriptEnabled
                        scrollEnabled
                        key={activeFile.id + activeFile.content.length}
                      />
                    )
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
                      <Feather name="monitor" size={32} color={colors.mutedForeground + "55"} />
                      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 8, textAlign: "center" }}>
                        Preview disponível para arquivos .html{"\n"}Para outros tipos, use o botão ▶ Rodar (abre no terminal)
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}
          </View>
        )}

        {/* Barra de status inferior (info do arquivo) */}
        <View style={[styles.statusBar, { backgroundColor: "#007acc", borderTopColor: "#005f9e" }]}>
          <TouchableOpacity
            onPress={() => setBottomTab(bottomTab === "terminal" ? "none" : "terminal")}
            style={styles.statusItem}
          >
            <Feather name="terminal" size={11} color="#ffffffcc" />
            <Text style={styles.statusText}>Terminal</Text>
          </TouchableOpacity>
          <View style={styles.statusDivider} />
          <Text style={styles.statusText}>
            {activeFile ? `${activeFile.language?.toUpperCase() || "TEXT"}` : "Nenhum arquivo"}
          </Text>
          {activeProject && (
            <>
              <View style={styles.statusDivider} />
              <Text style={styles.statusText}>{activeProject.files.length} arquivo{activeProject.files.length !== 1 ? "s" : ""}</Text>
            </>
          )}
          <View style={{ flex: 1 }} />
          <Text style={styles.statusText}>UTF-8</Text>
          <View style={styles.statusDivider} />
          <Text style={styles.statusText}>LF</Text>
        </View>{/* fim status bar */}
        </View>{/* fim coluna direita */}

        {/* ── MODAL JASMIN (tela cheia, não tampona editor) ── */}
        <Modal
          visible={showAI}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAI(false)}
        >
          <View style={{ flex: 1, backgroundColor: colors.card }}>
            <View style={[styles.aiPanelHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 10 }]}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center" }}>
                <Feather name="cpu" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>Jasmim</Text>
                <Text style={{ fontSize: 11, color: "#22c55e" }}>● Assistente IA</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAI(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ padding: 6, borderRadius: 8, backgroundColor: colors.secondary }}
              >
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <AIChat
              pendingMessage={pendingJasmimMsg}
              onPendingMessageConsumed={() => setPendingJasmimMsg("")}
            />
          </View>
        </Modal>

      </View>

      {/* ── MENU COMPLETO — Modal bottom sheet ── */}
      <Modal visible={showMenuCompleto} animationType="slide" transparent onRequestClose={() => setShowMenuCompleto(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "#00000060" }} activeOpacity={1} onPress={() => setShowMenuCompleto(false)} />
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: insets.bottom + 8, maxHeight: "80%" }}>
          {/* Handle */}
          <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 2 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          {/* Header */}
          <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
            <Feather name="zap" size={15} color="#f59e0b" />
            <Text style={[styles.menuHeaderTitle, { color: colors.foreground }]}>Menu Completo</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => setShowMenuCompleto(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          {/* Info do projeto */}
          {activeProject && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                <Text style={{ fontWeight: "700" }}>{activeProject.name}</Text>
                {"  "}·{"  "}{activeProject.files.length} arquivo{activeProject.files.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
          {/* Lista */}
          <ScrollView>
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => handleMenuAction(item.key)}
                style={[styles.menuItemRow, { borderBottomColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Feather name={item.icon as never} size={16} color={colors.mutedForeground} style={{ width: 24 }} />
                <Text style={[styles.menuItemLabel, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>{item.label}</Text>
                <Feather name="chevron-right" size={13} color={colors.mutedForeground + "55"} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── MODALS ── */}
      <LibrarySearch visible={showLibSearch} onClose={() => setShowLibSearch(false)} />
      <ProjectPlanModal visible={showPlan} onClose={() => setShowPlan(false)} />
      <AIMemoryModal visible={showMemory} onClose={() => setShowMemory(false)} />
      <CheckpointsModal visible={showCheckpoints} onClose={() => setShowCheckpoints(false)} />
      <CampoLivreModal visible={showCampoLivre} onClose={() => setShowCampoLivre(false)} />
      <GitHubModal visible={showGitHub} onClose={() => { setShowGitHub(false); setGithubInitialView(undefined); }} initialView={githubInitialView} />
      <APKBuilderModal visible={showAPKBuilder} onClose={() => setShowAPKBuilder(false)} />
      <VSCodeWebModal visible={showVSCodeWeb} onClose={() => setShowVSCodeWeb(false)} />

      {/* ── Modal: Ações Rápidas do Projeto ── */}
      <Modal visible={showQuickActions} animationType="slide" presentationStyle="pageSheet" transparent onRequestClose={() => setShowQuickActions(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "#00000055" }}
          activeOpacity={1}
          onPress={() => setShowQuickActions(false)}
        />
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          {activeProject && (
            <View style={{ paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 1 }}>PROJETO</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginTop: 2 }}>{activeProject.name}</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{activeProject.files.length} arquivo{activeProject.files.length !== 1 ? "s" : ""}</Text>
            </View>
          )}
          {[
            { icon: "🧠", label: "Memória do Projeto", desc: "Ver e editar memória JSON da Jasmim", action: () => { setShowQuickActions(false); handleMemoryPress(); } },
            { icon: "📋", label: "Taski — Lista de Tarefas", desc: "Gerenciar to-dos do projeto", action: () => { setShowQuickActions(false); router.navigate("/(tabs)/tasks" as never); } },
            { icon: "📸", label: "Salvar Checkpoint", desc: "Criar ponto de restauração agora", action: () => {
              setShowQuickActions(false);
              if (!activeProject) return;
              saveCheckpoint(activeProject.id, `Checkpoint ${new Date().toLocaleString("pt-BR")}`);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("✅ Checkpoint salvo!", "Ponto de restauração criado.");
            }},
            { icon: "🕐", label: "Histórico de Checkpoints", desc: "Ver e restaurar versões", action: () => { setShowQuickActions(false); setShowCheckpoints(true); } },
            { icon: "🤖", label: "Assistente Jasmim", desc: "Abrir painel de IA", action: () => { setShowQuickActions(false); setShowAI(true); } },
            { icon: "⬛", label: "Terminal", desc: "Abrir terminal bash", action: () => { setShowQuickActions(false); setBottomTab(bottomTab === "terminal" ? "none" : "terminal"); } },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.action}
              activeOpacity={0.75}
              style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 12 }}
            >
              <Text style={{ fontSize: 17 }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{item.label}</Text>
                <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{item.desc}</Text>
              </View>
              <Feather name="chevron-right" size={13} color={colors.mutedForeground + "66"} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setShowQuickActions(false)}
            style={{ alignItems: "center", paddingVertical: 16 }}
          >
            <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Playground HTML ── */}
      <HtmlPlayground
        visible={showPlayground}
        onClose={() => setShowPlayground(false)}
        initialContent={isHtmlFile && activeFile ? activeFile.content : undefined}
      />

      {/* Status do Sistema — tem Modal interno próprio */}
      <SystemStatus visible={showStatus} onClose={() => setShowStatus(false)} />

      {/* Preview Servidor ao vivo */}
      <PreviewPanel visible={showPreview} onClose={() => setShowPreview(false)} />

      {/* ── Modal: Banco de Dados ── */}
      <Modal visible={showDB} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[mStyles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[mStyles.sheetTitle, { color: colors.foreground }]}>🗄️ Banco de Dados</Text>
            <TouchableOpacity onPress={() => setShowDB(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <DatabasePanel />
        </View>
      </Modal>

      {/* ── Modal: Manual do DevMobile ── */}
      <ManualModal visible={showManual} onClose={() => setShowManual(false)} />
      <CombinarAppsModal
        visible={showCombinarApps}
        onClose={() => setShowCombinarApps(false)}
        onSendToJasmim={(prompt) => {
          setShowCombinarApps(false);
          setPendingJasmimMsg(prompt);
          setShowAI(true);
        }}
      />

      {/* ── Modal: Linguagem / Codificação ── */}
      <Modal visible={showLangTools} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[mStyles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[mStyles.sheetTitle, { color: colors.foreground }]}>🌐 Linguagem e Codificação</Text>
            <TouchableOpacity onPress={() => setShowLangTools(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
            {/* Linguagem */}
            <Text style={[mStyles.label, { color: colors.mutedForeground }]}>LINGUAGEM DO ARQUIVO</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert("Linguagem", `Mudança visual para "${lang}" aplicada no editor.`);
                    setShowLangTools(false);
                  }}
                  style={[
                    mStyles.langChip,
                    {
                      backgroundColor: activeFile?.language === lang ? colors.primary : colors.card,
                      borderColor: activeFile?.language === lang ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {activeFile?.language === lang && <Feather name="check" size={11} color={colors.primaryForeground} />}
                  <Text style={{ color: activeFile?.language === lang ? colors.primaryForeground : colors.foreground, fontSize: 13 }}>
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Codificação */}
            <Text style={[mStyles.label, { color: colors.mutedForeground }]}>CODIFICAÇÃO</Text>
            {ENCODINGS.map((enc) => (
              <TouchableOpacity
                key={enc}
                onPress={() => {
                  setSelectedEncoding(enc);
                  setShowLangTools(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  mStyles.encodingOption,
                  {
                    backgroundColor: selectedEncoding === enc ? colors.primary : colors.card,
                    borderColor: selectedEncoding === enc ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: selectedEncoding === enc ? colors.primaryForeground : colors.foreground, fontSize: 15 }}>
                  {enc}
                </Text>
                {selectedEncoding === enc && <Feather name="check" size={16} color={colors.primaryForeground} />}
              </TouchableOpacity>
            ))}

            {/* Formatar código */}
            <Text style={[mStyles.label, { color: colors.mutedForeground }]}>FERRAMENTAS</Text>
            {[
              {
                label: "Formatar JSON", icon: "align-left", action: () => {
                  if (!activeFile || activeFile.language !== "json") { Alert.alert("Info", "Disponível para arquivos JSON."); return; }
                  try {
                    const f = JSON.stringify(JSON.parse(activeFile.content), null, 2);
                    Alert.alert("Formatado!", "JSON formatado com sucesso.");
                  } catch { Alert.alert("Erro", "JSON inválido."); }
                  setShowLangTools(false);
                },
              },
              {
                label: "Estatísticas do arquivo", icon: "bar-chart-2", action: () => {
                  if (!activeFile) return;
                  const lines = activeFile.content.split("\n").length;
                  const words = activeFile.content.split(/\s+/).filter(Boolean).length;
                  const chars = activeFile.content.length;
                  Alert.alert("Estatísticas", `Linhas: ${lines}\nPalavras: ${words}\nCaracteres: ${chars}\nTamanho: ${(chars / 1024).toFixed(2)} KB\nCodificação: ${selectedEncoding}`);
                  setShowLangTools(false);
                },
              },
            ].map((tool) => (
              <TouchableOpacity
                key={tool.label}
                onPress={tool.action}
                style={[mStyles.toolRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Feather name={tool.icon as never} size={16} color={colors.primary} />
                <Text style={{ color: colors.foreground, fontSize: 14, flex: 1 }}>{tool.label}</Text>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header SK Code Editor style
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  hdrBtn: {
    width: 32, height: 32, borderRadius: 7,
    alignItems: "center", justifyContent: "center",
  },
  hdrIcon: {
    width: 30, height: 30, borderRadius: 7,
    alignItems: "center", justifyContent: "center",
  },
  hdrRunBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  hdrRunText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  breadcrumbPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  breadcrumbText: { fontSize: 12, fontWeight: "600", maxWidth: 80 },
  fileName: { fontSize: 12, fontWeight: "500", maxWidth: 100 },

  // Bottom panel
  bottomPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resizeHandle: {
    height: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resizeDragArea: {
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  resizeBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  collapsedRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 6,
    height: 32,
  },
  panelTabsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    height: 32,
  },
  bottomTabBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bottomTabBtn: {
    paddingHorizontal: 10,
    height: "100%",
    justifyContent: "center",
  },

  // Status bar (bottom)
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusText: { fontSize: 10, color: "#ffffffcc", letterSpacing: 0.2 },
  statusDivider: { width: StyleSheet.hairlineWidth, height: 12, backgroundColor: "#ffffff44", marginHorizontal: 2 },

  // Drawers
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 10,
  },
  fileDrawer: {
    position: "absolute",
    top: 0, left: 0, bottom: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  aiPanel: {
    position: "absolute",
    top: 0, right: 0, bottom: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  aiPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuCompleto: {
    position: "absolute",
    top: 0, left: 0, bottom: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    zIndex: 30,
    elevation: 30,
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuHeaderTitle: { fontSize: 16, fontWeight: "700" },
  menuItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  menuItemEmoji: { fontSize: 17, width: 24, textAlign: "center" },
  menuItemLabel: { fontSize: 15, fontWeight: "600" },
  menuItemDesc: { fontSize: 11, marginTop: 0 },
  menuProjectInfo: { padding: 14, marginBottom: 8 },
});

// Modal styles (for DB, Manual, Lang)
const mStyles = StyleSheet.create({
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    fontFamily: "monospace",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { fontSize: 15, fontWeight: "700" },
  dbSavedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dbTip: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
  dbResult: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  manualSection: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  langChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  encodingOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
});
