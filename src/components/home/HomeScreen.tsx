"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/layout/Header";
import PopupCard from "@/components/map/PopupCard";
import ListPanel from "@/components/list/ListPanel";
import WelcomeOverlay from "@/components/welcome/WelcomeOverlay";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { villagerToResident } from "@/lib/villagerToResident";
import {
  spotToVillageSpot,
  type SpotRowWithRegistrant,
} from "@/lib/spotToVillageSpot";
import type { SelectedMapItem, Resident, Spot } from "@/types/village";
import type { Villager } from "@/types/database";

const VillageMap = dynamic(() => import("@/components/map/VillageMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-dvw items-center justify-center bg-sand text-sm text-ink-soft">
      地図を読み込んでいます…
    </div>
  ),
});

const PinPlacementFlow = dynamic(
  () => import("@/components/map/PinPlacementFlow"),
  {
    ssr: false,
  },
);

const SpotFormFlow = dynamic(() => import("@/components/map/SpotFormFlow"), {
  ssr: false,
});

export default function HomeScreen() {
  const { villager } = useAuth();
  const [selected, setSelected] = useState<SelectedMapItem>(null);
  const [pinFlowOpen, setPinFlowOpen] = useState(false);
  const [spotFlowOpen, setSpotFlowOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [spots, setSpots] = useState<Spot[]>([]);

  // 村民ピン・スポットはどちらも全員分を公開表示する実データ（ダミーサンプルは廃止）
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();

    supabase
      .from("villagers")
      .select("*")
      .not("lat", "is", null)
      .then(({ data }) => {
        if (data)
          setResidents(
            (data as Villager[])
              .map(villagerToResident)
              .filter((r): r is Resident => r !== null),
          );
      });

    supabase
      .from("spots")
      .select("*, profiles(discord_username)")
      .then(({ data }) => {
        if (data)
          setSpots(
            (data as unknown as SpotRowWithRegistrant[]).map(spotToVillageSpot),
          );
      });
  }, []);

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-cream">
      <Header
        onOpenPinFlow={() => setPinFlowOpen(true)}
        onOpenSpotFlow={() => {
          setEditingSpot(null);
          setSpotFlowOpen(true);
        }}
      />
      <VillageMap
        residents={residents}
        spots={spots}
        selectedId={selected?.data.id ?? null}
        onSelectResident={(resident) =>
          setSelected({ type: "resident", data: resident })
        }
        onSelectSpot={(spot) => setSelected({ type: "spot", data: spot })}
      />
      <PopupCard
        selected={selected}
        onClose={() => setSelected(null)}
        onEditSpot={(spot) => {
          setEditingSpot(spot);
          setSpotFlowOpen(true);
        }}
      />

      <button
        type="button"
        onClick={() => setListOpen(true)}
        className="fixed bottom-4 left-4 z-[1050] flex items-center gap-1.5 rounded-full bg-cream px-4 py-2.5 text-sm font-semibold text-ink shadow-[0_8px_24px_-8px_rgba(58,51,44,0.35)] transition hover:bg-sand"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
        一覧
      </button>

      <WelcomeOverlay />
      <PinPlacementFlow
        open={pinFlowOpen}
        onClose={() => setPinFlowOpen(false)}
        onSaved={(resident) => {
          setResidents((prev) => {
            if (resident) {
              const exists = prev.some((r) => r.id === resident.id);
              return exists
                ? prev.map((r) => (r.id === resident.id ? resident : r))
                : [...prev, resident];
            }
            return villager ? prev.filter((r) => r.id !== villager.id) : prev;
          });
          setSelected(resident ? { type: "resident", data: resident } : null);
        }}
      />
      <SpotFormFlow
        open={spotFlowOpen}
        editingSpot={editingSpot}
        onClose={() => setSpotFlowOpen(false)}
        onSaved={(spot) => {
          setSpots((prev) => {
            const exists = prev.some((s) => s.id === spot.id);
            return exists
              ? prev.map((s) => (s.id === spot.id ? spot : s))
              : [...prev, spot];
          });
          setSelected({ type: "spot", data: spot });
        }}
        onDeleted={(spotId) => {
          setSpots((prev) => prev.filter((s) => s.id !== spotId));
          setSelected((prev) =>
            prev?.type === "spot" && prev.data.id === spotId ? null : prev,
          );
        }}
      />
      <ListPanel
        open={listOpen}
        onClose={() => setListOpen(false)}
        residents={residents}
        spots={spots}
        onSelectResident={(resident) =>
          setSelected({ type: "resident", data: resident })
        }
        onSelectSpot={(spot) => setSelected({ type: "spot", data: spot })}
      />
    </div>
  );
}
