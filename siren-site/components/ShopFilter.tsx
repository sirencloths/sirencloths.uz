"use client";

type Category =
  | "ВЕРХ"
  | "НИЗ"
  | "НОВИНКИ"
  | "АКСЕССУАРЫ"
  | "СКИДКИ";

type Props = {
  selectedCategories: Category[];
  onChange: (categories: Category[]) => void;
};

const categories: Category[] = [
  "ВЕРХ",
  "НИЗ",
  "НОВИНКИ",
  "АКСЕССУАРЫ",
  "СКИДКИ",
];

export default function ShopFilter({
  selectedCategories,
  onChange,
}: Props) {
  const allSelected = selectedCategories.length === 0;

  const handleAll = () => {
    onChange([]);
  };

  const handleCategory = (category: Category) => {
    if (selectedCategories.includes(category)) {
      onChange(
        selectedCategories.filter(
          (item) => item !== category
        )
      );

      return;
    }

    onChange([
      ...selectedCategories,
      category,
    ]);
  };

  return (
    <aside className="shop-filter">

      {/* ВСЕ ТОВАРЫ */}
      <button
        type="button"
        className="shop-filter-title"
        onClick={handleAll}
      >
        <span>ВСЕ ТОВАРЫ</span>

        <span
          className={`filter-radio ${
            allSelected
              ? "filter-radio--active"
              : ""
          }`}
        >
          {allSelected && "✓"}
        </span>
      </button>

      {/* КАТЕГОРИИ */}
      {categories.map((category) => {
        const active =
          selectedCategories.includes(category);

        return (
          <button
            key={category}
            type="button"
            className="shop-filter-item"
            onClick={() =>
              handleCategory(category)
            }
          >
            <span>{category}</span>

            <span
              className={`filter-checkbox ${
                active
                  ? "filter-checkbox--active"
                  : ""
              }`}
            >
              {active && "✓"}
            </span>
          </button>
        );
      })}
    </aside>
  );
}