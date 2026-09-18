"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Dumbbell, PlayCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { muscleGroupLabel, equipmentItemsLabel, formatDate } from "@/lib/format";
import { youtubeThumbnails } from "@/lib/youtube";
import type { ExerciseSummary } from "@/lib/types/exercise";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ExerciseSortOption = "name_asc" | "name_desc" | "date_desc" | "date_asc";

function SortableHeader({
  label,
  className,
  active,
  direction,
  onClick,
}: {
  label: string;
  className?: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className={cn("px-3 py-2 font-medium", className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1 hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}

/** Vista de tabla de la biblioteca de ejercicios — misma información que
 * las tarjetas, pero ordenable por columna (nombre, fecha) y más densa
 * para poder comparar muchos ejercicios de un vistazo. Compartida entre
 * el panel de entrenador/gimnasio y el de superadmin. */
export function ExerciseTableView({
  exercises,
  hrefBase,
  sort,
  onSortChange,
}: {
  exercises: ExerciseSummary[];
  hrefBase: string;
  sort: ExerciseSortOption;
  onSortChange: (next: ExerciseSortOption) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-foreground/[0.02] text-left text-xs text-muted-foreground uppercase">
            <SortableHeader
              label="Ejercicio"
              active={sort === "name_asc" || sort === "name_desc"}
              direction={sort === "name_desc" ? "desc" : "asc"}
              onClick={() => onSortChange(sort === "name_asc" ? "name_desc" : "name_asc")}
            />
            <th className="px-3 py-2 font-medium">Grupo muscular</th>
            <th className="px-3 py-2 font-medium">Equipo</th>
            <SortableHeader
              label="Agregado"
              className="whitespace-nowrap"
              active={sort === "date_desc" || sort === "date_asc"}
              direction={sort === "date_asc" ? "asc" : "desc"}
              onClick={() => onSortChange(sort === "date_desc" ? "date_asc" : "date_desc")}
            />
          </tr>
        </thead>
        <tbody>
          {exercises.map((exercise) => {
            const hasVideo = Boolean(exercise.video_url);
            const uploadedImageUrl = exercise.image_path
              ? createClient().storage.from("exercise-images").getPublicUrl(exercise.image_path)
                  .data.publicUrl
              : null;
            const thumbs = uploadedImageUrl ? null : youtubeThumbnails(exercise.video_url);
            return (
              <tr key={exercise.id} className="border-b last:border-b-0 hover:bg-foreground/[0.02]">
                <td className="px-3 py-2.5">
                  <Link href={`${hrefBase}/${exercise.id}`} className="flex min-w-0 items-center gap-2.5">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-primary/12">
                      {uploadedImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={uploadedImageUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : thumbs ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbs.primary}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div
                          className={
                            hasVideo
                              ? "absolute inset-0 flex items-center justify-center text-primary"
                              : "absolute inset-0 flex items-center justify-center text-muted-foreground"
                          }
                        >
                          {hasVideo ? (
                            <PlayCircle className="size-4" />
                          ) : (
                            <Dumbbell className="size-4" />
                          )}
                        </div>
                      )}
                    </div>
                    <span className="min-w-0 truncate font-medium">{exercise.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {exercise.muscle_groups.map((group) => (
                      <Badge key={group} variant="secondary" className="text-[10px]">
                        {muscleGroupLabel(group)}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {equipmentItemsLabel(exercise.equipment_items)}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                  {formatDate(exercise.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
