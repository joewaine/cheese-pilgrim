export type Review = {
  id: string;
  stopId: string;
  name: string;
  text: string;
  rating: number;
  location: string;
  date: string;
  photo?: Blob;
  video?: Blob;
  duration?: number;
};
// Keep the original database name so the rebrand preserves existing journals.
const DATABASE = "cheeze-pikgrim";
const STORE = "reviews";
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window))
      return reject(
        new Error("This browser cannot save a journal. Try a current browser."),
      );
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Your journal could not be opened. Check your browser’s storage settings.",
        ),
      );
    request.onblocked = () =>
      reject(new Error("Close other Cheese Pilgrim tabs and try again."));
  });
}

export async function loadReviews(): Promise<Review[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).getAll();
    request.onsuccess = () =>
      resolve(
        (request.result as Review[]).sort((a, b) =>
          b.date.localeCompare(a.date),
        ),
      );
    request.onerror = () =>
      reject(new Error("Your journal could not be read. Please try again."));
    transaction.oncomplete = () => db.close();
    transaction.onabort = () => {
      db.close();
      reject(new Error("Reading your journal was interrupted."));
    };
  });
}

export async function saveReview(review: Review): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(review);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onabort = () => {
      db.close();
      reject(
        new Error(
          "There is not enough browser storage to save this entry. Try a smaller photo or video.",
        ),
      );
    };
    transaction.onerror = () => {
      /* The abort handler reports failure after the transaction settles. */
    };
  });
}

export function validatePhoto(file: File): Promise<void> {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
  )
    return Promise.reject(
      new Error("Choose a JPEG, PNG, WebP, or AVIF photo."),
    );
  if (file.size > MAX_PHOTO_BYTES)
    return Promise.reject(new Error("Choose a photo smaller than 12 MB."));
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That photo could not be read. Please choose another."));
    };
    img.src = url;
  });
}

export function validateVideo(file: File): Promise<number> {
  if (!file.type.startsWith("video/"))
    return Promise.reject(new Error("Choose a video file."));
  if (file.size > MAX_VIDEO_BYTES)
    return Promise.reject(new Error("Choose a video smaller than 100 MB."));
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const clean = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    const timeout = setTimeout(() => {
      clean();
      reject(new Error("The video took too long to load. Try MP4 or WebM."));
    }, 15000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      clean();
      if (!Number.isFinite(duration) || duration <= 0)
        reject(
          new Error("The video duration could not be read. Try MP4 or WebM."),
        );
      else if (duration > 60)
        reject(
          new Error(
            "A little story, under a minute. Trim your video to 60 seconds or less.",
          ),
        );
      else resolve(duration);
    };
    video.onerror = () => {
      clean();
      reject(
        new Error("This browser cannot read that video. Try MP4 or WebM."),
      );
    };
    video.src = url;
  });
}
