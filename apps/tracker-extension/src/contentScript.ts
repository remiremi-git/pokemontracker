type EntityType = "move" | "ability";

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

type RuntimeAbility = {
  name: string;
  category: string;
  effect: string;
};

type LookupResult =
  | { entity: "move"; item: RuntimeMove; version: string | null }
  | { entity: "ability"; item: RuntimeAbility; version: string | null };

type LookupResponse<T> = {
  result: T | null;
  version: string | null;
};

type Candidate = {
  element: Element;
  entity?: EntityType;
  name: string;
};

type NormalizerModule = {
  normalizeLookupName(value: string): string;
};

let hoverTimer: number | undefined;
let activeElement: Element | null = null;
let tooltip: HTMLDivElement | null = null;
let pageCard: HTMLElement | null = null;
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

    const candidate = findLookupCandidate(target);
    if (!candidate || candidate.element === activeElement) return;

    activeElement = candidate.element;
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void showPageEntityCard());
} else {
  void showPageEntityCard();
}

function findLookupCandidate(target: Element): Candidate | null {
  const link = target.closest("a[href*='_(move)'], a[href*='_(Ability)'], a[href*='_(ability)']");
  if (link) {
    const name = getCandidateName(link);
    if (!name) return null;
    return {
      element: link,
      entity: inferEntityFromElement(link),
      name,
    };
  }

  const titledLink = target.closest("a[href*='/wiki/'][title$='(move)'], a[href*='/wiki/'][title$='(Ability)']");
  if (titledLink) {
    const name = getCandidateName(titledLink);
    if (!name) return null;
    return {
      element: titledLink,
      entity: inferEntityFromElement(titledLink),
      name,
    };
  }

  const text = target.textContent?.trim();
  if (!text || text.length > 48) return null;

  const looksLikeReference =
    target.closest("td, li, p, span") && /^[A-Z][A-Za-z0-9'’ .:-]{1,47}$/.test(text);

  return looksLikeReference ? { element: target, name: text } : null;
}

async function handleHover(candidate: Candidate) {
  const result = await lookupCandidate(candidate);
  if (!result || activeElement !== candidate.element) {
    hideTooltip();
    return;
  }

  showTooltip(candidate.element, result);
}

function getCandidateName(element: Element): string {
  const title = element.getAttribute("title");
  const source = title || element.textContent || "";

  return source
    .replace(/\s*\((?:move|ability)\)\s*$/i, "")
    .replace(/_/g, " ")
    .trim();
}

function inferEntityFromElement(element: Element): EntityType | undefined {
  const href = element.getAttribute("href") ?? "";
  const title = element.getAttribute("title") ?? "";
  const source = `${href} ${title}`;

  if (/\(move\)|_\(move\)/i.test(source)) return "move";
  if (/\(ability\)|_\(ability\)/i.test(source)) return "ability";

  return undefined;
}

async function lookupCandidate(candidate: Candidate): Promise<LookupResult | null> {
  const { normalizeLookupName } = await loadNormalizer();
  const normalizedName = normalizeLookupName(candidate.name);
  if (!normalizedName) return null;

  if (candidate.entity) {
    return lookupEntity(candidate.entity, normalizedName);
  }

  return (await lookupEntity("move", normalizedName)) ?? (await lookupEntity("ability", normalizedName));
}

async function lookupEntity(entity: EntityType, normalizedName: string): Promise<LookupResult | null> {
  const response =
    entity === "move"
      ? await sendLookup<RuntimeMove>("move", normalizedName)
      : await sendLookup<RuntimeAbility>("ability", normalizedName);

  if (!response.result) return null;

  return entity === "move"
    ? { entity, item: response.result as RuntimeMove, version: response.version }
    : { entity, item: response.result as RuntimeAbility, version: response.version };
}

function sendLookup<T>(entity: EntityType, normalizedName: string): Promise<LookupResponse<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "lookup", entity, normalizedName }, (response) =>
      resolve((response as LookupResponse<T> | undefined) ?? { result: null, version: null })
    );
  });
}

function showTooltip(anchor: Element, result: LookupResult) {
  tooltip ??= createTooltip();
  tooltip.innerHTML = renderLookupCard(result, { dismissable: false });
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

async function showPageEntityCard() {
  const pageCandidate = getPageCandidate();
  if (!pageCandidate) return;

  const result = await lookupCandidate(pageCandidate);
  if (!result) return;

  pageCard?.remove();
  const card = document.createElement("aside");
  card.className = "ptt-page-card";
  card.innerHTML = renderLookupCard(result, { dismissable: true });
  document.documentElement.appendChild(card);
  pageCard = card;

  card.querySelector<HTMLButtonElement>(".ptt-close")?.addEventListener("click", () => {
    pageCard?.remove();
    pageCard = null;
  });
}

function getPageCandidate(): Candidate | null {
  const match = window.location.pathname.match(/\/wiki\/([^/?#]+)_\((move|ability)\)$/i);
  if (!match) return null;

  const encodedName = match[1];
  const entity = match[2]?.toLowerCase() as EntityType | undefined;
  if (!encodedName || !entity) return null;

  return {
    element: document.documentElement,
    entity,
    name: decodeURIComponent(encodedName).replace(/_/g, " "),
  };
}

function renderLookupCard(result: LookupResult, options: { dismissable: boolean }): string {
  const close = options.dismissable
    ? `<button type="button" class="ptt-close" aria-label="Dismiss Pokemon tabletop card">x</button>`
    : "";

  return `
    ${close}
    ${result.entity === "move" ? renderMoveContent(result.item, result.version) : renderAbilityContent(result.item, result.version)}
  `;
}

function renderMoveContent(move: RuntimeMove, version: string | null): string {
  const tags = move.tags.length > 0 ? `<div class="ptt-tags">${move.tags.map(escapeHtml).join(" - ")}</div>` : "";
  const pp = move.ppCost == null ? "PP -" : `PP ${move.ppCost}`;
  const versionText = version ? `<div class="ptt-version">Data ${escapeHtml(version)}</div>` : "";

  return `
    <div class="ptt-header">
      <div>
        <div class="ptt-kicker">Move</div>
        <div class="ptt-title">${escapeHtml(move.name)}</div>
        <div class="ptt-meta">${escapeHtml(move.type)} - ${escapeHtml(move.category)} - ${escapeHtml(pp)}</div>
      </div>
    </div>
    ${tags}
    <div class="ptt-row"><span>Range</span><strong>${renderInlineMarkdown(move.range || "-")}</strong></div>
    <div class="ptt-effect">${renderInlineMarkdown(move.effect || "-")}</div>
    ${renderTier("Tier 1", move.tier1)}
    ${renderTier("Tier 2", move.tier2)}
    ${renderTier("Tier 3", move.tier3)}
    ${versionText}
  `;
}

function renderAbilityContent(ability: RuntimeAbility, version: string | null): string {
  const versionText = version ? `<div class="ptt-version">Data ${escapeHtml(version)}</div>` : "";

  return `
    <div class="ptt-header">
      <div>
        <div class="ptt-kicker">Ability</div>
        <div class="ptt-title">${escapeHtml(ability.name)}</div>
        <div class="ptt-meta">${escapeHtml(ability.category || "Ability")}</div>
      </div>
    </div>
    <div class="ptt-effect">${renderInlineMarkdown(ability.effect || "-")}</div>
    ${versionText}
  `;
}

function renderTier(label: string, value: string): string {
  if (!value) return "";
  return `<div class="ptt-tier"><span>${label}</span>${renderInlineMarkdown(value)}</div>`;
}

function renderInlineMarkdown(value: string): string {
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let html = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(value))) {
    html += renderTextMarks(value.slice(lastIndex, match.index));
    html += `<a href="${escapeAttribute(match[2])}" target="_blank" rel="noopener noreferrer">${renderTextMarks(
      match[1]
    )}</a>`;
    lastIndex = match.index + match[0].length;
  }

  html += renderTextMarks(value.slice(lastIndex));
  return html.replace(/\n/g, "<br>");
}

function renderTextMarks(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, "<u>$1</u>");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#096;");
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
