"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Copy,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { logActivity, startTiming } from "@/lib/log-activity";
import { formatDate, initialsOf } from "@/lib/format";
import { compressImage } from "@/lib/image-compress";
import type {
  CommunityDishOption,
  CommunityFoodOption,
  DietPlanAssignmentSummary,
  DietPlanBlock,
  DishOption,
  FoodOption,
  MealItemInput,
} from "@/lib/types/nutrition";
import type { ClientProfile } from "@/lib/types/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DishPickerDialog } from "@/components/trainer/dish-picker-dialog";
import { FoodPickerDialog } from "@/components/trainer/food-picker-dialog";
import { QuantityDialog } from "@/components/trainer/quantity-dialog";
import { AssignDietPlanDialog } from "@/components/trainer/assign-diet-plan-dialog";

interface PlanInfo {
  id: string;
  name: string;
  goal_label: string | null;
  daily_calorie_target: number | null;
}

export function DietPlanBuilder({
  trainerId,
  plan,
  blocks,
  mealItems,
  foodCatalog,
  dishCatalog,
  communityFoods,
  communityDishes,
  clients,
  assignments,
}: {
  trainerId: string;
  plan: PlanInfo;
  blocks: DietPlanBlock[];
  mealItems: MealItemInput[];
  foodCatalog: FoodOption[];
  dishCatalog: DishOption[];
  communityFoods?: CommunityFoodOption[];
  communityDishes?: CommunityDishOption[];
  clients: ClientProfile[];
  assignments: DietPlanAssignmentSummary[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [unassignTarget, setUnassignTarget] = React.useState<DietPlanAssignmentSummary | null>(null);
  const [unassigning, setUnassigning] = React.useState(false);

  const [dishPickerBlock, setDishPickerBlock] = React.useState<string | null>(null);
  const [foodPickerBlock, setFoodPickerBlock] = React.useState<string | null>(null);
  const [pendingFood, setPendingFood] = React.useState<{
    blockId: string;
    food: FoodOption;
  } | null>(null);
  const [addingItem, setAddingItem] = React.useState(false);

  const [addingBlock, setAddingBlock] = React.useState(false);
  const [editingBlockId, setEditingBlockId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [movingBlockId, setMovingBlockId] = React.useState<string | null>(null);
  const [cloningBlockId, setCloningBlockId] = React.useState<string | null>(null);
  const [blockToDelete, setBlockToDelete] = React.useState<string | null>(null);
  const [deletingBlock, setDeletingBlock] = React.useState(false);
  const [uploadingBlockImageId, setUploadingBlockImageId] = React.useState<string | null>(null);
  const blockImageInputs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const sortedBlocks = React.useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  );

  const totals = React.useMemo(
    () =>
      mealItems.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [mealItems],
  );

  const itemsByBlock = React.useMemo(() => {
    const map = new Map<string, MealItemInput[]>();
    for (const item of mealItems) {
      const list = map.get(item.block_id) ?? [];
      list.push(item);
      map.set(item.block_id, list);
    }
    return map;
  }, [mealItems]);

  async function handleAddDish(blockId: string, dish: DishOption) {
    setAddingItem(true);
    const supabase = createClient();
    const orderIndex = (itemsByBlock.get(blockId) ?? []).length;
    const { data, error } = await supabase
      .from("diet_plan_meals")
      .insert({
        diet_plan_id: plan.id,
        block_id: blockId,
        order_index: orderIndex,
        dish_id: dish.id,
      })
      .select("id")
      .single();
    setAddingItem(false);
    if (error || !data) {
      toast.error("No se pudo agregar el platillo");
      return;
    }
    toast.success("Platillo agregado");
    router.refresh();
  }

  async function handleAddFood(blockId: string, food: FoodOption, grams: number) {
    setAddingItem(true);
    const supabase = createClient();
    const orderIndex = (itemsByBlock.get(blockId) ?? []).length;
    const { data, error } = await supabase
      .from("diet_plan_meals")
      .insert({
        diet_plan_id: plan.id,
        block_id: blockId,
        order_index: orderIndex,
        food_id: food.id,
        quantity_grams: grams,
      })
      .select("id")
      .single();
    setAddingItem(false);
    setPendingFood(null);
    if (error || !data) {
      toast.error("No se pudo agregar el alimento");
      return;
    }
    toast.success("Alimento agregado");
    router.refresh();
  }

  async function handleRemoveItem(itemId: string | undefined) {
    if (!itemId) return;
    setRemovingId(itemId);
    const supabase = createClient();
    const { error } = await supabase.from("diet_plan_meals").delete().eq("id", itemId);
    setRemovingId(null);
    if (error) {
      toast.error("No se pudo quitar");
      return;
    }
    toast.success("Elemento quitado");
    router.refresh();
  }

  async function handleDeletePlan() {
    const startedAt = startTiming();
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("diet_plans").delete().eq("id", plan.id);
    if (error) {
      logActivity({
        action: "trainer.diet_plan_delete_failed",
        category: "trainer",
        severity: "error",
        message: `No se pudo eliminar el plan nutricional "${plan.name}"`,
        targetType: "diet_plan",
        targetId: plan.id,
        targetLabel: plan.name,
        startedAt,
        context: { reason: error.message },
      });
      toast.error("No se pudo eliminar el plan");
      setDeleting(false);
      setDeleteOpen(false);
      return;
    }
    logActivity({
      action: "trainer.diet_plan_deleted",
      category: "trainer",
      severity: "warning",
      message: `Eliminó el plan nutricional "${plan.name}"`,
      targetType: "diet_plan",
      targetId: plan.id,
      targetLabel: plan.name,
      startedAt,
    });
    toast.success("Plan eliminado");
    router.push("/entrenador/nutricion");
    router.refresh();
  }

  async function handleUnassign() {
    if (!unassignTarget) return;
    const startedAt = startTiming();
    setUnassigning(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("diet_plan_assignments")
      .delete()
      .eq("id", unassignTarget.id);
    setUnassigning(false);
    if (error) {
      logActivity({
        action: "trainer.diet_plan_unassign_failed",
        category: "trainer",
        severity: "error",
        message: `No se pudo desasignar a ${unassignTarget.client_name} del plan "${plan.name}"`,
        targetType: "profile",
        targetId: unassignTarget.client_id,
        targetLabel: unassignTarget.client_name,
        startedAt,
        context: { dietPlanId: plan.id, dietPlanName: plan.name, reason: error.message },
      });
      toast.error("No se pudo desasignar al cliente");
      return;
    }
    logActivity({
      action: "trainer.diet_plan_unassigned",
      category: "trainer",
      severity: "warning",
      message: `Desasignó a ${unassignTarget.client_name} del plan "${plan.name}"`,
      targetType: "profile",
      targetId: unassignTarget.client_id,
      targetLabel: unassignTarget.client_name,
      startedAt,
      context: { dietPlanId: plan.id, dietPlanName: plan.name },
    });
    toast.success(`Se desasignó a ${unassignTarget.client_name}`);
    setUnassignTarget(null);
    router.refresh();
  }

  async function handleAddBlock() {
    setAddingBlock(true);
    const supabase = createClient();
    const { error } = await supabase.from("diet_plan_blocks").insert({
      diet_plan_id: plan.id,
      name: "Nuevo bloque",
      order_index: sortedBlocks.length,
    });
    setAddingBlock(false);
    if (error) {
      toast.error("No se pudo agregar el bloque");
      return;
    }
    toast.success("Bloque agregado");
    router.refresh();
  }

  function startEditingBlock(block: DietPlanBlock) {
    setEditingBlockId(block.id);
    setEditingName(block.name);
  }

  async function saveBlockName(blockId: string) {
    const name = editingName.trim();
    setEditingBlockId(null);
    const original = sortedBlocks.find((b) => b.id === blockId);
    if (!name || name === original?.name) return;
    const supabase = createClient();
    const { error } = await supabase.from("diet_plan_blocks").update({ name }).eq("id", blockId);
    if (error) {
      toast.error("No se pudo renombrar el bloque");
      return;
    }
    router.refresh();
  }

  async function handleMoveBlock(blockId: string, direction: -1 | 1) {
    const index = sortedBlocks.findIndex((b) => b.id === blockId);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= sortedBlocks.length) return;
    const current = sortedBlocks[index];
    const target = sortedBlocks[targetIndex];
    setMovingBlockId(blockId);
    const supabase = createClient();
    const [r1, r2] = await Promise.all([
      supabase.from("diet_plan_blocks").update({ order_index: target.order_index }).eq("id", current.id),
      supabase.from("diet_plan_blocks").update({ order_index: current.order_index }).eq("id", target.id),
    ]);
    setMovingBlockId(null);
    if (r1.error || r2.error) {
      toast.error("No se pudo reordenar el bloque");
      return;
    }
    router.refresh();
  }

  async function handleCloneBlock(blockId: string) {
    const source = sortedBlocks.find((b) => b.id === blockId);
    if (!source) return;
    setCloningBlockId(blockId);
    const supabase = createClient();
    const { data: newBlock, error: blockError } = await supabase
      .from("diet_plan_blocks")
      .insert({
        diet_plan_id: plan.id,
        name: `${source.name} (copia)`,
        order_index: sortedBlocks.length,
      })
      .select("id")
      .single();
    if (blockError || !newBlock) {
      setCloningBlockId(null);
      toast.error("No se pudo clonar el bloque");
      return;
    }

    const sourceItems = itemsByBlock.get(blockId) ?? [];
    if (sourceItems.length > 0) {
      const { error: itemsError } = await supabase.from("diet_plan_meals").insert(
        sourceItems.map((item) => ({
          diet_plan_id: plan.id,
          block_id: newBlock.id,
          order_index: item.order_index,
          dish_id: item.dish_id,
          food_id: item.food_id,
          quantity_grams: item.quantity_grams,
        })),
      );
      if (itemsError) {
        setCloningBlockId(null);
        toast.error("No se pudo clonar el bloque");
        return;
      }
    }

    setCloningBlockId(null);
    toast.success(`"${source.name}" clonado`);
    router.refresh();
  }

  async function handleDeleteBlock() {
    if (!blockToDelete || sortedBlocks.length <= 1) return;
    setDeletingBlock(true);
    const supabase = createClient();
    const { error } = await supabase.from("diet_plan_blocks").delete().eq("id", blockToDelete);
    setDeletingBlock(false);
    if (error) {
      toast.error("No se pudo eliminar el bloque");
      return;
    }
    setBlockToDelete(null);
    toast.success("Bloque eliminado");
    router.refresh();
  }

  async function handleBlockImageSelected(blockId: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingBlockImageId(blockId);
    const supabase = createClient();
    const compressed = await compressImage(file);
    const path = `${trainerId}/diet-block-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("food-images")
      .upload(path, compressed, { upsert: true, contentType: "image/jpeg" });
    if (uploadError) {
      setUploadingBlockImageId(null);
      toast.error("No se pudo subir la imagen");
      return;
    }

    const { error: updateError } = await supabase
      .from("diet_plan_blocks")
      .update({ image_path: path })
      .eq("id", blockId);
    setUploadingBlockImageId(null);
    if (updateError) {
      toast.error("No se pudo guardar la imagen");
      return;
    }
    router.refresh();
  }

  async function handleRemoveBlockImage(blockId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("diet_plan_blocks")
      .update({ image_path: null })
      .eq("id", blockId);
    if (error) {
      toast.error("No se pudo quitar la imagen");
      return;
    }
    router.refresh();
  }

  const assignedClientIds = assignments.map((a) => a.client_id);
  const blockPendingDelete = sortedBlocks.find((b) => b.id === blockToDelete);

  return (
    <div className="flex w-full flex-col gap-4 p-4 pb-24 md:p-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/entrenador/nutricion">
            <ArrowLeft /> Volver a nutrición
          </Link>
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Editar información"
            onClick={() => setEditOpen(true)}
          >
            <Pencil /> <span className="hidden md:inline">Editar información</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Eliminar"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash /> <span className="hidden md:inline">Eliminar</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_20rem] md:items-start">
        {/* Columna izquierda: info del plan + bloques de comida. */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {plan.daily_calorie_target && (
                  <Badge variant="secondary">{Math.round(plan.daily_calorie_target)} kcal/día</Badge>
                )}
                {plan.goal_label && <Badge variant="secondary">{plan.goal_label}</Badge>}
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <MacroStat label="Kcal" value={Math.round(totals.calories)} />
                <MacroStat label="Prot" value={`${Math.round(totals.protein)}g`} />
                <MacroStat label="Carb" value={`${Math.round(totals.carbs)}g`} />
                <MacroStat label="Grasa" value={`${Math.round(totals.fat)}g`} />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Bloques
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={addingBlock}
              onClick={handleAddBlock}
            >
              {addingBlock ? <Loader2 className="animate-spin" /> : <Plus />}
              Agregar bloque
            </Button>
          </div>

          {sortedBlocks.map((block, index) => {
            const blockItems = itemsByBlock.get(block.id) ?? [];
            return (
              <Card key={block.id}>
                <div className="flex flex-col gap-2 px-5 py-3 md:flex-row md:items-center md:justify-between">
                  {editingBlockId === block.id ? (
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => saveBlockName(block.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveBlockName(block.id);
                        }
                        if (e.key === "Escape") setEditingBlockId(null);
                      }}
                      className="h-8 max-w-[14rem]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditingBlock(block)}
                      className="flex w-fit items-center gap-1.5 text-left"
                    >
                      <CardTitle className="text-sm">{block.name}</CardTitle>
                      <Pencil className="size-3 shrink-0 text-muted-foreground" />
                    </button>
                  )}

                  <div className="flex shrink-0 items-center justify-end gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Subir bloque"
                      disabled={index === 0 || movingBlockId !== null}
                      onClick={() => handleMoveBlock(block.id, -1)}
                    >
                      {movingBlockId === block.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowUp className="size-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Bajar bloque"
                      disabled={index === sortedBlocks.length - 1 || movingBlockId !== null}
                      onClick={() => handleMoveBlock(block.id, 1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Clonar bloque"
                      disabled={cloningBlockId !== null}
                      onClick={() => handleCloneBlock(block.id)}
                    >
                      {cloningBlockId === block.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar bloque"
                      className="text-destructive hover:text-destructive"
                      disabled={sortedBlocks.length <= 1}
                      onClick={() => setBlockToDelete(block.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <input
                      ref={(el) => {
                        blockImageInputs.current[block.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBlockImageSelected(block.id, e)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={block.image_path ? "Cambiar foto del bloque" : "Agregar foto al bloque"}
                      disabled={uploadingBlockImageId === block.id}
                      onClick={() => blockImageInputs.current[block.id]?.click()}
                    >
                      {uploadingBlockImageId === block.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ImagePlus className="size-4" />
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="ml-1">
                          <Plus /> Agregar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => setDishPickerBlock(block.id)}>
                          Platillo del catálogo
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setFoodPickerBlock(block.id)}>
                          Alimento individual
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardContent className="flex flex-col gap-1.5">
                  {block.image_path && (
                    <div className="relative mb-1 aspect-[4/3] w-full overflow-hidden rounded-lg border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          createClient().storage.from("food-images").getPublicUrl(block.image_path)
                            .data.publicUrl
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label="Quitar foto del bloque"
                        onClick={() => handleRemoveBlockImage(block.id)}
                        className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )}
                  {blockItems.length === 0 ? (
                    <p className="py-2 text-sm text-muted-foreground">Sin elementos.</p>
                  ) : (
                    blockItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-foreground/[0.02] px-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.dish_name ?? item.food_name}
                            {item.quantity_grams ? ` · ${Math.round(item.quantity_grams)} g` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(item.calories)} kcal · {Math.round(item.protein)}g prot
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Quitar"
                          className="shrink-0 text-destructive hover:text-destructive"
                          disabled={removingId === item.id}
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          {removingId === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Columna derecha: clientes asignados, fija al hacer scroll en escritorio. */}
        <div className="flex flex-col gap-3 md:sticky md:top-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Clientes asignados
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
              <UserPlus /> Asignar
            </Button>
          </div>

          {assignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Users className="size-6" />
                <p className="text-sm">Todavía no asignas este plan a ningún cliente.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">
                      {initialsOf(assignment.client_name) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{assignment.client_name}</p>
                    <p
                      className="text-xs text-muted-foreground"
                      title={
                        assignment.scale_factor !== 1
                          ? "Las porciones de este cliente se escalaron para acercarse a su propia meta calórica, distinta a la del plan base."
                          : undefined
                      }
                    >
                      Desde el {formatDate(assignment.start_date)}
                      {assignment.scale_factor !== 1
                        ? ` · ajustado ${Math.round((assignment.scale_factor - 1) * 100)}%`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Desasignar a ${assignment.client_name}`}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setUnassignTarget(assignment)}
                  >
                    <UserMinus className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <EditDietPlanInfoDialog open={editOpen} onOpenChange={setEditOpen} plan={plan} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar el plan "${plan.name}"?`}
        description="Esta acción no se puede deshacer. Las asignaciones de este plan a clientes también se eliminarán."
        loading={deleting}
        onConfirm={handleDeletePlan}
      />

      <ConfirmDialog
        open={blockToDelete !== null}
        onOpenChange={(open) => !open && setBlockToDelete(null)}
        title={`¿Eliminar el bloque "${blockPendingDelete?.name}"?`}
        description="Esta acción no se puede deshacer. Los elementos que tenga este bloque también se eliminarán."
        loading={deletingBlock}
        onConfirm={handleDeleteBlock}
      />

      <DishPickerDialog
        open={dishPickerBlock !== null}
        onOpenChange={(open) => !open && setDishPickerBlock(null)}
        dishes={dishCatalog}
        communityDishes={communityDishes}
        trainerId={trainerId}
        onPick={(dish) => {
          const blockId = dishPickerBlock!;
          setDishPickerBlock(null);
          void handleAddDish(blockId, dish);
        }}
      />

      <FoodPickerDialog
        open={foodPickerBlock !== null}
        onOpenChange={(open) => !open && setFoodPickerBlock(null)}
        foods={foodCatalog}
        communityFoods={communityFoods}
        trainerId={trainerId}
        onPick={(food) => {
          const blockId = foodPickerBlock!;
          setFoodPickerBlock(null);
          setPendingFood({ blockId, food });
        }}
      />

      <QuantityDialog
        open={pendingFood !== null}
        onOpenChange={(open) => !open && setPendingFood(null)}
        itemName={pendingFood?.food.name ?? ""}
        onConfirm={(grams) => {
          if (!pendingFood) return;
          void handleAddFood(pendingFood.blockId, pendingFood.food, grams);
        }}
      />

      {addingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <Loader2 className="size-6 animate-spin text-white" />
        </div>
      )}

      <AssignDietPlanDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        trainerId={trainerId}
        dietPlanId={plan.id}
        dietPlanName={plan.name}
        dailyCalorieTarget={plan.daily_calorie_target}
        clients={clients}
        alreadyAssignedClientIds={assignedClientIds}
        onAssigned={() => router.refresh()}
      />

      <ConfirmDialog
        open={unassignTarget !== null}
        onOpenChange={(open) => !open && setUnassignTarget(null)}
        title={`¿Desasignar a ${unassignTarget?.client_name ?? ""}?`}
        description="Deja de ver este plan nutricional en su panel. No se borra el plan ni el historial de sustituciones que ya haya hecho."
        loading={unassigning}
        onConfirm={handleUnassign}
      />
    </div>
  );
}

function MacroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-foreground/[0.04] px-2 py-2">
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
    </div>
  );
}

function EditDietPlanInfoDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanInfo;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar información</DialogTitle>
        </DialogHeader>
        {/* Se monta sólo mientras el diálogo está abierto: así el formulario
         * siempre arranca con los valores actuales del plan, sin necesitar
         * un efecto que sincronice el estado al abrir. */}
        {open && <EditDietPlanInfoForm plan={plan} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function EditDietPlanInfoForm({
  plan,
  onOpenChange,
}: {
  plan: PlanInfo;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(plan.name);
  const [goalLabel, setGoalLabel] = React.useState(plan.goal_label ?? "");
  const [dailyCalorieTarget, setDailyCalorieTarget] = React.useState<number | "">(
    plan.daily_calorie_target ?? "",
  );
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const startedAt = startTiming();
    const supabase = createClient();
    const { error } = await supabase
      .from("diet_plans")
      .update({
        name,
        goal_label: goalLabel || null,
        daily_calorie_target: dailyCalorieTarget === "" ? null : Number(dailyCalorieTarget),
      })
      .eq("id", plan.id);
    setSaving(false);
    if (error) {
      logActivity({
        action: "trainer.diet_plan_edit_failed",
        category: "trainer",
        severity: "error",
        message: `No se pudieron guardar los cambios de "${name}"`,
        targetType: "diet_plan",
        targetId: plan.id,
        targetLabel: name,
        startedAt,
        context: { reason: error.message },
      });
      toast.error("No se pudieron guardar los cambios");
      return;
    }
    logActivity({
      action: "trainer.diet_plan_edited",
      category: "trainer",
      severity: "success",
      message: `Editó el plan nutricional "${name}"`,
      targetType: "diet_plan",
      targetId: plan.id,
      targetLabel: name,
      startedAt,
    });
    toast.success("Cambios guardados");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit_name">Nombre</Label>
        <Input id="edit_name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit_goal_label">Objetivo (opcional)</Label>
        <Input
          id="edit_goal_label"
          value={goalLabel}
          onChange={(e) => setGoalLabel(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit_daily_calorie_target">Meta calórica diaria (opcional)</Label>
        <Input
          id="edit_daily_calorie_target"
          type="number"
          min={1}
          value={dailyCalorieTarget}
          onChange={(e) =>
            setDailyCalorieTarget(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </div>
      <Button type="submit" disabled={saving} className="w-fit">
        {saving ? <Loader2 className="animate-spin" /> : null}
        Guardar cambios
      </Button>
    </form>
  );
}
