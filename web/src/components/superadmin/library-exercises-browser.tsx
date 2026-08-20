"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Plus, Dumbbell, PlayCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { muscleGroupLabel, equipmentLabel } from "@/lib/format";
import { youtubeThumbnails } from "@/lib/youtube";
import type { ExerciseSummary } from "@/lib/types/exercise";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbnailImage } from "@/components/client/thumbnail-image";

export function LibraryExercisesBrowser({ exercises }: { exercises: ExerciseSummary[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, query]);

  return (
    <div className="flex w-full flex-col gap-6 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio por nombre"
            className="pl-9"
          />
        </div>
        <Button asChild className="ml-auto">
          <Link href="/superadmin/biblioteca/ejercicios/nuevo">
            <Plus /> Nuevo ejercicio
          </Link>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
          <Dumbbell className="size-8" />
          <p className="text-sm">
            {exercises.length === 0
              ? "Todavía no hay ejercicios en la biblioteca de Aretia."
              : "Ningún ejercicio coincide con la búsqueda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((exercise) => {
            const hasVideo = Boolean(exercise.video_url);
            const uploadedImageUrl = exercise.image_path
              ? createClient().storage.from("exercise-images").getPublicUrl(exercise.image_path)
                  .data.publicUrl
              : null;
            // Sin foto propia, la miniatura del video es mejor que un
            // ícono genérico — mismo criterio que ya se usa en las
            // tarjetas de ejercicio del panel de cliente.
            const thumbs = uploadedImageUrl ? null : youtubeThumbnails(exercise.video_url);
            const hasImage = Boolean(uploadedImageUrl || thumbs);
            return (
              <Link key={exercise.id} href={`/superadmin/biblioteca/ejercicios/${exercise.id}`}>
                <Card className="h-full overflow-hidden card-hover-glow transition-colors hover:border-primary/40 gap-0 py-0">
                  {uploadedImageUrl ? (
                    <div className="h-28 w-full overflow-hidden bg-primary/12">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={uploadedImageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : thumbs ? (
                    <div className="h-28 w-full overflow-hidden bg-primary/12">
                      <ThumbnailImage
                        src={thumbs.primary}
                        fallbackSrc={thumbs.fallback}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <CardContent className="flex h-full flex-col gap-3 py-4">
                    {!hasImage && (
                      <div
                        className={
                          hasVideo
                            ? "flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary"
                            : "flex size-10 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground"
                        }
                      >
                        {hasVideo ? <PlayCircle className="size-[18px]" /> : <Dumbbell className="size-[18px]" />}
                      </div>
                    )}
                    <div className="mt-auto">
                      <p className="truncate text-sm font-semibold">{exercise.name}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant="secondary">{muscleGroupLabel(exercise.muscle_group)}</Badge>
                        <Badge variant="secondary">{equipmentLabel(exercise.equipment)}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
