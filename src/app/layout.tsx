import type { Metadata } from "next"
import { Geist, Geist_Mono, Silkscreen } from "next/font/google"

import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

/** Fonte de display. Só em títulos: nome de ação é conteúdo e precisa de leitura fácil. */
const pixel = Silkscreen({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400", "700"],
})

export const metadata: Metadata = {
  title: "Activity Tracker",
  description: "Acompanhe de quanto em quanto tempo você faz cada coisa.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${pixel.variable} h-full antialiased`}
    >
      <body className="grid-paper flex min-h-full flex-col bg-background text-foreground">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
