import { Tabs } from "expo-router";
import { useTheme } from "@/design/theme";

export default function AppLayout() {
  const { colors } = useTheme();
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
      <Tabs.Screen name="index" options={{ title: "Início", tabBarLabel: "Início" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil", tabBarLabel: "Perfil" }} />
      <Tabs.Screen name="settings" options={{ title: "Ajustes", tabBarLabel: "Ajustes" }} />
    </Tabs>
  );
}
