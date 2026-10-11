type GalleryItem = {
  src: string;
  alt: string;
  href?: string;
};

export default function HoverGallery({ items }: { items: GalleryItem[] }) {
  return (
    <div className="mx-auto flex max-w-5xl items-center justify-center gap-4 px-4 py-10 md:gap-8">
      {items.map((item, index) => {
        const card = (
          <div
            className={[
              "aspect-[3/4] w-full overflow-hidden rounded-xl bg-card shadow-md",
              "transition-all duration-500 ease-out",
              "hover:z-10 hover:scale-110 hover:shadow-2xl active:scale-105",
              // ô giữa lệch lên một chút giống ảnh mẫu
              index === 1 ? "md:-translate-y-4" : "",
            ].join(" ")}
          >
            <img
              src={item.src}
              alt={item.alt}
              className="h-full w-full object-cover"
            />
          </div>
        );

        return (
          <div key={item.src} className="relative w-1/3">
            {item.href ? <a href={item.href}>{card}</a> : card}
          </div>
        );
      })}
    </div>
  );
}
