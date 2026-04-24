"use client"

// Favorites management for channels
export const getFavorites = (): string[] => {
  if (typeof window === "undefined") return []
  const favorites = localStorage.getItem("tata-favorites")
  return favorites ? JSON.parse(favorites) : []
}

export const addFavorite = (channelId: string): void => {
  const favorites = getFavorites()
  if (!favorites.includes(channelId)) {
    favorites.push(channelId)
    localStorage.setItem("tata-favorites", JSON.stringify(favorites))
  }
}

export const removeFavorite = (channelId: string): void => {
  const favorites = getFavorites()
  const updated = favorites.filter((id) => id !== channelId)
  localStorage.setItem("tata-favorites", JSON.stringify(updated))
}

export const isFavorite = (channelId: string): boolean => {
  return getFavorites().includes(channelId)
}

// Recently watched channels
export const addToRecentlyWatched = (channelId: string): void => {
  const recent = getRecentlyWatched()
  const filtered = recent.filter((id) => id !== channelId)
  filtered.unshift(channelId)
  const limited = filtered.slice(0, 12) // Keep only last 12 channels
  localStorage.setItem("tata-recently-watched", JSON.stringify(limited))
}

export const getRecentlyWatched = (): string[] => {
  if (typeof window === "undefined") return []
  const recent = localStorage.getItem("tata-recently-watched")
  return recent ? JSON.parse(recent) : []
}
