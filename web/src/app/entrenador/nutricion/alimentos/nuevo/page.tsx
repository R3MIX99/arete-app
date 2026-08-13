import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { NewFoodForm } from "@/components/trainer/new-food-form";
import type { FoodCategory } from "@/lib/types/nutrition";

export default async function NewFoodPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categories } = await supabase
    .from("food_categories")
    .select("id, slug, name, sort_order")
    .order("sort_order");

  return (
    <NewFoodForm trainerId={user.id} categories={(categories ?? []) as FoodCategory[]} />
  );
}
