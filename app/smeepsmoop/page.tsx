'use client'

import { Suspense } from "react"
import SmeepsmoopContent from "./content"
import SmeepsmoopLoading from "./loading"

export default function SmeepsmoopPage() {
  return (
    <Suspense fallback={<SmeepsmoopLoading />}>
      <SmeepsmoopContent />
    </Suspense>
  )
}
