import { Tabs } from "expo-router";
import { useTheme } from "@/design/theme";
import { buildTabScreenOptions } from "@/design/tab-bar";
import { TabBarIcon } from "@/design/TabBarIcon";
import { useHasAnyPermission } from "@/permissions/gate";
import { FINANCE_VIEW_PERMS } from "@/finance/perms";
import { CRM_VIEW_PERMS } from "@/crm/perms";
import { STOCK_VIEW_PERMS } from "@/stock/perms";
import { OPS_VIEW_PERMS } from "@/operacao/perms";
import {
  arePermissionsAuthoritative,
  useTenantStore,
} from "@/tenant/context-store";

const EXEC_PERMS = [
  "dashboard.executivo",
  "analytics.executivo",
  "dashboard.visualizar",
] as const;

/**
 * Esconde abas de módulos sem permissão (paridade com nav Web filtrada).
 * Guards de tela + API continuam como autoridade — href:null só remove do tab bar.
 * Sprint 32.5: não esconder Início/Dashboard enquanto RBAC ainda hidrata.
 */
export default function AppLayout() {
  const { colors, resolved } = useTheme();
  const permissionsStatus = useTenantStore((s) => s.permissionsStatus);
  const rbacReady = arePermissionsAuthoritative(permissionsStatus);
  const canExec = useHasAnyPermission(EXEC_PERMS);
  const canCrm = useHasAnyPermission(CRM_VIEW_PERMS);
  const canStock = useHasAnyPermission(STOCK_VIEW_PERMS);
  const canOps = useHasAnyPermission(OPS_VIEW_PERMS);
  const canFinance = useHasAnyPermission(FINANCE_VIEW_PERMS);
  const modules = useTenantStore((s) => s.modules);

  const tabOptions = buildTabScreenOptions(resolved);

  /** Durante hydrate: mantém abas visíveis (evita Dashboard sumir no cold start). */
  const hrefIf = (allowed: boolean) =>
    !rbacReady || allowed ? undefined : null;
  const hrefIfModule = (rbacOk: boolean, moduleOk: boolean | undefined) =>
    hrefIf(rbacOk && (modules == null || moduleOk !== false));

  return (
    <Tabs
      screenOptions={({ route }) => ({
        ...tabOptions,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarIcon: ({ color, focused }) => (
          <TabBarIcon routeName={route.name} color={color} focused={focused} />
        ),
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarLabel: "Início",
          tabBarAccessibilityLabel: "Início, Dashboard",
          href: hrefIf(canExec),
        }}
      />
      <Tabs.Screen
        name="inteligencia"
        options={{
          title: "Inteligência",
          tabBarLabel: "Intel.",
          tabBarAccessibilityLabel: "Inteligência",
          headerShown: false,
          href: hrefIfModule(canExec, modules?.intelligence),
        }}
      />
      <Tabs.Screen
        name="crm"
        options={{
          title: "CRM",
          tabBarLabel: "CRM",
          tabBarAccessibilityLabel: "CRM",
          headerShown: false,
          href: hrefIfModule(canCrm, modules?.crm),
        }}
      />
      <Tabs.Screen
        name="estoque"
        options={{
          title: "Estoque",
          tabBarLabel: "Estoq.",
          tabBarAccessibilityLabel: "Estoque",
          headerShown: false,
          href: hrefIfModule(canStock, modules?.stock),
        }}
      />
      <Tabs.Screen
        name="operacao"
        options={{
          title: "Operação",
          tabBarLabel: "Ops",
          tabBarAccessibilityLabel: "Operação",
          headerShown: false,
          href: hrefIfModule(canOps, modules?.ops),
        }}
      />
      <Tabs.Screen
        name="financeiro"
        options={{
          title: "Financeiro",
          tabBarLabel: "Financ.",
          tabBarAccessibilityLabel: "Financeiro",
          headerShown: false,
          href: hrefIfModule(canFinance, modules?.finance),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarLabel: "Perfil",
          tabBarAccessibilityLabel: "Perfil",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarLabel: "Mais",
          tabBarAccessibilityLabel: "Ajustes",
        }}
      />
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
