import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import {
  parseMarkdownLite,
  type Block,
  type Inline,
  type ListItem,
} from "@/lib/ai-assistant/markdown-lite";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  /** Slug da empresa: só links internos desta empresa viram links clicáveis. */
  tenantSlug?: string;
  className?: string;
};

const LINK_CLASS =
  "font-medium text-primary underline underline-offset-2 hover:opacity-80";

function renderInlines(
  nodes: Inline[],
  tenantSlug: string | undefined,
  prefix: string,
): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${prefix}-${i}`;
    switch (node.t) {
      case "text":
        return <Fragment key={key}>{node.v}</Fragment>;
      case "br":
        return <br key={key} />;
      case "bold":
        return (
          <strong key={key} className="font-semibold text-foreground">
            {renderInlines(node.c, tenantSlug, key)}
          </strong>
        );
      case "em":
        return <em key={key}>{renderInlines(node.c, tenantSlug, key)}</em>;
      case "code":
        return (
          <code
            key={key}
            className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.85em]"
          >
            {node.v}
          </code>
        );
      case "link": {
        const filhos = renderInlines(node.c, tenantSlug, key);
        if (node.href.startsWith("/")) {
          // Só abre telas da própria empresa; qualquer outro caminho vira texto.
          if (tenantSlug && node.href.startsWith(`/${tenantSlug}/`)) {
            return (
              <Link key={key} href={node.href} className={LINK_CLASS}>
                {filhos}
              </Link>
            );
          }
          return <Fragment key={key}>{filhos}</Fragment>;
        }
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            {filhos}
          </a>
        );
      }
    }
  });
}

function renderListItem(
  item: ListItem,
  tenantSlug: string | undefined,
  prefix: string,
): ReactNode {
  return (
    <li key={prefix} className={item.checked !== null ? "list-none" : undefined}>
      {item.checked !== null ? (
        <span aria-hidden className="mr-1.5 inline-block">
          {item.checked ? "☑" : "☐"}
        </span>
      ) : null}
      {renderInlines(item.c, tenantSlug, prefix)}
      {item.children.map((child, i) => renderBlock(child, tenantSlug, `${prefix}-c${i}`))}
    </li>
  );
}

function renderBlock(
  block: Block,
  tenantSlug: string | undefined,
  key: string,
): ReactNode {
  switch (block.t) {
    case "heading":
      return block.level <= 2 ? (
        <h3
          key={key}
          className="mb-1.5 mt-4 border-l-2 border-[var(--brand-gold,#C9A84C)] pl-2 text-[13px] font-semibold leading-snug text-foreground first:mt-0"
        >
          {renderInlines(block.c, tenantSlug, key)}
        </h3>
      ) : (
        <h4
          key={key}
          className="mb-1 mt-3 text-[13px] font-semibold leading-snug text-foreground first:mt-0"
        >
          {renderInlines(block.c, tenantSlug, key)}
        </h4>
      );
    case "paragraph":
      return (
        <p key={key} className="my-1.5 leading-relaxed first:mt-0 last:mb-0">
          {renderInlines(block.c, tenantSlug, key)}
        </p>
      );
    case "list": {
      const itens = block.items.map((it, i) => renderListItem(it, tenantSlug, `${key}-${i}`));
      return block.ordered ? (
        <ol
          key={key}
          start={block.start}
          className="my-1.5 list-decimal space-y-1 pl-5 leading-relaxed marker:text-muted-foreground"
        >
          {itens}
        </ol>
      ) : (
        <ul
          key={key}
          className="my-1.5 list-disc space-y-1 pl-5 leading-relaxed marker:text-muted-foreground"
        >
          {itens}
        </ul>
      );
    }
    case "table":
      return (
        <div key={key} className="my-2.5 overflow-x-auto rounded-lg border border-border/70 bg-background/60">
          <table className="w-full border-collapse text-xs leading-snug [overflow-wrap:normal]">
            <thead>
              <tr className="bg-muted/70">
                {block.head.map((cell, i) => (
                  <th
                    key={`${key}-h${i}`}
                    className={cn(
                      "px-2.5 py-1.5 font-semibold text-foreground",
                      block.align[i] === "right" && "text-right",
                      block.align[i] === "center" && "text-center",
                      (block.align[i] ?? "left") === "left" && "text-left",
                    )}
                  >
                    {renderInlines(cell, tenantSlug, `${key}-h${i}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={`${key}-r${r}`} className="border-t border-border/60">
                  {row.map((cell, i) => (
                    <td
                      key={`${key}-r${r}-${i}`}
                      className={cn(
                        "px-2.5 py-1.5 align-top",
                        block.align[i] === "right" && "text-right tabular-nums",
                        block.align[i] === "center" && "text-center",
                      )}
                    >
                      {renderInlines(cell, tenantSlug, `${key}-r${r}-${i}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "quote":
      return (
        <blockquote
          key={key}
          className="my-2 rounded-r-md border-l-2 border-[var(--brand-gold,#C9A84C)] bg-background/60 px-3 py-1.5 text-muted-foreground"
        >
          {renderInlines(block.c, tenantSlug, key)}
        </blockquote>
      );
    case "code":
      return (
        <pre
          key={key}
          className="my-2 overflow-x-auto rounded-md bg-background/70 p-2.5 font-mono text-xs leading-relaxed"
        >
          {block.v}
        </pre>
      );
    case "hr":
      return <hr key={key} className="my-3 border-border/70" />;
  }
}

/** Resposta da IA formatada (títulos, listas, tabelas de plano de ação…). */
export function MarkdownView({ text, tenantSlug, className }: Props) {
  const blocks = parseMarkdownLite(text);
  return (
    <div className={cn("text-sm [overflow-wrap:anywhere]", className)}>
      {blocks.map((b, i) => renderBlock(b, tenantSlug, `b${i}`))}
    </div>
  );
}
