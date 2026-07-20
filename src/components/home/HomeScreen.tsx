"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/layout/Header";
import PopupCard from "@/components/map/PopupCard";
import ListPanel from "@/components/list/ListPanel";
import WelcomeOverlay from "@/components/welcome/WelcomeOverlay";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { residents } from "@/data/residents";
import { spots } from "@/data/spots";
import { villagerToResident } from "@/lib/villagerToResident";
import {
  spotToVillageSpot,
  type SpotRowWithRegistrant,
} from "@/lib/spotToVillageSpot";
import type { SelectedMapItem, Spot } from "@/types/village";

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
  const [listOpen, setListOpen] = useState(false);
  const [realSpots, setRealSpots] = useState<Spot[]>([]);

  // おすすめスポットは村民ピンと異なり全員分を公開表示するため、マウント時に全件取得する
  // (一覧の「登録者」表示のためprofiles.discord_usernameをjoinする)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    supabase
      .from("spots")
      .select("*, profiles(discord_username)")
      .then(({ data }) => {
        if (data)
          setRealSpots(
            (data as unknown as SpotRowWithRegistrant[]).map(spotToVillageSpot),
          );
      });
  }, []);

  // 地図に表示する村民ピンは、ログイン中の自分がピンを設置していればそれを実データで合成する
  // (全村民の実データ化はフェーズ6の一覧表示以降で対応)
  const ownResident = useMemo(
    () => (villager ? villagerToResident(villager) : null),
    [villager],
  );
  const mapResidents = useMemo(() => {
    if (!ownResident) return residents;
    return [...residents.filter((r) => r.id !== ownResident.id), ownResident];
  }, [ownResident]);

  const mapSpots = useMemo(() => [...spots, ...realSpots], [realSpots]);

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-cream">
      <Header
        onOpenPinFlow={() => setPinFlowOpen(true)}
        onOpenSpotFlow={() => setSpotFlowOpen(true)}
      />
      <VillageMap
        residents={mapResidents}
        spots={mapSpots}
        selectedId={selected?.data.id ?? null}
        onSelectResident={(resident) =>
          setSelected({ type: "resident", data: resident })
        }
        onSelectSpot={(spot) => setSelected({ type: "spot", data: spot })}
      />
      <PopupCard selected={selected} onClose={() => setSelected(null)} />

      <button
        type="button"
        onClick={() => setListOpen(true)}
        className="fixed bottom-[104px] right-4 z-[1050] flex items-center gap-1.5 rounded-full bg-cream px-4 py-2.5 text-sm font-semibold text-ink shadow-[0_8px_24px_-8px_rgba(58,51,44,0.35)] transition hover:bg-sand"
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
          setSelected(resident ? { type: "resident", data: resident } : null);
        }}
      />
      <SpotFormFlow
        open={spotFlowOpen}
        onClose={() => setSpotFlowOpen(false)}
        onSaved={(spot) => {
          setRealSpots((prev) => [...prev, spot]);
          setSelected({ type: "spot", data: spot });
        }}
      />
      <ListPanel
        open={listOpen}
        onClose={() => setListOpen(false)}
        residents={mapResidents}
        spots={mapSpots}
        onSelectResident={(resident) =>
          setSelected({ type: "resident", data: resident })
        }
        onSelectSpot={(spot) => setSelected({ type: "spot", data: spot })}
      />
    </div>
  );
}
