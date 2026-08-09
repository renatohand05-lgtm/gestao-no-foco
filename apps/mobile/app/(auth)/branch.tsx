import { fetchBranches } from "@/api/mobile-api";
import { AuthenticatedDataError } from "@/auth/AuthenticatedDataError";
import { useSessionStore } from "@/auth/session-store";
import {
  Button,
  EmptyState,
  ListItem,
  LoadingState,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { logger } from "@/observability/logger";
import { mobileTelemetry } from "@/observability/telemetry";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";

export default function BranchScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantName = useTenantStore((s) => s.tenantName);
  const setBranch = useTenantStore((s) => s.setBranch);
  const continueWithoutBranch = useTenantStore((s) => s.continueWithoutBranch);
  const markBranchSelected = useSessionStore((s) => s.markBranchSelected);
  const markContinueWithoutBranch = useSessionStore((s) => s.markContinueWithoutBranch);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["mobile", "branches", tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      logger.info("postlogin.branches_start", { hasTenant: Boolean(tenantId) });
      const result = await fetchBranches(tenantId);
      if (!result.ok) {
        logger.warn("postlogin.branches_failed", { status: result.status });
        throw new Error(result.error.message);
      }
      logger.info("postlogin.branches_ok", {
        count: result.data.items.length,
        allowContinue: result.data.allowContinueWithoutBranch,
      });
      return result.data;
    },
  });

  if (isLoading) {
    return (
      <SafeAreaScreen>
        <LoadingState title="Carregando filiais…" />
      </SafeAreaScreen>
    );
  }

  if (isError || !data) {
    return (
      <AuthenticatedDataError
        code="BRANCH_LOAD_FAILED"
        title="Não foi possível carregar seus dados."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const handleContinueWithoutBranch = () => {
    continueWithoutBranch();
    markContinueWithoutBranch();
    logger.info("postlogin.continue_without_branch", {});
    mobileTelemetry.track("BRANCH_SELECTED", { reason: "continue_without" });
    router.replace("/(app)");
  };

  return (
    <SafeAreaScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="title">Selecione a filial</Text>
        <Text variant="body" muted style={styles.subtitle}>
          {tenantName}
        </Text>

        {data.items.length === 0 ? (
          <EmptyState
            title="Sem filiais"
            message={data.message ?? "Nenhuma filial cadastrada."}
            action={
              data.allowContinueWithoutBranch ? (
                <Button title="Continuar sem filial" onPress={handleContinueWithoutBranch} />
              ) : undefined
            }
          />
        ) : (
          data.items.map((branch) => (
            <ListItem
              key={branch.id}
              title={branch.name}
              onPress={() => {
                setBranch(branch.id, branch.name);
                markBranchSelected();
                logger.info("postlogin.branch_selected", {});
                mobileTelemetry.track("BRANCH_SELECTED");
                router.replace("/(app)");
              }}
            />
          ))
        )}

        {data.items.length > 0 && data.allowContinueWithoutBranch ? (
          <Button
            title="Continuar sem filial"
            variant="secondary"
            onPress={handleContinueWithoutBranch}
            style={styles.continue}
          />
        ) : null}
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  subtitle: { marginVertical: 12 },
  continue: { marginTop: 16 },
});
