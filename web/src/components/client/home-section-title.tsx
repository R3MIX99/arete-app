import { cn } from "@/lib/utils";

/** Título de sección del inicio: texto ligero con una raya corta del color
 * de acento debajo. */
export function HomeSectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <h2 className="text-lg leading-tight font-normal">{children}</h2>
      <span aria-hidden className="h-0.5 w-9 rounded-full bg-primary" />
    </div>
  );
}
