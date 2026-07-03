// Sello "desarrollado por consultoríadigital" sobre fondo verde limón
export default function ConsultoriaBadge({ size = "md" }: { size?: "md" | "lg" }) {
  const pad = size === "lg" ? "px-8 py-4" : "px-5 py-2.5";
  const brand = size === "lg" ? "text-2xl" : "text-base";
  const label = size === "lg" ? "text-xs" : "text-[10px]";
  return (
    <div className={`bg-lima text-black rounded-xl ${pad} flex flex-col items-center gap-0.5 shadow-sm`}>
      <span className={`${label} uppercase tracking-[0.28em] font-semibold opacity-70`}>
        desarrollado por
      </span>
      <span className={`wordmark ${brand}`}>
        consultoría<b>digital</b>
      </span>
    </div>
  );
}
