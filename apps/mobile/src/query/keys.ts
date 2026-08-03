import { buildQueryKey, type QueryKeyParts } from "@gof/domain";

export function queryKeys() {
  return {
    all: (tenantId: string | null, branchId: string | null) =>
      buildQueryKey({ tenantId, branchId, module: "root" }),
    module: (
      tenantId: string | null,
      branchId: string | null,
      module: string,
    ) => buildQueryKey({ tenantId, branchId, module }),
    entity: (parts: QueryKeyParts) => buildQueryKey(parts),
  };
}

export const qk = queryKeys();
