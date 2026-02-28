import { useCallback } from "react";
import { useAppStore } from "@/store/appStore";

export default function MarkdownRenderer() {
  const htmlContent = useAppStore((s) => s.htmlContent);
  const fontSize = useAppStore((s) => s.fontSize);

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
      });
    }
  }, []);

  return (
    <div
      className="content"
      style={{ fontSize: `${fontSize / 100}rem` }}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
