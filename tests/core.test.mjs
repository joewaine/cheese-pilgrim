import test from "node:test";
import assert from "node:assert/strict";
import { stops, countries, trails, getStop } from "../src/data.ts";
import {
  createReviewId,
  distanceKm,
  directionsUrl,
  nearestRoute,
  readSavedIds,
  routeDistance,
} from "../src/route.ts";

test("the seed atlas has 24 unique stops in 9 countries, with valid coordinates and pairings", () => {
  assert.equal(stops.length, 24);
  assert.equal(countries.length, 9);
  assert.equal(new Set(stops.map((s) => s.id)).size, stops.length);
  for (const stop of stops) {
    assert.ok(stop.coords[0] >= -180 && stop.coords[0] <= 180);
    assert.ok(stop.coords[1] >= -90 && stop.coords[1] <= 90);
    for (const key of ["name", "place", "bread", "wine", "tea", "coffee"])
      assert.ok(stop[key]);
    if (stop.venue) assert.match(stop.source, /^https:\/\//);
  }
});
test("suggested trails contain only unique known stops", () => {
  for (const trail of trails) {
    assert.equal(new Set(trail.ids).size, trail.ids.length);
    for (const id of trail.ids) assert.ok(getStop(id));
  }
});
test("great-circle distance matches a known London–Paris distance", () => {
  assert.equal(distanceKm([0, 0], [0, 0]), 0);
  const km = distanceKm([-0.1276, 51.5072], [2.3522, 48.8566]);
  assert.ok(km > 342 && km < 345);
});
test("nearest-neighbour ordering preserves the selected start and does not mutate the input", () => {
  const ids = ["gruyere", "mozzarella", "comte", "gorgonzola"];
  const before = [...ids];
  const result = nearestRoute(ids, "comte");
  assert.equal(result[0], "comte");
  assert.equal(result[1], "gruyere");
  assert.deepEqual(new Set(result), new Set(ids));
  assert.deepEqual(ids, before);
});
test("route ordering safely handles missing IDs, duplicates, and empty input", () => {
  assert.deepEqual(nearestRoute([], ""), []);
  assert.deepEqual(nearestRoute(["missing", "comte", "comte"], "bad-start"), [
    "comte",
  ]);
});
test("route distance is symmetric and empty/single routes have no travel", () => {
  assert.equal(routeDistance([]), 0);
  assert.equal(routeDistance(["gruyere"]), 0);
  assert.equal(
    routeDistance(trails[0].ids),
    routeDistance([...trails[0].ids].reverse()),
  );
});
test("navigation names a verified venue or the region, without inventing a producer", () => {
  const region = new URL(directionsUrl(getStop("gouda")));
  assert.equal(
    region.searchParams.get("destination"),
    "Gouda, South Holland, Netherlands",
  );
  const venue = new URL(directionsUrl(getStop("gruyere"), getStop("comte")));
  assert.match(venue.searchParams.get("destination"), /La Maison du Gruyère/);
  assert.match(venue.searchParams.get("origin"), /La Maison du Comté/);
  assert.equal(venue.searchParams.get("travelmode"), "driving");
});
test("stored IDs reject corrupt data and filter unknown entries", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  let raw;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => raw },
  });
  try {
    raw = "{";
    assert.deepEqual(readSavedIds("test", ["gruyere"]), ["gruyere"]);
    raw = '{"no":"array"}';
    assert.deepEqual(readSavedIds("test", ["comte"]), ["comte"]);
    raw = '["gruyere","missing",2,"gruyere","comte"]';
    assert.deepEqual(readSavedIds("test", []), ["gruyere", "comte"]);
    raw = "[]";
    assert.deepEqual(readSavedIds("test", ["comte"]), []);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  }
});
test("review IDs are valid UUIDs and unique", () => {
  const ids = new Set(Array.from({ length: 50 }, () => createReviewId()));
  assert.equal(ids.size, 50);
  for (const id of ids)
    assert.match(
      id,
      /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/,
    );
});
