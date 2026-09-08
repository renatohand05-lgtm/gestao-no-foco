import {
  fetchAiAssistantConversation,
  sendAiAssistantMessage,
  type AiAssistantMessage,
} from "@/api/mobile-api";
import {
  Button,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useTheme } from "@/design/theme";
import { useTenantStore } from "@/tenant/context-store";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AssistenteIaScreen() {
  const { colors } = useTheme();
  const tenantId = useTenantStore((s) => s.tenantId);

  const [messages, setMessages] = useState<AiAssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const result = await fetchAiAssistantConversation(tenantId);
      if (ignore) return;
      if (result.ok) {
        setMessages(result.data.messages);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, [tenantId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setError(null);

    const optimistic: AiAssistantMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: body,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);

    const result = await sendAiAssistantMessage(tenantId, body);
    setSending(false);
    if (result.ok) {
      setMessages((prev) => [...prev, result.data]);
    } else {
      setError(result.error.message);
    }
  }

  return (
    <SafeAreaScreen edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : messages.length === 0 ? (
            <Text variant="body" muted>
              Pergunte como usar o sistema, ou sobre os dados da sua
              empresa (financeiro, vendas). Estou aqui pra ajudar.
            </Text>
          ) : (
            messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  m.role === "user"
                    ? { alignSelf: "flex-end", backgroundColor: colors.primary }
                    : { alignSelf: "flex-start", backgroundColor: colors.surfaceElevated },
                ]}
              >
                <Text
                  variant="body"
                  style={{ color: m.role === "user" ? "#0B0F14" : colors.text }}
                >
                  {m.content}
                </Text>
                <Text
                  variant="caption"
                  style={{
                    marginTop: 4,
                    color: m.role === "user" ? "#0B0F14AA" : colors.textMuted,
                  }}
                >
                  {formatTime(m.createdAt)}
                </Text>
              </View>
            ))
          )}
          {sending ? (
            <Text variant="caption" muted>
              Pensando…
            </Text>
          ) : null}
          {error ? (
            <Text variant="caption" style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Digite sua pergunta…"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            multiline
          />
          <Button
            title={sending ? "…" : "Enviar"}
            onPress={handleSend}
            disabled={sending || !draft.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, flexGrow: 1 },
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
