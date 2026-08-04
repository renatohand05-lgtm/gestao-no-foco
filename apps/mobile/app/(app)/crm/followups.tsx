import { fetchCrmFollowups } from "@/api/mobile-api";
import {
  CRM_VIEW_PERMS,
  CrmSkeleton,
  crmErrorMessage,
  throwCrmApiError,
} from "@/crm/sections";
import { Button, Card, ErrorState, SafeAreaScreen, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";

export default function CrmFollowupsScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(CRM_VIEW_PERMS);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "crm-followups"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchCrmFollowups({ tenantId, branchId });
      if (!result.ok) throwCrmApiError(result);
      return result.data;
    },
  });

  if (!canView) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Acesso negado" message="Sem permissão de CRM." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Offline"
          message="Follow-ups detalhados exigem conexão. O resumo do CRM Home pode estar disponível offline."
        />
      </SafeAreaScreen>
    );
  }

  if (query.isLoading && !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <CrmSkeleton />
      </SafeAreaScreen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Falha ao carregar"
          message={crmErrorMessage(query.error, "Não foi possível carregar follow-ups.")}
          action={
            <Button title="Tentar novamente" onPress={() => void query.refetch()} />
          }
        />
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        }
      >
        <Text variant="caption" style={{ color: colors.textMuted }}>
          Ações concluir/adiar/atribuir: use o CRM Web (mutações bloqueadas
          offline/mobile nesta sprint).
        </Text>
        {(query.data?.buckets ?? []).map((bucket) => (
          <Card key={bucket.id}>
            <Text variant="subtitle">
              {bucket.label} ({bucket.items.length})
            </Text>
            {bucket.items.length === 0 ? (
              <Text
                variant="body"
                style={{ color: colors.textMuted, marginTop: 6 }}
              >
                Nenhum item neste bucket.
              </Text>
            ) : (
              bucket.items.slice(0, 20).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/crm/client/${item.clienteId}`)}
                  style={{ marginTop: 10, minHeight: 44, justifyContent: "center" }}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir cliente ${item.clienteNome}`}
                >
                  <Text variant="body">{item.titulo}</Text>
                  <Text variant="caption" style={{ color: colors.textMuted }}>
                    {item.clienteNome} · {item.dataRef || "sem data"}
                  </Text>
                </Pressable>
              ))
            )}
          </Card>
        ))}
        {!query.data?.buckets?.length ? (
          <View style={{ paddingVertical: 16 }}>
            <Text variant="body" style={{ color: colors.textMuted }}>
              Nenhum follow-up agrupado.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaScreen>
  );
}
