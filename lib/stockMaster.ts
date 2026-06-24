import stockMasterJson from "@/data/stockMaster.json";

export type StockMaster = {
  code: string;
  name: string;
  market: string;
  sector: string;
  themes: string[];
};

export const STOCK_MASTER = stockMasterJson as StockMaster[];

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    )
    .replace(/　/g, " ");
}

export function searchStocks(query: string) {
  const q = normalizeText(query);

  if (!q) return [];

  const keywords = q.split(/\s+/).filter(Boolean);

  return STOCK_MASTER.filter((stock) => {
    const target = normalizeText(
      [stock.code, stock.name, stock.market, stock.sector, ...stock.themes].join(" ")
    );

    return keywords.every((keyword) => target.includes(keyword));
  }).slice(0, 25);
}

export function findStockByCode(code: string) {
  const cleanCode = normalizeText(code).replace(".t", "").toUpperCase();
  return STOCK_MASTER.find((stock) => stock.code.toUpperCase() === cleanCode);
}
