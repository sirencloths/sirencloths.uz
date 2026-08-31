"use client";

import { useLanguage } from "./LanguageProvider";

const sizes = [
  {
    value: "S",
    available: true,
  },
  {
    value: "M",
    available: true,
  },
  {
    value: "L",
    available: true,
  },
  {
    value: "XL",
    available: true,
  },
  {
    value: "XXL",
    available: false,
  },
  {
    value: "XXXL",
    available: false,
  },
];

type Props = {
  selectedSize: string;
  onSizeChange: (size: string) => void;
};

export default function ProductSizeSelector({
  selectedSize,
  onSizeChange,
}: Props) {
  const { t } = useLanguage();
  return (
    <div className="product-sizes">

      <div className="product-sizes-top">

        <div className="product-sizes-label">

          <span>
            {t("chooseSize")}
          </span>

          <strong>
            {selectedSize}
          </strong>

        </div>

        <button
          type="button"
          className="size-guide-link"
        >
          {t("sizeHelp")}
        </button>

      </div>

      <div className="product-size-list">

        {sizes.map((size) => (
          <button
            key={size.value}
            type="button"
            disabled={!size.available}
            className={`product-size ${
              selectedSize === size.value
                ? "product-size--selected"
                : ""
            } ${
              !size.available
                ? "product-size--disabled"
                : ""
            }`}
            onClick={() =>
              onSizeChange(size.value)
            }
          >
            {size.value}
          </button>
        ))}

      </div>
    </div>
  );
}
