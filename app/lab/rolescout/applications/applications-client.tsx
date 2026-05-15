"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { getTrackingCsv, TRACKING_UPDATED_EVENT } from "./lib/storage";

const DEMO_CSV_URL =
  "https://raw.githubusercontent.com/michaophir/rolescout-scraper/main/tracking_sheet.csv";

const STAGES = [
  "Saved",
  "Applied",
  "Recruiter Screen",
  "Hiring Manager",
  "Interview Loop",
  "Final Round",
  "Offer",
] as const;

const EXIT_STATES = [
  "Accepted",
  "No Response",
  "Rejected",
  "Ghosted",
  "Declined",
  "Withdrawn",
] as const;

const STAGE_SET = new Set<string>(STAGES);
const EXIT_SET = new Set<string>(EXIT_STATES);

const STAGE_COLOR = "#1e293b";
// Palette used to assign colors to sources at render time. A few well-known
// sources are pinned to specific hues so repeat visits feel stable; unknown
// sources cycle through the remaining palette in the order they're seen.
const SOURCE_PALETTE = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // orange
  "#8b5cf6", // purple
  "#14b8a6", // teal
  "#ec4899", // pink
  "#eab308", // yellow
  "#64748b", // gray
  "#06b6d4", // cyan
  "#f43f5e", // rose
  "#84cc16", // lime
  "#a855f7", // violet
];
const PINNED_SOURCE_COLORS: Record<string, string> = {
  LinkedIn: "#3b82f6",
  Referral: "#10b981",
  Direct: "#f59e0b",
  Scraper: "#8b5cf6",
  Other: "#64748b",
};
const OTHER_SOURCE = "Other";
const EXIT_COLORS: Record<string, string> = {
  Rejected: "#b91c1c",
  Ghosted: "#6b7280",
  "No Response": "#9ca3af",
  Declined: "#d97706",
  Withdrawn: "#7c3aed",
  Accepted: "#059669",
};

type NodeKind = "source" | "stage" | "exit";

function buildSourceColorMap(sourceNames: string[]): Map<string, string> {
  const map = new Map<string, string>();
  // Reserve pinned colors so cycling doesn't collide with them.
  const reserved = new Set(Object.values(PINNED_SOURCE_COLORS));
  const cycle = SOURCE_PALETTE.filter((c) => !reserved.has(c));
  let i = 0;
  for (const name of sourceNames) {
    if (PINNED_SOURCE_COLORS[name]) {
      map.set(name, PINNED_SOURCE_COLORS[name]);
      continue;
    }
    map.set(name, cycle[i % cycle.length]);
    i += 1;
  }
  return map;
}

function nodeColor(
  name: string,
  kind: NodeKind,
  sourceColors?: Map<string, string>
): string {
  if (kind === "source") {
    return (
      sourceColors?.get(name) ??
      PINNED_SOURCE_COLORS[name] ??
      PINNED_SOURCE_COLORS.Other
    );
  }
  if (kind === "exit") return EXIT_COLORS[name] ?? "#6b7280";
  return STAGE_COLOR;
}

function statusBadgeClasses(status: string): string {
  switch (status) {
    case "Active":
      return "bg-emerald-50 text-emerald-700";
    case "Rejected":
      return "bg-red-50 text-red-700";
    case "Ghosted":
      return "bg-gray-100 text-gray-600";
    case "No Response":
      return "bg-gray-50 text-gray-500";
    case "Declined":
      return "bg-amber-50 text-amber-700";
    case "Withdrawn":
      return "bg-violet-50 text-violet-700";
    case "Accepted":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-gray-100 text-gray-500";
  }
}

type Row = {
  jobId: string;
  company: string;
  role: string;
  person: string;
  date: string;
  event: string;
  source: string;
  stage: string;
  state: string;
  location: string;
  compensation: string;
  nextAction: string;
  nextActionDate: string;
  notes: string;
  jobUrl: string;
};

type AggregatedJob = {
  jobId: string;
  company: string;
  role: string;
  currentStage: string; // highest stage reached
  state: string; // latest state
  source: string; // first row's source
  nextAction: string;
  nextActionDate: string;
  jobUrl: string;
  isExit: boolean;
  reachedApplied: boolean;
};

function parseRow(raw: Record<string, unknown>): Row {
  const get = (key: string) => String(raw[key] ?? "").trim();
  const normalizeStage = (v: string) => (v === "Pre-Applied" ? "Saved" : v);
  return {
    jobId: get("Job ID"),
    company: get("Company"),
    role: get("Role"),
    person: get("Person"),
    date: get("Date"),
    event: get("Event"),
    source: get("Source"),
    stage: normalizeStage(get("Stage")),
    state: get("State"),
    location: get("Location"),
    compensation: get("Compensation"),
    nextAction: get("Next Action"),
    nextActionDate: get("Next Action Date"),
    notes: get("Notes"),
    jobUrl: get("Job URL"),
  };
}

function toTime(date: string): number {
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

type Transition = {
  source: string;
  target: string;
  value: number;
  sourceKind: NodeKind;
  targetKind: NodeKind;
};

function aggregateJobs(rows: Row[]): {
  jobs: AggregatedJob[];
  transitions: Transition[];
} {
  // Event-stream model: many rows per Job ID. Group by Job ID, then derive
  // a single AggregatedJob per group using:
  //   - highest Stage reached (by STAGES order)
  //   - latest State (by Date)
  //   - Source from the first row
  //   - Next Action from the latest row that has one
  const byJob = new Map<string, Row[]>();
  for (const row of rows) {
    if (!row.jobId) continue;
    const arr = byJob.get(row.jobId) ?? [];
    arr.push(row);
    byJob.set(row.jobId, arr);
  }

  const jobs: AggregatedJob[] = [];
  const counts = new Map<string, number>();
  const meta = new Map<string, { sourceKind: NodeKind; targetKind: NodeKind }>();

  const bump = (
    source: string,
    target: string,
    sourceKind: NodeKind,
    targetKind: NodeKind
  ) => {
    const key = `${source}|||${target}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!meta.has(key)) meta.set(key, { sourceKind, targetKind });
  };

  for (const events of byJob.values()) {
    // Chronological order (oldest first). Stable sort keeps original order
    // for ties so "first row" semantics are predictable.
    const sorted = [...events].sort(
      (a, b) => toTime(a.date) - toTime(b.date)
    );

    // Highest Stage reached. "Accepted" is no longer a middle stage — it
    // is a terminal state — so rows with stage=Accepted don't affect the
    // stage index, but they flag the job as having accepted an offer.
    let highestStageIdx = -1;
    let highestStage = "";
    let reachedAccepted = false;
    for (const r of sorted) {
      if (r.stage === "Accepted") {
        reachedAccepted = true;
        continue;
      }
      const idx = STAGES.indexOf(r.stage as (typeof STAGES)[number]);
      if (idx > highestStageIdx) {
        highestStageIdx = idx;
        highestStage = r.stage;
      }
    }

    // Latest state from the most recent row by date.
    const latest = sorted[sorted.length - 1];
    let latestState = latest?.state ?? "";
    // If any row recorded Accepted (stage or state), override latestState.
    if (reachedAccepted || latestState === "Accepted") {
      latestState = "Accepted";
    }

    // Source from the first row. Blank/missing sources fall into "Other".
    // Also treats whitespace-only and common "no value" tokens as blank.
    const rawFirstSource = (sorted[0]?.source ?? "").trim();
    const normalizedFirst =
      rawFirstSource === "" ||
      rawFirstSource.toLowerCase() === "n/a" ||
      rawFirstSource.toLowerCase() === "none" ||
      rawFirstSource === "-"
        ? OTHER_SOURCE
        : rawFirstSource;
    const firstSource = normalizedFirst;
    const sourceForFlow = firstSource;

    // Next Action from the latest row that has a non-empty Next Action.
    let nextAction = "";
    let nextActionDate = "";
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].nextAction) {
        nextAction = sorted[i].nextAction;
        nextActionDate = sorted[i].nextActionDate;
        break;
      }
    }

    // Job URL from the latest row that has one, falling back to any non-empty.
    let jobUrl = "";
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].jobUrl) {
        jobUrl = sorted[i].jobUrl;
        break;
      }
    }

    // Sankey flows on deduplicated data:
    //   Source -> highest stage reached (always, if stage is known)
    //   highest stage -> latest state (only if state is an exit)
    if (STAGE_SET.has(highestStage)) {
      bump(sourceForFlow, highestStage, "source", "stage");
      if (EXIT_SET.has(latestState)) {
        bump(highestStage, latestState, "stage", "exit");
      }
    }

    const isExit = EXIT_SET.has(latestState);
    const reachedApplied = highestStageIdx >= STAGES.indexOf("Applied");

    jobs.push({
      jobId: latest.jobId,
      company: latest.company,
      role: latest.role,
      currentStage: highestStage,
      state: latestState,
      source: firstSource,
      nextAction,
      nextActionDate,
      jobUrl,
      isExit,
      reachedApplied,
    });
  }

  const transitions: Transition[] = [];
  for (const [key, value] of counts) {
    const [src, tgt] = key.split("|||");
    const m = meta.get(key)!;
    transitions.push({
      source: src,
      target: tgt,
      value,
      sourceKind: m.sourceKind,
      targetKind: m.targetKind,
    });
  }

  return { jobs, transitions };
}

function computeStats(jobs: AggregatedJob[]) {
  // Total = unique Job IDs (jobs is already deduplicated).
  const total = jobs.length;
  const active = jobs.filter((j) => j.state === "Active").length;
  const responded = jobs.filter((j) => {
    const idx = STAGES.indexOf(j.currentStage as (typeof STAGES)[number]);
    return idx >= STAGES.indexOf("Recruiter Screen");
  }).length;
  // Offer rate: reached Offer as a stage OR ended in Accepted (which is
  // now an exit state sitting past Offer in the funnel).
  const offers = jobs.filter((j) => {
    const idx = STAGES.indexOf(j.currentStage as (typeof STAGES)[number]);
    return idx >= STAGES.indexOf("Offer") || j.state === "Accepted";
  }).length;

  return {
    total,
    active,
    responseRate: total > 0 ? responded / total : 0,
    offerRate: total > 0 ? offers / total : 0,
  };
}

// ----- Custom Sankey layout (no d3-sankey) -----

type LayoutNode = {
  name: string;
  kind: NodeKind;
  column: number;
  value: number; // max(inflow, outflow)
  height: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

type LayoutLink = {
  source: LayoutNode;
  target: LayoutNode;
  value: number;
  sy0: number; // top y at source side
  ty0: number; // top y at target side
  sourceThickness: number; // thickness at source side (uses source's scale)
  targetThickness: number; // thickness at target side (uses target's scale)
};

type SankeyLayout = {
  nodes: LayoutNode[];
  links: LayoutLink[];
};

const SANKEY_NODE_WIDTH = 14;
const SANKEY_NODE_PADDING = 14;
const SANKEY_PAD_TOP = 36;
const SANKEY_PAD_BOTTOM = 24;
const SANKEY_PAD_LEFT = 140;
const SANKEY_PAD_RIGHT = 140;
const SANKEY_TOTAL_COLUMNS = STAGES.length + 2; // sources + 8 stages + exits = 10
const SANKEY_MIN_NODE_HEIGHT = 8;
const SANKEY_MAX_NODE_HEIGHT_RATIO = 0.6;

function buildSankey(
  transitions: Transition[],
  width: number,
  height: number
): SankeyLayout | null {
  if (transitions.length === 0) return null;

  const usableWidth =
    width - SANKEY_PAD_LEFT - SANKEY_PAD_RIGHT - SANKEY_NODE_WIDTH;
  const colSpacing =
    SANKEY_TOTAL_COLUMNS > 1 ? usableWidth / (SANKEY_TOTAL_COLUMNS - 1) : 0;
  const xForColumn = (col: number) => SANKEY_PAD_LEFT + col * colSpacing;

  const columnFor = (name: string, kind: NodeKind): number => {
    if (kind === "source") return 0;
    if (kind === "exit") return SANKEY_TOTAL_COLUMNS - 1;
    return STAGES.indexOf(name as (typeof STAGES)[number]) + 1;
  };

  const nodesByName = new Map<string, LayoutNode>();
  const ensureNode = (name: string, kind: NodeKind): LayoutNode => {
    const existing = nodesByName.get(name);
    if (existing) return existing;
    const col = columnFor(name, kind);
    const node: LayoutNode = {
      name,
      kind,
      column: col,
      value: 0,
      height: 0,
      x0: xForColumn(col),
      x1: xForColumn(col) + SANKEY_NODE_WIDTH,
      y0: 0,
      y1: 0,
    };
    nodesByName.set(name, node);
    return node;
  };

  // Always create every stage + exit state node (even if zero count).
  for (const stage of STAGES) ensureNode(stage, "stage");
  for (const exit of EXIT_STATES) ensureNode(exit, "exit");

  // Build links from transitions, creating sources/exits on demand.
  const links: LayoutLink[] = [];
  for (const t of transitions) {
    const s = ensureNode(t.source, t.sourceKind);
    const tg = ensureNode(t.target, t.targetKind);
    links.push({
      source: s,
      target: tg,
      value: t.value,
      sy0: 0,
      ty0: 0,
      sourceThickness: 0,
      targetThickness: 0,
    });
  }

  // Compute node values: max(inflow, outflow). Display value matches.
  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  for (const l of links) {
    inflow.set(l.target.name, (inflow.get(l.target.name) ?? 0) + l.value);
    outflow.set(l.source.name, (outflow.get(l.source.name) ?? 0) + l.value);
  }
  for (const node of nodesByName.values()) {
    node.value = Math.max(
      inflow.get(node.name) ?? 0,
      outflow.get(node.name) ?? 0
    );
  }

  // Group nodes by column and sort within each column.
  const nodesByColumn = new Map<number, LayoutNode[]>();
  for (const node of nodesByName.values()) {
    const arr = nodesByColumn.get(node.column) ?? [];
    arr.push(node);
    nodesByColumn.set(node.column, arr);
  }
  for (const [col, arr] of nodesByColumn) {
    if (col === 0) {
      // Sources: alphabetical for stable ordering
      arr.sort((a, b) => a.name.localeCompare(b.name));
    } else if (col === SANKEY_TOTAL_COLUMNS - 1) {
      // Exits: pinned to EXIT_STATES order
      arr.sort(
        (a, b) =>
          EXIT_STATES.indexOf(a.name as (typeof EXIT_STATES)[number]) -
          EXIT_STATES.indexOf(b.name as (typeof EXIT_STATES)[number])
      );
    }
    // Stage columns have a single node each — no sort needed.
  }

  // Two scales: stage/exit columns share one scale; the source column gets
  // its own (smaller) scale so the largest source node never exceeds the
  // Applied node's height. Source-side and target-side link thicknesses
  // therefore differ, producing trapezoid ribbons.
  const usableHeight = height - SANKEY_PAD_TOP - SANKEY_PAD_BOTTOM;

  // 1) Stage scale: smallest per-column scale across stage + exit columns.
  //    We reserve SANKEY_MIN_NODE_HEIGHT for every zero-count node up front
  //    (so pre-created empty exits don't overflow the flow area) and divide
  //    the remaining space by the sum of *non-zero* values.
  let stageScale = Infinity;
  for (const [col, arr] of nodesByColumn) {
    if (col === 0) continue; // skip sources
    const nonZeroTotal = arr.reduce(
      (s, n) => s + (n.value > 0 ? n.value : 0),
      0
    );
    const zeroCount = arr.filter((n) => n.value <= 0).length;
    const zeroSlack = zeroCount * SANKEY_MIN_NODE_HEIGHT;
    const padTotal = Math.max(0, arr.length - 1) * SANKEY_NODE_PADDING;
    const available = usableHeight - padTotal - zeroSlack;
    if (nonZeroTotal <= 0 || available <= 0) continue;
    const scale = available / nonZeroTotal;
    if (scale < stageScale) stageScale = scale;
  }
  if (!Number.isFinite(stageScale) || stageScale <= 0) stageScale = 1;

  // 2) Cap stage scale so no stage/exit node exceeds 60% of diagram height.
  let maxStageValue = 0;
  for (const node of nodesByName.values()) {
    if (node.kind === "source") continue;
    if (node.value > maxStageValue) maxStageValue = node.value;
  }
  if (maxStageValue > 0) {
    const cap = (height * SANKEY_MAX_NODE_HEIGHT_RATIO) / maxStageValue;
    if (cap < stageScale) stageScale = cap;
  }

  // 3) Source scale. Three constraints, smallest wins:
  //    (a) tallest source <= Applied node height  (visual anchor)
  //    (b) sourceScale <= stageScale              (flows never widen out)
  //    (c) full source column fits in usableHeight after inter-node padding
  //        (so tall columns don't push bottom sources off-screen)
  const appliedNode = nodesByName.get("Applied");
  let referenceHeight = 0;
  if (appliedNode && appliedNode.value > 0) {
    referenceHeight = appliedNode.value * stageScale;
  } else {
    referenceHeight = maxStageValue * stageScale;
  }

  const sourceNodes = nodesByColumn.get(0) ?? [];
  const sourceCount = sourceNodes.length;
  const sourceTotalValue = sourceNodes.reduce((s, n) => s + n.value, 0);
  const maxSourceValue = sourceNodes.reduce(
    (m, n) => (n.value > m ? n.value : m),
    0
  );

  let sourceScale = stageScale;
  if (maxSourceValue > 0 && referenceHeight > 0) {
    sourceScale = Math.min(stageScale, referenceHeight / maxSourceValue);
  }
  if (sourceCount > 0 && sourceTotalValue > 0) {
    const sourcePadTotal = Math.max(0, sourceCount - 1) * SANKEY_NODE_PADDING;
    const sourceAvailable = usableHeight - sourcePadTotal;
    if (sourceAvailable > 0) {
      const fitScale = sourceAvailable / sourceTotalValue;
      sourceScale = Math.min(sourceScale, fitScale);
    }
  }

  const scaleFor = (kind: NodeKind) =>
    kind === "source" ? sourceScale : stageScale;

  // Compute node heights.
  //  - Sources: exactly value * sourceScale (no min clamp — labels render
  //    to the left of the bar and don't depend on bar thickness).
  //  - Stages/Exits: value * scale, clamped to SANKEY_MIN_NODE_HEIGHT so
  //    zero-count nodes still render as a visible bar.
  for (const node of nodesByName.values()) {
    const raw = node.value * scaleFor(node.kind);
    node.height =
      node.kind === "source" ? raw : Math.max(SANKEY_MIN_NODE_HEIGHT, raw);
  }

  // Stack nodes in each column, centered vertically within the usable area.
  // Clamp the starting y so the column is always fully inside the flow area.
  const flowTop = SANKEY_PAD_TOP;
  const flowBottom = height - SANKEY_PAD_BOTTOM;
  for (const arr of nodesByColumn.values()) {
    const totalH =
      arr.reduce((s, n) => s + n.height, 0) +
      Math.max(0, arr.length - 1) * SANKEY_NODE_PADDING;
    let y = flowTop + Math.max(0, (usableHeight - totalH) / 2);
    // If the column would extend past the bottom, shift it up so it ends
    // exactly at flowBottom. y is still clamped to flowTop minimum.
    if (y + totalH > flowBottom) {
      y = Math.max(flowTop, flowBottom - totalH);
    }
    for (const node of arr) {
      node.y0 = y;
      node.y1 = y + node.height;
      y = node.y1 + SANKEY_NODE_PADDING;
    }
  }

  // Per-link thicknesses use each side's own scale, so a Source -> Stage
  // ribbon enters narrower (sourceScale) and exits wider (stageScale).
  const outByNode = new Map<string, LayoutLink[]>();
  const inByNode = new Map<string, LayoutLink[]>();
  for (const l of links) {
    l.sourceThickness = l.value * scaleFor(l.source.kind);
    l.targetThickness = l.value * scaleFor(l.target.kind);
    const o = outByNode.get(l.source.name) ?? [];
    o.push(l);
    outByNode.set(l.source.name, o);
    const i = inByNode.get(l.target.name) ?? [];
    i.push(l);
    inByNode.set(l.target.name, i);
  }

  // Stack link endpoints centered vertically within each node, so flows
  // originate from (and arrive at) the node's vertical midline.
  for (const node of nodesByName.values()) {
    const outLinks = outByNode.get(node.name) ?? [];
    outLinks.sort((a, b) => a.target.y0 - b.target.y0);
    const totalOut = outLinks.reduce((s, l) => s + l.sourceThickness, 0);
    let oy = node.y0 + Math.max(0, (node.height - totalOut) / 2);
    for (const link of outLinks) {
      link.sy0 = oy;
      oy += link.sourceThickness;
    }

    const inLinks = inByNode.get(node.name) ?? [];
    inLinks.sort((a, b) => a.source.y0 - b.source.y0);
    const totalIn = inLinks.reduce((s, l) => s + l.targetThickness, 0);
    let iy = node.y0 + Math.max(0, (node.height - totalIn) / 2);
    for (const link of inLinks) {
      link.ty0 = iy;
      iy += link.targetThickness;
    }
  }

  return {
    nodes: Array.from(nodesByName.values()),
    links,
  };
}

function sankeyLinkPath(link: LayoutLink): string {
  const x0 = link.source.x1;
  const x1 = link.target.x0;
  const sy0 = link.sy0;
  const sy1 = sy0 + link.sourceThickness;
  const ty0 = link.ty0;
  const ty1 = ty0 + link.targetThickness;
  const xMid = (x0 + x1) / 2;
  return (
    `M${x0},${sy0}` +
    `C${xMid},${sy0} ${xMid},${ty0} ${x1},${ty0}` +
    `L${x1},${ty1}` +
    `C${xMid},${ty1} ${xMid},${sy1} ${x0},${sy1}` +
    `Z`
  );
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

type NextActionFilter = "all" | "overdue" | "today" | "week";

export default function RoleScoutClient() {
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Filters
  const [stageFilter, setStageFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [nextActionFilter, setNextActionFilter] =
    useState<NextActionFilter>("all");

  // Collapsible sections
  const [sankeyOpen, setSankeyOpen] = useState(true);
  const [tableOpen, setTableOpen] = useState(true);

  // Sankey tooltip
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadFromStorage = async (): Promise<boolean> => {
      const saved = await getTrackingCsv();
      if (cancelled || !saved) return false;
      const result = Papa.parse(saved, { header: true, skipEmptyLines: true });
      const parsed = (result.data as Record<string, unknown>[]).map(parseRow);
      setRows(parsed);
      setIsDemo(false);
      setLoading(false);
      return true;
    };

    setLoading(true);
    setError(null);

    (async () => {
      const loaded = await loadFromStorage();
      if (cancelled || loaded) return;

      setIsDemo(true);
      try {
        const r = await fetch(DEMO_CSV_URL);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (cancelled) return;
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        const parsed = (result.data as Record<string, unknown>[]).map(parseRow);
        setRows(parsed);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(String(e));
        setLoading(false);
      }
    })();

    const onUpdate = () => {
      void loadFromStorage();
    };
    window.addEventListener(TRACKING_UPDATED_EVENT, onUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener(TRACKING_UPDATED_EVENT, onUpdate);
    };
  }, []);

  const { jobs, transitions } = useMemo(() => aggregateJobs(rows), [rows]);
  const stats = useMemo(() => computeStats(jobs), [jobs]);

  const sources = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.source).filter(Boolean))).sort(),
    [jobs]
  );
  const states = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.state).filter(Boolean))).sort(),
    [jobs]
  );
  const stages = useMemo(
    () =>
      Array.from(new Set(jobs.map((j) => j.currentStage).filter(Boolean))).sort(
        (a, b) => {
          const ia = STAGES.indexOf(a as (typeof STAGES)[number]);
          const ib = STAGES.indexOf(b as (typeof STAGES)[number]);
          if (ia !== -1 && ib !== -1) return ia - ib;
          if (ia !== -1) return -1;
          if (ib !== -1) return 1;
          return a.localeCompare(b);
        }
      ),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return jobs.filter((j) => {
      if (stageFilter !== "all" && j.currentStage !== stageFilter) return false;
      if (stateFilter !== "all" && j.state !== stateFilter) return false;
      if (sourceFilter !== "all" && j.source !== sourceFilter) return false;
      if (nextActionFilter !== "all") {
        const d = parseDate(j.nextActionDate);
        if (!d) return false;
        const diff = daysBetween(d, now);
        if (nextActionFilter === "overdue" && diff >= 0) return false;
        if (nextActionFilter === "today" && diff !== 0) return false;
        if (nextActionFilter === "week" && (diff < 0 || diff > 7)) return false;
      }
      return true;
    });
  }, [jobs, stageFilter, stateFilter, sourceFilter, nextActionFilter]);

  const sankeyWidth = 1280;
  const sankeyHeight = 520;
  const graph = useMemo(
    () => buildSankey(transitions, sankeyWidth, sankeyHeight),
    [transitions]
  );

  // Dynamic source-color assignment based on the unique Source values in
  // the current data, in the order they first appear in the flow list.
  const sourceColorMap = useMemo(() => {
    const seen: string[] = [];
    if (graph) {
      for (const node of graph.nodes) {
        if (node.kind === "source" && !seen.includes(node.name)) {
          seen.push(node.name);
        }
      }
    }
    return buildSourceColorMap(seen);
  }, [graph]);

  // Total real applications for percentage calculation in tooltips.
  const totalApplications = useMemo(() => jobs.length, [jobs]);

  return (
    <div>
      <div>
        {/* Demo banner */}
        {isDemo && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>
              Viewing demo data —{" "}
              <a
                href="/lab/rolescout/settings"
                className="font-medium underline decoration-amber-400 underline-offset-2 hover:text-amber-700"
              >
                go to Settings
              </a>
              {" "}to upload your own tracking data.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Error loading data: {error}
          </div>
        )}

        {/* Stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Applications"
            value={loading ? "—" : String(stats.total)}
          />
          <StatCard
            label="Active in Pipeline"
            value={loading ? "—" : String(stats.active)}
          />
          <StatCard
            label="Response Rate"
            value={loading ? "—" : `${Math.round(stats.responseRate * 100)}%`}
          />
          <StatCard
            label="Offer Rate"
            value={loading ? "—" : `${Math.round(stats.offerRate * 100)}%`}
          />
        </div>

        {/* Stacked layout: Sankey above, table below */}
        <div className="flex flex-col gap-6">
          {/* Sankey */}
          <div className="relative rounded-xl border border-gray-200 bg-white p-6">
            <SectionHeader
              label="Pipeline Flow"
              open={sankeyOpen}
              onToggle={() => setSankeyOpen((v) => !v)}
            />
            {sankeyOpen && (
              <>
                {loading && (
                  <p className="text-sm text-gray-500">Loading...</p>
                )}
                {!loading && !graph && (
                  <p className="text-sm text-gray-500">No pipeline data yet.</p>
                )}
                {graph && (
                  <svg
                    viewBox={`0 0 ${sankeyWidth} ${sankeyHeight}`}
                    className="w-full"
                  >
                    {/* Flow ribbons */}
                    <g>
                      {graph.links.map((link, i) => {
                        const path = sankeyLinkPath(link);
                        const pct =
                          totalApplications > 0
                            ? (link.value / totalApplications) * 100
                            : 0;
                        // Source-tinted on the left half (Source -> Stage),
                        // exit-tinted on the right half (Stage -> Exit).
                        const tintFromSource =
                          link.source.kind === "source"
                            ? nodeColor(
                                link.source.name,
                                "source",
                                sourceColorMap
                              )
                            : null;
                        const tintFromTarget =
                          link.target.kind === "exit"
                            ? nodeColor(link.target.name, "exit")
                            : null;
                        const fill =
                          tintFromSource ??
                          tintFromTarget ??
                          nodeColor(
                            link.source.name,
                            link.source.kind,
                            sourceColorMap
                          );
                        return (
                          <path
                            key={i}
                            d={path}
                            fill={fill}
                            fillOpacity={0.3}
                            stroke="none"
                            className="transition-opacity hover:!opacity-60"
                            onMouseEnter={(e) => {
                              const rect = (
                                e.currentTarget
                                  .ownerSVGElement as SVGSVGElement
                              ).getBoundingClientRect();
                              setTooltip({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                                label: `${link.source.name} → ${link.target.name}: ${link.value} (${pct.toFixed(1)}%)`,
                              });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        );
                      })}
                    </g>
                    {/* Node rects + labels */}
                    <g>
                      {graph.nodes.map((node, i) => {
                        const fill = nodeColor(
                          node.name,
                          node.kind,
                          sourceColorMap
                        );
                        const isSource = node.kind === "source";
                        const isExit = node.kind === "exit";
                        const isStage = node.kind === "stage";
                        return (
                          <g key={i}>
                            <rect
                              x={node.x0}
                              y={node.y0}
                              width={node.x1 - node.x0}
                              height={Math.max(
                                SANKEY_MIN_NODE_HEIGHT,
                                node.y1 - node.y0
                              )}
                              fill={fill}
                              rx={2}
                            />
                            {isStage ? (
                              <text
                                x={(node.x0 + node.x1) / 2}
                                y={node.y0 - 18}
                                textAnchor="middle"
                                fontSize={10}
                                fill="#1e293b"
                                fontWeight={500}
                              >
                                <tspan
                                  x={(node.x0 + node.x1) / 2}
                                  dy="0"
                                >
                                  {node.name}
                                </tspan>
                                <tspan
                                  x={(node.x0 + node.x1) / 2}
                                  dy="1.1em"
                                  fill="#64748b"
                                  fontWeight={400}
                                >
                                  {node.value}
                                </tspan>
                              </text>
                            ) : (
                              <text
                                x={isSource ? node.x0 - 8 : node.x1 + 8}
                                y={(node.y0 + node.y1) / 2}
                                textAnchor={isSource ? "end" : "start"}
                                dominantBaseline="central"
                                fontSize={11}
                                fill="#1e293b"
                                fontWeight={500}
                              >
                                {node.name} ({node.value})
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                )}
                {tooltip && (
                  <div
                    className="pointer-events-none absolute rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
                    style={{
                      left: `${tooltip.x}px`,
                      top: `${tooltip.y - 36}px`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    {tooltip.label}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <SectionHeader
              label="Applications"
              open={tableOpen}
              onToggle={() => setTableOpen((v) => !v)}
            />
            {tableOpen && (
            <>
            <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
              <FilterSelect
                label="Stage"
                value={stageFilter}
                onChange={setStageFilter}
                options={stages}
              />
              <FilterSelect
                label="State"
                value={stateFilter}
                onChange={setStateFilter}
                options={states}
              />
              <FilterSelect
                label="Source"
                value={sourceFilter}
                onChange={setSourceFilter}
                options={sources}
              />
              <div>
                <label className="mb-1 block text-gray-500">Next Action</label>
                <select
                  value={nextActionFilter}
                  onChange={(e) =>
                    setNextActionFilter(e.target.value as NextActionFilter)
                  }
                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                >
                  <option value="all">All</option>
                  <option value="overdue">Overdue</option>
                  <option value="today">Due Today</option>
                  <option value="week">Due This Week</option>
                </select>
              </div>
            </div>

            <div className="max-h-[560px] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-2 pr-2 font-medium">Company</th>
                    <th className="pb-2 pr-2 font-medium">Role</th>
                    <th className="pb-2 pr-2 font-medium">Stage</th>
                    <th className="pb-2 pr-2 font-medium">State</th>
                    <th className="pb-2 pr-2 font-medium">Next Action</th>
                    <th className="whitespace-nowrap pb-2 pr-2 font-medium">Job URL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-gray-400"
                      >
                        No matching applications
                      </td>
                    </tr>
                  )}
                  {filteredJobs.map((j) => {
                    const d = parseDate(j.nextActionDate);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const isOverdue = d ? daysBetween(d, now) < 0 : false;
                    return (
                      <tr
                        key={j.jobId}
                        className={`border-b border-gray-100 ${
                          j.isExit ? "text-gray-400" : "text-slate-900"
                        }`}
                      >
                        <td className="py-2 pr-2 font-medium">{j.company}</td>
                        <td className="py-2 pr-2">{j.role}</td>
                        <td className="py-2 pr-2">{j.currentStage}</td>
                        <td className="py-2 pr-2">
                          {j.state ? (
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClasses(
                                j.state
                              )}`}
                            >
                              {j.state}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          {j.nextAction ? (
                            <div>
                              <div>{j.nextAction}</div>
                              {j.nextActionDate && (
                                <div
                                  className={
                                    isOverdue
                                      ? "font-medium text-amber-600"
                                      : "text-gray-400"
                                  }
                                >
                                  {j.nextActionDate}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-2">
                          {j.jobUrl ? (
                            <a
                              href={j.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:text-blue-700"
                            >
                              View&nbsp;↗
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  label,
  open,
  onToggle,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`flex w-full items-center justify-between text-left ${
        open ? "mb-4" : ""
      }`}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </h2>
      <svg
        viewBox="0 0 20 20"
        className={`h-4 w-4 text-gray-400 transition-transform ${
          open ? "rotate-180" : ""
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="5 8 10 13 15 8" />
      </svg>
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-gray-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
      >
        <option value="all">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

