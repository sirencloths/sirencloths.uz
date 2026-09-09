"use client";

import Image from "next/image";
import { useState } from "react";
import { records as fallbackRecords } from "@/lib/data";
import type { ApiMusicRecord } from "@/lib/api";
import RecordPlayer from "./RecordPlayer";
import { useLanguage } from "./LanguageProvider";

const recordColors = [
  "record-card--blue",
  "record-card--pink",
  "record-card--brown",
  "record-card--red",
  "record-card--green",
  "record-card--yellow",
];
const apiOrigin = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");

export default function Records({ records = [] }: { records?: ApiMusicRecord[] }) {
  const { t } = useLanguage();
  const displayRecords = records.length
    ? records.map((record, index) => ({
        id: record.id,
        title: record.title,
        genre: record.artist || "SIREN",
        image: record.coverImageUrl || fallbackRecords[index % fallbackRecords.length].image,
        color: recordColors[index % recordColors.length],
        audioUrl: record.audioUrl.startsWith("http") ? record.audioUrl : `${apiOrigin}${record.audioUrl}`,
      }))
    : fallbackRecords.map((record, index) => ({ ...record, id: `fallback-${index}`, audioUrl: "" }));
  const [selectedAudio, setSelectedAudio] = useState(displayRecords[0]?.audioUrl ?? "");
  const [playRequest, setPlayRequest] = useState(0);
  const selectAndPlay = (audioUrl: string) => {
    if (!audioUrl) return;
    setSelectedAudio(audioUrl);
    setPlayRequest((current) => current + 1);
  };

  return (
    <section className="records" id="records">
      <div className="records-main">
        <div className="records-content">
          <div className="records-heading">
            <h2>{t("records")}</h2>
            <a href="#playlist-frame">{t("playlist")}</a>
          </div>

          <div className="records-grid">
            {displayRecords.map((record) => (
              <article
                key={record.id}
                className={`record-card ${record.color}`}
                role="button"
                tabIndex={record.audioUrl ? 0 : -1}
                aria-disabled={!record.audioUrl}
                onClick={() => selectAndPlay(record.audioUrl)}
                onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && record.audioUrl) { event.preventDefault(); selectAndPlay(record.audioUrl); } }}
              >
                <Image src={record.image} alt="" width={72} height={72} />
                <div>
                  <small>{t("album")}</small>
                  <h3>{record.title}</h3>
                  <p>{record.genre}</p>
                </div>
                <b>{record.audioUrl ? "PLAY" : "EP.0001"}</b>
              </article>
            ))}
          </div>
        </div>

        <RecordPlayer audioSrc={selectedAudio} autoPlayNonce={playRequest} />
      </div>
    </section>
  );
}
