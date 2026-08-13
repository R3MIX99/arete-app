import { formatDate } from "@/lib/format";
import type { ExerciseProgressSummary } from "@/lib/types/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProgressLineChart } from "@/components/trainer/progress-line-chart";

export function ExerciseProgressDialog({
  open,
  onOpenChange,
  summary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ExerciseProgressSummary | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{summary?.exercise_name}</DialogTitle>
        </DialogHeader>
        {summary && (
          <ProgressLineChart
            unit="kg"
            points={summary.logs.map((log) => ({
              label: formatDate(log.date),
              value: log.weight,
            }))}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
