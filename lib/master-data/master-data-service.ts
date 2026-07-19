import { createClienteService } from "@/lib/clientes/cliente-service";
import { createFornecedorService } from "@/lib/financeiro/fornecedor-service";
import { createCategoriaFinanceiraService } from "@/lib/financeiro/categoria-financeira-service";
import { createCentroCustoService } from "@/lib/financeiro/centro-custo-service";
import { createPlanoContaService } from "@/lib/financeiro/plano-conta-service";
import {
  masterCacheGet,
  masterCacheSet,
  MASTER_CACHE_BUCKETS,
} from "@/lib/master-data/master-data-cache";
import { MasterDataRepository } from "@/lib/master-data/master-data-repository";
import { createMasterDataSearchService } from "@/lib/master-data/master-data-search";
import { suggestContaPagarFromFornecedor } from "@/lib/master-data/master-data-suggestions";
import { createProdutoService } from "@/lib/produtos/produto-service";
import { createClient } from "@/lib/supabase/server";
import type { ContaPagarAutofillSuggestion } from "@/lib/master-data/master-data-types";

/**
 * Fachada Master Data — orquestra cadastros existentes sem quebrar APIs.
 */
export class MasterDataService {
  constructor(
    private readonly tenantId: string,
    private readonly tenantSlug: string,
  ) {}

  async search(query: string) {
    const search = await createMasterDataSearchService(
      this.tenantId,
      this.tenantSlug,
    );
    return search.search(query);
  }

  async getFornecedorAutofill(
    fornecedorId: string,
  ): Promise<ContaPagarAutofillSuggestion | null> {
    const service = await createFornecedorService(this.tenantId);
    const fornecedor = await service.getById(fornecedorId);
    return suggestContaPagarFromFornecedor(fornecedor);
  }

  async listCachedCategorias() {
    const cached = masterCacheGet(this.tenantId, MASTER_CACHE_BUCKETS.categorias);
    if (cached) return cached as Awaited<
      ReturnType<
        Awaited<ReturnType<typeof createCategoriaFinanceiraService>>["list"]
      >
    >["data"];

    const service = await createCategoriaFinanceiraService(this.tenantId);
    const result = await service.list({ perPage: 100, ativo: true });
    masterCacheSet(this.tenantId, MASTER_CACHE_BUCKETS.categorias, result.data);
    return result.data;
  }

  async listCachedCentros() {
    const cached = masterCacheGet(this.tenantId, MASTER_CACHE_BUCKETS.centros);
    if (cached) return cached as Awaited<
      ReturnType<Awaited<ReturnType<typeof createCentroCustoService>>["list"]>
    >["data"];

    const service = await createCentroCustoService(this.tenantId);
    const result = await service.list({ perPage: 100, ativo: true });
    masterCacheSet(this.tenantId, MASTER_CACHE_BUCKETS.centros, result.data);
    return result.data;
  }

  async listCachedPlanos() {
    const cached = masterCacheGet(this.tenantId, MASTER_CACHE_BUCKETS.planos);
    if (cached) return cached as Awaited<
      ReturnType<Awaited<ReturnType<typeof createPlanoContaService>>["list"]>
    >["data"];

    const service = await createPlanoContaService(this.tenantId);
    const result = await service.list({ perPage: 100, ativo: true });
    masterCacheSet(this.tenantId, MASTER_CACHE_BUCKETS.planos, result.data);
    return result.data;
  }

  async tags() {
    const supabase = await createClient();
    const repo = new MasterDataRepository(supabase, this.tenantId);
    return repo.listTags();
  }

  async clientes() {
    return createClienteService(this.tenantId);
  }

  async produtos() {
    return createProdutoService(this.tenantId);
  }

  async fornecedores() {
    return createFornecedorService(this.tenantId);
  }
}

export async function createMasterDataService(
  tenantId: string,
  tenantSlug: string,
) {
  return new MasterDataService(tenantId, tenantSlug);
}
