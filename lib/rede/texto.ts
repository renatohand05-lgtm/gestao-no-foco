/** Rede de lojas — utilidades de texto (puras). */

/** "Vila Mariana" → "vila-mariana" (mesmo formato exigido pelo banco). */
export function slugDe(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
