import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface ExtractedData {
  url: string;
  html: string;
  title: string;
  routes: string[];
  scripts: string[];
  styles: string[];
  links: string[];
  fonts: string[];
  images: string[];
  meta: { name: string; content: string }[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onImport?: (files: { name: string; content: string }[]) => void;
}

function parseHtml(html: string, baseUrl: string): ExtractedData {
  const getTag = (tag: string) => {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    const matches: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) matches.push(m[1].trim());
    return matches;
  };

  const getAttr = (pattern: RegExp) => {
    const matches: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(html)) !== null) {
      const v = (m[1] || m[2] || "").trim();
      if (v && !v.startsWith("data:") && v.length < 300) matches.push(v);
    }
    return [...new Set(matches)];
  };

  const resolve = (href: string) => {
    if (!href || href.startsWith("data:") || href.startsWith("#")) return null;
    if (href.startsWith("http")) return href;
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  };

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? titleMatch[1].trim() : "sem título";

  const scripts = getAttr(/src=["']([^"']+\.js[^"']*?)["']/gi)
    .map(resolve).filter(Boolean) as string[];

  const styles = getAttr(/href=["']([^"']+\.css[^"']*?)["']/gi)
    .map(resolve).filter(Boolean) as string[];

  const fonts = getAttr(/href=["']([^"']*fonts[^"']*?)["']/gi)
    .map(resolve).filter(Boolean) as string[];

  const images = getAttr(/src=["']([^"']+\.(png|jpg|jpeg|gif|webp|svg|ico)[^"']*?)["']/gi)
    .map(resolve).filter(Boolean) as string[];

  const links = getAttr(/href=["']([^"'#][^"']*?)["']/gi)
    .filter((h) => !h.endsWith(".css") && !h.includes("font"))
    .map(resolve).filter(Boolean) as string[];

  const routes = links
    .filter((l) => {
      try { return new URL(l).hostname === new URL(baseUrl).hostname; } catch { return false; }
    })
    .map((l) => {
      try { return new URL(l).pathname; } catch { return l; }
    });

  const meta: { name: string; content: string }[] = [];
  const metaRe = /<meta[^>]+>/gi;
  let metaM: RegExpExecArray | null;
  while ((metaM = metaRe.exec(html)) !== null) {
    const tag = metaM[0];
    const nameM = /(?:name|property)=["']([^"']+)["']/i.exec(tag);
    const contentM = /content=["']([^"']+)["']/i.exec(tag);
    if (nameM && contentM) meta.push({ name: nameM[1], content: contentM[1] });
  }

  return {
    url: baseUrl,
    html,
    title,
    routes: [...new Set(routes)].slice(0, 50),
    scripts: [...new Set(scripts)].slice(0, 30),
    styles: [...new Set(styles)].slice(0, 20),
    links: [...new Set(links)].slice(0, 50),
    fonts: [...new Set(fonts)].slice(0, 10),
    images: [...new Set(images)].slice(0, 30),
    meta,
  };
}

function buildReport(data: ExtractedData): string {
  const lines: string[] = [
    `# 🌐 Extração: ${data.title}`,
    `URL: ${data.url}`,
    `Data: ${new Date().toLocaleString("pt-BR")}`,
    "",
    "---",
    "",
    `## 🗺️ Rotas encontradas (${data.routes.length})`,
    ...data.routes.map((r) => `- ${r}`),
    "",
    `## 📜 Scripts JS (${data.scripts.length})`,
    ...data.scripts.map((s) => `- ${s}`),
    "",
    `## 🎨 Folhas de Estilo CSS (${data.styles.length})`,
    ...data.styles.map((s) => `- ${s}`),
    "",
    `## 🔤 Fontes (${data.fonts.length})`,
    ...data.fonts.map((f) => `- ${f}`),
    "",
    `## 🖼️ Imagens (${data.images.length})`,
    ...data.images.map((i) => `- ${i}`),
    "",
    `## 🔗 Links (${data.links.length})`,
    ...data.links.slice(0, 20).map((l) => `- ${l}`),
    "",
    `## 🏷️ Meta Tags (${data.meta.length})`,
    ...data.meta.map((m) => `- ${m.name}: ${m.content}`),
  ];
  return lines.join("\n");
}

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

export default function SiteExtractor({ visible, onClose, onImport }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [tab, setTab] = useState<"rotas" | "scripts" | "links" | "fontes" | "html">("rotas");

  const handleExtract = async () => {
    const target = url.trim();
    if (!target) return;
    const fullUrl = target.startsWith("http") ? target : `https://${target}`;
    setLoading(true);
    setData(null);
    let html = "";
    let ok = false;

    for (const proxy of CORS_PROXIES) {
      try {
        const res = await fetch(proxy(fullUrl), { headers: { Accept: "text/html,*/*" } });
        if (res.ok) {
          const json = await res.json().catch(async () => ({ contents: await res.text() }));
          html = typeof json === "object" && json.contents ? json.contents : JSON.stringify(json);
          ok = true;
          break;
        }
      } catch {}
    }

    if (!ok || !html) {
      setLoading(false);
      Alert.alert("Erro", "Não foi possível acessar o site.\n\nPossíveis causas:\n• Site bloqueia scraping\n• URL inválida\n• Sem conexão com internet");
      return;
    }

    const extracted = parseHtml(html, fullUrl);
    setData(extracted);
    setLoading(false);
  };

  const handleImport = () => {
    if (!data || !onImport) return;
    const domain = (() => { try { return new URL(data.url).hostname.replace(/\./g, "_"); } catch { return "site"; } })();
    onImport([
      { name: `${domain}_index.html`, content: data.html },
      { name: `${domain}_extração.md`, content: buildReport(data) },
    ]);
    Alert.alert("✅ Importado!", "HTML e relatório de extração adicionados ao projeto.");
    onClose();
  };

  const TABS: { key: typeof tab; label: string; count: number }[] = [
    { key: "rotas", label: "Rotas", count: data?.routes.length ?? 0 },
    { key: "scripts", label: "Scripts", count: data?.scripts.length ?? 0 },
    { key: "links", label: "Links", count: data?.links.length ?? 0 },
    { key: "fontes", label: "Fontes", count: data?.fonts.length ?? 0 },
    { key: "html", label: "HTML", count: data ? 1 : 0 },
  ];

  const items: string[] =
    !data ? [] :
    tab === "rotas" ? data.routes :
    tab === "scripts" ? data.scripts :
    tab === "links" ? data.links :
    tab === "fontes" ? [...data.fonts, ...data.styles] :
    [data.html.slice(0, 5000) + (data.html.length > 5000 ? "\n...[truncado]" : "")];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[s.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[s.title, { color: colors.primary }]}>🌐 Extrator de Sites</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* URL input */}
        <View style={[s.inputRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TextInput
            style={[s.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            value={url}
            onChangeText={setUrl}
            placeholder="https://site.com.br"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onSubmitEditing={handleExtract}
          />
          <TouchableOpacity
            onPress={handleExtract}
            disabled={loading}
            style={[s.extractBtn, { backgroundColor: colors.primary }]}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.extractBtnText}>Extrair</Text>}
          </TouchableOpacity>
        </View>

        {!data && !loading && (
          <View style={s.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🌐</Text>
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
              Cole a URL de qualquer site e extraia{"\n"}rotas, scripts, links, fontes e HTML
            </Text>
          </View>
        )}

        {data && (
          <>
            <View style={[s.resultHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Text style={[s.siteTitle, { color: colors.foreground }]} numberOfLines={1}>{data.title}</Text>
              <Text style={[s.siteUrl, { color: colors.mutedForeground }]} numberOfLines={1}>{data.url}</Text>
            </View>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.tabBar, { borderBottomColor: colors.border }]}>
              {TABS.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[s.tabBtn, tab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                >
                  <Text style={[s.tabLabel, { color: tab === t.key ? colors.primary : colors.mutedForeground }]}>
                    {t.label} {t.count > 0 ? `(${t.count})` : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
              {items.length === 0 ? (
                <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 24 }}>Nenhum item encontrado</Text>
              ) : (
                items.map((item, i) => (
                  <View key={i} style={[s.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.itemText, { color: colors.foreground, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }]} selectable>
                      {item}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {onImport && (
              <View style={[s.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
                <TouchableOpacity onPress={handleImport} style={[s.importBtn, { backgroundColor: colors.primary }]}>
                  <Feather name="download" size={16} color="#fff" />
                  <Text style={s.importBtnText}>Importar HTML + Relatório para o Projeto</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16, fontWeight: "800" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  extractBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  extractBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  resultHeader: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  siteTitle: { fontSize: 14, fontWeight: "700" },
  siteUrl: { fontSize: 11, marginTop: 2 },
  tabBar: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  item: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 6,
  },
  itemText: { fontSize: 12, lineHeight: 18 },
  footer: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  importBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
