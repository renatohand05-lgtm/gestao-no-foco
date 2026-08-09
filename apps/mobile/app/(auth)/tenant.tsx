import { fetchMemberships, fetchPermissions } from "@/api/mobile-api";
import { AuthenticatedDataError } from "@/auth/AuthenticatedDataError";
import { authErrorFromCode } from "@/auth/errors";
import {
  classifyMembershipError,
} from "@/auth/post-login-errors";
import { useSessionStore } from "@/auth/session-store";
import {
  EmptyState,
  Input,
  ListItem,
  LoadingState,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { getApiBaseResolution } from "@/env/validate";
import { logger } from "@/observability/logger";
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
  const [permError, setPermError] = useState<Error | null>(null);
  const apiBase = getApiBaseResolution();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["mobile", "memberships", apiBase.code],
    queryFn: async () => {
      logger.info("postlogin.memberships_start", {
        apiBaseCode: apiBase.code,
        apiHost: (() => {
          try {
            return new URL(apiBase.url).host;
          } catch {
            return "invalid";
          }
        })(),
      });
      const result = await fetchMemberships();
      if (!result.ok) {
        logger.warn("postlogin.memberships_failed", {
          status: result.status,
          code: result.error.code,
          apiBaseCode: apiBase.code,
        });
        const err = new Error(result.error.message) as Error & {
          status?: number;
        };
        err.status = result.status;
        throw err;
      }
      logger.info("postlogin.memberships_ok", {
        count: result.data.items.length,
      });
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
    logger.info("postlogin.tenant_selected", {
      hasSlug: Boolean(tenant.slug),
    });
    setPermError(null);
    const perms = await fetchPermissions(tenant.tenantId);
    if (!perms.ok) {
      logger.warn("postlogin.permissions_failed", {
        status: perms.status,
        code: perms.error.code,
      });
      // Nunca gravar [] silenciosamente — esconde abas / Access Denied em massa.
      const err = new Error(perms.error.message) as Error & { status?: number };
      err.status = perms.status;
      setPermError(err);
      return;
    }
    setTenant({
      tenantId: tenant.tenantId,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      segmentId: tenant.segmentId as SegmentId | null,
      permissions: perms.data.permissions,
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
    const code = classifyMembershipError(error, apiBase.code);
    return (
      <AuthenticatedDataError
        code={code}
        title="Não foi possível carregar seus dados."
        onRetry={() => {
          void refetch();
        }}
        showGoHome={false}
      />
    );
  }

  if (permError) {
    const code = classifyMembershipError(permError, apiBase.code);
    return (
      <AuthenticatedDataError
        code={code}
        title="Não foi possível carregar suas permissões."
        onRetry={() => {
          setPermError(null);
        }}
        showGoHome={false}
      />
    );
  }

  return (
    <SafeAreaScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title">Selecione a empresa</Text>
        <Text variant="body" muted style={styles.subtitle}>
          {email}
        </Text>

        {apiBase.corrected ? (
          <Text variant="caption" muted>
            API do app ajustada automaticamente ({apiBase.code}).
          </Text>
        ) : null}

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
              onPress={() => {
                void handleSelect(tenant);
              }}
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
