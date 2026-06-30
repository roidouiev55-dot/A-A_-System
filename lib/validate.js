// Input validation for API routes.
// Every route builds its payload from an explicit whitelist of fields with
// typed coercion — never pass a raw request body to the DB. Unknown fields are
// dropped, types are enforced, and URL fields reject anything but http(s):// to
// prevent stored `javascript:`/`data:` hrefs from reaching the UI.
import { BLIST } from "./core";

export class ValidationError extends Error {}

// ── field types ──
const T = {
  text: (max = 5000) => (v) => {
    if (v === undefined || v === null) return undefined;
    return String(v).slice(0, max).trim();
  },
  brand: () => (v) => {
    if (v === undefined || v === null) return undefined;
    if (!BLIST.includes(v)) throw new ValidationError("מותג לא תקין");
    return v;
  },
  iso: () => (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const d = new Date(v);
    if (isNaN(d.getTime())) throw new ValidationError("תאריך לא תקין");
    return d.toISOString();
  },
  bool: () => (v) => (v === undefined ? undefined : !!v),
  oneOf: (vals) => (v) => {
    if (v === undefined || v === null) return undefined;
    if (!vals.includes(v)) throw new ValidationError("ערך לא תקין");
    return v;
  },
  url: (max = 1000) => (v) => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).slice(0, max).trim();
    if (s === "") return "";
    if (!/^https?:\/\//i.test(s)) throw new ValidationError("קישור חייב להתחיל ב-http:// או https://");
    return s;
  },
};

// Build a clean payload from a schema. Only whitelisted keys survive.
// `required` keys must be present and non-empty after coercion.
function build(schema, body, required = []) {
  const src = body && typeof body === "object" ? body : {};
  const out = {};
  for (const [key, fn] of Object.entries(schema)) {
    const val = fn(src[key]);
    if (val !== undefined) out[key] = val;
  }
  for (const r of required) {
    if (out[r] === undefined || out[r] === "") throw new ValidationError(`שדה חובה חסר: ${r}`);
  }
  return out;
}

// ── schemas ──
const EVENT = {
  brand: T.brand(),
  name: T.text(300),
  date: T.iso(),
  location: T.text(300),
  link: T.url(1000),
  full_details: T.text(10000),
};

const BRAND_ASSET = {
  brand: T.brand(),
  logo: T.url(1000),
  drive_link: T.url(1000),
  canva_templates: T.url(1000),
  instagram_link: T.url(1000),
  community_link: T.url(1000),
};

const COMMUNITY = {
  brand: T.brand(),
  name: T.text(300),
  link: T.url(1000),
};

// Global asset folders — a single shared row, not per-brand.
const GENERAL_FOLDERS = {
  videos: T.url(1000),
  images: T.url(1000),
  logos: T.url(1000),
  graphics: T.url(1000),
  canva_posts: T.url(1000),
};

// ── per-route validators ──
export const validate = {
  eventCreate: (b) => build(EVENT, b, ["name", "date", "brand"]),
  eventUpdate: (b) => ({ id: reqId(b), ...build(EVENT, b) }),

  brandAsset: (b) => build(BRAND_ASSET, b, ["brand"]),

  // single global row, fixed id so upsert always targets the same record
  generalFolders: (b) => ({ id: "main", ...build(GENERAL_FOLDERS, b) }),

  communityCreate: (b) => build(COMMUNITY, b, ["brand"]),
  communityUpdate: (b) => ({ id: reqId(b), ...build(COMMUNITY, b) }),

  // messages: the `event` subobject feeds the AI prompt and the stored row
  messageEvent: (e) => {
    const ev = build(EVENT, e);
    ev.id = reqId(e);
    if (!ev.brand) throw new ValidationError("מותג לא תקין");
    return ev;
  },
  msgType: (v) => T.oneOf(["ערך", "CTA"])(v) || "ערך",
  msgStatus: (v) => {
    const s = T.oneOf(["נשלח", "לא נשלח"])(v);
    if (!s) throw new ValidationError("סטטוס לא תקין");
    return s;
  },

  contentStatus: (b) => {
    const out = { id: reqId(b) };
    const status = T.text(100)(b.status);
    const canva_link = T.url(1000)(b.canva_link);
    if (status !== undefined) out.status = status;
    if (canva_link !== undefined) out.canva_link = canva_link;
    return out;
  },

  reminder: (b) => ({ id: reqId(b), sent: !!b.sent }),
  task: (b) => ({
    id: reqId(b),
    done: !!b.done,
    label: T.text(500)(b.label) || "",
    brand: T.brand()(b.brand) || "",
  }),

  // validate a bare id value (e.g. from a ?id= query param)
  id: (v) => reqId({ id: v }),
};

// Identifiers (uuids or client-built keys) — required text, bounded length.
function reqId(b) {
  const id = T.text(200)(b && b.id);
  if (!id) throw new ValidationError("מזהה (id) חסר");
  return id;
}
