import stockMasterJson from "@/data/stockMaster.json";

export type StockMaster = {
  code: string;
  name: string;
  market: string;
  sector: string;
  themes: string[];
};

export const STOCK_MASTER = stockMasterJson as StockMaster[];

export function searchStocks(query: string) {
  const q = query.trim().toLowerCase();

  if (!q) return STOCK_MASTER.slice(0, 10);

  return STOCK_MASTER.filter((stock) => {
    return (
      stock.code.includes(q) ||
      stock.name.toLowerCase().includes(q) ||
      stock.market.toLowerCase().includes(q) ||
      stock.sector.toLowerCase().includes(q) ||
      stock.themes.some((theme) => theme.toLowerCase().includes(q))
    );
  }).slice(0, 10);
}

export function findStockByCode(code: string) {
  return STOCK_MASTER.find((stock) => stock.code === code);
}
