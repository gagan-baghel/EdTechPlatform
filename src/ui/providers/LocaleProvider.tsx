"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { NextIntlClientProvider } from "next-intl"

import en from "../../../messages/en.json"
import hi from "../../../messages/hi.json"

/** Locale codes with a bundled catalogue. */
type SupportedLocale = "en" | "hi"

const MESSAGES: Record<SupportedLocale, typeof en> = { en, hi }

const isSupportedLocale = (value: string): value is SupportedLocale =>
  value in MESSAGES
export const SUPPORTED_LOCALES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
]
const STORAGE_KEY = "locale"

export interface LocaleSwitcherContextType {
  locale: string
  setLocale: (code: string) => void
}

const LocaleSwitcherContext = createContext<LocaleSwitcherContextType>({ locale: "en", setLocale: () => {} })

/**
 * Provider-only next-intl setup — no [locale] URL segment, no routing
 * middleware. Restructuring every route under a locale segment (next-intl's
 * default) would touch all ~28 pages and the hand-rolled router shim right
 * before a launch date; a stored preference switches translations at
 * runtime with zero routing changes and zero risk to existing routes.
 * Coverage is scoped to the highest-traffic surfaces (nav, footer, home
 * hero, course card/purchase actions, auth forms) — see messages/en.json
 * for what's translated. Extending coverage later just means adding keys
 * to messages/*.json and calling useTranslations() in more components.
 */
export default function LocaleProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [locale, setLocaleState] = useState("en")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && MESSAGES[stored as SupportedLocale]) setLocaleState(stored)
  }, [])

  const setLocale = (code: string) => {
    if (!MESSAGES[code as SupportedLocale]) return
    setLocaleState(code)
    localStorage.setItem(STORAGE_KEY, code)
  }

  const activeLocale: SupportedLocale = isSupportedLocale(locale) ? locale : "en"

  return (
    <LocaleSwitcherContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[activeLocale]} timeZone="Asia/Kolkata">
        {children}
      </NextIntlClientProvider>
    </LocaleSwitcherContext.Provider>
  )
}

export function useLocaleSwitcher(): LocaleSwitcherContextType {
  return useContext(LocaleSwitcherContext)
}
