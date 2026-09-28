import { getStop, stops } from "./data.ts";
import type { Stop } from "./data.ts";

export function distanceKm(a: [number, number], b: [number, number]): number {
  const radians = Math.PI / 180;
  const lat = (b[1] - a[1]) * radians;
  const lon = (b[0] - a[0]) * radians;
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a[1] * radians) *
      Math.cos(b[1] * radians) *
      Math.sin(lon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

// A transparent geographic heuristic. Road, ferry and seasonal constraints need a routing service.
export function nearestRoute(ids: string[], startId: string): string[] {
  const remaining = new Set(ids.filter((id) => getStop(id)));
  const first = remaining.has(startId)
    ? startId
    : remaining.values().next().value;
  if (!first) return [];
  const route = [first];
  remaining.delete(first);
  while (remaining.size) {
    const current = getStop(route[route.length - 1])!;
    const next = [...remaining].sort(
      (a, b) =>
        distanceKm(current.coords, getStop(a)!.coords) -
        distanceKm(current.coords, getStop(b)!.coords),
    )[0];
    route.push(next);
    remaining.delete(next);
  }
  return route;
}

export function routeDistance(ids: string[]): number {
  return Math.round(
    ids.slice(1).reduce((sum, id, index) => {
      const a = getStop(ids[index]);
      const b = getStop(id);
      return a && b ? sum + distanceKm(a.coords, b.coords) : sum;
    }, 0),
  );
}

export function directionsUrl(destination: Stop, origin?: Stop): string {
  const place = (stop: Stop) =>
    `${stop.venue ? `${stop.venue}, ` : ""}${stop.place}, ${stop.country}`;
  const params = new URLSearchParams({
    api: "1",
    destination: place(destination),
    travelmode: "driving",
  });
  if (origin) params.set("origin", place(origin));
  return `https://www.google.com/maps/dir/?${params}`;
}

export function createReviewId(): string {
  // randomUUID is unavailable on plain-HTTP LAN previews; getRandomValues works there.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((n) => n.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function readSavedIds(key: string, fallback: string[]): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return [
      ...new Set(
        parsed.filter(
          (id): id is string =>
            typeof id === "string" && stops.some((s) => s.id === id),
        ),
      ),
    ];
  } catch {
    return fallback;
  }
}
