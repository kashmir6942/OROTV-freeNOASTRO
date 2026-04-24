"use client"

import { useEffect, useState } from "react"

export function IOSUnsupportedModal() {
  const [isIOS, setIsIOS] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const detectIOS = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isIOSDevice = /iphone|ipad|ipod|mac|ios/i.test(userAgent) && !/android/i.test(userAgent)
      setIsIOS(isIOSDevice)
    }

    detectIOS()
  }, [])

  if (!isClient || !isIOS) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center space-y-6 px-6 text-center max-w-md">
        <h1 className="text-3xl font-bold text-gray-900">Not Supported</h1>
        <p className="text-lg text-gray-600">
          This website is not supported on iOS devices. Please use an Android device, PC, or Android TV to access this
          service.
        </p>
        <div className="text-sm text-gray-500 mt-4">
          <p>Supported devices:</p>
          <ul className="mt-2 space-y-1">
            <li>✓ Android devices</li>
            <li>✓ PC / Laptop</li>
            <li>✓ Android TV</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
