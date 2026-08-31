"use client";

import { useLanguage } from "./LanguageProvider";

type Color = {
  key: "darkGray" | "black" | "cream" | "pink";
  value: string;
};

const colors: Color[] = [
  {
    key: "darkGray",
    value: "#5a5a5a",
  },
  {
    key: "black",
    value: "#000000",
  },
  {
    key: "cream",
    value: "#fff4d8",
  },
  {
    key: "pink",
    value: "#fce5e5",
  },
];

type Props = {
  selectedColor: Color["key"];
  onColorChange: (color: Color["key"]) => void;
};

export default function ProductColorSelector({
  selectedColor,
  onColorChange,
}: Props) {
  const { t } = useLanguage();
  const selectedIndex = colors.findIndex(
    (color) => color.key === selectedColor
  );

  const currentColor =
    selectedIndex >= 0
      ? colors[selectedIndex]
      : colors[0];

  return (
    <div className="product-colors">
      <div className="product-colors-label">
        <span>{t("chooseColor")}</span>

        <strong>
          {t(currentColor.key)}
        </strong>
      </div>

      <div className="product-color-list">
        {colors.map((color) => (
          <button
            key={color.value}
            type="button"
            className={`product-color ${
              selectedColor === color.key
                ? "product-color--selected"
                : ""
            }`}
            style={{
              backgroundColor: color.value,
            }}
            aria-label={t(color.key)}
            onClick={() =>
              onColorChange(color.key)
            }
          />
        ))}
      </div>
    </div>
  );
}
