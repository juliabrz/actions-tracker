import type { Metadata } from "next"
import { Fredoka, Nunito, Silkscreen } from "next/font/google"

import { Toaster } from "@/components/ui/sonner"

import "./globals.css"

/* Duas famílias, mesmo universo: ambas arredondadas. O erro anterior não foi
   usar duas fontes — foi juntar pixel 8-bit com grotesca técnica, que brigam. */
const body = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
})

const display = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

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
      className={`${body.variable} ${display.variable} ${pixel.variable} h-full antialiased`}
    >
      <body className="grid-paper flex min-h-full flex-col bg-background text-foreground">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
