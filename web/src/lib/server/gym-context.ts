import type { SupabaseClient } from "@supabase/supabase-js";

import type { GymContext } from "@/lib/types/gym-context";
import type { GymRole } from "@/lib/types/gyms";

/**
 * Si el entrenador actual pertenece a un gimnasio, trae lo necesario
 * para el panel (nombre, su rol ahí, y el cupo de seats). null si no
 * pertenece a ninguno — el panel se ve exactamente igual que hoy.
 */
export async function fetchGymContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  profileId: string,
): Promise<GymContext | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("gym_id")
    .eq("id", profileId)
    .maybeSingle();

  const gymId = profile?.gym_id as string | null;
  if (!gymId) return null;

  const [{ data: gym }, { data: member }, { data: seatLimit }, { data: seatUsed }] = await Promise.all([
    supabase.from("gyms").select("name").eq("id", gymId).maybeSingle(),
    supabase
      .from("gym_members")
      .select("role")
      .eq("gym_id", gymId)
      .eq("profile_id", profileId)
      .maybeSingle(),
    supabase.rpc("gym_seat_limit", { p_gym_id: gymId }),
    supabase.rpc("gym_used_seats", { p_gym_id: gymId }),
  ]);

  if (!gym || !member) return null;

  const role = member.role as GymRole;

  return {
    gymId,
    gymName: gym.name as string,
    role,
    isManager: role === "admin" || role === "supervisor",
    isAdmin: role === "admin",
    seatLimit: (seatLimit as number | null) ?? null,
    seatUsed: (seatUsed as number | null) ?? 0,
  };
}
