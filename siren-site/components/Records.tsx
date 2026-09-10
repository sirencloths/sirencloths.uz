"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { records as fallbackRecords } from "@/lib/data";
import type { ApiMusicRecord } from "@/lib/api";
import { useLanguage } from "./LanguageProvider";

const recordTones = ["#8c3760", "#2a675d", "#635090", "#9b5735", "#b4474d", "#41658e"];
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const PlayIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" fill="currentColor" /></svg>;
const PauseIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z" fill="currentColor" /></svg>;

export default function Records({ records = [] }: { records?: ApiMusicRecord[] }) {
  const { t } = useLanguage();
  const displayRecords = useMemo(() => records.length
    ? records.map((record, index) => ({ id: record.id, title: record.title, artist: record.artist || "SIREN", image: record.coverImageUrl || fallbackRecords[index % fallbackRecords.length].image, tone: recordTones[index % recordTones.length], audioUrl: record.audioUrl.startsWith("http") ? record.audioUrl : `${apiOrigin}${record.audioUrl}` }))
    : fallbackRecords.map((record, index) => ({ ...record, id: `fallback-${index}`, artist: record.genre, tone: recordTones[index % recordTones.length], audioUrl: "" })), [records]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeRecord = displayRecords.find((record) => record.id === playingId) ?? null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeRecord?.audioUrl) return;
    audio.load();
    void audio.play().catch(() => setPlayingId(null));
  }, [activeRecord?.id, activeRecord?.audioUrl]);

  const toggleRecord = (record: typeof displayRecords[number]) => {
    if (!record.audioUrl) return;
    if (playingId === record.id) { audioRef.current?.pause(); setPlayingId(null); return; }
    setPlayingId(record.id);
  };

  return <section className="records" id="records">
    <div className="records-heading"><h2>{t("records")}</h2><a href="#playlist-frame">{t("playlist")}</a></div>
    <div className="records-grid">
      {displayRecords.map((record) => {
        const playing = record.id === playingId;
        return <article key={record.id} className={`record-card${playing ? " is-playing" : ""}`} style={{ "--record-tone": record.tone } as React.CSSProperties}>
          <button type="button" className="record-cover" aria-label={playing ? "Пауза" : t("playTrack")} aria-pressed={playing} disabled={!record.audioUrl} onClick={() => toggleRecord(record)}>
            <Image src={record.image} alt={`${record.title} cover`} width={480} height={480} />
            <span className="record-control">{playing ? <PauseIcon /> : <PlayIcon />}</span>
          </button>
          <div className="record-copy"><small>{t("album")}</small><h3>{record.title}</h3><p>{record.artist}</p></div>
        </article>;
      })}
    </div>
    <audio ref={audioRef} src={activeRecord?.audioUrl || ""} onEnded={() => setPlayingId(null)} />
  </section>;
}
