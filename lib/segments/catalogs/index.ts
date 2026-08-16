import type { ProductSegmentId } from "../types.ts";
import { librarySegmentForContext } from "../library-segment.ts";
import { BARBEARIA_LIBRARY } from "./barbearia.ts";
import { CLINICA_ESTETICA_LIBRARY } from "./clinica-estetica.ts";
import { CONSULTORIA_LIBRARY } from "./consultoria.ts";
import { LAVA_RAPIDO_LIBRARY } from "./lava-rapido.ts";
import { CONSULTORIO_ODONTOLOGICO_LIBRARY } from "./odontologia.ts";
import { OFICINA_LIBRARY } from "./oficina.ts";
import type { SegmentLibraryItem } from "./types.ts";

export type { SegmentLibraryItem, LibraryGroup, LibrarySeed } from "./types.ts";
export {
  defineLibrary,
  groupLibraryByCategory,
  namesAreEquivalent,
  normalizeCatalogName,
} from "./builder.ts";
export { librarySegmentForContext } from "../library-segment.ts";

const LIBRARIES: Record<ProductSegmentId, SegmentLibraryItem[]> = {
  oficina: OFICINA_LIBRARY,
  barbearia: BARBEARIA_LIBRARY,
  lava_rapido: LAVA_RAPIDO_LIBRARY,
  consultoria: CONSULTORIA_LIBRARY,
  clinica_estetica: CLINICA_ESTETICA_LIBRARY,
  consultorio_odontologico: CONSULTORIO_ODONTOLOGICO_LIBRARY,
};

export function getSegmentServiceLibrary(
  segment: ProductSegmentId,
): SegmentLibraryItem[] {
  return LIBRARIES[segment] ?? [];
}

export function getLibraryForContext(
  ctx: Parameters<typeof librarySegmentForContext>[0],
): SegmentLibraryItem[] {
  return getSegmentServiceLibrary(librarySegmentForContext(ctx)).filter(
    (item) => item.active,
  );
}

export function getLibraryItemById(
  segment: ProductSegmentId,
  id: string,
): SegmentLibraryItem | undefined {
  return getSegmentServiceLibrary(segment).find((item) => item.id === id);
}

export const ALL_SEGMENT_LIBRARIES = LIBRARIES;
