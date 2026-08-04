import { fetchCrmClients } from "@/api/mobile-api";
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
import { useDeferredValue, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";

export default function CrmClientsScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(CRM_VIEW_PERMS);
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q.trim());

  const query = useQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "crm-clients",
      filters: { q: deferredQ },
    }),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchCrmClients({
        tenantId,
        branchId,
        q: deferredQ || undefined,
      });
      if (!result.ok) throwCrmApiError(result);
      return result.data;
    },
  });

  if (!canView) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Acesso negado" message="Sem permissão de clientes." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Offline"
          message="A lista de clientes exige conexão. O resumo do CRM Home pode estar disponível offline."
        />
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar cliente"
          placeholderTextColor={colors.textMuted}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.text,
            backgroundColor: colors.surface,
            minHeight: 44,
          }}
          accessibilityLabel="Buscar cliente"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      {query.isLoading && !query.data ? (
        <CrmSkeleton />
      ) : query.isError && !query.data ? (
        <ErrorState
          title="Falha ao carregar"
          message={crmErrorMessage(query.error, "Não foi possível listar clientes.")}
          action={
            <Button title="Tentar novamente" onPress={() => void query.refetch()} />
          }
        />
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={() => void query.refetch()}
            />
          }
          ListEmptyComponent={
            <View style={{ padding: 24 }}>
              <Text variant="body" style={{ color: colors.textMuted }}>
                Nenhum cliente encontrado.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/crm/client/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir cliente ${item.nome}`}
            >
              <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
                <Text variant="subtitle">{item.nome}</Text>
                <Text variant="caption" style={{ color: colors.textMuted, marginTop: 4 }}>
                  {[item.telefone, item.cidade, item.status]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </Text>
                <Text variant="caption" style={{ color: colors.textMuted, marginTop: 2 }}>
                  Score {item.score ?? "—"}
                  {item.valorGerado ? ` · ${item.valorGerado}` : ""}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaScreen>
  );
}
