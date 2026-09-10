import {
  closeMasterTicket,
  fetchMasterSupportTickets,
  fetchMasterTicketThread,
  sendMasterTicketReply,
  type MasterSupportTicket,
  type SupportMessage,
} from "@/api/mobile-api";
import {
  Button,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useTheme } from "@/design/theme";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function formatRelative(iso: string) {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MasterSuporteScreen() {
  const { colors } = useTheme();
  const [tickets, setTickets] = useState<MasterSupportTicket[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function loadTickets() {
    const result = await fetchMasterSupportTickets();
    if (result.ok) {
      setTickets(result.data.tickets);
    } else {
      setError(result.error.message);
    }
    setLoadingList(false);
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      const result = await fetchMasterSupportTickets();
      if (ignore) return;
      if (result.ok) {
        setTickets(result.data.tickets);
      } else {
        setError(result.error.message);
      }
      setLoadingList(false);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  async function openTicket(id: string) {
    setSelectedId(id);
    setLoadingThread(true);
    const result = await fetchMasterTicketThread(id);
    if (result.ok) {
      setMessages(result.data.messages);
    } else {
      setError(result.error.message);
    }
    setLoadingThread(false);
  }

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || !selectedId) return;
    setError(null);
    setDraft("");
    setSending(true);
    const result = await sendMasterTicketReply(selectedId, body);
    setSending(false);
    if (result.ok) {
      setMessages(result.data.messages);
      void loadTickets();
    } else {
      setError(result.error.message);
    }
  }

  async function handleClose() {
    if (!selectedId) return;
    await closeMasterTicket(selectedId);
    void loadTickets();
    setSelectedId(null);
  }

  const selectedTicket = tickets?.find((t) => t.id === selectedId) ?? null;

  if (selectedId && selectedTicket) {
    return (
      <SafeAreaScreen edges={["left", "right", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          <View style={styles.threadHeader}>
            <TouchableOpacity onPress={() => setSelectedId(null)}>
              <Text variant="body" style={{ color: colors.primary }}>
                ← Voltar
              </Text>
            </TouchableOpacity>
            <Text variant="subtitle">{selectedTicket.tenantName}</Text>
            {selectedTicket.status === "open" ? (
              <TouchableOpacity onPress={handleClose}>
                <Text variant="caption" style={{ color: colors.primary }}>
                  Encerrar
                </Text>
              </TouchableOpacity>
            ) : (
              <Text variant="caption" muted>
                Encerrado
              </Text>
            )}
          </View>

          <ScrollView ref={scrollRef} contentContainerStyle={styles.threadContent}>
            {loadingThread ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              messages.map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.bubble,
                    m.senderRole === "platform_owner"
                      ? { alignSelf: "flex-end", backgroundColor: colors.primary }
                      : { alignSelf: "flex-start", backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <Text
                    variant="body"
                    style={{
                      color: m.senderRole === "platform_owner" ? "#0B0F14" : colors.text,
                    }}
                  >
                    {m.body}
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      marginTop: 4,
                      color:
                        m.senderRole === "platform_owner" ? "#0B0F14AA" : colors.textMuted,
                    }}
                  >
                    {formatTime(m.createdAt)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Responder…"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              multiline
              editable={selectedTicket.status === "open"}
            />
            <Button
              title={sending ? "…" : "Enviar"}
              onPress={handleSend}
              disabled={sending || !draft.trim() || selectedTicket.status !== "open"}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.listContent}>
        <Text variant="display">Central de suporte</Text>
        {loadingList ? (
          <ActivityIndicator color={colors.primary} />
        ) : error ? (
          <Text variant="body" muted>
            {error}
          </Text>
        ) : !tickets || tickets.length === 0 ? (
          <Text variant="body" muted>
            Nenhuma solicitação de suporte ainda.
          </Text>
        ) : (
          tickets.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.ticketRow, { borderColor: colors.border }]}
              onPress={() => openTicket(t.id)}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: "500" }}>
                  {t.tenantName}
                </Text>
                <Text variant="caption" muted numberOfLines={1}>
                  {t.lastSenderRole === "platform_owner" ? "Você: " : ""}
                  {t.lastMessagePreview ?? "—"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text variant="caption" muted>
                  {formatRelative(t.lastMessageAt)}
                </Text>
                {t.unreadForOwner > 0 ? (
                  <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                    <Text variant="caption" style={{ color: "#fff" }}>
                      {t.unreadForOwner}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 16, gap: 4 },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  threadContent: { padding: 16, gap: 10, flexGrow: 1 },
  bubble: {
    maxWidth: "85%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
