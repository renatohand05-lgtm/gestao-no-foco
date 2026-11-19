/**
 * Rede de lojas — regras de acesso no app (espelham o banco, que é a autoridade).
 * O RLS decide o que cada pessoa lê/grava; aqui só escondemos o que ela não pode usar.
 */
import type { Loja, ModuloRede, PerfilRede } from "./tipos.ts";

export function podeVer(perfil: PerfilRede | null | undefined, modulo: ModuloRede): boolean {
  return perfil?.modulos[modulo]?.ver === true;
}

/** Vale se a pessoa vê pelo menos um dos módulos (abas que juntam mais de um módulo). */
export function podeVerAlgum(perfil: PerfilRede | null | undefined, modulos: readonly ModuloRede[]): boolean {
  return modulos.some((m) => podeVer(perfil, m));
}

export function podeEditar(perfil: PerfilRede | null | undefined, modulo: ModuloRede): boolean {
  return perfil?.modulos[modulo]?.editar === true;
}

/** Lojas que a pessoa enxerga (todas, ou só as atribuídas a ela). */
export function lojasDoPerfil<T extends Pick<Loja, "id">>(perfil: PerfilRede | null | undefined, lojas: readonly T[]): T[] {
  if (!perfil) return [];
  if (perfil.todasLojas) return [...lojas];
  const ids = new Set(perfil.lojaIds);
  return lojas.filter((l) => ids.has(l.id));
}

export function ehGestaoDaRede(perfil: PerfilRede | null | undefined): boolean {
  return perfil?.papel === "administrador" || perfil?.papel === "consultor";
}

/** Vê a rede inteira (administrador, consultor, ou acesso a todas as lojas); senão só as lojas atribuídas. */
export function veRedeInteira(perfil: PerfilRede | null | undefined): boolean {
  return ehGestaoDaRede(perfil) || perfil?.todasLojas === true;
}

/** Interpreta o JSON de `rede_meu_perfil` (ou null se a pessoa não tem acesso). */
export function lerPerfil(raw: unknown): PerfilRede | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.papel !== "string") return null;
  const modulos: PerfilRede["modulos"] = {};
  if (r.modulos && typeof r.modulos === "object") {
    for (const [k, v] of Object.entries(r.modulos as Record<string, unknown>)) {
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        modulos[k as ModuloRede] = { ver: o.ver === true, editar: o.editar === true };
      }
    }
  }
  return {
    papel: r.papel as PerfilRede["papel"],
    todasLojas: r.todas_lojas === true,
    lojaIds: Array.isArray(r.loja_ids) ? (r.loja_ids as unknown[]).filter((x): x is string => typeof x === "string") : [],
    modulos,
  };
}
