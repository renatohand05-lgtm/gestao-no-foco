import { Tabs } from "expo-router";
import { useTheme } from "@/design/theme";
import { useHasAnyPermission } from "@/permissions/gate";
import { FINANCE_VIEW_PERMS } from "@/finance/perms";
import { CRM_VIEW_PERMS } from "@/crm/perms";
import { STOCK_VIEW_PERMS } from "@/stock/perms";
import { OPS_VIEW_PERMS } from "@/operacao/perms";

const EXEC_PERMS = [
  "dashboard.executivo",
  "analytics.executivo",
  "dashboard.visualizar",
] as const;

/**
 * Esconde abas de módulos sem permissão (paridade com nav Web filtrada).
 * Guards de tela + API continuam como autoridade — href:null só remove do tab bar.
 */
export default function AppLayout() {
  const { colors } = useTheme();
  const canExec = useHasAnyPermission(EXEC_PERMS);
  const canCrm = useHasAnyPermission(CRM_VIEW_PERMS);
  const canStock = useHasAnyPermission(STOCK_VIEW_PERMS);
  const canOps = useHasAnyPermission(OPS_VIEW_PERMS);
  const canFinance = useHasAnyPermission(FINANCE_VIEW_PERMS);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarLabel: "Início",
          href: canExec ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="inteligencia"
        options={{
          title: "Inteligência",
          tabBarLabel: "Intel.",
          headerShown: false,
          href: canExec ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="crm"
        options={{
          title: "CRM",
          tabBarLabel: "CRM",
          headerShown: false,
          href: canCrm ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="estoque"
        options={{
          title: "Estoque",
          tabBarLabel: "Estoque",
          headerShown: false,
          href: canStock ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="operacao"
        options={{
          title: "Operação",
          tabBarLabel: "Operação",
          headerShown: false,
          href: canOps ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="financeiro"
        options={{
          title: "Financeiro",
          tabBarLabel: "Financeiro",
          headerShown: false,
          href: canFinance ? undefined : null,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Perfil", tabBarLabel: "Perfil" }} />
      <Tabs.Screen name="settings" options={{ title: "Ajustes", tabBarLabel: "Ajustes" }} />
      <Tabs.Screen
        name="busca"
        options={{ title: "Busca", href: null, headerShown: true }}
      />
      <Tabs.Screen
        name="comandos"
        options={{ title: "Comandos", href: null, headerShown: true }}
      />
      <Tabs.Screen
        name="scanner"
        options={{ title: "Scanner", href: null, headerShown: true }}
      />
    </Tabs>
  );
}
