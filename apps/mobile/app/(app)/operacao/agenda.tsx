import { fetchOpsSchedule } from "@/api/mobile-api";
import {
  OPS_VIEW_PERMS,
  OpsSkeleton,
  opsErrorMessage,
  throwOpsApiError,
} from "@/operacao/sections";
import { Button, Card, ErrorState, SafeAreaScreen, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";

type Range = "hoje" | "semana";

export default function OperacaoAgendaScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(OPS_VIEW_PERMS);
  const { colors } = useTheme();
  const [range, setRange] = useState<Range>("hoje");

  const query = useQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "ops-schedule",
      filters: { range },
    }),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchOpsSchedule({ tenantId, branchId, range });
      if (!result.ok) throwOpsApiError(result);
      return result.data;
    },
  });

  if (!canView) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Acesso negado" message="Sem permissão." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Offline" message="Agenda exige conexão." />
      </SafeAreaScreen>
    );
  }

  if (query.isLoading && !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <OpsSkeleton />
      </SafeAreaScreen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Falha ao carregar"
          message={opsErrorMessage(query.error, "Não foi possível carregar a agenda.")}
          action={
            <Button title="Tentar novamente" onPress={() => void query.refetch()} />
          }
        />
      </SafeAreaScreen>
    );
  }

  const data = query.data;

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
        }}
      >
        {(["hoje", "semana"] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: range === r ? colors.surface : "transparent",
              minHeight: 44,
              justifyContent: "center",
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: range === r }}
            accessibilityLabel={r === "hoje" ? "Hoje" : "Semana"}
          >
            <Text variant="caption">{r === "hoje" ? "Hoje" : "Semana"}</Text>
          </Pressable>
        ))}
      </View>
      {data?.unavailable ? (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <ErrorState
            title="Dados parciais"
            message="Agenda temporariamente indisponível. Campos sem fonte aparecem como —."
          />
        </View>
      ) : null}
      {data?.conflicts && data.conflicts.length > 0 ? (
        <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
          <Text variant="subtitle">Conflitos</Text>
          {data.conflicts.map((c, i) => (
            <Text
              key={`${c.a}-${c.b}-${i}`}
              variant="caption"
              style={{ color: colors.danger, marginTop: 6 }}
            >
              {c.reason}: {c.a.slice(0, 8)} ↔ {c.b.slice(0, 8)}
            </Text>
          ))}
        </Card>
      ) : null}
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
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
              Nenhum evento no período.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
            <Text variant="subtitle">{item.titulo}</Text>
            <Text
              variant="caption"
              style={{ color: colors.textMuted, marginTop: 4 }}
            >
              {item.status}
            </Text>
            <Text
              variant="caption"
              style={{ color: colors.textMuted, marginTop: 2 }}
            >
              {item.inicio.slice(0, 16).replace("T", " ")} →{" "}
              {item.fim.slice(0, 16).replace("T", " ")}
            </Text>
          </Card>
        )}
      />
    </SafeAreaScreen>
  );
}
