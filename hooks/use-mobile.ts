import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const update = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    mql.addEventListener("change", update)

    // Atualiza o estado inicial de forma assíncrona para evitar
    // setState sincronizado dentro do effect (lint).
    const timeoutId = window.setTimeout(update, 0)

    return () => {
      window.clearTimeout(timeoutId)
      mql.removeEventListener("change", update)
    }
  }, [])

  return !!isMobile
}
