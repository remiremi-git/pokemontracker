type RuntimeMove = {
  name: string;
  type: string;
  category: string;
  effect: string;
  ppCost: number | null;
  range: string;
  tags: string[];
  tier1: string;
  tier2: string;
  tier3: string;
};

type LookupResponse = {
  result: RuntimeMove | null;
  version: string | null;
};

type NormalizerModule = {
  normalizeLookupName(value: string): string;
};

let hoverTimer: number | undefined;
let activeElement: Element | null = null;
let tooltip: HTMLDivElement | null = null;
let normalizerPromise: Promise<NormalizerModule> | null = null;

function loadNormalizer(): Promise<NormalizerModule> {
  normalizerPromise ??= import(chrome.runtime.getURL("dist/shared/normalize.js"));
  return normalizerPromise;
}

document.addEventListener(
  "mouseover",
  (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const candidate = findMoveCandidate(target);
    if (!candidate || candidate === activeElement) return;

    activeElement = candidate;
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => {
      void handleHover(candidate);
    }, 180);
  },
  true
);

document.addEventListener(
  "mouseout",
  (event) => {
    if (activeElement && event.target instanceof Node && activeElement.contains(event.target)) {
      const related = event.relatedTarget;
      if (related instanceof Node && activeElement.contains(related)) return;
      activeElement = null;
      window.clearTimeout(hoverTimer);
      hideTooltip();
    }
  },
  true
);

function findMoveCandidate(target: Element): Element | null {
  const link = target.closest("a[href*='_(move)'], a[href*='/wiki/'][title$='(move)']");
  if (link) return link;

  const text = target.textContent?.trim();
  if (!text || text.length > 40) return null;

  const looksLikeMoveReference =
    target.closest("td, li, p, span") && /^[A-Z][A-Za-z0-9'’ .:-]{1,39}$/.test(text);

  return looksLikeMoveReference ? target : null;
}

async function handleHover(element: Element) {
  const rawName = getCandidateName(element);
  if (!rawName) return;

  const { normalizeLookupName } = await loadNormalizer();
  const normalizedName = normalizeLookupName(rawName);
  if (!normalizedName) return;

  const response = await sendLookup(normalizedName);
  if (!response.result || activeElement !== element) {
    hideTooltip();
    return;
  }

  showMoveTooltip(element, response.result, response.version);
}

function getCandidateName(element: Element): string {
  const title = element.getAttribute("title");
  if (title) return title.replace(/\s*\(move\)\s*$/i, "");

  return element.textContent?.trim() ?? "";
}

function sendLookup(normalizedName: string): Promise<LookupResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "lookup", entity: "move", normalizedName },
      (response) => resolve((response as LookupResponse | undefined) ?? { result: null, version: null })
    );
  });
}

function showMoveTooltip(anchor: Element, move: RuntimeMove, version: string | null) {
  tooltip ??= createTooltip();
  tooltip.innerHTML = renderMoveTooltip(move, version);
  document.documentElement.appendChild(tooltip);

  const rect = anchor.getBoundingClientRect();
  const spacing = 10;
  const top = Math.max(8, rect.bottom + spacing + window.scrollY);
  const left = Math.min(
    window.scrollX + rect.left,
    window.scrollX + document.documentElement.clientWidth - tooltip.offsetWidth - 12
  );

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${Math.max(8, left)}px`;
  tooltip.dataset.visible = "true";
}

function createTooltip(): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "ptt-tooltip";
  element.setAttribute("role", "tooltip");
  return element;
}

function hideTooltip() {
  if (tooltip) {
    tooltip.dataset.visible = "false";
    tooltip.remove();
  }
}

function renderMoveTooltip(move: RuntimeMove, version: string | null): string {
  const tags = move.tags.length > 0 ? `<div class="ptt-tags">${move.tags.map(escapeHtml).join(" · ")}</div>` : "";
  const pp = move.ppCost == null ? "PP -" : `PP ${move.ppCost}`;
  const versionText = version ? `<div class="ptt-version">Data ${escapeHtml(version)}</div>` : "";

  return `
    <div class="ptt-header">
      <div>
        <div class="ptt-title">${escapeHtml(move.name)}</div>
        <div class="ptt-meta">${escapeHtml(move.type)} · ${escapeHtml(move.category)} · ${escapeHtml(pp)}</div>
      </div>
    </div>
    ${tags}
    <div class="ptt-row"><span>Range</span><strong>${escapeHtml(move.range || "-")}</strong></div>
    <div class="ptt-effect">${escapeMarkdownLikeText(move.effect || "-")}</div>
    ${renderTier("Tier 1", move.tier1)}
    ${renderTier("Tier 2", move.tier2)}
    ${renderTier("Tier 3", move.tier3)}
    ${versionText}
  `;
}

function renderTier(label: string, value: string): string {
  if (!value) return "";
  return `<div class="ptt-tier"><span>${label}</span>${escapeMarkdownLikeText(value)}</div>`;
}

function escapeMarkdownLikeText(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return replacements[char];
  });
}
