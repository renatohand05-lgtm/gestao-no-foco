import { fetchMemberships, fetchPermissions } from "@/api/mobile-api";
import { authErrorFromCode } from "@/auth/errors";
import { useSessionStore } from "@/auth/session-store";
import {
  EmptyState,
  ErrorState,
  Input,
  ListItem,
  LoadingState,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useTenantStore } from "@/tenant/context-store";
import type { SegmentId } from "@gof/config";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

export default function TenantScreen() {
  const email = useSessionStore((s) => s.snapshot.email);
  const markTenantSelected = useSessionStore((s) => s.markTenantSelected);
  const setTenant = useTenantStore((s) => s.setTenant);
  const [query, setQuery] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mobile", "memberships"],
    queryFn: async () => {
      const result = await fetchMemberships();
      if (!result.ok) throw new Error(result.error.message);
      return result.data.items;
    },
  });

  const filtered = useMemo(() => {
    const items = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q),
    );
  }, [data, query]);

  const handleSelect = async (tenant: (typeof filtered)[number]) => {
    const perms = await fetchPermissions(tenant.tenantId);
    setTenant({
      tenantId: tenant.tenantId,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      segmentId: tenant.segmentId as SegmentId | null,
      permissions: perms.ok ? perms.data.permissions : [],
    });
    markTenantSelected();
    router.push("/(auth)/branch");
  };

  if (isLoading) {
    return (
      <SafeAreaScreen>
        <LoadingState title="Carregando empresas…" />
      </SafeAreaScreen>
    );
  }

  if (isError) {
    return (
      <SafeAreaScreen>
        <ErrorState
          title="Falha ao carregar"
          message={authErrorFromCode("network_unavailable").message}
          action={<ListItem title="Tentar novamente" onPress={() => refetch()} />}
        />
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title">Selecione a empresa</Text>
        <Text variant="body" muted style={styles.subtitle}>
          {email}
        </Text>

        <Input
          placeholder="Buscar empresa…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />

        {filtered.length === 0 ? (
          <EmptyState
            title="Nenhuma empresa"
            message={authErrorFromCode("tenant_membership_missing").message}
          />
        ) : (
          filtered.map((tenant) => (
            <ListItem
              key={tenant.tenantId}
              title={tenant.name}
              subtitle={`${tenant.slug} · ${tenant.role}`}
              onPress={() => handleSelect(tenant)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  subtitle: { marginVertical: 8 },
});
