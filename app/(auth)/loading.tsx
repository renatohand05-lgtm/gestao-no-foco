import { RouteLoading } from "@/components/layout/route-loading";

export default function AuthLoading() {
  return <RouteLoading cards={1} label="Carregando autenticação…" />;
}
