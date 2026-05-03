/**
 * Persistent device ID stored in localStorage so the same browser/device is
 * recognised across sessions. Used to enforce "1 device per account".
 */
const STORAGE_KEY = "orotv_device_id"

function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return ""
  try {
    let id = window.localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = generateDeviceId()
      window.localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    // localStorage blocked - fall back to a session-stable id on window
    const w = window as unknown as { __orotvDeviceId?: string }
    if (!w.__orotvDeviceId) w.__orotvDeviceId = generateDeviceId()
    return w.__orotvDeviceId
  }
}
