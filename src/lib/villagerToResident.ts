import type { Villager } from "@/types/database";
import type { Resident } from "@/types/village";

// lat/lng/place_nameが揃って初めて地図に表示できる(ピン未設置ならnull)
export function villagerToResident(villager: Villager): Resident | null {
  if (villager.lat == null || villager.lng == null || !villager.place_name) return null;

  return {
    id: villager.id,
    dogName: villager.dog_name,
    placeName: villager.place_name,
    bio: villager.bio ?? "",
    photoUrl: villager.photo_url,
    instagramUrl: villager.instagram_url,
    birthday: villager.birthday,
    position: [villager.lat, villager.lng],
    createdAt: villager.created_at,
  };
}
