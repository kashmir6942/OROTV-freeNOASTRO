import { createClient } from "@/lib/supabase/client"

// Generate a unique session ID for the user
export function getUserSessionId(): string {
  if (typeof window === "undefined") return "server-session"

  let sessionId = sessionStorage.getItem("user_session_id")
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem("user_session_id", sessionId)
  }
  return sessionId
}

// Set a user preference in Supabase
export async function setUserPreference(key: string, value: any): Promise<void> {
  try {
    const supabase = createClient()
    const sessionId = getUserSessionId()

    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_session: sessionId,
        preference_key: key,
        preference_value: value,
      },
      {
        onConflict: "user_session,preference_key",
      },
    )

    if (error) {
      console.error("[v0] Error setting user preference:", error)
      // Fallback to localStorage if Supabase fails
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value))
      }
    }
  } catch (error) {
    console.error("[v0] Error setting user preference:", error)
    // Fallback to localStorage if Supabase fails
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }
}

// Get a user preference from Supabase
export async function getUserPreference(key: string, defaultValue: any = null): Promise<any> {
  try {
    const supabase = createClient()
    const sessionId = getUserSessionId()

    const { data, error } = await supabase
      .from("user_preferences")
      .select("preference_value")
      .eq("user_session", sessionId)
      .eq("preference_key", key)
      .single()

    if (error || !data) {
      // Fallback to localStorage if Supabase fails
      if (typeof window !== "undefined") {
        const localValue = localStorage.getItem(key)
        if (localValue) {
          try {
            return JSON.parse(localValue)
          } catch {
            return localValue
          }
        }
      }
      return defaultValue
    }

    return data.preference_value
  } catch (error) {
    console.error("[v0] Error getting user preference:", error)
    // Fallback to localStorage if Supabase fails
    if (typeof window !== "undefined") {
      const localValue = localStorage.getItem(key)
      if (localValue) {
        try {
          return JSON.parse(localValue)
        } catch {
          return localValue
        }
      }
    }
    return defaultValue
  }
}

// Remove a user preference from Supabase
export async function removeUserPreference(key: string): Promise<void> {
  try {
    const supabase = createClient()
    const sessionId = getUserSessionId()

    const { error } = await supabase
      .from("user_preferences")
      .delete()
      .eq("user_session", sessionId)
      .eq("preference_key", key)

    if (error) {
      console.error("[v0] Error removing user preference:", error)
    }

    // Also remove from localStorage as fallback
    if (typeof window !== "undefined") {
      localStorage.removeItem(key)
    }
  } catch (error) {
    console.error("[v0] Error removing user preference:", error)
    // Fallback to localStorage if Supabase fails
    if (typeof window !== "undefined") {
      localStorage.removeItem(key)
    }
  }
}

// Get all user preferences from Supabase
export async function getAllUserPreferences(): Promise<Record<string, any>> {
  try {
    const supabase = createClient()
    const sessionId = getUserSessionId()

    const { data, error } = await supabase
      .from("user_preferences")
      .select("preference_key, preference_value")
      .eq("user_session", sessionId)

    if (error || !data) {
      return {}
    }

    const preferences: Record<string, any> = {}
    data.forEach((item) => {
      preferences[item.preference_key] = item.preference_value
    })

    return preferences
  } catch (error) {
    console.error("[v0] Error getting all user preferences:", error)
    return {}
  }
}
