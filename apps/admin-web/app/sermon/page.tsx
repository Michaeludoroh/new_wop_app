import type { Metadata } from "next";
import { existsSync } from "fs";
import path from "path";
import styles from "./sermon.module.css";

const SERMON = {
  title: "Living with Passion and Purpose",
  preachedOn: "Sunday, July 6, 2026",
  description:
    "Join us for this month’s message as we explore what it means to walk boldly in faith, serve with love, and carry God’s purpose into every area of life. May this word encourage your heart and strengthen your walk with Christ."
} as const;

const VIDEO_SRC = "/videos/sermon-july-2026.mp4";

const POSTER_CANDIDATES = [
  "/videos/sermon-july-2026-poster.jpg",
  "/videos/sermon-july-2026-poster.png",
  "/videos/sermon-july-2026-poster.webp",
  "/images/sermon-july-2026-poster.jpg"
] as const;

function resolvePosterPath(): string | undefined {
  const publicDir = path.join(process.cwd(), "public");

  for (const candidate of POSTER_CANDIDATES) {
    const relativePath = candidate.replace(/^\//, "");
    if (existsSync(path.join(publicDir, relativePath))) {
      return candidate;
    }
  }

  return undefined;
}

export const metadata: Metadata = {
  title: `Sermon — ${SERMON.title} | Men and Women of Passion and Purpose`,
  description: SERMON.description,
  openGraph: {
    title: SERMON.title,
    description: SERMON.description,
    type: "video.other"
  }
};

export default function SermonPage() {
  const poster = resolvePosterPath();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <p className={styles.eyebrow}>Sermon</p>
          <h1 className={styles.orgName}>Men and Women of Passion and Purpose</h1>
        </div>
      </header>

      <main className={styles.main}>
        <article className={styles.sermonCard} aria-labelledby="sermon-title">
          <div className={styles.videoWrapper}>
            <video
              className={styles.video}
              controls
              playsInline
              preload="metadata"
              src={VIDEO_SRC}
              {...(poster ? { poster } : {})}
            >
              Your browser does not support HTML5 video.{" "}
              <a href={VIDEO_SRC}>Download the sermon video</a>.
            </video>
          </div>

          <div className={styles.content}>
            <h2 id="sermon-title" className={styles.title}>
              {SERMON.title}
            </h2>

            <p className={styles.meta}>
              <span className={styles.dateBadge}>Preached {SERMON.preachedOn}</span>
            </p>

            <p className={styles.description}>{SERMON.description}</p>
          </div>
        </article>
      </main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Men and Women of Passion and Purpose. All rights reserved.</p>
      </footer>
    </div>
  );
}
