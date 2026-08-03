import { resolveBootRoute } from "@/auth/guards";
import { useSessionStore } from "@/auth/session-store";
import { LoadingState, SafeAreaScreen } from "@/design/components";
import { Redirect } from "expo-router";

export default function BootScreen() {
  const state = useSessionStore((s) => s.state);

  if (state === "booting" || state === "authenticating" || state === "refreshing") {
    return (
      <SafeAreaScreen>
        <LoadingState title="Iniciando Gestão…" />
      </SafeAreaScreen>
    );
  }

  return <Redirect href={resolveBootRoute(state)} />;
}
