import { fetchFinanceDetail } from "@/api/mobile-api";
import { Button, Card, ErrorState, SafeAreaScreen, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { FINANCE_VIEW_PERMS, FinanceSkeleton } from "@/finance/sections";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

export default function FinanceDetailScreen() {
  const { id, kind: kindParam } = useLocalSearchParams<{
    id: string;
    kind?: string;
  }>();
  const kind = kindParam === "receber" ? "receber" : "pagar";
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(FINANCE_VIEW_PERMS);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "finance-detail",
      entity: id,
      filters: { kind },
    }),
    enabled: Boolean(tenantId) && Boolean(id) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchFinanceDetail({
        tenantId,
        id,
        kind,
        branchId,
      });
      if (!result.ok) {
        const err = new Error(result.error.message) as Error & { status?: number };
        err.status = result.status;
        throw err;
      }
      return result.data;
    },
  });

  if (!canView) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Acesso negado" message="Sem permissão para o detalhe." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Offline" message="Detalhe exige conexão. Mutações bloqueadas offline." />
      </SafeAreaScreen>
    );
  }

  if (query.isLoading) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <FinanceSkeleton />
      </SafeAreaScreen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Não encontrado"
          message={query.error instanceof Error ? query.error.message : "Lançamento indisponível"}
          action={<Button title="Tentar novamente" onPress={() => void query.refetch()} />}
        />
      </SafeAreaScreen>
    );
  }

  const data = query.data;

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        }
      >
        <Text variant="title">{data.title}</Text>
        <Text variant="caption" style={{ color: colors.textMuted, marginTop: 4 }}>
          Tipo: {data.kind === "pagar" ? "Conta a pagar" : "Conta a receber"}
        </Text>
        <View style={{ gap: 8, marginTop: 16 }}>
          {data.fields.map((f) => (
            <Card key={f.label}>
              <Text variant="caption" style={{ color: colors.textMuted }}>
                {f.label}
              </Text>
              <Text variant="subtitle" style={{ marginTop: 4 }}>
                {f.value}
              </Text>
            </Card>
          ))}
        </View>
        <Text variant="caption" style={{ color: colors.textMuted, marginTop: 16 }}>
          Baixa, pagamento, exclusão e edição sensível permanecem na web com validação server-side.
        </Text>
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
});
