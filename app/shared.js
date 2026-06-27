// Small UI helpers shared across tabs.
import { diffDays } from "../lib/core";

export function relDay(today, date) {
  const d = diffDays(today, new Date(date));
  if (d === 0) return "היום";
  if (d === 1) return "מחר";
  if (d === -1) return "אתמול";
  if (d < 0) return `לפני ${Math.abs(d)} ימים`;
  return `בעוד ${d} ימים`;
}

// social content channel → icon
export const CH_ICON = { story: "📱", post: "🖼", comm: "👥" };
