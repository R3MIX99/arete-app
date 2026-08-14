"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";

import { youtubeVideoId } from "@/lib/youtube";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

/** Ícono de video que, al tocarlo, abre el video embebido en un modal
 * (drawer en teléfono) en vez de mandar a YouTube en otra pestaña. */
export function ExerciseVideoButton({
  videoUrl,
  exerciseName,
}: {
  videoUrl: string;
  exerciseName: string;
}) {
  const [open, setOpen] = useState(false);
  const videoId = youtubeVideoId(videoUrl);
  if (!videoId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Ver video"
      >
        <PlayCircle className="size-4.5" />
      </button>
      <ResponsiveDialog open={open} onOpenChange={setOpen} title={exerciseName}>
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
          <iframe
            className="size-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            title={exerciseName}
            allowFullScreen
          />
        </div>
      </ResponsiveDialog>
    </>
  );
}
