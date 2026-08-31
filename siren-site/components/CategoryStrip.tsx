const categories = ["Одежда", "Аксессуары", "Мерч", "Лукбук"];

export default function CategoryStrip() {
  return (
    <section className="category-strip" aria-label="Разделы каталога">
      {categories.map((category) => (
        <a key={category} href="#">
          {category}
        </a>
      ))}
    </section>
  );
}
