import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { StoreProvider } from '@/components/providers/StoreProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'R/T Cars',
  description: 'Car auction aggregator — Copart & IAA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full antialiased`}>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  )
}
