"use client";

import Image from "next/image";
import { records } from "@/lib/data";
import RecordPlayer from "./RecordPlayer";
import { useLanguage } from "./LanguageProvider";

export default function Records() {
  const { t } = useLanguage();

  return (
    <section className="records" id="records">
      <div className="records-main">
        <div className="records-content">
          <div className="records-heading">
            <h2>{t("records")}</h2>
            <a href="#playlist-frame">{t("playlist")}</a>
          </div>

          <div className="records-grid">
            {records.map((record, i) => (
              <article key={i} className={`record-card ${record.color}`}>
                <Image src={record.image} alt="" width={72} height={72} />
                <div>
                  <small>{t("album")}</small>
                  <h3>{record.title}</h3>
                  <p>{record.genre}</p>
                </div>
                <b>EP.0001</b>
              </article>
            ))}
          </div>
        </div>

        <RecordPlayer />
      </div>
    </section>
  );
}
