import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeftRight,
  BookOpen,
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Cookie,
  Coffee,
  Download,
  ExternalLink,
  Heart,
  Leaf,
  List,
  Map as MapIcon,
  MapPin,
  Menu,
  Navigation,
  Play,
  Plus,
  Printer,
  Route,
  Search,
  Star,
  TentTree,
  Van,
  Video,
  Wine,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import AtlasMap, { CompassRose } from "./AtlasMap";
import Modal from "./Modal";
import { countries, defaultRoute, getStop, stops, trails } from "./data";
import type { Stop } from "./data";
import {
  createReviewId,
  directionsUrl,
  nearestRoute,
  readSavedIds,
  routeDistance,
} from "./route";
import {
  loadReviews,
  saveReview,
  validatePhoto,
  validateVideo,
} from "./storage";
import type { Review } from "./storage";
import { demoReviews } from "./demo";
import type { DemoReview } from "./demo";

type Entry = Review | DemoReview;
type Tab = "atlas" | "trails" | "journal";
type Dialog = "plan" | "review" | "story" | "book" | null;
// Existing browser settings retain their original keys through the rebrand.
const ROUTE_KEY = "pikgrim-route-v1";
const SAVED_KEY = "pikgrim-saved-v1";
const isDemo = (entry: Entry): entry is DemoReview => "demo" in entry;

function CheeseMark({ size = 35 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M6 31V20L32 9l6 23-32 4v-5ZM6 20l29 3M14 26v2m10 1v2m7-4v2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="m11 9 1-3m7 3 2-3m-15 9-3-1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={12} fill={i < rating ? "currentColor" : "none"} />
      ))}
    </span>
  );
}
function BlobImage({
  blob,
  className,
  alt,
}: {
  blob: Blob;
  className?: string;
  alt: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const value = URL.createObjectURL(blob);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [blob]);
  return url ? <img src={url} className={className} alt={alt} /> : null;
}
function VideoPlayer({ entry }: { entry: Entry }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (isDemo(entry)) {
      setUrl(entry.videoUrl ?? "");
      return;
    }
    if (entry.video) {
      const value = URL.createObjectURL(entry.video);
      setUrl(value);
      return () => URL.revokeObjectURL(value);
    }
  }, [entry]);
  return (
    <>
      <video
        className="journal-video"
        src={url}
        controls
        playsInline
        preload="metadata"
      >
        <track
          kind="captions"
          src={isDemo(entry) ? "/videos/sample-field-note.vtt" : undefined}
          srcLang="en"
          label="English"
          default={isDemo(entry)}
        />
      </video>
      {isDemo(entry) && (
        <p className="quiet">
          A fictional field note using illustrative photographs. Silent, with
          on-screen captions.
        </p>
      )}
    </>
  );
}

function StopCard({
  stop,
  saved,
  onSave,
  onReview,
  onVideo,
  drink,
  setDrink,
}: {
  stop: Stop;
  saved: boolean;
  onSave: () => void;
  onReview: () => void;
  onVideo: () => void;
  drink: "wine" | "tea" | "coffee";
  setDrink: (d: "wine" | "tea" | "coffee") => void;
}) {
  const sample = demoReviews.find((r) => r.stopId === stop.id);
  return (
    <article className="stop-card" key={stop.id}>
      <div className="stop-photo">
        <img
          src="/images/cheese.jpg"
          alt="Illustrative photograph of rustic cheese wheels"
        />
        <span className="photo-note">
          From the cheese cellar · illustrative photograph
        </span>
        <div className="stop-photo-top">
          <span className="location-badge">
            <MapPin size={12} />
            {stop.country}
          </span>
          <button
            className={`save-button ${saved ? "saved" : ""}`}
            aria-label={saved ? `Unsave ${stop.name}` : `Save ${stop.name}`}
            aria-pressed={saved}
            onClick={onSave}
          >
            <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        {sample?.videoUrl && (
          <button className="video-chip" onClick={onVideo}>
            <Play size={11} fill="currentColor" /> A little field note{" "}
            <span>0:24</span>
          </button>
        )}
      </div>
      <div className="stop-card-body">
        <div className="stop-eyebrow">
          <span className="eyebrow">
            A TASTE OF{" "}
            {stop.country === "United Kingdom"
              ? "BRITAIN"
              : stop.country.toUpperCase()}
          </span>
          <span className="stop-stamp">{stop.code}</span>
        </div>
        <h2>{stop.name}</h2>
        <p className="stop-place">
          <MapPin size={12} />
          {stop.place}
        </p>
        <p className="stop-description">{stop.description}</p>
        <div className="pairing-heading">
          <span>Good things come in threes.</span>
          <div className="drink-switch" aria-label="Beverage preference">
            {(["wine", "tea", "coffee"] as const).map((d) => (
              <button
                key={d}
                className={drink === d ? "active" : ""}
                onClick={() => setDrink(d)}
                aria-label={`Pair with ${d}`}
                aria-pressed={drink === d}
              >
                {d === "wine" ? (
                  <Wine size={13} />
                ) : d === "tea" ? (
                  <Leaf size={13} />
                ) : (
                  <Coffee size={13} />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="pairings">
          <div>
            <CheeseMark size={25} />
            <span>
              <small>THE CHEESE</small>
              {stop.milk} milk
            </span>
          </div>
          <div>
            <Cookie size={22} />
            <span>
              <small>THE CRUNCH</small>
              {stop.bread}
            </span>
          </div>
          <div>
            {drink === "wine" ? (
              <Wine size={22} />
            ) : drink === "tea" ? (
              <Leaf size={22} />
            ) : (
              <Coffee size={22} />
            )}
            <span>
              <small>THE SIP</small>
              {stop[drink]}
            </span>
          </div>
        </div>
        <div className="stop-actions">
          <a
            className="button primary"
            href={directionsUrl(stop)}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation size={14} />
            Let’s go there
            <ArrowUpRight size={14} />
          </a>
          <button
            className="icon-button review-button"
            onClick={onReview}
            aria-label={`Write a review of ${stop.name}`}
          >
            <BookOpen size={19} />
          </button>
        </div>
        <p className="venue-line">
          {stop.venue ? (
            <>
              <span className="tiny-dot" />
              Visitor venue ·{" "}
              <a href={stop.source} target="_blank" rel="noreferrer">
                Visit details <ExternalLink size={10} />
              </a>
            </>
          ) : (
            <>
              <MapPin size={11} />
              Regional starting point
              {stop.source && (
                <>
                  {" "}
                  ·{" "}
                  <a href={stop.source} target="_blank" rel="noreferrer">
                    Find a dairy <ExternalLink size={10} />
                  </a>
                </>
              )}
            </>
          )}
        </p>
        {stop.visitNote && <p className="visit-note">{stop.visitNote}</p>}
      </div>
    </article>
  );
}

function Planner({
  route,
  mode,
  onSave,
  onClose,
}: {
  route: string[];
  mode: string;
  onSave: (ids: string[], name: string, mode?: string) => void;
  onClose: () => void;
}) {
  const [preset, setPreset] = useState("current");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(Math.max(0, route.length - 1));
  const [reverse, setReverse] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [transport, setTransport] = useState(mode);
  const base =
    preset === "grand"
      ? stops.map((s) => s.id)
      : preset === "current"
        ? route
        : trails.find((t) => t.id === preset)!.ids;
  const slice = base.slice(start, end + 1);
  const ordered = nearby ? nearestRoute(slice, slice[0]) : slice;
  const chosen = reverse ? [...ordered].reverse() : ordered;
  const selectPreset = (value: string) => {
    setPreset(value);
    setStart(0);
    setEnd(
      (value === "grand"
        ? stops.length
        : value === "current"
          ? route.length
          : trails.find((t) => t.id === value)!.ids.length) - 1,
    );
  };
  return (
    <Modal
      title="Your next delicious detour."
      eyebrow="MAKE IT YOUR OWN"
      onClose={onClose}
      wide
    >
      <p className="modal-intro">
        One cheese a day. As much time as you like in between.
      </p>
      <div className="planner-form">
        <label className="field">
          Start with a trail
          <select value={preset} onChange={(e) => selectPreset(e.target.value)}>
            <option value="current">My current trail</option>
            {trails.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
            <option value="grand">The grand tour · all 24 stops</option>
          </select>
        </label>
        <div className="field-row">
          <label className="field">
            From
            <select
              aria-label="From"
              value={start}
              onChange={(e) => {
                const n = Number(e.target.value);
                setStart(n);
                if (n > end) setEnd(n);
              }}
            >
              {base.map((id, i) => (
                <option value={i} key={id}>
                  {i + 1}. {getStop(id)!.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            To
            <select
              aria-label="To"
              value={end}
              onChange={(e) => setEnd(Number(e.target.value))}
            >
              {base.map((id, i) =>
                i >= start ? (
                  <option value={i} key={id}>
                    {i + 1}. {getStop(id)!.name}
                  </option>
                ) : null,
              )}
            </select>
          </label>
        </div>
        <div className="transport-options">
          <button
            type="button"
            className={transport === "van" ? "selected" : ""}
            aria-pressed={transport === "van"}
            onClick={() => setTransport("van")}
          >
            <Van size={21} />
            <span>
              Campervan<small>Home is where you park it.</small>
            </span>
            {transport === "van" && <Check size={16} />}
          </button>
          <button
            type="button"
            className={transport === "car" ? "selected" : ""}
            aria-pressed={transport === "car"}
            onClick={() => setTransport("car")}
          >
            <TentTree size={21} />
            <span>
              Car + cosy stays<small>A little room along the way.</small>
            </span>
            {transport === "car" && <Check size={16} />}
          </button>
        </div>
        <div className="planner-checks">
          <label>
            <input
              type="checkbox"
              checked={reverse}
              onChange={(e) => setReverse(e.target.checked)}
            />
            Travel in reverse
          </label>
          <label>
            <input
              type="checkbox"
              checked={nearby}
              onChange={(e) => setNearby(e.target.checked)}
            />
            Order by nearest next stop
          </label>
        </div>
        <div className="plan-summary">
          <div>
            <strong>{chosen.length}</strong>
            <span>cheese stops</span>
          </div>
          <div>
            <strong>
              {new Set(chosen.map((id) => getStop(id)!.country)).size}
            </strong>
            <span>countries</span>
          </div>
          <div>
            <strong>
              {routeDistance(chosen).toLocaleString()} <small>km</small>
            </strong>
            <span>straight-line distance</span>
          </div>
        </div>
        <ol className="planner-stops">
          {chosen.map((id) => (
            <li key={id}>
              <span>{getStop(id)!.name}</span>
              <small>{getStop(id)!.place}</small>
            </li>
          ))}
        </ol>
        <p className="quiet">
          This is a suggested sequence, not a road-optimised itinerary. Allow
          extra travel days for long legs and islands. Check opening times
          {transport === "van" ? ", campervan access, parking," : ""} and
          ferries before setting off.
        </p>
        <button
          className="button primary full-width"
          disabled={!chosen.length}
          onClick={() =>
            onSave(
              chosen,
              preset === "grand"
                ? "The grand tour"
                : preset === "current"
                  ? "My own little pilgrimage"
                  : trails.find((t) => t.id === preset)!.name,
              transport,
            )
          }
        >
          Make this my trail <ArrowRight size={16} />
        </button>
      </div>
    </Modal>
  );
}

function ReviewForm({
  stop,
  onClose,
  onSaved,
}: {
  stop: Stop;
  onClose: () => void;
  onSaved: (entry: Review) => void;
}) {
  const [rating, setRating] = useState(0);
  const [photo, setPhoto] = useState<File>();
  const [video, setVideo] = useState<File>();
  const [duration, setDuration] = useState<number>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [validating, setValidating] = useState(false);
  const [text, setText] = useState("");
  const pending = useRef(0);
  const attach = async (
    e: ChangeEvent<HTMLInputElement>,
    kind: "photo" | "video",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    pending.current++;
    setValidating(true);
    try {
      if (kind === "photo") {
        await validatePhoto(file);
        setPhoto(file);
      } else {
        const seconds = await validateVideo(file);
        setVideo(file);
        setDuration(seconds);
      }
    } catch (err) {
      setError((err as Error).message);
      e.target.value = "";
    } finally {
      pending.current--;
      setValidating(pending.current > 0);
    }
  };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!rating) {
      setError("Give this cheese a rating before saving.");
      return;
    }
    if (!text.trim()) {
      setError("Add a few words about your tasting.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const review: Review = {
      id: createReviewId(),
      stopId: stop.id,
      name: String(form.get("name") ?? "").trim() || "A fellow pilgrim",
      text: text.trim(),
      rating,
      location: String(form.get("location") ?? "").trim(),
      date: new Date().toISOString(),
      photo,
      video,
      duration,
    };
    try {
      await saveReview(review);
      onSaved(review);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title="A taste worth remembering."
      eyebrow={`${stop.name.toUpperCase()} · YOUR FIELD NOTE`}
      onClose={onClose}
    >
      <form className="review-form" onSubmit={submit}>
        <p className="modal-intro">
          A dairy, a picnic, or your corner shop. Every good cheese has a story.
        </p>
        <fieldset className="rating-field">
          <legend>How was your cheese?</legend>
          <div>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                aria-label={`Rate ${n} ${n === 1 ? "star" : "stars"}`}
                aria-pressed={rating === n}
                onClick={() => setRating(n)}
              >
                <Star size={29} fill={n <= rating ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
        </fieldset>
        <div className="field-row">
          <label className="field">
            Your name
            <input
              name="name"
              placeholder="Fellow cheese pilgrim"
              maxLength={60}
            />
          </label>
          <label className="field">
            Where did you find it?
            <input
              name="location"
              placeholder="A village dairy, a corner shop…"
              maxLength={140}
            />
          </label>
        </div>
        <label className="field">
          Your tasting note
          <textarea
            required
            rows={4}
            maxLength={1200}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="The flavour. The pairing. The little moment you want to keep."
          />
          <small className="character-count">{text.length} / 1,200</small>
        </label>
        <div className="upload-row">
          <label className="upload">
            <Camera size={20} />
            <strong>{photo ? "Photo attached" : "Add a photograph"}</strong>
            <small>
              {photo ? photo.name : "JPEG, PNG, WebP, AVIF · up to 12 MB"}
            </small>
            <input
              aria-label="Add a photograph"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => void attach(e, "photo")}
            />
          </label>
          <label className="upload">
            <Video size={20} />
            <strong>
              {video ? "Video attached" : "A little video, perhaps?"}
            </strong>
            <small>
              {video
                ? `${duration?.toFixed(1)} seconds · ${video.name}`
                : "60 seconds maximum · up to 100 MB"}
            </small>
            <input
              aria-label="Add a video"
              type="file"
              accept="video/*"
              onChange={(e) => void attach(e, "video")}
            />
          </label>
        </div>
        {photo && (
          <div className="upload-preview">
            <BlobImage blob={photo} alt="Your selected photograph" />
            <button
              type="button"
              className="text-button"
              onClick={() => setPhoto(undefined)}
            >
              Remove photo
            </button>
          </div>
        )}
        {video && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setVideo(undefined);
              setDuration(undefined);
            }}
          >
            Remove video
          </button>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="quiet">
          Your notes and media are saved on this browser. They aren’t published
          or shared with other travellers.
        </p>
        <button
          className="button primary full-width"
          disabled={busy || validating}
        >
          {busy ? (
            "Saving your memory…"
          ) : validating ? (
            "Checking your attachment…"
          ) : (
            <>
              <BookOpen size={16} />
              Save to my journal
            </>
          )}
        </button>
      </form>
    </Modal>
  );
}

function EntryCard({
  entry,
  onPlay,
  onExplore,
}: {
  entry: Entry;
  onPlay: (e: Entry) => void;
  onExplore: (id: string) => void;
}) {
  const stop = getStop(entry.stopId)!;
  return (
    <article className="entry-card">
      <div className="entry-photo">
        {isDemo(entry) ? (
          <img
            src={entry.photoUrl}
            alt="Illustrative photograph for the sample journal"
          />
        ) : entry.photo ? (
          <BlobImage
            blob={entry.photo}
            alt={`${stop.name} tasting photograph`}
          />
        ) : (
          <div className="entry-no-photo">
            <CheeseMark size={72} />
          </div>
        )}
        {(isDemo(entry) ? entry.videoUrl : entry.video) && (
          <button className="video-chip" onClick={() => onPlay(entry)}>
            <Play size={11} fill="currentColor" />
            Watch the moment<span>{Math.round(entry.duration ?? 0)}s</span>
          </button>
        )}
        {isDemo(entry) && (
          <span className="sample-label">SAMPLE FIELD NOTE</span>
        )}
      </div>
      <div className="entry-body">
        <div className="entry-meta">
          <span>{stop.place.split(",")[0]}</span>
          <Stars rating={entry.rating} />
        </div>
        <button className="entry-title" onClick={() => onExplore(stop.id)}>
          {stop.name}
          <ArrowUpRight size={17} />
        </button>
        <p>{entry.text}</p>
        <div className="entry-author">
          <span className="avatar">
            {isDemo(entry) ? "M&J" : entry.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{entry.name}</strong>
            <small>
              {new Date(entry.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · {entry.location || "Somewhere delicious"}
            </small>
          </div>
        </div>
      </div>
    </article>
  );
}

function BookPreview({
  route,
  entries,
  onClose,
}: {
  route: string[];
  entries: Entry[];
  onClose: () => void;
}) {
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [includeSample, setIncludeSample] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printBook = async () => {
    setPrinting(true);
    setError("");
    try {
      await document.fonts.ready;
      await Promise.all(
        [...document.querySelectorAll<HTMLImageElement>(".book-pages img")].map(
          (img) => img.decode(),
        ),
      );
      window.print();
    } catch {
      setError(
        "A photograph could not be prepared for printing. Please try again.",
      );
    } finally {
      setPrinting(false);
    }
  };
  useEffect(() => {
    let active = true;
    Promise.all(
      route.map(
        async (id) =>
          [
            id,
            await QRCode.toDataURL(
              `${location.origin}${location.pathname}#cheese=${id}`,
              {
                width: 120,
                margin: 1,
                color: { dark: "#294b3d", light: "#fffdf7" },
              },
            ),
          ] as const,
      ),
    )
      .then((pairs) => {
        if (active) setCodes(Object.fromEntries(pairs));
      })
      .catch(() => {
        if (active)
          setError(
            "The QR codes could not be generated. Close this preview and try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [route]);
  return (
    <Modal
      title="Your little book of cheese."
      eyebrow="A KEEPSAKE, ONE PAGE AT A TIME"
      onClose={onClose}
      wide
    >
      <div className="book-toolbar">
        <p className="quiet">
          {route.length} consecutive pages in your trail’s order. QR codes open
          the cheese’s atlas page; private notes stay on this browser.
        </p>
        <label className="checkbox-line">
          <input
            type="checkbox"
            checked={includeSample}
            onChange={(e) => setIncludeSample(e.target.checked)}
          />
          Include sample notes
        </label>
        <button
          className="button primary"
          onClick={() => void printBook()}
          disabled={printing || Object.keys(codes).length !== route.length}
        >
          <Printer size={15} />
          {printing ? "Preparing photographs…" : "Print / save as PDF"}
        </button>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </div>
      <div className="book-pages">
        {route.map((id, i) => {
          const stop = getStop(id)!;
          const notes = entries.filter(
            (e) => e.stopId === id && (includeSample || !isDemo(e)),
          );
          return (
            <article className="book-page" key={id}>
              <div className="book-page-top">
                <span>CHEESE PILGRIM · THE FIELD JOURNAL</span>
                <span>{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="eyebrow">
                {stop.country} · {stop.place}
              </p>
              <h2>{stop.name}</h2>
              <p>{stop.description}</p>
              <div className="book-pairing">
                <strong>The perfect little trio</strong>
                <p>
                  {stop.name} + {stop.bread} + {stop.wine}
                </p>
                <small>
                  Prefer tea? {stop.tea}. Coffee? {stop.coffee}.
                </small>
              </div>
              {notes.length ? (
                notes.map((entry) => (
                  <div className="book-note" key={entry.id}>
                    <Stars rating={entry.rating} />
                    <p>{entry.text}</p>
                    {isDemo(entry) ? (
                      <img
                        src={entry.photoUrl}
                        alt="Illustrative sample photograph"
                      />
                    ) : entry.photo ? (
                      <BlobImage blob={entry.photo} alt="Tasting photograph" />
                    ) : null}
                    <small>
                      {entry.name}
                      {isDemo(entry) ? " · Sample entry" : ""} ·{" "}
                      {entry.location}
                    </small>
                  </div>
                ))
              ) : (
                <div className="book-blank">
                  <p>A few words to remember it by…</p>
                  <div />
                  <div />
                  <div />
                </div>
              )}
              <div className="book-page-footer">
                <div>
                  {codes[id] && (
                    <img src={codes[id]} alt={`QR code for ${stop.name}`} />
                  )}
                  <span>
                    Find this cheese.
                    <br />
                    Follow the next chapter.
                  </span>
                </div>
                <small>
                  {i + 1} / {route.length}
                </small>
              </div>
            </article>
          );
        })}
      </div>
    </Modal>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("atlas");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selected, setSelected] = useState(() => {
    const id = new URLSearchParams(location.hash.slice(1)).get("cheese");
    return id && getStop(id) ? id : "gruyere";
  });
  const [route, setRoute] = useState(() => {
    const ids = readSavedIds(ROUTE_KEY, defaultRoute);
    return ids.length ? ids : defaultRoute;
  });
  const [routeName, setRouteName] = useState("The Alpine passage");
  const [saved, setSaved] = useState(() => readSavedIds(SAVED_KEY, []));
  const [transport, setTransport] = useState(() => {
    try {
      return localStorage.getItem("pikgrim-transport") === "car"
        ? "car"
        : "van";
    } catch {
      return "van";
    }
  });
  const [country, setCountry] = useState("All countries");
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [mapView, setMapView] = useState(true);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [drink, setDrink] = useState<"wine" | "tea" | "coffee">("wine");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showSamples, setShowSamples] = useState(true);
  const [videoEntry, setVideoEntry] = useState<Entry | null>(null);
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const notify = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    let active = true;
    loadReviews()
      .then((value) => {
        if (active) setReviews(value);
      })
      .catch((e) => {
        if (active) setStorageError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoadingReviews(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const match = trails.find(
      (t) => JSON.stringify(t.ids) === JSON.stringify(route),
    );
    setRouteName(match?.name ?? "My own little pilgrimage");
  }, []);
  useEffect(() => {
    const onHash = () => {
      const id = new URLSearchParams(location.hash.slice(1)).get("cheese");
      if (id && getStop(id)) {
        setSelected(id);
        setTab("atlas");
        setCountry("All countries");
        setQuery("");
        setSavedOnly(false);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const select = (id: string) => {
    setSelected(id);
    history.replaceState(null, "", `#cheese=${id}`);
  };
  const stop = getStop(selected)!;
  const visible = useMemo(
    () =>
      stops.filter(
        (s) =>
          (country === "All countries" || s.country === country) &&
          (!savedOnly || saved.includes(s.id)) &&
          `${s.name} ${s.country} ${s.place} ${s.milk}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [country, query, savedOnly, saved],
  );
  useEffect(() => {
    if (visible.length && !visible.some((s) => s.id === selected)) {
      setSelected(visible[0].id);
      history.replaceState(null, "", `#cheese=${visible[0].id}`);
    }
  }, [visible, selected]);
  const entries: Entry[] = [...reviews, ...(showSamples ? demoReviews : [])];
  const currentIndex = route.indexOf(selected);
  const persist = (key: string, ids: string[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      notify(
        "Browser storage is unavailable. This change will last for this visit only.",
      );
    }
  };
  const saveStop = () => {
    const next = saved.includes(selected)
      ? saved.filter((id) => id !== selected)
      : [...saved, selected];
    setSaved(next);
    persist(SAVED_KEY, next);
  };
  const changeTab = (value: Tab) => {
    setTab(value);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const explore = (id: string) => {
    setCountry("All countries");
    setQuery("");
    setSavedOnly(false);
    select(id);
    changeTab("atlas");
  };
  const chooseTrail = (ids: string[], name: string, mode?: string) => {
    if (mode) {
      setTransport(mode);
      try {
        localStorage.setItem("pikgrim-transport", mode);
      } catch {
        /* The route persistence call below reports unavailable storage. */
      }
    }
    setRoute(ids);
    persist(ROUTE_KEY, ids);
    setRouteName(name);
    select(ids[0]);
    setCountry("All countries");
    setQuery("");
    setSavedOnly(false);
    setDialog(null);
    changeTab("atlas");
    notify("Your trail is ready. Let the good wandering begin.");
  };
  const trailCards = (
    <div className="trail-grid">
      {trails.map((trail, i) => (
        <button
          className="trail-card"
          key={trail.id}
          onClick={() => chooseTrail(trail.ids, trail.name)}
        >
          <div className="trail-photo">
            <img
              src={trail.image}
              alt={
                i === 0
                  ? "A dramatic Alpine mountain landscape"
                  : i === 1
                    ? "Lavender fields at sunset"
                    : "Colourful coastal houses in Italy"
              }
              loading="lazy"
            />
            <span className="trail-number">0{i + 1}</span>
            <span className="trail-length">
              {trail.ids.length} cheeses ·{" "}
              {new Set(trail.ids.map((id) => getStop(id)!.country)).size}{" "}
              {i === 0 ? "countries" : "country"}
            </span>
          </div>
          <div className="trail-info">
            <span className="eyebrow">{trail.eyebrow}</span>
            <h3>{trail.name}</h3>
            <p>{trail.subtitle}</p>
            <span className="trail-arrow">
              <ArrowUpRight size={22} />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
  const openReview = () => setDialog("review");
  const exportJournal = async () => {
    try {
      const serializeBlob = async (blob: Blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(new Error("A media attachment could not be exported."));
          reader.readAsDataURL(blob);
        });
      const exported = await Promise.all(
        reviews.map(async (r) => ({
          ...r,
          photo: r.photo ? await serializeBlob(r.photo) : undefined,
          video: r.video ? await serializeBlob(r.video) : undefined,
        })),
      );
      const blob = new Blob(
        [
          JSON.stringify(
            {
              version: 1,
              exportedAt: new Date().toISOString(),
              route,
              saved,
              reviews: exported,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cheese-pilgrim-journal.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Your journal backup includes your notes, photos, and videos.");
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => changeTab("atlas")}
            aria-label="Cheese Pilgrim home"
          >
            <CheeseMark />
            <span>
              cheese <em>pilgrim</em>
              <small>A JOURNEY IN GOOD TASTE</small>
            </span>
          </button>
          <nav
            className={mobileMenu ? "main-nav open" : "main-nav"}
            aria-label="Main navigation"
          >
            <button
              className={tab === "atlas" ? "active" : ""}
              onClick={() => changeTab("atlas")}
            >
              The atlas
            </button>
            <button
              className={tab === "trails" ? "active" : ""}
              onClick={() => changeTab("trails")}
            >
              Little pilgrimages
            </button>
            <button
              onClick={() => {
                setDialog("story");
                setMobileMenu(false);
              }}
            >
              Our philosophy
            </button>
          </nav>
          <div className="header-actions">
            <button
              className={`journal-link ${tab === "journal" ? "active" : ""}`}
              onClick={() => changeTab("journal")}
            >
              <BookOpen size={17} />
              <span>My journal</span>
              {reviews.length > 0 && <small>{reviews.length}</small>}
            </button>
            <button
              className="button primary header-plan"
              onClick={() => setDialog("plan")}
            >
              Plan a pilgrimage <ArrowUpRight size={15} />
            </button>
            <button
              className="icon-button mobile-toggle"
              onClick={() => setMobileMenu((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={mobileMenu}
            >
              {mobileMenu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        {tab === "atlas" && (
          <>
            <section className="hero page-width">
              <div className="hero-copy">
                <p className="eyebrow">
                  <span /> FOLLOW YOUR CURIOSITY. BRING AN APPETITE.
                </p>
                <h1>
                  Good cheese.
                  <br />A very <em>good journey.</em>
                </h1>
                <p>
                  Discover the places, people, and pairings behind Europe’s
                  cheeses.
                  <br className="desktop-break" /> One stop. One little plate.
                  One lovely evening at a time.
                </p>
              </div>
              <div className="hero-aside">
                <div className="pilgrim-seal">
                  <span>TAKE THE SLOW ROAD</span>
                  <CompassRose />
                  <small>EST. 2026 · EUROPE</small>
                </div>
                <div className="hero-stats">
                  <span>
                    <strong>24</strong> cheeses
                  </span>
                  <i />
                  <span>
                    <strong>9</strong> countries
                  </span>
                  <i />
                  <span>Endless little stories</span>
                </div>
              </div>
            </section>
            <section
              className="atlas-section page-width"
              aria-label="Cheese atlas"
            >
              <div className="atlas-toolbar">
                <div className="atlas-title">
                  <Compass size={18} />
                  <h2>The cheese atlas</h2>
                  <span className="count-pill">
                    {visible.length} {visible.length === 1 ? "stop" : "stops"}
                  </span>
                </div>
                <div className="atlas-filters">
                  <label className="search-box">
                    <Search size={15} />
                    <input
                      aria-label="Search cheeses or places"
                      placeholder="Find a cheese or a place…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </label>
                  <label className="country-filter">
                    <span className="sr-only">Filter by country</span>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <option>All countries</option>
                      {countries.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} />
                  </label>
                  <button
                    className={`filter-saved ${savedOnly ? "active" : ""}`}
                    aria-label="Show saved cheeses"
                    aria-pressed={savedOnly}
                    onClick={() => setSavedOnly((v) => !v)}
                  >
                    <Bookmark
                      size={16}
                      fill={savedOnly ? "currentColor" : "none"}
                    />
                  </button>
                  <div className="view-toggle">
                    <button
                      aria-label="Map view"
                      aria-pressed={mapView}
                      className={mapView ? "active" : ""}
                      onClick={() => setMapView(true)}
                    >
                      <MapIcon size={16} />
                    </button>
                    <button
                      aria-label="List view"
                      aria-pressed={!mapView}
                      className={!mapView ? "active" : ""}
                      onClick={() => setMapView(false)}
                    >
                      <List size={17} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="atlas-layout">
                <div className="atlas-left">
                  {visible.length === 0 ? (
                    <div className="empty-state">
                      <Search size={34} />
                      <h3>No cheese left behind.</h3>
                      <p>
                        {savedOnly
                          ? "Save a cheese with its bookmark, then find it here."
                          : "Try another name, place, or country."}
                      </p>
                      <button
                        className="button outline"
                        onClick={() => {
                          setQuery("");
                          setCountry("All countries");
                          setSavedOnly(false);
                        }}
                      >
                        Show the whole atlas
                      </button>
                    </div>
                  ) : mapView ? (
                    <AtlasMap
                      visible={visible}
                      selected={selected}
                      route={route}
                      onSelect={select}
                    />
                  ) : (
                    <div className="cheese-list">
                      {visible.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => select(s.id)}
                          className={s.id === selected ? "selected" : ""}
                        >
                          <span className="list-cheese-icon">
                            <CheeseMark size={30} />
                          </span>
                          <span>
                            <strong>{s.name}</strong>
                            <small>
                              {s.place} · {s.country}
                            </small>
                          </span>
                          <span className="list-texture">{s.texture}</span>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="trail-strip">
                    <div className="trail-strip-icon">
                      <Route size={22} />
                    </div>
                    <div className="trail-strip-title">
                      <span className="eyebrow">YOUR CURRENT TRAIL</span>
                      <strong>{routeName}</strong>
                      <small>
                        {route.length} stops ·{" "}
                        {new Set(route.map((id) => getStop(id)!.country)).size}{" "}
                        countries · one delicious detour
                      </small>
                    </div>
                    <button
                      className="icon-button reverse-button"
                      aria-label="Reverse trail"
                      onClick={() => {
                        const next = [...route].reverse();
                        setRoute(next);
                        persist(ROUTE_KEY, next);
                        notify(
                          "Trail reversed. Follow it in the other direction.",
                        );
                      }}
                    >
                      <ArrowLeftRight size={18} />
                    </button>
                    <button
                      className="trail-edit"
                      onClick={() => setDialog("plan")}
                    >
                      Make it yours
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
                <StopCard
                  stop={stop}
                  saved={saved.includes(selected)}
                  onSave={saveStop}
                  onReview={openReview}
                  onVideo={() =>
                    setVideoEntry(
                      demoReviews.find((r) => r.stopId === selected)!,
                    )
                  }
                  drink={drink}
                  setDrink={setDrink}
                />
              </div>
              <div className="atlas-bottom">
                <span>
                  <Leaf size={13} /> Pairings are suggestions. The best one is
                  the one you love.
                </span>
                <div className="next-stop-controls">
                  <button
                    aria-label="Previous stop"
                    disabled={currentIndex === 0 || route.length < 2}
                    onClick={() =>
                      select(
                        route[
                          currentIndex < 0 ? route.length - 1 : currentIndex - 1
                        ],
                      )
                    }
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span>
                    {currentIndex >= 0
                      ? `Stop ${currentIndex + 1} of ${route.length}`
                      : "Off the beaten trail"}
                  </span>
                  <button
                    aria-label="Next stop"
                    disabled={
                      currentIndex === route.length - 1 || route.length < 2
                    }
                    onClick={() =>
                      select(route[currentIndex < 0 ? 0 : currentIndex + 1])
                    }
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </section>
            <section className="little-trips page-width">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    A FEW DAYS. A FEW VERY GOOD CHEESES.
                  </p>
                  <h2>A little pilgrimage.</h2>
                </div>
                <button
                  className="text-link"
                  onClick={() => changeTab("trails")}
                >
                  Find your next detour <ArrowRight size={16} />
                </button>
              </div>
              {trailCards}
            </section>
            <section className="journal-teaser page-width">
              <div className="teaser-art">
                <BookOpen size={54} strokeWidth={1} />
                <span>
                  Notes from
                  <br />
                  <em>the slow road.</em>
                </span>
              </div>
              <div>
                <p className="eyebrow">A MEMORY IS BETTER WHEN YOU KEEP IT.</p>
                <h2>A little cheese. A little story.</h2>
                <p>
                  A photograph, a few words, a minute of your day. Make a
                  journal worth coming back to — and a book to take on your next
                  adventure.
                </p>
                <button
                  className="text-link"
                  onClick={() => changeTab("journal")}
                >
                  Meet Margot & Jules, our sample pilgrims{" "}
                  <ArrowRight size={16} />
                </button>
              </div>
            </section>
          </>
        )}
        {tab === "trails" && (
          <div className="page-width subpage">
            <p className="eyebrow">THE PLEASURE IS IN THE WANDERING</p>
            <h1>
              Small trips.
              <br />
              <em>Very good memories.</em>
            </h1>
            <p className="subpage-intro">
              You don’t need a year off. Just a few free days, a little
              curiosity,
              <br />
              and room for one more cheese.
            </p>
            {trailCards}
            <div className="custom-trail">
              <CompassRose />
              <div>
                <h2>Your own little pilgrimage.</h2>
                <p>
                  Take a consecutive stretch of a trail, explore all 24 stops,
                  or turn the whole thing around.
                </p>
              </div>
              <button
                className="button primary"
                onClick={() => setDialog("plan")}
              >
                Plan my route <ArrowRight size={16} />
              </button>
            </div>
            <p className="quiet">
              Our trails are starting points for planning. Route lines connect
              regions, not roads; transport, accommodation, seasonal access, and
              venue bookings are up to you.
            </p>
          </div>
        )}
        {tab === "journal" && (
          <div className="page-width subpage">
            <div className="journal-page-heading">
              <div>
                <p className="eyebrow">SOME THINGS ARE WORTH SAVOURING TWICE</p>
                <h1>
                  The field <em>journal.</em>
                </h1>
                <p className="subpage-intro">
                  A collection of cheeses, little places, and very good
                  evenings.
                </p>
              </div>
              <div className="journal-page-actions">
                <button
                  className="button outline"
                  onClick={() => setDialog("book")}
                >
                  <Printer size={15} />
                  Make a little book
                </button>
                <button className="button primary" onClick={openReview}>
                  <Plus size={16} />
                  Add a field note
                </button>
              </div>
            </div>
            <div className="persona-banner">
              <span className="persona-avatar">
                M<span>&</span>J
              </span>
              <div>
                <span className="eyebrow">MEET YOUR SAMPLE PILGRIMS</span>
                <h3>Margot & Jules, taking the long way.</h3>
                <p>
                  A fictional couple, a borrowed campervan, and a soft spot for
                  hard cheese. Explore their three sample notes, then start your
                  own.
                </p>
              </div>
              <label className="sample-toggle">
                <input
                  type="checkbox"
                  checked={showSamples}
                  onChange={(e) => setShowSamples(e.target.checked)}
                />
                Show sample notes
              </label>
            </div>
            {storageError && (
              <p className="form-error" role="alert">
                {storageError}
              </p>
            )}
            {loadingReviews ? (
              <p className="quiet">Opening your journal…</p>
            ) : entries.length ? (
              <div className="entry-grid">
                {entries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onPlay={setVideoEntry}
                    onExplore={explore}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state journal-empty">
                <BookOpen size={44} />
                <h2>The first page is yours.</h2>
                <p>Choose a cheese on the atlas, then tell its little story.</p>
                <button
                  className="button primary"
                  onClick={() => changeTab("atlas")}
                >
                  Find my first cheese
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
            <div className="journal-bottom">
              <p>
                <Heart size={14} />
                Your own journal lives in this browser. Take a backup to keep
                your memories safe.
              </p>
              <button
                className="text-link"
                onClick={() => void exportJournal()}
              >
                <Download size={15} />
                Export my journal
              </button>
            </div>
          </div>
        )}
      </main>
      <footer className="site-footer page-width">
        <div>
          <CheeseMark size={27} />
          <span>Good cheese. Good company. Take the long way.</span>
        </div>
        <button onClick={() => setDialog("story")}>
          A small manifesto <ArrowUpRight size={12} />
        </button>
        <span>Made for the love of cheese. © 2026</span>
      </footer>
      {dialog === "plan" && (
        <Planner
          route={route}
          mode={transport}
          onSave={chooseTrail}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "review" && (
        <ReviewForm
          stop={stop}
          onClose={() => setDialog(null)}
          onSaved={(entry) => {
            setReviews((r) => [entry, ...r]);
            setDialog(null);
            setTab("journal");
            notify("A good memory, safely tucked into your journal.");
          }}
        />
      )}
      {dialog === "book" && (
        <BookPreview
          route={route}
          entries={[...reviews, ...demoReviews]}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "story" && (
        <Modal
          title="Take the long way."
          eyebrow="THE CHEESE PILGRIM PHILOSOPHY"
          onClose={() => setDialog(null)}
        >
          <div className="manifesto">
            <CompassRose />
            <p>
              Some journeys start with a destination. Ours starts with a piece
              of cheese.
            </p>
            <p>
              Follow it back to the pasture, the village, the person who made
              it. Add a little bread and something lovely to drink. Stay for the
              evening.
            </p>
            <p>
              Or start at your corner shop. A pilgrimage can be a thousand
              miles, or a ten-minute walk.
            </p>
            <h3>Keep it simple.</h3>
            <div className="manifesto-trio">
              <CheeseMark />
              <Plus size={14} />
              <Cookie size={28} />
              <Plus size={14} />
              <Wine size={28} />
            </div>
            <p>
              Cheese. Something crunchy. Something to sip.
              <br />
              Everything else is a happy detour.
            </p>
            <hr />
            <p className="quiet">
              Inspired by Liam’s cheese-map idea and the{" "}
              <a
                href="https://www.tasteatlas.com/cheese"
                target="_blank"
                rel="noreferrer"
              >
                TasteAtlas cheese map
              </a>
              . Our first atlas has 24 regional starting points, with official
              visitor links where available. Coordinates are approximate. Margot
              & Jules and their notes are fictional; photography is
              illustrative.
            </p>
            <button
              className="button primary full-width"
              onClick={() => {
                setDialog(null);
                changeTab("atlas");
              }}
            >
              Find your first little adventure
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {videoEntry && (
        <Modal
          title="A minute on the slow road."
          eyebrow={
            isDemo(videoEntry)
              ? "MARGOT & JULES · SAMPLE FIELD NOTE"
              : `${videoEntry.name} · FIELD NOTE`
          }
          onClose={() => setVideoEntry(null)}
        >
          <VideoPlayer entry={videoEntry} />
          <p className="video-story">{videoEntry.text}</p>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
