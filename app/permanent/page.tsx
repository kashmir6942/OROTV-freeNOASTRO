'use client'

import { useDeviceRedirect } from '@/hooks/use-device-redirect'
import IPTVContent from '@/components/iptv-content'

export default function PermanentPage() {
  useDeviceRedirect('permanent')

  // Permanent page bypasses all auth - direct access
  return <IPTVContent username="permanent" />
}
