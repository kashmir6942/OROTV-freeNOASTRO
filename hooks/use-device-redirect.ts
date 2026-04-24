'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useIsMobile } from './use-mobile'

export function useDeviceRedirect(currentPath: 'permanent' | 'mobileui') {
  const router = useRouter()
  const isMobile = useIsMobile()
  const searchParams = useSearchParams()
  const hasChecked = searchParams.get('device-checked') === 'true'
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (redirectedRef.current || hasChecked) return
    
    if (isMobile === undefined) return

    redirectedRef.current = true

    // Redirect based on current path and device type
    if (currentPath === 'permanent' && isMobile) {
      router.push('/mobileui?device-checked=true')
    } else if (currentPath === 'mobileui' && !isMobile) {
      router.push('/permanent?device-checked=true')
    }
  }, [isMobile, hasChecked, currentPath, router])
}
