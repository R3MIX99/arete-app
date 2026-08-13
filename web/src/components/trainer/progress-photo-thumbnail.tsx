"use client";

import * as React from "react";
import { Loader2, ImageOff } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";

export function ProgressPhotoThumbnail({
  photoPath,
  date,
}: {
  photoPath: string;
  date: string;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    async function load() {
      const { data, error } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(photoPath, 3600);
      if (cancelled) return;
      if (error || !data) {
        setFailed(true);
        return;
      }
      setUrl(data.signedUrl);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  return (
    <div className="flex w-[90px] shrink-0 flex-col gap-1">
      <div className="flex h-[110px] w-[90px] items-center justify-center overflow-hidden rounded-lg bg-foreground/[0.05]">
        {failed ? (
          <ImageOff className="size-5 text-muted-foreground" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`Foto de progreso del ${date}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <p className="text-center text-[10px] text-muted-foreground">{formatDate(date)}</p>
    </div>
  );
}
