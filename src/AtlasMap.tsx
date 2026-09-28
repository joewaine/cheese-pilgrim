import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection } from "geojson";
import { Plus, Minus, Maximize, Compass } from "lucide-react";
import type { Stop } from "./data";
import { getStop } from "./data";

const WIDTH = 900;
const HEIGHT = 555;
const projection = geoMercator()
  .center([7, 47])
  .scale(1110)
  .translate([445, 241]);
const path = geoPath(projection);
const countryLabels: [string, number, number][] = [
  ["FRANCE", 1.8, 46.45],
  ["SPAIN", -3.8, 40.8],
  ["PORTUGAL", -8.05, 40.9],
  ["ITALY", 12.2, 42.6],
  ["GERMANY", 10.5, 50.6],
  ["SWITZERLAND", 8.0, 46.45],
  ["AUSTRIA", 14.2, 47.6],
  ["BELGIUM", 4.65, 50.7],
  ["NETHERLANDS", 6.1, 53.1],
  ["CROATIA", 16.1, 44.7],
  ["GREECE", 22.7, 38.0],
  ["POLAND", 19.5, 52.1],
  ["CZECHIA", 15.6, 49.8],
  ["HUNGARY", 19.3, 47.2],
  ["ROMANIA", 25, 45.7],
  ["IRELAND", -8.1, 53.4],
  ["GREAT BRITAIN", -2.8, 55.3],
];

export function CompassRose({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 110" aria-hidden="true">
      <g stroke="currentColor" strokeWidth=".7" fill="none">
        <circle cx="50" cy="58" r="25" />
        <circle cx="50" cy="58" r="20" />
        <path d="M50 14v87M7 58h86M20 28l60 60M20 88l60-60" />
        <path d="M50 24l7 27 27 7-27 7-7 27-7-27-27-7 27-7Z" />
        <path d="M50 24v34H16l27-7Z" fill="currentColor" />
        <path d="M50 92V58h34l-27 7Z" fill="currentColor" />
      </g>
      <text
        x="50"
        y="10"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Georgia"
        fontSize="11"
      >
        N
      </text>
      <text
        x="96"
        y="61"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Georgia"
        fontSize="7"
      >
        E
      </text>
      <text
        x="4"
        y="61"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Georgia"
        fontSize="7"
      >
        W
      </text>
    </svg>
  );
}

export default function AtlasMap({
  visible,
  selected,
  route,
  onSelect,
}: {
  visible: Stop[];
  selected: string;
  route: string[];
  onSelect: (id: string) => void;
}) {
  const [geography, setGeography] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState([0, 0]);
  const drag = useRef<{ x: number; y: number; initial: number[] } | null>(null);
  const moved = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch("/data/world.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Map unavailable");
        return r.json();
      })
      .then((world: Topology<{ countries: GeometryCollection }>) =>
        setGeography(
          feature(world, world.objects.countries) as FeatureCollection,
        ),
      )
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [retry]);
  const routePath = useMemo(() => {
    const coords = route
      .map(getStop)
      .filter((s): s is Stop => !!s)
      .map((s) => s.coords);
    return coords.length > 1
      ? (path({ type: "LineString", coordinates: coords }) ?? "")
      : "";
  }, [route]);
  return (
    <div className="atlas-map">
      <div className="map-cartouche">
        <span className="micro">THE OLD WORLD, ONE BITE AT A TIME</span>
        <span>A cheese lover’s atlas</span>
        <div className="cartouche-rule">✦</div>
      </div>
      {error ? (
        <div className="map-status">
          <p>The map couldn’t be loaded.</p>
          <button
            className="text-button"
            onClick={() => setRetry((v) => v + 1)}
          >
            Try again
          </button>
        </div>
      ) : !geography ? (
        <div className="map-status">Unfolding the atlas…</div>
      ) : null}
      <svg
        className="map-geography"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        aria-label="Interactive map of European cheese regions"
        onPointerDown={(e) => {
          if ((e.target as Element).closest('[role="button"]')) return;
          moved.current = false;
          drag.current = { x: e.clientX, y: e.clientY, initial: pan };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const factor = WIDTH / e.currentTarget.getBoundingClientRect().width;
          const dx = (e.clientX - drag.current.x) * factor;
          const dy = (e.clientY - drag.current.y) * factor;
          if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
          setPan([drag.current.initial[0] + dx, drag.current.initial[1] + dy]);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern
            id="sea-lines"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 6L6 0"
              stroke="#68857a"
              strokeWidth=".3"
              opacity=".12"
            />
          </pattern>
          <filter id="pin-shadow" x="-70%" y="-70%" width="240%" height="240%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="3"
              floodColor="#314c3d"
              floodOpacity=".2"
            />
          </filter>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#sea-lines)" />
        <g
          transform={`translate(${pan[0]} ${pan[1]}) translate(450 278) scale(${zoom}) translate(-450 -278)`}
        >
          <path
            d={path(geoGraticule10()) ?? ""}
            fill="none"
            stroke="#779084"
            strokeWidth=".5"
            opacity=".3"
          />
          {geography?.features.map((f) => (
            <path
              key={f.id}
              d={path(f) ?? ""}
              className={`country country-${f.id}`}
            />
          ))}
          {countryLabels.map(([name, lon, lat]) => {
            const xy = projection([lon, lat])!;
            return (
              <text
                key={name}
                x={xy[0]}
                y={xy[1]}
                className={`country-label ${name === "SWITZERLAND" || name === "NETHERLANDS" ? "small" : ""}`}
                transform={
                  name === "PORTUGAL"
                    ? `rotate(-80 ${xy[0]} ${xy[1]})`
                    : undefined
                }
              >
                {name}
              </text>
            );
          })}
          <text
            className="sea-label"
            x="114"
            y="282"
            transform="rotate(-13 114 282)"
          >
            Bay of Biscay
          </text>
          <text
            className="sea-label"
            x="470"
            y="480"
            transform="rotate(-8 470 480)"
          >
            M e d i t e r r a n e a n S e a
          </text>
          <text className="sea-label" x="324" y="44">
            North Sea
          </text>
          <g className="mountains" transform="translate(435 262)">
            <path d="m0 12 9-13 9 13m-5-1 12-19 12 19m-6-3 9-14 11 17m-7-2 10-17 12 17m-6-2 9-11 8 11m-39-8 3 4 3-3m-35 4 2 2 3-3" />
            <path d="m50 17 10-13 9 13m-5-1 10-15 12 16" />
          </g>
          <path
            d={routePath}
            fill="none"
            stroke="#fbf6e9"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d={routePath} className="route-line" />
          {visible
            .filter((s) => s.id !== selected)
            .map((stop) => {
              const [x, y] = projection(stop.coords)!;
              const inRoute = route.includes(stop.id);
              return (
                <g
                  key={stop.id}
                  transform={`translate(${x} ${y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Explore ${stop.name}, ${stop.country}`}
                  className="map-pin"
                  onPointerDown={() => {
                    moved.current = false;
                  }}
                  onClick={() => onSelect(stop.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(stop.id);
                    }
                  }}
                >
                  <circle r="15" fill="transparent" />
                  <circle
                    r={inRoute ? 7 : 5}
                    className={inRoute ? "route-dot" : "place-dot"}
                  />
                  {inRoute && <circle r="2" fill="#f7f3e8" />}
                  {stop.label && (
                    <text
                      x={stop.label[0]}
                      y={stop.label[1]}
                      className="pin-label"
                    >
                      {stop.name === "Le Gruyère AOP" ? "Gruyère" : stop.name}
                    </text>
                  )}
                </g>
              );
            })}
          {visible
            .filter((s) => s.id === selected)
            .map((stop) => {
              const [x, y] = projection(stop.coords)!;
              return (
                <g
                  key={stop.id}
                  transform={`translate(${x} ${y})`}
                  className="selected-pin"
                  aria-label={`Selected: ${stop.name}`}
                >
                  <circle r="27" fill="#b8873e" opacity=".13" />
                  <circle
                    r="19"
                    fill="#bd914c"
                    stroke="#fff9e8"
                    strokeWidth="3"
                    filter="url(#pin-shadow)"
                  />
                  <path
                    d="m-8 6 16-1-2-13L-8-2Zm0-8 16 3M-3 1v1m5-1v1m-6 2v1"
                    fill="none"
                    stroke="#fff9e8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <g transform="translate(26 9)">
                    <rect
                      x="-5"
                      y="-12"
                      width={stop.name.length * 7 + 12}
                      height="24"
                      rx="3"
                      fill="#fbf8ef"
                      fillOpacity=".94"
                    />
                    <text className="selected-label" y="5">
                      {stop.name}
                    </text>
                  </g>
                </g>
              );
            })}
        </g>
      </svg>
      <CompassRose className="map-compass" />
      <div className="map-zoom">
        <button
          aria-label="Zoom in"
          disabled={zoom >= 2.5}
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="Zoom out"
          disabled={zoom <= 0.75}
          onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
        >
          <Minus size={17} />
        </button>
        <button
          aria-label="Reset map"
          onClick={() => {
            setZoom(1);
            setPan([0, 0]);
          }}
        >
          <Maximize size={15} />
        </button>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-line" /> Your trail
        </span>
        <span>
          <i className="legend-dot" /> A cheese to discover
        </span>
      </div>
      <div className="map-credit">
        <Compass size={11} /> Made for wandering · Natural Earth
      </div>
    </div>
  );
}
