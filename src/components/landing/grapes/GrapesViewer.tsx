"use client";

interface GrapesViewerProps {
  html: string;
  css: string;
}

export function GrapesViewer({ html, css }: GrapesViewerProps) {
  return (
    <div className="gjs-landing-view min-h-dvh">
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
