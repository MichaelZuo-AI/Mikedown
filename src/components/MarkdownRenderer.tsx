import { useCallback, useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAppStore } from "@/store/appStore";

async function renderMermaidNodes(el: HTMLElement) {
  const nodes = el.querySelectorAll<HTMLElement>(".mermaid:not(.mermaid-empty)");
  if (nodes.length === 0) return;

  const mermaid = (await import("mermaid")).default;

  const isDark =
    document.documentElement.getAttribute("data-theme") !== "light";
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    securityLevel: "strict",
  });

  for (const node of Array.from(nodes)) {
    // Preserve original source for re-render on theme change
    if (!node.dataset.source) {
      node.dataset.source = node.textContent || "";
    }
    node.removeAttribute("data-processed");
    node.textContent = node.dataset.source;

    try {
      await mermaid.run({ nodes: [node] });
      node.classList.remove("mermaid-error");
    } catch (err) {
      console.error("Mermaid rendering failed for node:", err);
      node.textContent = node.dataset.source;
      node.classList.add("mermaid-error");
    }
  }
}

function isLocalPath(src: string): boolean {
  if (!src) return false;
  // Skip URLs, data URIs, and blob URIs
  if (/^(https?:|data:|blob:|asset:)/i.test(src)) return false;
  // Skip already-converted asset localhost URLs
  if (src.includes("asset.localhost")) return false;
  return true;
}

function normalizePath(p: string): string {
  const parts = p.split("/");
  const out: string[] = [];
  for (const seg of parts) {
    if (seg === "..") out.pop();
    else if (seg !== "." && seg !== "") out.push(seg);
  }
  return "/" + out.join("/");
}

function resolveImageSrc(src: string, fileDir: string): string {
  if (src.startsWith("/")) {
    return convertFileSrc(src);
  }
  // Relative path — resolve against file directory and normalize ../
  const resolved = normalizePath(`${fileDir}/${src}`);
  return convertFileSrc(resolved);
}

function resolveLocalImages(el: HTMLElement, filePath: string) {
  if (!filePath) return;
  const fileDir = filePath.replace(/[/\\][^/\\]*$/, "");
  const imgs = el.querySelectorAll<HTMLImageElement>("img");
  for (const img of Array.from(imgs)) {
    const src = img.getAttribute("src");
    if (src && isLocalPath(src)) {
      img.src = resolveImageSrc(src, fileDir);
      img.onerror = () => {
        const placeholder = document.createElement("div");
        placeholder.className = "img-error";
        placeholder.textContent = `Image not found: ${src}`;
        img.replaceWith(placeholder);
      };
    }
  }
}

export default function MarkdownRenderer() {
  const htmlContent = useAppStore((s) => s.htmlContent);
  const filePath = useAppStore((s) => s.filePath);
  const fontSize = useAppStore((s) => s.fontSize);
  const contentRef = useRef<HTMLDivElement>(null);
  const pendingRender = useRef<number | null>(null);

  const scheduleRender = useCallback(() => {
    if (pendingRender.current) cancelAnimationFrame(pendingRender.current);
    pendingRender.current = requestAnimationFrame(() => {
      pendingRender.current = null;
      const el = contentRef.current;
      if (el) renderMermaidNodes(el);
    });
  }, []);

  // Render mermaid diagrams when content changes
  useEffect(() => {
    scheduleRender();
  }, [htmlContent, scheduleRender]);

  // Resolve local image paths to Tauri asset protocol URLs
  useEffect(() => {
    const el = contentRef.current;
    if (el && filePath) {
      resolveLocalImages(el, filePath);
    }
  }, [htmlContent, filePath]);

  // Re-render mermaid diagrams on theme change
  useEffect(() => {
    const observer = new MutationObserver(() => scheduleRender());

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [scheduleRender]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.matches("[data-copy]")) {
      const code = target.closest("pre")?.querySelector("code");
      if (!code) return;
      navigator.clipboard.writeText(code.textContent || "").then(() => {
        target.textContent = "Copied!";
        target.classList.add("copied");
        setTimeout(() => {
          target.textContent = "Copy";
          target.classList.remove("copied");
        }, 2000);
      }).catch(() => {
        target.textContent = "Failed";
        setTimeout(() => { target.textContent = "Copy"; }, 2000);
      });
      return;
    }

    // Interactive checkbox toggle
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      e.preventDefault();
      const el = contentRef.current;
      if (!el) return;
      // Find which checkbox index this is in the rendered HTML
      const allCheckboxes = Array.from(el.querySelectorAll('input[type="checkbox"]'));
      const cbIndex = allCheckboxes.indexOf(target);
      if (cbIndex === -1) return;

      const store = useAppStore.getState();
      const md = store.markdownContent;
      const pattern = /^(\s*[-*+]\s+)\[([ xX])\]/gm;
      let matchIndex = 0;
      let result: RegExpExecArray | null;
      while ((result = pattern.exec(md)) !== null) {
        if (matchIndex === cbIndex) {
          const isChecked = result[2] !== " ";
          const replacement = isChecked ? `${result[1]}[ ]` : `${result[1]}[x]`;
          const newMd = md.slice(0, result.index) + replacement + md.slice(result.index + result[0].length);
          store.setMarkdownContent(newMd);
          break;
        }
        matchIndex++;
      }
    }
  }, []);

  return (
    <div
      ref={contentRef}
      className="content"
      style={{ zoom: fontSize / 100 }}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
