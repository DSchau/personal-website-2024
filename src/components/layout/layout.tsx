import type { ReactNode } from 'react'

import '@/styles/globals.css'

import { Header } from '@/components/header/header.tsx'
import { Navigation } from '@/components/navigation/navigation.tsx'

interface Props {
  children: ReactNode
}

export function Layout({ children }: Props) {
  return (
    <>
      <Navigation />
      <Header />
      <main>
        {children}
      </main>
    </>
  )
}