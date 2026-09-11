"use client";

import Image from "next/image";
import { ListMusic, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getStorefrontRecords, type ApiMusicRecord } from "@/lib/api";

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
const asset = (url?: string | null) => url?.startsWith("/uploads/") ? `${apiOrigin}${url}` : url || "/images/p1.jpg";
const audioSource = (url: string) => url.startsWith("http") ? url : `${apiOrigin}${url}`;

type MusicPlayerValue = { activeId: string | null; playing: boolean; playTrack: (id: string) => void; toggle: () => void };
const MusicPlayerContext = createContext<MusicPlayerValue | null>(null);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<ApiMusicRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [requestPlay, setRequestPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeTrack = useMemo(() => tracks.find((track) => track.id === activeId) ?? null, [tracks, activeId]);

  useEffect(() => {
    let mounted = true;
    void getStorefrontRecords().then((items) => {
      if (!mounted) return;
      setTracks(items);
      setActiveId((current) => current || items[0]?.id || null);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    audio.load();
    setProgress(0);
    setDuration(0);
    if (!requestPlay) setPlaying(false);
  }, [activeTrack?.id, requestPlay]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    if (audio.paused) void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else { audio.pause(); setPlaying(false); }
  };
  const playTrack = (id: string) => {
    if (id === activeId && playerVisible) { toggle(); return; }
    setPlayerVisible(true);
    setActiveId(id);
    setRequestPlay(true);
  };
  const jump = (direction: -1 | 1) => {
    if (!tracks.length) return;
    const current = Math.max(0, tracks.findIndex((track) => track.id === activeId));
    const next = (current + direction + tracks.length) % tracks.length;
    setActiveId(tracks[next].id);
    setRequestPlay(true);
  };
  const closePlayer = () => {
    audioRef.current?.pause();
    setPlaying(false);
    setOpen(false);
    setPlayerVisible(false);
  };
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

  return <MusicPlayerContext.Provider value={{ activeId, playing, playTrack, toggle }}>
    {children}
    {activeTrack && playerVisible && <aside className="global-player" aria-label="Musiqa pleyeri">
      <div className="global-player__track"><Image src={asset(activeTrack.coverImageUrl)} alt="" width={58} height={58} /><div><b>{activeTrack.title}</b><span>{activeTrack.artist || "SIREN"}</span></div><div className="global-player__header-actions"><button type="button" className="global-player__menu" aria-label="Treklar ro‘yxati" aria-expanded={open} onClick={() => setOpen((value) => !value)}><ListMusic size={20} strokeWidth={2} /></button><button type="button" className="global-player__close" aria-label="Pleyerni yopish" onClick={closePlayer}><X size={18} strokeWidth={2.5} /></button></div></div>
      <div className="global-player__timeline"><span>{formatTime(progress)}</span><input aria-label="Trek holati" type="range" min="0" max={duration || 0} value={Math.min(progress, duration || 0)} onChange={(event) => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setProgress(value); }} /><span>{duration ? `-${formatTime(Math.max(duration - progress, 0))}` : "--:--"}</span></div>
      <div className="global-player__controls"><button type="button" aria-label="Oldingi trek" onClick={() => jump(-1)}><SkipBack size={28} fill="currentColor" /></button><button type="button" className="global-player__toggle" aria-label={playing ? "Pauza" : "Play"} aria-pressed={playing} onClick={toggle}>{playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button><button type="button" aria-label="Keyingi trek" onClick={() => jump(1)}><SkipForward size={28} fill="currentColor" /></button></div>
      {open && <div className="global-player__list">{tracks.map((track) => { const isActive = track.id === activeId; const isPlaying = isActive && playing; return <button type="button" key={track.id} className={`${isActive ? "is-active" : ""}${isPlaying ? " is-playing" : ""}`} onClick={() => { playTrack(track.id); setOpen(false); }}><Image src={asset(track.coverImageUrl)} alt="" width={36} height={36} /><span><b>{track.title}</b><small>{track.artist || "SIREN"}{track.genre ? ` · ${track.genre}` : ""}</small></span>{isPlaying && <i className="global-player__equalizer" aria-label="Ijro etilmoqda"><i /><i /><i /></i>}</button>; })}</div>}
      <audio ref={audioRef} src={audioSource(activeTrack.audioUrl)} onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onCanPlay={() => { if (requestPlay) { setRequestPlay(false); void audioRef.current?.play().catch(() => setPlaying(false)); } }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => jump(1)} />
    </aside>}
  </MusicPlayerContext.Provider>;
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
  return context;
}
