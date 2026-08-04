import {
  fetchMobileSearch,
  type MobileSearchHit,
} from "@/api/mobile-api";
import { useSessionStore } from "@/auth/session-store";
import {
  Button,
  Card,
  ErrorState,
  Input,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useTheme } from "@/design/theme";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { splitHighlight } from "@/productivity/highlight";
import { openProductivityRoute } from "@/productivity/navigate";
import {
  loadSearchCache,
  saveSearchCache,
} from "@/productivity/search-cache";
import { toggleFavorite } from "@/productivity/storage";
import type { ProductivityEntityType } from "@/productivity/types";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const TYPE_LABEL: Record<string, string> = {
  cliente: "Clientes",
  veiculo: "Veículos",
  ordem_servico: "Ordens de serviço",
  produto: "Produtos",
  servico: "Serviços",
  fornecedor: "Fornecedores",
  conta_pagar: "Contas a pagar",
  conta_receber: "Contas a receber",
  oportunidade: "Oportunidades",
  membro: "Equipe",
  notificacao: "Alertas",
};

function toEntityType(type: string): ProductivityEntityType {
  if (
    type === "cliente" ||
    type === "veiculo" ||
    type === "ordem_servico" ||
    type === "produto" ||
    type === "fornecedor" ||
    type === "oportunidade"
  ) {
    return type;
  }
  if (type === "conta_pagar" || type === "conta_receber") return "conta";
  return "comando";
}

function HighlightTitle({
  title,
  term,
  color,
  matchColor,
}: {
  title: string;
  term: string;
  color: string;
  matchColor: string;
}) {
  const parts = splitHighlight(title, term);
  return (
    <Text variant="body">
      {parts.map((p, i) => (
        <Text
          key={`${i}-${p.text}`}
          variant="body"
          style={{
            color: p.match ? matchColor : color,
            fontWeight: p.match ? "700" : "400",
          }}
        >
          {p.text}
        </Text>
      ))}
    </Text>
  );
}

export default function BuscaGlobalScreen() {
  const { colors } = useTheme();
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const userId = useSessionStore((s) => s.snapshot.userId) ?? "";
  const network = useNetworkStatus();
  const online = isOnline(network);

  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q.trim());
  const [debouncedQ, setDebouncedQ] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(deferredQ), 280);
    return () => clearTimeout(t);
  }, [deferredQ]);

  const cacheQuery = useQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "global-search-cache",
    }),
    enabled: Boolean(tenantId),
    staleTime: 60_000,
    queryFn: () => loadSearchCache(tenantId!, branchId),
  });
  const cache = cacheQuery.data ?? null;

  const enabled =
    Boolean(tenantId) && online && debouncedQ.length >= 2;

  const query = useQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "global-search",
      entity: "q",
      filters: { q: debouncedQ },
    }),
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const result = await fetchMobileSearch({
        tenantId: tenantId!,
        q: debouncedQ,
        branchId,
        limit: 30,
        signal: controller.signal,
      });
      if (!result.ok) {
        const err = new Error(result.error.message) as Error & { status?: number };
        err.status = result.status;
        throw err;
      }
      await saveSearchCache(tenantId!, branchId, debouncedQ, result.data.items);
      return result.data;
    },
  });

  const items = useMemo(() => {
    if (query.data?.items) return query.data.items;
    if (!online && cache && (!debouncedQ || cache.q === debouncedQ)) {
      return cache.items;
    }
    return [];
  }, [query.data, online, cache, debouncedQ]);

  const grouped = useMemo(() => {
    const map = new Map<string, MobileSearchHit[]>();
    for (const it of items) {
      const list = map.get(it.type) ?? [];
      list.push(it);
      map.set(it.type, list);
    }
    return Array.from(map.entries());
  }, [items]);

  const openHit = async (hit: MobileSearchHit) => {
    await openProductivityRoute({
      route: hit.route,
      opensWeb: hit.opensWeb,
      recent: {
        userId,
        tenantId: tenantId!,
        branchId,
        id: hit.id,
        type: toEntityType(hit.type),
        title: hit.title,
        subtitle: hit.subtitle,
      },
    });
  };

  const starHit = async (hit: MobileSearchHit) => {
    if (!userId || !tenantId) return;
    await toggleFavorite(userId, tenantId, branchId, {
      id: hit.id,
      type: toEntityType(hit.type),
      title: hit.title,
      subtitle: hit.subtitle,
      route: hit.route,
      opensWeb: hit.opensWeb,
    });
  };

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <View style={styles.header}>
        <Input
          value={q}
          onChangeText={setQ}
          placeholder="Buscar clientes, OS, placas, produtos…"
          autoFocus
          returnKeyType="search"
          accessibilityLabel="Busca global"
          accessibilityHint="Digite ao menos dois caracteres"
          style={styles.input}
        />
        {!online ? (
          <Text variant="caption" muted accessibilityRole="text">
            Offline — exibindo último resultado em cache
            {cache?.savedAt
              ? ` · ${new Date(cache.savedAt).toLocaleString("pt-BR")}`
              : ""}
          </Text>
        ) : null}
      </View>

      {enabled && query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando busca" />
        </View>
      ) : null}

      {enabled && query.isError ? (
        <ErrorState
          title="Falha na busca"
          message={
            query.error instanceof Error
              ? query.error.message
              : "Não foi possível buscar."
          }
          action={<Button title="Tentar novamente" onPress={() => void query.refetch()} />}
        />
      ) : null}

      {!enabled && online && q.trim().length > 0 && q.trim().length < 2 ? (
        <Text variant="caption" muted style={styles.hint}>
          Digite ao menos 2 caracteres.
        </Text>
      ) : null}

      {!online && !items.length ? (
        <ErrorState
          title="Busca remota indisponível"
          message="Conecte-se para buscar. Favoritos e recentes continuam disponíveis na home."
        />
      ) : null}

      {enabled && !query.isLoading && !query.isError && items.length === 0 ? (
        <Text variant="body" muted style={styles.hint}>
          Nenhum resultado para “{debouncedQ}”.
        </Text>
      ) : null}

      <FlatList
        data={grouped}
        keyExtractor={([type]) => type}
        contentContainerStyle={styles.list}
        renderItem={({ item: [type, hits] }) => (
          <View style={styles.group}>
            <Text variant="subtitle" accessibilityRole="header">
              {TYPE_LABEL[type] ?? type} ({hits.length})
            </Text>
            {hits.map((hit) => (
              <Card key={`${hit.type}-${hit.id}`} style={styles.card}>
                <Pressable
                  onPress={() => void openHit(hit)}
                  accessibilityRole="button"
                  accessibilityLabel={`${hit.title}. ${hit.subtitle ?? ""}`}
                  accessibilityHint="Abre o detalhe"
                  style={styles.row}
                >
                  <View style={{ flex: 1 }}>
                    <HighlightTitle
                      title={hit.title}
                      term={debouncedQ}
                      color={colors.text}
                      matchColor={colors.primary}
                    />
                    {hit.subtitle ? (
                      <Text variant="caption" muted>
                        {hit.subtitle}
                        {hit.status ? ` · ${hit.status}` : ""}
                      </Text>
                    ) : null}
                    {hit.opensWeb ? (
                      <Text variant="caption" muted>
                        Abre no portal
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => void starHit(hit)}
                    accessibilityRole="button"
                    accessibilityLabel={`Favoritar ${hit.title}`}
                    hitSlop={12}
                    style={styles.star}
                  >
                    <Text variant="body">★</Text>
                  </Pressable>
                </Pressable>
              </Card>
            ))}
          </View>
        )}
        ListFooterComponent={null}
      />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, gap: 8 },
  input: { minHeight: 48 },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  group: { gap: 8, marginBottom: 12 },
  card: { padding: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    minHeight: 48,
  },
  star: { padding: 8, minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  center: { padding: 24, alignItems: "center" },
  hint: { paddingHorizontal: 16, marginBottom: 8 },
});
