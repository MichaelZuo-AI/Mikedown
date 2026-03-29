/**
 * Convert HTML tables and TSV/CSV clipboard data to Markdown tables.
 * Inspired by Bokuchi-Editor/bokuchi's tableConverter utility.
 */

export function htmlTableToMarkdown(html: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) return null;

  const rows = Array.from(table.querySelectorAll("tr"));
  if (rows.length === 0) return null;

  const markdownRows: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll("td, th"));
    if (cells.length === 0) continue;

    const cellContents = cells.map((cell) => {
      let content = (cell.textContent || "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
      content = content.replace(/\|/g, "\\|");
      return content || " ";
    });

    markdownRows.push("| " + cellContents.join(" | ") + " |");

    if (markdownRows.length === 1) {
      markdownRows.push("|" + cellContents.map(() => " --- ").join("|") + "|");
    }
  }

  return markdownRows.length >= 2 ? markdownRows.join("\n") : null;
}

export function tsvCsvToMarkdown(text: string): string | null {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return null;

  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(",") ? "," : null;
  if (!delimiter) return null;

  const markdownRows: string[] = [];
  let headerCols = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = line.split(delimiter).map((c) => {
      const content = c.trim().replace(/\|/g, "\\|");
      return content || " ";
    });

    if (markdownRows.length === 0) headerCols = cells.length;
    if (cells.length !== headerCols) return null; // inconsistent columns — not a table

    markdownRows.push("| " + cells.join(" | ") + " |");

    if (markdownRows.length === 1) {
      markdownRows.push("|" + cells.map(() => " --- ").join("|") + "|");
    }
  }

  return markdownRows.length >= 3 ? markdownRows.join("\n") : null;
}

/**
 * Try to convert clipboard data to a Markdown table.
 * Returns the Markdown string, or null if the data isn't a table.
 */
export function clipboardToMarkdownTable(clipboardData: DataTransfer): string | null {
  // First try HTML table
  const html = clipboardData.getData("text/html");
  if (html && html.includes("<table") && html.includes("</table>")) {
    const result = htmlTableToMarkdown(html);
    if (result) return result;
  }

  // Then try TSV/CSV
  const text = clipboardData.getData("text/plain");
  if (text) {
    return tsvCsvToMarkdown(text);
  }

  return null;
}
