/**
 * Resolver único de responsável da OS (Gate 18.1.1).
 *
 * Implementação canônica vive em `os-central-compose.ts` para compatibilidade
 * com os testes Node (strip-types sem alias/@). Este módulo reexporta a API.
 */

export {
  OS_RESPONSAVEL_FALLBACK,
  resolveOsResponsavel,
  type OsResponsavelAlocacaoPrincipal,
  type OsResponsavelSource,
  type ResolveOsResponsavelInput,
  type ResolveOsResponsavelResult,
} from "./os-central-compose";
