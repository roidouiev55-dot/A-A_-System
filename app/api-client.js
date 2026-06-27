// Client-side API helpers. Mutating calls (POST/PUT/DELETE) throw on HTTP error
// or an {error} payload so callers can roll back optimistic UI instead of
// silently diverging from the database. apiGet stays lenient — its callers
// inspect the returned payload themselves.
async function apiSend(method, path, body) {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  if (!res.ok || (json && json.error)) {
    throw new Error((json && json.error) || `שגיאת שרת (${res.status})`);
  }
  return json;
}

export const apiPost = (path, body) => apiSend("POST", path, body);
export const apiPut = (path, body) => apiSend("PUT", path, body);
export const apiDel = (path, body) => apiSend("DELETE", path, body);
export const apiGet = (path) => fetch(`/api/${path}`, { cache: "no-store" }).then(r => r.json());
