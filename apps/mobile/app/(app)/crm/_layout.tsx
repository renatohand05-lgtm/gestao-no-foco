import { Stack } from "expo-router";
import { useTheme } from "@/design/theme";

export default function CrmLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "CRM" }} />
      <Stack.Screen name="pipeline" options={{ title: "Pipeline" }} />
      <Stack.Screen name="clients" options={{ title: "Clientes" }} />
      <Stack.Screen name="client/[id]" options={{ title: "Cliente" }} />
      <Stack.Screen name="timeline" options={{ title: "Timeline" }} />
      <Stack.Screen name="followups" options={{ title: "Follow-ups" }} />
      <Stack.Screen name="forecast" options={{ title: "Forecast" }} />
    </Stack>
  );
}
