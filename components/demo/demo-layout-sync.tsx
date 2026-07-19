"use client";

import { useEffect, useRef } from "react";

import { useDemoMode } from "@/components/demo/demo-mode-provider";
import { useLayout } from "@/components/executive/layout/layout-context";

/**
 * Alinha chrome do layout ao Demo Mode sem alterar o Layout Engine.
 */
export function DemoLayoutSync() {
  const { mode, active } = useDemoMode();
  const { setStudioView, state, toggleFullscreen } = useLayout();
  const appliedFs = useRef(false);

  useEffect(() => {
    if (active) {
      setStudioView("published");
    }
  }, [active, mode, setStudioView]);

  useEffect(() => {
    const wantFs = active && mode === "fullscreen";
    if (wantFs && !state.fullscreen) {
      toggleFullscreen();
      appliedFs.current = true;
      return;
    }
    if (!wantFs && state.fullscreen && appliedFs.current) {
      toggleFullscreen();
      appliedFs.current = false;
    }
  }, [active, mode, state.fullscreen, toggleFullscreen]);

  return null;
}
