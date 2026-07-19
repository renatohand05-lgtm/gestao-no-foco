"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  Expand,
  Eye,
  FileJson,
  FolderOpen,
  LayoutTemplate,
  Pencil,
  RotateCcw,
  Save,
  Shrink,
  Upload,
} from "lucide-react";

import { useLayout } from "@/components/executive/layout/layout-context";
import { ExecutiveExportLayout } from "@/components/executive/layout/executive-export-layout";
import { ExecutiveImportLayout } from "@/components/executive/layout/executive-import-layout";
import { ExecutiveLayoutLibrary } from "@/components/executive/layout/executive-layout-library";
import { ExecutiveResetDialog } from "@/components/executive/layout/executive-reset-dialog";
import { ExecutiveSaveLayout } from "@/components/executive/layout/executive-save-layout";
import type { StudioView } from "@/components/executive/layout/layout-ui";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exAnimations,
  exMotion,
  exShadow,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

/**
 * Toolbar Premium + persistência (Sprint 13.6).
 */
export function ExecutiveLayoutToolbar() {
  const {
    state,
    densityProfile,
    studioView,
    toggleEditMode,
    setStudioView,
    toggleFullscreen,
    cycleDensityProfile,
    duplicate,
    saveLayout,
    discardChanges,
    isDirty,
    persistStatus,
  } = useLayout();

  const [saveOpen, setSaveOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const inStudio = studioView !== "published";

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/45 bg-white/70 p-2 backdrop-blur-md dark:border-white/10 dark:bg-card/80",
          exShadow.toolbar,
          exAnimations.fade,
        )}
        aria-label="Toolbar de layout"
      >
        <ViewSegment value={studioView} onChange={setStudioView} />

        <span className="mx-1 hidden h-6 w-px bg-slate-200/80 sm:block dark:bg-white/10" />

        <Button
          type="button"
          size="sm"
          variant={state.fullscreen ? "default" : "ghost"}
          className={cn("rounded-xl", exAnimations.focusRing, exMotion.ripple)}
          onClick={toggleFullscreen}
          aria-pressed={state.fullscreen}
        >
          <DsIcon icon={Expand} size="sm" className="mr-1.5" />
          <span className="hidden sm:inline">Tela cheia</span>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn("rounded-xl", exAnimations.focusRing, exMotion.ripple)}
          onClick={cycleDensityProfile}
          aria-label={`Densidade: ${densityProfile}`}
        >
          <DsIcon icon={Shrink} size="sm" className="mr-1.5" />
          <span className="hidden sm:inline">
            {densityProfile === "executive"
              ? "Executivo"
              : densityProfile === "compact"
                ? "Compacto"
                : "Confortável"}
          </span>
        </Button>

        {inStudio ? (
          <>
            <span className="mx-1 hidden h-6 w-px bg-slate-200/80 sm:block dark:bg-white/10" />

            <Button
              type="button"
              size="sm"
              variant="default"
              className={cn("rounded-xl", exAnimations.focusRing)}
              disabled={persistStatus === "saving"}
              onClick={() => void saveLayout()}
            >
              <DsIcon icon={Save} size="sm" className="mr-1.5" />
              Salvar
            </Button>

            {isDirty ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn("rounded-xl", exAnimations.focusRing)}
                onClick={discardChanges}
              >
                Descartar
              </Button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium",
                  "hover:bg-slate-100 dark:hover:bg-white/10",
                  exAnimations.focusRing,
                  exMotion.press,
                )}
              >
                <DsIcon icon={FileJson} size="sm" />
                <span className="hidden sm:inline">Arquivo</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-44">
                <DropdownMenuLabel>Arquivo</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSaveOpen(true)}>
                  <DsIcon icon={Save} size="sm" className="mr-2" />
                  Salvar como…
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void duplicate()}>
                  <DsIcon icon={Copy} size="sm" className="mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setImportOpen(true)}>
                  <DsIcon icon={Upload} size="sm" className="mr-2" />
                  Importar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExportOpen(true)}>
                  <DsIcon icon={Download} size="sm" className="mr-2" />
                  Exportar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium",
                  "hover:bg-slate-100 dark:hover:bg-white/10",
                  exAnimations.focusRing,
                  exMotion.press,
                )}
              >
                <DsIcon icon={LayoutTemplate} size="sm" />
                <span className="hidden sm:inline">Workspace</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-44">
                <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setLibraryOpen(true)}>
                  <DsIcon icon={FolderOpen} size="sm" className="mr-2" />
                  Meus layouts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStudioView("edit")}>
                  <DsIcon icon={Pencil} size="sm" className="mr-2" />
                  Personalizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStudioView("preview")}>
                  <DsIcon icon={Eye} size="sm" className="mr-2" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStudioView("published")}>
                  <DsIcon icon={Check} size="sm" className="mr-2" />
                  Concluir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setResetOpen(true)}>
                  <DsIcon icon={RotateCcw} size="sm" className="mr-2" />
                  Restaurar CEO
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "rounded-xl border-slate-200 bg-white dark:border-white/10",
              exAnimations.focusRing,
              exMotion.ripple,
            )}
            onClick={toggleEditMode}
          >
            <DsIcon icon={LayoutTemplate} size="sm" className="mr-1.5" />
            Personalizar
          </Button>
        )}

        <span
          className={cn(
            "ml-auto hidden truncate sm:inline",
            exTypography.caption,
          )}
        >
          {state.layoutName}
          {studioView === "preview" ? " · Preview" : null}
          {isDirty ? " · •" : null}
        </span>
      </div>

      <ExecutiveSaveLayout open={saveOpen} onOpenChange={setSaveOpen} />
      <ExecutiveResetDialog open={resetOpen} onOpenChange={setResetOpen} />
      <ExecutiveExportLayout open={exportOpen} onOpenChange={setExportOpen} />
      <ExecutiveImportLayout open={importOpen} onOpenChange={setImportOpen} />
      <ExecutiveLayoutLibrary open={libraryOpen} onOpenChange={setLibraryOpen} />
    </>
  );
}

function ViewSegment({
  value,
  onChange,
}: {
  value: StudioView;
  onChange: (v: StudioView) => void;
}) {
  const items: Array<{ id: StudioView; label: string; icon: typeof Pencil }> = [
    { id: "edit", label: "Editar", icon: Pencil },
    { id: "preview", label: "Preview", icon: Eye },
    { id: "published", label: "Publicado", icon: Check },
  ];

  return (
    <div
      className="inline-flex rounded-xl bg-slate-100/90 p-0.5 dark:bg-white/5"
      role="tablist"
      aria-label="Modo do workspace"
    >
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium sm:px-3",
              exMotion.transition,
              exAnimations.focusRing,
              exMotion.press,
              active
                ? "bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white",
            )}
            onClick={() => onChange(item.id)}
          >
            <DsIcon icon={item.icon} size="sm" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
