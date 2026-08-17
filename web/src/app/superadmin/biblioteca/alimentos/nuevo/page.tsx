import { createClient } from "@/lib/supabase/server";
import { LibraryFoodForm } from "@/components/superadmin/library-food-form";
import type { FoodCategory } from "@/lib/types/nutrition";

export default async function NewLibraryFoodPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("food_categories")
    .select("id, slug, name, sort_order")
    .order("sort_order");

  return <LibraryFoodForm mode="create" categories={(categories ?? []) as FoodCategory[]} />;
}
