/**
 * Leitor de Markdown enxuto para as respostas do assistente.
 * Gera uma árvore de blocos (títulos, listas, tabelas, citações…) que a tela
 * transforma em elementos React — nunca HTML cru, então não há como a IA
 * (ou um texto colado nos dados) injetar código na página.
 *
 * Sem dependências: roda no servidor, no navegador e nos testes em Node.
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "br" }
  | { t: "bold"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; c: Inline[] };

export type ListItem = {
  c: Inline[];
  /** true/false para "- [x]"/"- [ ]"; null para item comum. */
  checked: boolean | null;
  children: Block[];
};

export type Block =
  | { t: "heading"; level: 1 | 2 | 3 | 4; c: Inline[] }
  | { t: "paragraph"; c: Inline[] }
  | { t: "list"; ordered: boolean; start: number; items: ListItem[] }
  | {
      t: "table";
      head: Inline[][];
      align: Array<"left" | "right" | "center">;
      rows: Inline[][][];
    }
  | { t: "quote"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "hr" };

/** Só links internos (/caminho) ou https — o resto vira texto simples. */
export function isSafeHref(href: string): boolean {
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  return /^https:\/\/[^\s]+$/i.test(href);
}

const INLINE_SOURCE =
  "(\\*\\*([^*]+?)\\*\\*)|(`([^`]+)`)|(\\[([^\\]]+)\\]\\(([^)\\s]+)\\))|(\\*([^*\\s][^*]*?)\\*)";

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  // Uma regex nova por chamada: o parser chama a si mesmo para o conteúdo do
  // negrito/link, e um RegExp global compartilhado perderia a posição (loop infinito).
  const re = new RegExp(INLINE_SOURCE, "g");
  for (let m = re.exec(source); m; m = re.exec(source)) {
    if (m.index > last) out.push({ t: "text", v: source.slice(last, m.index) });
    if (m[1] !== undefined) {
      out.push({ t: "bold", c: parseInline(m[2]) });
    } else if (m[3] !== undefined) {
      out.push({ t: "code", v: m[4] });
    } else if (m[5] !== undefined) {
      const href = m[7];
      if (isSafeHref(href)) out.push({ t: "link", href, c: parseInline(m[6]) });
      else out.push({ t: "text", v: m[6] });
    } else if (m[8] !== undefined) {
      out.push({ t: "em", c: parseInline(m[9]) });
    }
    last = m.index + m[0].length;
  }
  if (last < source.length) out.push({ t: "text", v: source.slice(last) });
  return out;
}

/** Várias linhas de um mesmo parágrafo: cada quebra vira <br> (estilo chat). */
function parseLines(lines: string[]): Inline[] {
  const out: Inline[] = [];
  lines.forEach((line, i) => {
    if (i > 0) out.push({ t: "br" });
    out.push(...parseInline(line.trim()));
  });
  return out;
}

const HEADING_RE = /^(#{1,4})\s+(.*?)\s*#*\s*$/;
const HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const LIST_RE = /^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/;
const FENCE_RE = /^\s*```/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function isBlockStart(line: string): boolean {
  return (
    HEADING_RE.test(line) ||
    HR_RE.test(line) ||
    LIST_RE.test(line) ||
    FENCE_RE.test(line) ||
    QUOTE_RE.test(line)
  );
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "\\" && trimmed[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (ch === "|") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parseAlign(sepLine: string): Array<"left" | "right" | "center"> {
  return splitRow(sepLine).map((c) => {
    const left = c.startsWith(":");
    const right = c.endsWith(":");
    return left && right ? "center" : right ? "right" : "left";
  });
}

function parseList(lines: string[], start: number): { block: Block; next: number } {
  const first = LIST_RE.exec(lines[start])!;
  const baseIndent = first[1].replace(/\t/g, "  ").length;
  const ordered = /\d/.test(first[2]);
  const startNumber = ordered ? Number.parseInt(first[2], 10) : 1;
  const items: ListItem[] = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      // linha em branco: a lista continua só se o próximo item for do mesmo nível
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      const nextItem = j < lines.length ? LIST_RE.exec(lines[j]) : null;
      if (
        nextItem &&
        nextItem[1].replace(/\t/g, "  ").length >= baseIndent &&
        // uma lista numerada logo após uma de marcadores (ou o contrário) é outra lista
        (nextItem[1].replace(/\t/g, "  ").length >= baseIndent + 2 ||
          /\d/.test(nextItem[2]) === ordered)
      ) {
        i = j;
        continue;
      }
      break;
    }

    const m = LIST_RE.exec(line);
    if (!m) {
      const indent = line.match(/^\s*/)![0].replace(/\t/g, "  ").length;
      if (indent > baseIndent && items.length > 0 && !isBlockStart(line)) {
        const item = items[items.length - 1];
        item.c.push({ t: "br" }, ...parseInline(line.trim()));
        i++;
        continue;
      }
      break;
    }

    const indent = m[1].replace(/\t/g, "  ").length;
    if (indent < baseIndent) break;
    if (indent >= baseIndent + 2 && items.length > 0) {
      const child = parseList(lines, i);
      items[items.length - 1].children.push(child.block);
      i = child.next;
      continue;
    }

    if (/\d/.test(m[2]) !== ordered) break; // mudou o tipo de lista: começa outra

    let text = m[3];
    let checked: boolean | null = null;
    const task = /^\[( |x|X)\]\s+(.*)$/.exec(text);
    if (task) {
      checked = task[1].toLowerCase() === "x";
      text = task[2];
    }
    items.push({ c: parseInline(text), checked, children: [] });
    i++;
  }

  return {
    block: { t: "list", ordered, start: startNumber, items },
    next: Math.max(i, start + 1),
  };
}

export function parseMarkdownLite(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (FENCE_RE.test(line)) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !FENCE_RE.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // fecha a cerca (ou fim do texto, se ainda em streaming)
      blocks.push({ t: "code", v: body.join("\n") });
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      blocks.push({
        t: "heading",
        level: heading[1].length as 1 | 2 | 3 | 4,
        c: parseInline(heading[2]),
      });
      i++;
      continue;
    }

    if (HR_RE.test(line)) {
      blocks.push({ t: "hr" });
      i++;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      const head = splitRow(line).map(parseInline);
      const align = parseAlign(lines[i + 1]);
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() !== "" && lines[i].includes("|")) {
        const cells = splitRow(lines[i]).map(parseInline);
        while (cells.length < head.length) cells.push([]);
        rows.push(cells.slice(0, head.length));
        i++;
      }
      blocks.push({ t: "table", head, align, rows });
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        body.push(QUOTE_RE.exec(lines[i])![1]);
        i++;
      }
      blocks.push({ t: "quote", c: parseLines(body) });
      continue;
    }

    if (LIST_RE.test(line)) {
      const { block, next } = parseList(lines, i);
      blocks.push(block);
      i = next;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
      // uma tabela começando na próxima linha também encerra o parágrafo
      if (
        para.length > 0 &&
        lines[i].includes("|") &&
        i + 1 < lines.length &&
        TABLE_SEP_RE.test(lines[i + 1])
      ) {
        break;
      }
      para.push(lines[i]);
      i++;
    }
    if (para.length > 0) blocks.push({ t: "paragraph", c: parseLines(para) });
    else i++;
  }

  return blocks;
}
