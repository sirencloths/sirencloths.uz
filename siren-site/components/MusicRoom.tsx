"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { ApiMusicRecord } from "@/lib/api";
import { useMusicPlayer } from "./MusicPlayer";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const asset = (url?: string | null) => url?.startsWith("/uploads/") ? `${apiOrigin}${url}` : url || "/images/p1.jpg";

export default function MusicRoom({ records }: { records: ApiMusicRecord[] }) {
  const { activeId, playing, progress, duration, playTrack, toggle, jump, seek } = useMusicPlayer();
  const current = records.find((record) => record.id === activeId) ?? records[0];

  const currentImage = asset(current?.coverImageUrl);
  const backdropRef = useRef(currentImage);
  const [backdropImage, setBackdropImage] = useState(currentImage);
  const [previousBackdropImage, setPreviousBackdropImage] = useState<string | null>(null);

  useEffect(() => {
    if (currentImage === backdropRef.current) return;
    setPreviousBackdropImage(backdropRef.current);
    backdropRef.current = currentImage;
    setBackdropImage(currentImage);
    const timer = window.setTimeout(() => setPreviousBackdropImage(null), 650);
    return () => window.clearTimeout(timer);
  }, [currentImage]);

  if (!current) return <main className="music-room music-room--empty"><Link href="/" className="music-room__back"><ArrowLeft size={19} /> НАЗАД</Link><p>МУЗЫКА ПОКА НЕ ДОБАВЛЕНА.</p></main>;

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  return <main className="music-room">
    {previousBackdropImage && <div className="music-room__backdrop music-room__backdrop--previous" style={{ backgroundImage: `url("${previousBackdropImage}")` }} aria-hidden="true" />}
    <div className="music-room__backdrop" style={{ backgroundImage: `url("${backdropImage}")` }} aria-hidden="true" />
    <div className="music-room__shade" aria-hidden="true" />
    <section className="music-room__shell" aria-label="Музыкальный плеер">
      <Link href="/" className="music-room__back"><ArrowLeft size={19} /> НАЗАД</Link>
      <div className="music-room__now-playing">
        <div className="music-room__cover"><Image src={currentImage} alt={`${current.title} cover`} width={560} height={560} priority /></div>
        <div className="music-room__details"><span>СЕЙЧАС ИГРАЕТ</span><h1>{current.title}</h1><p>{current.artist || "SIREN"}</p>{current.genre && <b>{current.genre}</b>}
          <div className="music-room__timeline"><time>{formatTime(progress)}</time><input aria-label="Позиция трека" type="range" min="0" max={duration || 0} value={Math.min(progress, duration || 0)} onChange={(event) => seek(Number(event.target.value))} /><time>{duration ? `−${formatTime(Math.max(duration - progress, 0))}` : "--:--"}</time></div>
          <div className="music-room__controls"><button type="button" aria-label="Предыдущий трек" onClick={() => jump(-1)}><SkipBack size={25} fill="currentColor" /></button><button type="button" className="music-room__play" aria-label={playing ? "Пауза" : "Воспроизвести"} onClick={() => activeId === current.id ? toggle() : playTrack(current.id)}>{playing && activeId === current.id ? <Pause size={27} fill="currentColor" /> : <Play size={27} fill="currentColor" />}</button><button type="button" aria-label="Следующий трек" onClick={() => jump(1)}><SkipForward size={25} fill="currentColor" /></button></div>
        </div>
      </div>
      <div className="music-room__playlist"><div className="music-room__playlist-heading"><span>ПЛЕЙЛИСТ</span><b>{records.length} ТРЕКОВ</b></div><div className="music-room__playlist-scroll">{records.map((record, index) => { const selected = record.id === activeId; const isPlaying = selected && playing; return <button key={record.id} type="button" className={`${selected ? "is-selected" : ""}${isPlaying ? " is-playing" : ""}`} onClick={() => playTrack(record.id)}><span className="music-room__number">{String(index + 1).padStart(2, "0")}</span><img src={asset(record.coverImageUrl)} alt="" /><span className="music-room__track-copy"><b>{record.title}</b><small>{record.artist || "SIREN"}{record.genre ? ` · ${record.genre}` : ""}</small></span>{isPlaying ? <span className="music-room__bars" aria-label="Играет"><i /><i /><i /></span> : <Play size={17} className="music-room__row-play" fill="currentColor" />}</button>; })}</div></div>
    </section>
  </main>;
}
