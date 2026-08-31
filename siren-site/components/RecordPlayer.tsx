"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";

export default function RecordPlayer() {
  const [spinning, setSpinning] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="record-player">
      <button
        className="record-play"
        id="record-play"
        type="button"
        aria-label={t("playTrack")}
        aria-pressed={spinning}
        onClick={() => setSpinning((prev) => !prev)}
      >
        <span></span>
        <b>{t("playTrack")}</b>
      </button>
      <div
        className={`disc${spinning ? " is-spinning" : ""}`}
        id="disc"
        aria-hidden="true"
      >
        <div className="disc-hole"></div>
      </div>
    </div>
  );
}
