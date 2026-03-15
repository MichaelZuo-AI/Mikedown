import { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/appStore";

export default function SearchBar() {
  const searchOpen = useAppStore((s) => s.searchOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const [query, setQuery] = useState("");
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearHighlights = useCallback(() => {
    document.querySelectorAll("mark.search-highlight").forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ""), el);
        parent.normalize();
      }
    });
  }, []);

  // Auto-focus when opened
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Close on Escape
  useEffect(() => {
    if (!searchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen, setSearchOpen]);

  const performSearch = useCallback((searchQuery: string) => {
    clearHighlights();
    if (!searchQuery.trim()) {
      setTotalMatches(0);
      setCurrentMatch(0);
      return;
    }

    const contentEl = document.querySelector(".content");
    if (!contentEl) return;

    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text);
    }

    let matchCount = 0;
    const lowerQuery = searchQuery.toLowerCase();

    for (const node of textNodes) {
      const text = node.textContent || "";
      const lowerText = text.toLowerCase();
      let idx = lowerText.indexOf(lowerQuery);
      if (idx === -1) continue;

      const fragment = document.createDocumentFragment();
      let lastIdx = 0;

      while (idx !== -1) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
        const mark = document.createElement("mark");
        mark.className = "search-highlight";
        mark.textContent = text.slice(idx, idx + searchQuery.length);
        if (matchCount === 0) mark.classList.add("search-current");
        fragment.appendChild(mark);
        matchCount++;
        lastIdx = idx + searchQuery.length;
        idx = lowerText.indexOf(lowerQuery, lastIdx);
      }

      fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
      node.parentNode?.replaceChild(fragment, node);
    }

    setTotalMatches(matchCount);
    setCurrentMatch(matchCount > 0 ? 1 : 0);

    const first = document.querySelector("mark.search-current");
    first?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [clearHighlights]);

  const navigateMatch = useCallback((direction: 1 | -1) => {
    if (totalMatches === 0) return;

    const marks = document.querySelectorAll("mark.search-highlight");
    marks.forEach((m) => m.classList.remove("search-current"));

    let next = currentMatch + direction;
    if (next > totalMatches) next = 1;
    if (next < 1) next = totalMatches;
    setCurrentMatch(next);

    const target = marks[next - 1];
    if (target) {
      target.classList.add("search-current");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentMatch, totalMatches]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      navigateMatch(e.shiftKey ? -1 : 1);
    }
  }, [navigateMatch]);

  // Perform search when query changes
  useEffect(() => {
    performSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Clean up when closing
  useEffect(() => {
    if (!searchOpen) {
      setQuery("");
      clearHighlights();
    }
  }, [searchOpen, clearHighlights]);

  if (!searchOpen) return null;

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className="search-count">
        {totalMatches > 0 ? `${currentMatch} of ${totalMatches}` : "No matches"}
      </span>
      <button className="search-nav" onClick={() => navigateMatch(-1)} title="Previous match" aria-label="Previous match">&#x25B2;</button>
      <button className="search-nav" onClick={() => navigateMatch(1)} title="Next match" aria-label="Next match">&#x25BC;</button>
      <button className="search-close" onClick={() => setSearchOpen(false)} title="Close search" aria-label="Close search">&#x2715;</button>
    </div>
  );
}
