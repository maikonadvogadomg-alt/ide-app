/**
 * DatabasePanel — Gerenciador visual de banco de dados para DevMobile
 *
 * Aba LOCAL  → SQLite embutido no celular (expo-sqlite). Persiste no dispositivo.
 * Aba NEON   → PostgreSQL na nuvem. Executa queries via servidor (/api/db/execute).
 *
 * Sem servidor configurado: SQLite funciona 100% offline.
 * Com servidor: SQLite + Neon funcionam juntos.
 */

import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { fetch } from "expo/fetch";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useApiBase } from "@/hooks/useApiBase";
import { runSQL, listTables, switchDatabase, getCurrentDbName } from "@/services/localSQLite";
import type { DBConfig, Project, AIMemoryEntry } from "@/context/AppContext";

// ─── Schema DevMobile no Neon ─────────────────────────────────────────────────
const NEON_SCHEMA_STEPS = [
  `CREATE TABLE IF NOT EXISTS dm_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    language TEXT DEFAULT '',
    git_repo TEXT DEFAULT '',
    git_provider TEXT DEFAULT '',
    folder TEXT DEFAULT '',
    combined_with TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS dm_project_files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    content TEXT DEFAULT '',
    language TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_proj FOREIGN KEY(project_id) REFERENCES dm_projects(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS dm_ai_memory (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'geral',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS dm_chat_history (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS dm_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_dmfiles_proj ON dm_project_files(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_dmchat_proj ON dm_chat_history(project_id)`,
];

// ─── Sync de projetos para Neon ───────────────────────────────────────────────
async function pushProjectsToNeon(connStr: string, projects: Project[], memory: AIMemoryEntry[]): Promise<{ ok: number; errors: string[] }> {
  let ok = 0;
  const errors: string[] = [];

  for (const p of projects) {
    try {
      await runNeonHTTP(connStr, `
        INSERT INTO dm_projects (id, name, description, language, git_repo, git_provider, folder, combined_with, created_at, updated_at)
        VALUES (
          '${p.id.replace(/'/g, "''")}',
          '${(p.name || "").replace(/'/g, "''")}',
          '${(p.description || "").replace(/'/g, "''")}',
          '${(p.language || "").replace(/'/g, "''")}',
          '${(p.gitRepo || "").replace(/'/g, "''")}',
          '${(p.gitProvider || "").replace(/'/g, "''")}',
          '${(p.folder || "").replace(/'/g, "''")}',
          '${JSON.stringify(p.combinedWith || []).replace(/'/g, "''")}',
          '${p.createdAt}', '${p.updatedAt}'
        )
        ON CONFLICT (id) DO UPDATE SET
          name=EXCLUDED.name, description=EXCLUDED.description,
          language=EXCLUDED.language, git_repo=EXCLUDED.git_repo,
          folder=EXCLUDED.folder, updated_at=EXCLUDED.updated_at
      `);
      // Remove arquivos antigos e insere novos
      await runNeonHTTP(connStr, `DELETE FROM dm_project_files WHERE project_id='${p.id.replace(/'/g, "''")}'`);
      for (const f of p.files) {
        const safeContent = (f.content || "").replace(/'/g, "''");
        await runNeonHTTP(connStr, `
          INSERT INTO dm_project_files (id, project_id, name, path, content, language)
          VALUES (
            '${f.id.replace(/'/g, "''")}',
            '${p.id.replace(/'/g, "''")}',
            '${(f.name || "").replace(/'/g, "''")}',
            '${(f.path || f.name || "").replace(/'/g, "''")}',
            '${safeContent}',
            '${(f.language || "").replace(/'/g, "''")}'
          )
          ON CONFLICT (id) DO UPDATE SET
            name=EXCLUDED.name, path=EXCLUDED.path,
            content=EXCLUDED.content, language=EXCLUDED.language
        `);
      }
      ok++;
    } catch (e) {
      errors.push(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Sync memória da IA
  for (const m of memory) {
    try {
      await runNeonHTTP(connStr, `
        INSERT INTO dm_ai_memory (id, content, category, created_at)
        VALUES ('${m.id.replace(/'/g, "''")}', '${(m.content || "").replace(/'/g, "''")}', '${m.category}', '${m.createdAt}')
        ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content, category=EXCLUDED.category
      `);
    } catch {}
  }

  return { ok, errors };
}

// ─── Neon HTTP direto (sem servidor) ──────────────────────────────────────────
function parseNeonHost(connStr: string): string | null {
  try {
    const m = connStr.match(/@([^/:@]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function runNeonHTTP(connStr: string, sql: string): Promise<{
  rows: Record<string, unknown>[];
  rowCount: number;
  command: string;
}> {
  const host = parseNeonHost(connStr);
  if (!host) throw new Error("Connection string inválida — formato esperado: postgresql://user:pass@host/db");

  const resp = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connStr,
    },
    body: JSON.stringify({ query: sql, params: [] }),
  });

  if (!resp.ok) {
    let errMsg = `HTTP ${resp.status}`;
    try {
      const j = await resp.json() as { message?: string; error?: string };
      errMsg = j.message || j.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await resp.json() as {
    rows?: Record<string, unknown>[];
    rowCount?: number;
    command?: string;
  };
  return {
    rows: data.rows || [],
    rowCount: data.rowCount ?? (data.rows?.length ?? 0),
    command: data.command || "SELECT",
  };
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
type DbTab = "local" | "neon";

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  isSelect: boolean;
  message?: string;
  error?: string;
  latencyMs?: number;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DatabasePanel() {
  const colors = useColors();
  const { dbConfigs, addDBConfig, removeDBConfig, activeProject, projects, aiMemory } = useApp();

  const apiBase = useApiBase();

  const [activeTab, setActiveTab] = useState<DbTab>("local");

  // ── Estado LOCAL SQLite ──────────────────────────────────────────────────────
  const [localTables, setLocalTables] = useState<string[]>([]);
  const [localQuery, setLocalQuery] = useState("");
  const [localResult, setLocalResult] = useState<QueryResult | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localDbName, setLocalDbName] = useState(getCurrentDbName());
  const [showDbSwitcher, setShowDbSwitcher] = useState(false);
  const [newDbName, setNewDbName] = useState("");

  // ── Estado NEON ──────────────────────────────────────────────────────────────
  const [neonConnStr, setNeonConnStr] = useState("");
  const [neonQuery, setNeonQuery] = useState("");
  const [neonResult, setNeonResult] = useState<QueryResult | null>(null);
  const [neonLoading, setNeonLoading] = useState(false);
  const [neonConnected, setNeonConnected] = useState(false);
  const [neonConnName, setNeonConnName] = useState("");
  const [neonTables, setNeonTables] = useState<string[]>([]);
  const [neonTestResult, setNeonTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showAddNeon, setShowAddNeon] = useState(false);
  const [selectedNeonConfig, setSelectedNeonConfig] = useState<DBConfig | null>(null);

  // ── Estado SCHEMA / SYNC ─────────────────────────────────────────────────────
  const [schemaStatus, setSchemaStatus] = useState<string | null>(null);
  const [schemaBusy, setSchemaBusy] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);

  // ── Estado IA (Jasmin analisa o banco) ───────────────────────────────────────
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);

  const askJasmin = useCallback(async (extraPrompt?: string) => {
    setAiLoading(true);
    setAiReply(null);
    setShowAiPanel(true);
    try {
      const tabelasStr = localTables.length > 0
        ? `Tabelas existentes no banco: ${localTables.join(", ")}.`
        : "O banco ainda não tem tabelas criadas.";
      const queryStr = localQuery.trim() ? `Query atual digitada: ${localQuery}` : "";
      const resultStr = localResult && !localResult.error && localResult.rows.length > 0
        ? `Resultado da última query (${localResult.rowCount} linhas, colunas: ${localResult.columns.join(", ")}): ${JSON.stringify(localResult.rows.slice(0, 5))} ${localResult.rowCount > 5 ? `... e mais ${localResult.rowCount - 5} linhas` : ""}`
        : localResult?.error
          ? `Erro na última query: ${localResult.error}`
          : "";
      const userQ = (extraPrompt || aiPrompt).trim() || "Analise meu banco de dados, explique o que tenho e sugira como melhorar ou usar os dados.";

      const mensagem = `Você é Jasmin, assistente de banco de dados SQLite para advogados e desenvolvedores. Responda sempre em português brasileiro, de forma clara e prática.

Banco de dados local SQLite do usuário:
- Nome: ${localDbName}
- ${tabelasStr}
${queryStr ? "- " + queryStr : ""}
${resultStr ? "- " + resultStr : ""}

Pergunta/pedido do usuário: ${userQ}

Responda de forma direta. Se sugerir SQL, use blocos de código marcados com \`\`\`sql.`;

      const base = apiBase || "http://localhost:8080";
      const resp = await fetch(`${base}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: mensagem }),
      });
      if (!resp.ok) throw new Error(`Erro ${resp.status}`);
      const data = await resp.json() as { content?: string; error?: string };
      setAiReply(data.content || data.error || "Sem resposta");
    } catch (e: unknown) {
      setAiReply(`❌ Erro ao contatar a IA: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAiLoading(false);
    }
  }, [localTables, localQuery, localResult, localDbName, aiPrompt, apiBase]);

  // ── Template de queries rápidas ──────────────────────────────────────────────
  const QUICK_LOCAL = [
    { label: "Listar tabelas", sql: "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name" },
    { label: "Criar tabela exemplo", sql: "CREATE TABLE IF NOT EXISTS tarefas (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  titulo TEXT NOT NULL,\n  feito INTEGER DEFAULT 0,\n  criado_em TEXT DEFAULT (datetime('now','localtime'))\n)" },
    { label: "Inserir exemplo", sql: "INSERT INTO tarefas (titulo) VALUES ('Minha primeira tarefa')" },
    { label: "Selecionar tudo", sql: "SELECT * FROM tarefas ORDER BY id DESC LIMIT 100" },
    { label: "Info do banco", sql: "PRAGMA database_list" },
    { label: "Tamanho das tabelas", sql: "SELECT name, (SELECT COUNT(*) FROM sqlite_master m2 WHERE m2.name=m1.name) as linhas FROM sqlite_master m1 WHERE type='table' AND name NOT LIKE 'sqlite_%'" },
  ];

  const QUICK_NEON = [
    { label: "Listar tabelas", sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name" },
    { label: "Versão PostgreSQL", sql: "SELECT version()" },
    { label: "Criar tabela exemplo", sql: "CREATE TABLE IF NOT EXISTS tarefas (\n  id SERIAL PRIMARY KEY,\n  titulo TEXT NOT NULL,\n  feito BOOLEAN DEFAULT FALSE,\n  criado_em TIMESTAMPTZ DEFAULT NOW()\n)" },
    { label: "Inserir exemplo", sql: "INSERT INTO tarefas (titulo) VALUES ('Primeira tarefa') RETURNING *" },
    { label: "Selecionar tudo", sql: "SELECT * FROM tarefas ORDER BY id DESC LIMIT 100" },
    { label: "Tamanho das tabelas", sql: "SELECT relname AS tabela, pg_size_pretty(pg_total_relation_size(relid)) AS tamanho FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC" },
  ];

  // ── Load tabelas locais ──────────────────────────────────────────────────────
  const loadLocalTables = useCallback(async () => {
    try {
      const tables = await listTables();
      setLocalTables(tables);
    } catch {}
  }, []);

  useEffect(() => {
    loadLocalTables();
    setLocalDbName(getCurrentDbName());
  }, [loadLocalTables]);

  // ── Executar query local ─────────────────────────────────────────────────────
  const runLocalQuery = async (sql?: string) => {
    const q = (sql ?? localQuery).trim();
    if (!q) return;
    setLocalLoading(true);
    setLocalResult(null);
    const t0 = Date.now();
    try {
      const raw = await runSQL(q);
      const cols = raw.isSelect && raw.rows.length > 0 ? Object.keys(raw.rows[0]) : [];
      setLocalResult({
        columns: cols,
        rows: raw.rows,
        rowCount: raw.isSelect ? raw.rows.length : (raw.changes ?? 0),
        isSelect: raw.isSelect,
        message: raw.isSelect ? undefined : `✅ ${raw.changes ?? 0} linha(s) afetada(s)${raw.lastInsertRowId ? ` · ID=${raw.lastInsertRowId}` : ""}`,
        latencyMs: Date.now() - t0,
      });
      await loadLocalTables();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setLocalResult({ columns: [], rows: [], rowCount: 0, isSelect: false, error: msg, latencyMs: Date.now() - t0 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLocalLoading(false);
    }
  };

  // ── Trocar banco de dados local ──────────────────────────────────────────────
  const handleSwitchDb = async (name: string) => {
    try {
      await switchDatabase(name);
      setLocalDbName(getCurrentDbName());
      setLocalTables([]);
      setLocalResult(null);
      await loadLocalTables();
      setShowDbSwitcher(false);
      setNewDbName("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      Alert.alert("Erro", e instanceof Error ? e.message : "Erro ao trocar banco");
    }
  };

  // ── Executar query Neon (direto via HTTP — sem servidor) ─────────────────────
  const runNeonQuery = async (sql?: string) => {
    const q = (sql ?? neonQuery).trim();
    const conn = selectedNeonConfig?.connectionString ?? neonConnStr;
    if (!q || !conn) return;

    setNeonLoading(true);
    setNeonResult(null);
    const t0 = Date.now();
    try {
      const data = await runNeonHTTP(conn, q);
      const rows = data.rows;
      const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
      const isSelect = /^\s*(SELECT|WITH|SHOW|EXPLAIN)/i.test(q);
      setNeonResult({
        columns: cols,
        rows,
        rowCount: data.rowCount,
        isSelect,
        message: isSelect ? undefined : `✅ ${data.rowCount} linha(s) afetada(s)`,
        latencyMs: Date.now() - t0,
      });
      if (isSelect && /information_schema\.tables/i.test(q)) {
        setNeonTables(rows.map(r => String(r.table_name || r.TABLE_NAME || "")));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setNeonResult({ columns: [], rows: [], rowCount: 0, isSelect: false, error: msg, latencyMs: Date.now() - t0 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setNeonLoading(false);
    }
  };

  // ── Testar conexão Neon (direto via HTTP — sem servidor) ─────────────────────
  const testNeonConnection = async () => {
    const conn = neonConnStr.trim();
    if (!conn) return;
    const t0 = Date.now();
    try {
      const data = await runNeonHTTP(conn, "SELECT 1 AS ok");
      const ok = data.rows.length > 0;
      setNeonTestResult({
        ok,
        message: ok ? `✅ Conectado! (${Date.now() - t0}ms)` : "Sem resposta",
      });
      if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      setNeonTestResult({ ok: false, message: e instanceof Error ? e.message : "Erro de conexão" });
    }
  };

  // ── Criar schema DevMobile no Neon ──────────────────────────────────────────
  const setupNeonSchema = async () => {
    const conn = selectedNeonConfig?.connectionString ?? neonConnStr;
    if (!conn) return;
    setSchemaBusy(true);
    setSchemaStatus(null);
    try {
      for (let i = 0; i < NEON_SCHEMA_STEPS.length; i++) {
        setSchemaStatus(`Criando estrutura ${i + 1}/${NEON_SCHEMA_STEPS.length}…`);
        await runNeonHTTP(conn, NEON_SCHEMA_STEPS[i]);
      }
      setSchemaStatus("✅ Schema DevMobile criado! Tabelas: dm_projects, dm_project_files, dm_ai_memory, dm_chat_history, dm_settings");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Atualiza lista de tabelas
      const r = await runNeonHTTP(conn, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
      setNeonTables(r.rows.map(row => String(row.table_name || "")));
    } catch (e: unknown) {
      setSchemaStatus(`❌ ${e instanceof Error ? e.message : "Erro ao criar schema"}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSchemaBusy(false);
    }
  };

  // ── Sincronizar projetos para o Neon ─────────────────────────────────────────
  const syncToNeon = async () => {
    const conn = selectedNeonConfig?.connectionString ?? neonConnStr;
    if (!conn) return;
    setSyncBusy(true);
    setSyncStatus(null);
    try {
      setSyncStatus(`Sincronizando ${projects.length} projeto(s)…`);
      const result = await pushProjectsToNeon(conn, projects, aiMemory);
      if (result.errors.length > 0) {
        setSyncStatus(`⚠️ ${result.ok} projeto(s) enviado(s), ${result.errors.length} com erro.\n${result.errors.slice(0, 3).join("\n")}`);
      } else {
        setSyncStatus(`✅ ${result.ok} projeto(s) sincronizado(s) com sucesso!`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: unknown) {
      setSyncStatus(`❌ ${e instanceof Error ? e.message : "Erro de sync"}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSyncBusy(false);
    }
  };

  // ── Salvar conexão Neon ──────────────────────────────────────────────────────
  const saveNeonConfig = () => {
    const conn = neonConnStr.trim();
    const name = neonConnName.trim() || "Neon DB";
    if (!conn) return;
    addDBConfig({ provider: "neon", connectionString: conn, name });
    setNeonConnStr("");
    setNeonConnName("");
    setNeonTestResult(null);
    setShowAddNeon(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Renderiza resultado como tabela ──────────────────────────────────────────
  const ResultTable = ({ result }: { result: QueryResult }) => {
    if (result.error) {
      return (
        <View style={[styles.errorBox, { backgroundColor: "#2d0000", borderColor: "#ef444433" }]}>
          <Feather name="alert-circle" size={14} color="#f87171" />
          <Text style={{ color: "#f87171", fontSize: 12, flex: 1, lineHeight: 18 }}>{result.error}</Text>
        </View>
      );
    }
    if (!result.isSelect || result.rows.length === 0) {
      return (
        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="check-circle" size={14} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 13 }}>
              {result.message || "Executado com sucesso"}
            </Text>
            {result.latencyMs != null && (
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>
                {result.latencyMs}ms
              </Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
            {result.rowCount} linha{result.rowCount !== 1 ? "s" : ""} · {result.columns.length} col{result.columns.length !== 1 ? "unas" : "una"}
            {result.latencyMs != null ? ` · ${result.latencyMs}ms` : ""}
          </Text>
          <TouchableOpacity onPress={() => {
            const text = [result.columns.join(" | "), ...result.rows.map(r => result.columns.map(c => String(r[c] ?? "NULL")).join(" | "))].join("\n");
            Clipboard.setStringAsync(text);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}>
            <Text style={{ color: colors.primary, fontSize: 11 }}>Copiar CSV</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator style={{ flex: 1 }}>
          <View>
            {/* Header */}
            <View style={[styles.tableRow, { backgroundColor: colors.secondary }]}>
              {result.columns.map(col => (
                <Text key={col} style={[styles.tableCell, styles.tableHeader, { color: colors.accent }]}>{col}</Text>
              ))}
            </View>
            {/* Rows */}
            {result.rows.slice(0, 2000).map((row, i) => (
              <View key={i} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? colors.card : colors.background }]}>
                {result.columns.map(col => (
                  <Text key={col} style={[styles.tableCell, { color: colors.foreground }]} numberOfLines={3}>
                    {row[col] == null ? <Text style={{ color: colors.mutedForeground, fontStyle: "italic" }}>NULL</Text> : String(row[col])}
                  </Text>
                ))}
              </View>
            ))}
            {result.rows.length > 2000 && (
              <Text style={{ color: colors.mutedForeground, fontSize: 11, padding: 8, textAlign: "center" }}>
                ... {result.rows.length - 2000} linhas adicionais — use LIMIT para paginar
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // ── ABA LOCAL ─────────────────────────────────────────────────────────────────
  const LocalTab = () => (
    <View style={{ flex: 1 }}>
      {/* Aviso: SQLite não disponível no preview web */}
      {Platform.OS === "web" && (
        <View style={{ margin: 12, padding: 14, backgroundColor: "#1c1400", borderRadius: 10, borderWidth: 1, borderColor: "#f59e0b44", flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <Text style={{ fontSize: 20 }}>📱</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fcd34d", fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
              SQLite funciona no celular
            </Text>
            <Text style={{ color: "#d4a21a", fontSize: 12, lineHeight: 18 }}>
              Esta prévia roda no navegador — o banco de dados local só está disponível no app instalado no celular (Expo Go ou APK).{"\n\n"}
              No celular, você poderá criar tabelas, inserir e consultar dados normalmente.
            </Text>
          </View>
        </View>
      )}

      {/* Header do banco */}
      <View style={[styles.dbHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="database" size={13} color={colors.accent} />
        <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13, flex: 1 }}>
          {localDbName}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
          {localTables.length} tabela{localTables.length !== 1 ? "s" : ""}
        </Text>
        <TouchableOpacity onPress={() => setShowDbSwitcher(v => !v)} style={styles.iconBtn}>
          <Feather name="layers" size={14} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={loadLocalTables} style={styles.iconBtn}>
          <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Switcher de banco */}
      {showDbSwitcher && (
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13, marginBottom: 8 }}>
            Trocar banco de dados local
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }}>
            Os dados ficam no dispositivo. Cada banco é um arquivo .db separado.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}
              value={newDbName}
              onChangeText={setNewDbName}
              placeholder="Nome do banco (ex: meu_app)"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => newDbName.trim() && handleSwitchDb(newDbName.trim())}
              disabled={!newDbName.trim()}
              style={[styles.btn, { backgroundColor: newDbName.trim() ? colors.primary : colors.muted }]}
            >
              <Text style={{ color: colors.primaryForeground, fontWeight: "700", fontSize: 13 }}>Criar/Abrir</Text>
            </TouchableOpacity>
          </View>
          {/* Bancos salvos nos projetos */}
          {activeProject && (
            <TouchableOpacity
              onPress={() => handleSwitchDb(activeProject.name.toLowerCase().replace(/\s+/g, "_"))}
              style={[styles.dbChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Feather name="folder" size={12} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 12 }}>
                Banco do projeto: {activeProject.name.toLowerCase().replace(/\s+/g, "_")}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => handleSwitchDb("devmobile_local")}
            style={[styles.dbChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Feather name="hard-drive" size={12} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 12 }}>devmobile_local (padrão)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabelas existentes */}
      {localTables.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
            {localTables.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => { setLocalQuery(`SELECT * FROM ${t} LIMIT 100`); }}
                style={[styles.tableChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <Feather name="table" size={11} color={colors.accent} />
                <Text style={{ color: colors.foreground, fontSize: 12 }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Editor de query */}
      <View style={[styles.queryEditor, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <TextInput
          style={[styles.queryInput, { color: colors.foreground, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}
          value={localQuery}
          onChangeText={setLocalQuery}
          placeholder={"SELECT * FROM tarefas\n-- Use sql> no Terminal ou escreva aqui"}
          placeholderTextColor={colors.mutedForeground}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 8, gap: 8 }}>
          <TouchableOpacity
            onPress={() => { setLocalQuery(""); setLocalResult(null); }}
            style={[styles.btnSmall, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Feather name="trash-2" size={13} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              const t = await Clipboard.getStringAsync();
              if (t) setLocalQuery(t);
            }}
            style={[styles.btnSmall, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          >
            <Feather name="clipboard" size={13} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => runLocalQuery()}
            disabled={localLoading || !localQuery.trim()}
            style={[styles.runBtn, { backgroundColor: localQuery.trim() ? colors.accent : colors.muted, flex: 1 }]}
          >
            {localLoading
              ? <ActivityIndicator size={14} color="#fff" />
              : <><Feather name="play" size={13} color="#fff" /><Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Executar SQL</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Queries rápidas */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
          {QUICK_LOCAL.map(q => (
            <TouchableOpacity
              key={q.label}
              onPress={() => { setLocalQuery(q.sql); runLocalQuery(q.sql); }}
              style={[styles.tableChip, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}
            >
              <Text style={{ color: colors.primary, fontSize: 11 }}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Resultado */}
      {localResult && (
        <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.border }}>
          <ResultTable result={localResult} />
        </View>
      )}

      {!localResult && localTables.length === 0 && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
          <Feather name="database" size={40} color={colors.border} />
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 16, textAlign: "center" }}>
            Banco local vazio
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
            Os dados ficam <Text style={{ color: colors.accent, fontWeight: "700" }}>salvos no seu celular</Text> — mesmo sem internet.{"\n\n"}
            Toque em <Text style={{ fontWeight: "700", color: colors.primary }}>"Criar tabela exemplo"</Text> acima para começar.
          </Text>
        </View>
      )}

      {/* ── Painel Jasmin IA ─────────────────────────────────────────────────── */}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        {/* Barra de abertura */}
        <TouchableOpacity
          onPress={() => setShowAiPanel(v => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: colors.card }}
        >
          <Text style={{ fontSize: 16 }}>🤖</Text>
          <Text style={{ flex: 1, color: colors.primary, fontWeight: "700", fontSize: 13 }}>
            Perguntar à Jasmin sobre o banco
          </Text>
          <Feather name={showAiPanel ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
        </TouchableOpacity>

        {showAiPanel && (
          <View style={{ backgroundColor: colors.background, padding: 10, gap: 8 }}>
            {/* Campo de pergunta */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={{
                  flex: 1, padding: 9, fontSize: 13,
                  backgroundColor: colors.card, color: colors.foreground,
                  borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                  fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                }}
                value={aiPrompt}
                onChangeText={setAiPrompt}
                placeholder="Ex: Crie uma tabela de clientes para escritório de advocacia..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => askJasmin()}
                disabled={aiLoading}
                style={{
                  backgroundColor: aiLoading ? colors.muted : "#7c3aed",
                  borderRadius: 8, paddingHorizontal: 14,
                  alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                {aiLoading
                  ? <ActivityIndicator size={14} color="#fff" />
                  : <><Feather name="send" size={13} color="#fff" /><Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Enviar</Text></>
                }
              </TouchableOpacity>
            </View>

            {/* Atalhos rápidos */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {[
                  "Analise meu banco e sugira melhorias",
                  "Crie tabelas para escritório de advocacia",
                  "Corrija o erro na minha query",
                  "Explique os dados que tenho",
                  "Escreva uma query para listar tudo",
                ].map(q => (
                  <TouchableOpacity
                    key={q}
                    onPress={() => askJasmin(q)}
                    disabled={aiLoading}
                    style={{ backgroundColor: "#7c3aed22", borderWidth: 1, borderColor: "#7c3aed44", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}
                  >
                    <Text style={{ color: "#a78bfa", fontSize: 11 }}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Resposta da IA */}
            {aiLoading && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10 }}>
                <ActivityIndicator size={14} color="#7c3aed" />
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Jasmin analisando o banco...</Text>
              </View>
            )}
            {aiReply && !aiLoading && (
              <View style={{ backgroundColor: "#1a0d2e", borderRadius: 8, borderWidth: 1, borderColor: "#7c3aed33" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 13 }}>🤖</Text>
                  <Text style={{ color: "#a78bfa", fontWeight: "700", fontSize: 12, flex: 1 }}>Jasmin</Text>
                  <TouchableOpacity
                    onPress={async () => { await Clipboard.setStringAsync(aiReply); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="copy" size={12} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setAiReply(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 6 }}
                  >
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 160 }} contentContainerStyle={{ padding: 10, paddingTop: 0 }}>
                  <Text style={{ color: "#e2d9f3", fontSize: 12, lineHeight: 18 }}>{aiReply}</Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );

  // ── ABA NEON ──────────────────────────────────────────────────────────────────
  const NeonTab = () => {
    const neonConfigs = dbConfigs.filter(d => d.provider === "neon" || d.provider === "postgres");

    return (
      <View style={{ flex: 1 }}>
        {/* Banner info */}
        <View style={[styles.warnBox, { backgroundColor: "#0d2d0d", borderColor: "#22c55e33" }]}>
          <Feather name="cloud" size={13} color="#22c55e" />
          <Text style={{ color: "#86efac", fontSize: 12, flex: 1, lineHeight: 18 }}>
            <Text style={{ fontWeight: "700", color: "#4ade80" }}>Neon funciona sem servidor.</Text>
            {" "}Cole a connection string e execute SQL diretamente no banco PostgreSQL na nuvem.
          </Text>
        </View>

        {/* Ações rápidas: Schema + Sync */}
        {(selectedNeonConfig || neonConnStr.trim()) && (
          <View style={{ padding: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700" }}>AÇÕES RÁPIDAS</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={setupNeonSchema}
                disabled={schemaBusy}
                style={[styles.btn, { flex: 1, backgroundColor: schemaBusy ? colors.muted : "#7c3aed" }]}
              >
                {schemaBusy
                  ? <ActivityIndicator size={13} color="#fff" />
                  : <><Feather name="database" size={13} color="#fff" /><Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Criar Schema</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity
                onPress={syncToNeon}
                disabled={syncBusy}
                style={[styles.btn, { flex: 1, backgroundColor: syncBusy ? colors.muted : "#0891b2" }]}
              >
                {syncBusy
                  ? <ActivityIndicator size={13} color="#fff" />
                  : <><Feather name="upload-cloud" size={13} color="#fff" /><Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Sync Projetos ({projects.length})</Text></>
                }
              </TouchableOpacity>
            </View>
            {schemaStatus && (
              <View style={[styles.infoBox, {
                backgroundColor: schemaStatus.startsWith("❌") ? "#2d0000" : schemaStatus.startsWith("✅") ? "#0d2d0d" : "#0a1628",
                borderColor: schemaStatus.startsWith("❌") ? "#ef444433" : schemaStatus.startsWith("✅") ? "#22c55e33" : "#3b82f644",
              }]}>
                <Text style={{ color: schemaStatus.startsWith("❌") ? "#f87171" : schemaStatus.startsWith("✅") ? "#4ade80" : "#60a5fa", fontSize: 12, flex: 1, lineHeight: 18 }}>
                  {schemaStatus}
                </Text>
              </View>
            )}
            {syncStatus && (
              <View style={[styles.infoBox, {
                backgroundColor: syncStatus.startsWith("❌") ? "#2d0000" : syncStatus.startsWith("✅") ? "#0d2d0d" : "#0a1628",
                borderColor: syncStatus.startsWith("❌") ? "#ef444433" : syncStatus.startsWith("✅") ? "#22c55e33" : "#3b82f644",
              }]}>
                <Text style={{ color: syncStatus.startsWith("❌") ? "#f87171" : syncStatus.startsWith("✅") ? "#4ade80" : "#60a5fa", fontSize: 12, flex: 1, lineHeight: 18 }}>
                  {syncStatus}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Conexões salvas */}
        {neonConfigs.length > 0 && (
          <View style={[{ borderBottomWidth: 1, borderBottomColor: colors.border, padding: 10, gap: 6 }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontWeight: "700", marginBottom: 2 }}>
              CONEXÕES SALVAS
            </Text>
            {neonConfigs.map(cfg => (
              <TouchableOpacity
                key={cfg.name}
                onPress={() => {
                  setSelectedNeonConfig(cfg);
                  setNeonQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
                  runNeonQuery("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
                }}
                style={[
                  styles.connCard,
                  {
                    backgroundColor: selectedNeonConfig?.name === cfg.name ? colors.primary + "18" : colors.card,
                    borderColor: selectedNeonConfig?.name === cfg.name ? colors.primary : colors.border,
                  }
                ]}
              >
                <Feather name="cloud" size={13} color={selectedNeonConfig?.name === cfg.name ? colors.primary : colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>{cfg.name}</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 10 }} numberOfLines={1}>
                    {cfg.connectionString.replace(/:[^:@]+@/, ":***@")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert("Remover conexão", `Remover "${cfg.name}"?`, [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Remover", style: "destructive", onPress: () => { removeDBConfig(cfg.name); if (selectedNeonConfig?.name === cfg.name) setSelectedNeonConfig(null); } },
                    ]);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="trash-2" size={13} color={colors.mutedForeground} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Adicionar nova conexão */}
        {(showAddNeon || neonConfigs.length === 0) && (
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border, margin: 10 }]}>
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14, marginBottom: 4 }}>
              Conectar ao Neon PostgreSQL
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
              Cole a connection string do Neon.{"\n"}
              Obtenha gratuitamente em{" "}
              <Text style={{ color: colors.primary }}>neon.tech → Connection Details</Text>
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 4 }}>Nome da conexão</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, marginBottom: 10 }]}
              value={neonConnName}
              onChangeText={setNeonConnName}
              placeholder="Meu banco Neon"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 4 }}>Connection String</Text>
            <TextInput
              style={[styles.input, styles.connInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, marginBottom: 10, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}
              value={neonConnStr}
              onChangeText={(t) => { setNeonConnStr(t); setNeonTestResult(null); }}
              placeholder="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            {neonTestResult && (
              <View style={[styles.infoBox, {
                backgroundColor: neonTestResult.ok ? "#0d2d0d" : "#2d0000",
                borderColor: neonTestResult.ok ? "#22c55e33" : "#ef444433",
                marginBottom: 10,
              }]}>
                <Feather name={neonTestResult.ok ? "check-circle" : "x-circle"} size={14} color={neonTestResult.ok ? "#22c55e" : "#f87171"} />
                <Text style={{ color: neonTestResult.ok ? "#22c55e" : "#f87171", fontSize: 12, flex: 1 }}>
                  {neonTestResult.message}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={testNeonConnection}
                disabled={!neonConnStr.trim()}
                style={[styles.btn, { backgroundColor: neonConnStr.trim() ? "#1d4ed8" : colors.muted }]}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Testar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveNeonConfig}
                disabled={!neonConnStr.trim()}
                style={[styles.btn, { backgroundColor: neonConnStr.trim() ? colors.primary : colors.muted, flex: 1 }]}
              >
                <Feather name="save" size={13} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Salvar e usar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Botão adicionar nova conexão */}
        {neonConfigs.length > 0 && !showAddNeon && (
          <TouchableOpacity
            onPress={() => setShowAddNeon(true)}
            style={[styles.addConnBtn, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}
          >
            <Feather name="plus-circle" size={14} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Adicionar nova conexão Neon</Text>
          </TouchableOpacity>
        )}

        {/* Tabelas da conexão selecionada */}
        {neonTables.length > 0 && selectedNeonConfig && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
              {neonTables.map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => { setNeonQuery(`SELECT * FROM ${t} LIMIT 100`); }}
                  style={[styles.tableChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                >
                  <Feather name="table" size={11} color="#60a5fa" />
                  <Text style={{ color: colors.foreground, fontSize: 12 }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Editor de query Neon */}
        {(selectedNeonConfig || neonConnStr) && (
          <>
            <View style={[styles.queryEditor, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                style={[styles.queryInput, { color: colors.foreground, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]}
                value={neonQuery}
                onChangeText={setNeonQuery}
                placeholder={"SELECT * FROM tarefas LIMIT 100\n-- PostgreSQL / Neon"}
                placeholderTextColor={colors.mutedForeground}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 8, gap: 8 }}>
                <TouchableOpacity
                  onPress={() => { setNeonQuery(""); setNeonResult(null); }}
                  style={[styles.btnSmall, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                >
                  <Feather name="trash-2" size={13} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => runNeonQuery()}
                  disabled={neonLoading || !neonQuery.trim()}
                  style={[styles.runBtn, { backgroundColor: neonQuery.trim() ? "#1d4ed8" : colors.muted, flex: 1 }]}
                >
                  {neonLoading
                    ? <ActivityIndicator size={14} color="#fff" />
                    : <><Feather name="play" size={13} color="#fff" /><Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Executar SQL</Text></>
                  }
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
              <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
                {QUICK_NEON.map(q => (
                  <TouchableOpacity
                    key={q.label}
                    onPress={() => { setNeonQuery(q.sql); runNeonQuery(q.sql); }}
                    style={[styles.tableChip, { backgroundColor: colors.card, borderColor: "#3b82f644" }]}
                  >
                    <Text style={{ color: "#60a5fa", fontSize: 11 }}>{q.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {neonResult && (
              <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.border }}>
                <ResultTable result={neonResult} />
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  // ── Render principal ──────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Tabs LOCAL / NEON */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([
          { key: "local" as DbTab, label: "💾 SQLite Local", desc: "Funciona offline · salvo no celular" },
          { key: "neon"  as DbTab, label: "🐘 Neon / Postgres", desc: "Nuvem gratuita · sem servidor" },
        ] as { key: DbTab; label: string; desc: string }[]).map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => { setActiveTab(tab.key); Haptics.selectionAsync(); }}
              style={[styles.tab, {
                backgroundColor: active ? colors.primary + "18" : "transparent",
                borderBottomColor: active ? colors.primary : "transparent",
                borderBottomWidth: 2,
                flex: 1,
              }]}
            >
              <Text style={{ color: active ? colors.primary : colors.mutedForeground, fontWeight: active ? "700" : "400", fontSize: 13 }}>
                {tab.label}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 1 }}>{tab.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {activeTab === "local" ? <LocalTab /> : <NeonTab />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  dbHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: 4 },
  panel: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  connInput: {
    minHeight: 60,
    fontSize: 12,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
  },
  btnSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  runBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 36,
    borderRadius: 8,
  },
  queryEditor: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  queryInput: {
    minHeight: 52,
    maxHeight: 110,
    padding: 10,
    fontSize: 13,
    lineHeight: 20,
  },
  tableChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  dbChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  connCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  addConnBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderBottomWidth: 1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    margin: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ffffff11",
  },
  tableCell: {
    minWidth: 100,
    maxWidth: 250,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#ffffff11",
  },
  tableHeader: {
    fontWeight: "700",
    fontSize: 11,
  },
});
