import { Button, EmptyState, SafeAreaScreen } from "@/design/components";
import { Link, Stack } from "expo-router";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Não encontrado" }} />
      <SafeAreaScreen>
        <EmptyState
          title="Página não encontrada"
          message="A rota solicitada não existe nesta versão."
          action={
            <Link href="/" asChild>
              <Button title="Ir para início" />
            </Link>
          }
        />
      </SafeAreaScreen>
    </>
  );
}
