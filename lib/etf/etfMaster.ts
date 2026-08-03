import masterData from "@/data/etfMaster.json";
import type { EtfCategory, EtfMasterItem } from "./etfTypes";

const ETF_MASTER = (masterData as EtfMasterItem[]).slice().sort((a, b) => a.priority - b.priority);

export function getEtfMaster(options?: { enabledOnly?: boolean; category?: EtfCategory | null }) {
  const enabledOnly = options?.enabledOnly ?? true;
  return ETF_MASTER.filter((item) => (!enabledOnly || item.enabled) && (!options?.category || item.category === options.category));
}

export function getEtfBySymbol(symbol: string) {
  const normalized = symbol.replace(/\.T$/i, "").toUpperCase();
  return ETF_MASTER.find((item) => item.symbol.toUpperCase() === normalized) ?? null;
}
