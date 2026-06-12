"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import grapesjs, { type Editor } from "grapesjs";
import gjsPresetWebpage from "grapesjs-preset-webpage";
import "grapesjs/dist/css/grapes.min.css";
import { RocketLaunch, X } from "@phosphor-icons/react";
import { buildDefaultLandingHtml, DEFAULT_LANDING_CSS } from "@/components/landing/grapes/build-default-page";
import { apiFetch } from "@/lib/api-client";
import type { LandingPagePayload } from "@/lib/landing-page";
import type { PlatformEvent } from "@/types";

interface GrapesEditorProps {
  event: PlatformEvent;
  initialPage: LandingPagePayload | null;
  onExit: () => void;
}

export function GrapesEditor({ event, initialPage, onExit }: GrapesEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || editorRef.current) return;

    const editor = grapesjs.init({
      container,
      height: "100%",
      width: "auto",
      fromElement: false,
      storageManager: false,
      noticeOnUnload: false,
      plugins: [gjsPresetWebpage],
      pluginsOpts: {
        "gjs-preset-webpage": {
          blocksBasicOpts: { flexGrid: true },
        },
      },
      deviceManager: {
        devices: [
          { id: "desktop", name: "Desktop", width: "" },
          { id: "tablet", name: "Tablet", width: "768px", widthMedia: "992px" },
          { id: "mobile", name: "Mobile", width: "375px", widthMedia: "480px" },
        ],
      },
      canvas: {
        styles: [
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
        ],
      },
    });

    if (initialPage?.projectData) {
      editor.loadProjectData(initialPage.projectData);
    } else if (initialPage?.html) {
      editor.setComponents(initialPage.html);
      editor.setStyle(initialPage.css || DEFAULT_LANDING_CSS);
    } else {
      editor.setComponents(buildDefaultLandingHtml(event));
      editor.setStyle(DEFAULT_LANDING_CSS);
    }

    editorRef.current = editor;

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [event, initialPage]);

  const handlePublish = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || saving) return;

    setSaving(true);
    setStatus(null);
    try {
      await apiFetch(event.slug, "/landing-page", {
        method: "PUT",
        body: JSON.stringify({
          projectData: editor.getProjectData() as Record<string, unknown>,
          html: editor.getHtml(),
          css: editor.getCss(),
        }),
      });
      setStatus("Published");
      setTimeout(() => setStatus(null), 2500);
    } catch {
      setStatus("Failed to publish");
    } finally {
      setSaving(false);
    }
  }, [event.slug, saving]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#1e1e1e]">
      <header className="flex shrink-0 items-center justify-between border-b border-[#3d3d3d] bg-[#222] px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-[#888]">Editing landing page</p>
          <p className="truncate text-[13px] font-semibold text-[#eee]">{event.title}</p>
        </div>
        <div className="flex items-center gap-2">
          {status && (
            <span className="text-[11px] text-[#aaa]" aria-live="polite">
              {status}
            </span>
          )}
          <button
            type="button"
            onClick={onExit}
            className="flex h-8 items-center gap-1 rounded px-2.5 text-[12px] text-[#aaa] hover:bg-[#333] hover:text-white"
          >
            <X size={14} />
            Exit
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving}
            className="flex h-8 items-center gap-1.5 rounded bg-[#0084ff] px-3 text-[12px] font-semibold text-white hover:bg-[#0073e6] disabled:opacity-60"
          >
            <RocketLaunch size={14} weight="fill" />
            {saving ? "Publishing…" : "Publish"}
          </button>
        </div>
      </header>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  );
}
