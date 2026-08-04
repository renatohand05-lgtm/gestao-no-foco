import { Stack } from "expo-router";
import { useTheme } from "@/design/theme";

export default function InteligenciaLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Inteligência" }} />
    </Stack>
  );
}
