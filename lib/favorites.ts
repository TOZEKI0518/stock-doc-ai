export type FavoriteStock = {
  code: string;
  name: string;
  addedAt: string;
};

const FAVORITES_KEY = "stock-doc-ai-favorites";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getFavorites(): FavoriteStock[] {
  if (!canUseLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item) => {
      return (
        item &&
        typeof item.code === "string" &&
        typeof item.name === "string" &&
        typeof item.addedAt === "string"
      );
    });
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: FavoriteStock[]) {
  if (!canUseLocalStorage()) return;

  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function isFavorite(code: string, favorites: FavoriteStock[]) {
  return favorites.some((item) => item.code === code);
}

export function addFavorite(stock: { code: string; name: string }) {
  const favorites = getFavorites();

  if (favorites.some((item) => item.code === stock.code)) {
    return favorites;
  }

  const nextFavorites = [
    {
      code: stock.code,
      name: stock.name,
      addedAt: new Date().toISOString(),
    },
    ...favorites,
  ];

  saveFavorites(nextFavorites);

  return nextFavorites;
}

export function removeFavorite(code: string) {
  const favorites = getFavorites();
  const nextFavorites = favorites.filter((item) => item.code !== code);

  saveFavorites(nextFavorites);

  return nextFavorites;
}
