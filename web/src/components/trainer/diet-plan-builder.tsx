"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  Trash,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { mealTypeLabel, formatDate, initialsOf } from "@/lib/format";
import type {
  CommunityDishOption,
  CommunityFoodOption,
  DietPlanAssignmentSummary,
  DishOption,
  FoodOption,
  MealItemInput,
  MealType,
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

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

interface PlanInfo {
  id: string;
  name: string;
  goal_label: string | null;
  daily_calorie_target: number | null;
}

export function DietPlanBuilder({
  trainerId,
  plan,
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
  mealItems: MealItemInput[];
  foodCatalog: FoodOption[];
  dishCatalog: DishOption[];
  communityFoods?: CommunityFoodOption[];
  communityDishes?: CommunityDishOption[];
  clients: ClientProfile[];
  assignments: DietPlanAssignmentSummary[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(mealItems);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const [dishPickerMeal, setDishPickerMeal] = React.useState<MealType | null>(null);
  const [foodPickerMeal, setFoodPickerMeal] = React.useState<MealType | null>(null);
  const [pendingFood, setPendingFood] = React.useState<{
    mealType: MealType;
    food: FoodOption;
  } | null>(null);
  const [addingItem, setAddingItem] = React.useState(false);

  const totals = React.useMemo(
    () =>
      items.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [items],
  );

  const itemsByMeal = React.useMemo(() => {
    const map = new Map<MealType, MealItemInput[]>();
    for (const item of items) {
      const list = map.get(item.meal_type) ?? [];
      list.push(item);
      map.set(item.meal_type, list);
    }
    return map;
  }, [items]);

  async function handleAddDish(mealType: MealType, dish: DishOption) {
    setAddingItem(true);
    const supabase = createClient();
    const orderIndex = (itemsByMeal.get(mealType) ?? []).length;
    const { data, error } = await supabase
      .from("diet_plan_meals")
      .insert({
        diet_plan_id: plan.id,
        meal_type: mealType,
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

  async function handleAddFood(mealType: MealType, food: FoodOption, grams: number) {
    setAddingItem(true);
    const supabase = createClient();
    const orderIndex = (itemsByMeal.get(mealType) ?? []).length;
    const { data, error } = await supabase
      .from("diet_plan_meals")
      .insert({
        diet_plan_id: plan.id,
        meal_type: mealType,
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
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    toast.success("Elemento quitado");
  }

  async function handleDeletePlan() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("diet_plans").delete().eq("id", plan.id);
    if (error) {
      toast.error("No se pudo eliminar el plan");
      setDeleting(false);
      setDeleteOpen(false);
      return;
    }
    toast.success("Plan eliminado");
    router.push("/entrenador/nutricion");
    router.refresh();
  }

  const assignedClientIds = assignments.map((a) => a.client_id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/entrenador/nutricion">
            <ArrowLeft /> Volver a nutrición
          </Link>
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil /> Editar información
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash /> Eliminar
          </Button>
        </div>
      </div>

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

      {MEAL_TYPES.map((mealType) => {
        const mealItemsList = itemsByMeal.get(mealType) ?? [];
        return (
          <Card key={mealType}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">{mealTypeLabel(mealType)}</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Plus /> Agregar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => setDishPickerMeal(mealType)}>
                    Platillo del catálogo
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setFoodPickerMeal(mealType)}>
                    Alimento individual
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {mealItemsList.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">Sin elementos.</p>
              ) : (
                mealItemsList.map((item) => (
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

      <div className="mt-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Clientes asignados
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
          <UserPlus /> Asignar a clientes
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
                <p className="text-xs text-muted-foreground">
                  Desde el {formatDate(assignment.start_date)}
                  {assignment.scale_factor !== 1
                    ? ` · ajustado ${Math.round((assignment.scale_factor - 1) * 100)}%`
                    : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <EditDietPlanInfoDialog open={editOpen} onOpenChange={setEditOpen} plan={plan} />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar el plan "${plan.name}"?`}
        description="Esta acción no se puede deshacer. Las asignaciones de este plan a clientes también se eliminarán."
        loading={deleting}
        onConfirm={handleDeletePlan}
      />

      <DishPickerDialog
        open={dishPickerMeal !== null}
        onOpenChange={(open) => !open && setDishPickerMeal(null)}
        dishes={dishCatalog}
        communityDishes={communityDishes}
        trainerId={trainerId}
        onPick={(dish) => {
          const mealType = dishPickerMeal!;
          setDishPickerMeal(null);
          void handleAddDish(mealType, dish);
        }}
      />

      <FoodPickerDialog
        open={foodPickerMeal !== null}
        onOpenChange={(open) => !open && setFoodPickerMeal(null)}
        foods={foodCatalog}
        communityFoods={communityFoods}
        trainerId={trainerId}
        onPick={(food) => {
          const mealType = foodPickerMeal!;
          setFoodPickerMeal(null);
          setPendingFood({ mealType, food });
        }}
      />

      <QuantityDialog
        open={pendingFood !== null}
        onOpenChange={(open) => !open && setPendingFood(null)}
        itemName={pendingFood?.food.name ?? ""}
        onConfirm={(grams) => {
          if (!pendingFood) return;
          void handleAddFood(pendingFood.mealType, pendingFood.food, grams);
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
        dailyCalorieTarget={plan.daily_calorie_target}
        clients={clients}
        alreadyAssignedClientIds={assignedClientIds}
        onAssigned={() => router.refresh()}
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
  const router = useRouter();
  const [name, setName] = React.useState(plan.name);
  const [goalLabel, setGoalLabel] = React.useState(plan.goal_label ?? "");
  const [dailyCalorieTarget, setDailyCalorieTarget] = React.useState<number | "">(
    plan.daily_calorie_target ?? "",
  );
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(plan.name);
      setGoalLabel(plan.goal_label ?? "");
      setDailyCalorieTarget(plan.daily_calorie_target ?? "");
    }
  }, [open, plan]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
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
      toast.error("No se pudieron guardar los cambios");
      return;
    }
    toast.success("Cambios guardados");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar información</DialogTitle>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
