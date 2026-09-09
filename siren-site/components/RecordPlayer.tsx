"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { spotifyEmbedUrl } from "@/lib/spotify";

export default function RecordPlayer({ audioSrc = "", autoPlayNonce = 0 }: { audioSrc?: string; autoPlayNonce?: number }) {
  const [spinning, setSpinning] = useState(false);
  const [playError, setPlayError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const { t } = useLanguage();
  const spotifyUrl = spotifyEmbedUrl(audioSrc);

  useEffect(() => {
    audioRef.current?.pause();
    setSpinning(false);
    setPlayError("");
  }, [audioSrc]);

  useEffect(() => {
    if (!autoPlayNonce || !audioSrc || !audioRef.current || spotifyUrl) return;
    void audioRef.current.play().then(() => setSpinning(true)).catch(() => setPlayError("Trekni ijro etib bo‘lmadi."));
  }, [autoPlayNonce, audioSrc, spotifyUrl]);

  const toggle = async () => {
    if (!audioSrc || !audioRef.current) return setSpinning((previous) => !previous);
    if (audioRef.current.paused) {
      try { await audioRef.current.play(); setSpinning(true); setPlayError(""); }
      catch { setPlayError("Trekni ijro etib bo‘lmadi."); }
      return;
    }
    audioRef.current.pause();
    setSpinning(false);
  };

  return (
    <div className="record-player">
      {spotifyUrl ? (
        <iframe
          className="spotify-record-player"
          src={spotifyUrl}
          title="Spotify player"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      ) : <>
      <button
        className="record-play"
        id="record-play"
        type="button"
        aria-label={t("playTrack")}
        aria-pressed={spinning}
        onClick={() => void toggle()}
      >
        <span></span>
        <b>{t("playTrack")}</b>
      </button>
      {audioSrc && <audio ref={audioRef} src={audioSrc} onEnded={() => setSpinning(false)} />}
      {playError && <p className="record-player-error">{playError}</p>}
      <div
        className={`disc${spinning ? " is-spinning" : ""}`}
        id="disc"
        aria-hidden="true"
      >
        <div className="disc-hole"></div>
      </div>
      </>}
    </div>
  );
}
