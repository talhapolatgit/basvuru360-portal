const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BR",
  "DIV",
  "EM",
  "H1",
  "H2",
  "H3",
  "H4",
  "I",
  "LI",
  "OL",
  "P",
  "SPAN",
  "STRONG",
  "U",
  "UL",
]);

/**
 * Admin rich-text içeriğini portalda güvenli göstermek için basit sanitizer.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html?.trim()) return "";

  if (typeof DOMParser === "undefined") {
    return "";
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          el.replaceWith(...Array.from(el.childNodes));
          continue;
        }
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (name.startsWith("on") || name === "srcdoc") {
            el.removeAttribute(attr.name);
            continue;
          }
          if (name === "href") {
            const href = attr.value.trim();
            if (!/^(https?:|mailto:|tel:|\/|#)/i.test(href)) {
              el.removeAttribute(attr.name);
            }
            continue;
          }
          if (name === "style") {
            const kept = [];
            const size = /font-size\s*:\s*[^;]+/i.exec(attr.value)?.[0];
            const align = /text-align\s*:\s*(left|right|center|justify)/i.exec(
              attr.value,
            )?.[0];
            if (size) kept.push(size);
            if (align) kept.push(align);
            if (kept.length) el.setAttribute("style", kept.join("; "));
            else el.removeAttribute("style");
            continue;
          }
          if (name === "align") {
            const align = attr.value.trim().toLowerCase();
            if (["left", "right", "center", "justify"].includes(align)) {
              el.style.textAlign = align;
            }
            el.removeAttribute(attr.name);
            continue;
          }
          if (name !== "class") {
            el.removeAttribute(attr.name);
          }
        }
        if (el.tagName === "A" && el.getAttribute("href")) {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
        walk(el);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.parentNode?.removeChild(child);
      }
    }
  };

  walk(doc.body);
  return doc.body.innerHTML.trim();
}

export function hasRichText(html: string | null | undefined): boolean {
  if (!html?.trim()) return false;
  const plain = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u200B/g, "")
    .trim();
  return plain.length > 0;
}
