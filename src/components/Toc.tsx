import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";

interface TocEntry {
  id: string;
  text: string;
  level: string; // "h1" | "h2" | "h3" | "h4"
}

export default function Toc() {
  const htmlContent = useAppStore((s) => s.htmlContent);
  const [entries, setEntries] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Build ToC entries from DOM after render
  useEffect(() => {
    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      const allHeadings = document.querySelectorAll(
        ".content h1, .content h2, .content h3, .content h4",
      );
      const headings = Array.from(allHeadings).slice(0, 500);
      const items: TocEntry[] = [];
      headings.forEach((h) => {
        items.push({
          id: h.id,
          text: h.textContent || "",
          level: h.tagName.toLowerCase(),
        });
      });
      setEntries(items);
    }, 50);
    return () => clearTimeout(timer);
  }, [htmlContent]);

  // Scroll-spy: update active heading on scroll (throttled with rAF)
  useEffect(() => {
    const wrap = document.querySelector(".content-wrap");
    if (!wrap) return;

    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const allH = document.querySelectorAll(
          ".content h1, .content h2, .content h3, .content h4",
        );
        const headings = Array.from(allH).slice(0, 500);
        let active: Element | null = null;
        headings.forEach((h) => {
          if (h instanceof HTMLElement && h.offsetTop - wrap.scrollTop <= 80) {
            active = h;
          }
        });
        if (active) setActiveId((active as HTMLElement).id);
      });
    };

    wrap.addEventListener("scroll", onScroll);
    return () => {
      wrap.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [htmlContent]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setActiveId(id);
  }, []);

  return (
    <nav className="toc" aria-label="Table of contents">
      <div className="toc-title">Contents</div>
      {entries.map((entry) => (
        <button
          key={entry.id}
          className={`toc-item ${entry.level}${activeId === entry.id ? " active" : ""}`}
          onClick={() => scrollTo(entry.id)}
        >
          {entry.text}
        </button>
      ))}
    </nav>
  );
}
