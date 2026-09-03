import { GlassPanel } from "@/components/ui/GlassPanel";
import { Dices } from "lucide-react";

export default function DMDicePage() {
  return (
    <GlassPanel title="Dados" subtitle="No disponible">
      <div className="flex flex-col items-center gap-3 py-10 text-center opacity-50">
        <Dices size={36} className="text-[var(--text-4)]" />
        <p className="text-sm text-[var(--text-3)]">
          Las tiradas no están disponibles para el Dungeon Master de momento.
        </p>
      </div>
    </GlassPanel>
  );
}
