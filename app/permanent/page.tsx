'use client'

import { useEffect } from 'react'
import { useDeviceRedirect } from '@/hooks/use-device-redirect'
import Home from '../page'

export default function PermanentPage() {
  useDeviceRedirect('permanent')

  // Mark this session as the permanent token holder so any downstream
  // checks (favorites, history, etc.) work just like a normal logged-in view.
  useEffect(() => {
    try {
      sessionStorage.setItem('currentToken', 'permanent')
    } catch {
      // sessionStorage can be unavailable (SSR, privacy mode) — safe to ignore.
    }
  }, [])

  // Render channels directly. bypassAuth skips the loading + welcome gates
  // in <Home /> so /permanent goes straight into the IPTV UI.
  return <Home bypassAuth />
}
