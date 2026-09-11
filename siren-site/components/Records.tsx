"use client";

import Image from "next/image";
import { useMemo } from "react";
import { records as fallbackRecords } from "@/lib/data";
import type { ApiMusicRecord } from "@/lib/api";
import { useLanguage } from "./LanguageProvider";
import { useMusicPlayer } from "./MusicPlayer";

const recordTones = ["#8c3760", "#2a675d", "#635090", "#9b5735", "#b4474d", "#41658e"];
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const PlayIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" fill="currentColor" /></svg>;
const PauseIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z" fill="currentColor" /></svg>;

export default function Records({ records = [] }: { records?: ApiMusicRecord[] }) {
  const { t } = useLanguage();
  const displayRecords = useMemo(() => records.length
    ? records.map((record, index) => ({ id: record.id, title: record.title, artist: record.artist || "SIREN", genre: record.genre || "—", image: record.coverImageUrl || fallbackRecords[index % fallbackRecords.length].image, tone: recordTones[index % recordTones.length], audioUrl: record.audioUrl.startsWith("http") ? record.audioUrl : `${apiOrigin}${record.audioUrl}` }))
    : fallbackRecords.map((record, index) => ({ ...record, id: `fallback-${index}`, artist: "SIREN", tone: recordTones[index % recordTones.length], audioUrl: "" })), [records]);
  const { activeId, playing, playTrack } = useMusicPlayer();

  const compactRecords = displayRecords.slice(0, 10);

  return <section className="records" id="records">
    <div className="records-heading"><h2>{t("records")}</h2><a href="#playlist-frame">{t("playlist")}</a></div>
    <div className="records-grid">
      {compactRecords.map((record) => {
        const isPlaying = record.id === activeId && playing;
        return <article key={record.id} className={`record-card${isPlaying ? " is-playing" : ""}`} style={{ "--record-tone": record.tone } as React.CSSProperties}>
          <button type="button" className="record-cover" aria-label={isPlaying ? "Пауза" : t("playTrack")} aria-pressed={isPlaying} disabled={!record.audioUrl} onClick={() => playTrack(record.id)}>
            <Image src={record.image} alt={`${record.title} cover`} width={480} height={480} />
            <span className="record-control">{isPlaying ? <PauseIcon /> : <PlayIcon />}</span>
          </button>
          <div className="record-copy"><small>{record.artist}</small><h3>{record.title}</h3><p>{record.genre}</p></div>
        </article>;
      })}
    </div>
  </section>;
}
