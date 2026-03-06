"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CookieBanner } from "@/components/cookie-banner";
import { ScrollIndicator } from "@/components/scroll-indicator";

interface ClientLayoutProps {
  children: React.ReactNode;
}

/**
 * ClientLayout — camada de layout client-side.
 *
 * Responsabilidades:
 *  - Montar a Navbar e o Footer ao redor do conteúdo principal.
 *  - Exibir o ScrollIndicator de progresso de leitura.
 *  - Exibir o CookieBanner de consentimento (LGPD / GDPR).
 *
 * Padrões aplicados:
 *  - `useMemo` para derivar estilos e classes condicionais sem re-computação.
 *  - `useCallback` para handlers estáveis passados como props.
 *  - `useEffect` para leitura do localStorage sem hidratação mismatch.
 */
export function ClientLayout({ children }: ClientLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Evita mismatch de hidratação entre servidor e cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleScroll = useCallback(() => {
    const el = document.documentElement;
    const scrolled = el.scrollTop;
    const total = el.scrollHeight - el.clientHeight;
    setScrollProgress(total > 0 ? Math.round((scrolled / total) * 100) : 0);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Estilos condicionais do indicador de progresso (CSS Conditional Rule equivalente em JS)
  const indicatorStyle = useMemo<React.CSSProperties>(
    () => ({
      width: `${scrollProgress}%`,
      transition: scrollProgress === 0 ? "none" : "width 0.1s linear",
    }),
    [scrollProgress],
  );

  return (
    <>
      {/* Indicador de progresso de leitura acessível */}
      <div
        role="progressbar"
        aria-valuenow={scrollProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso de leitura da página"
        className="fixed top-0 left-0 h-1 bg-primary z-[60]"
        style={indicatorStyle}
      />

      {/* Barra de navegação sticky */}
      <Navbar />

      {/* Conteúdo principal da página */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        {children}
      </main>

      {/* Rodapé */}
      <Footer />

      {/* Banner de cookies — renderizado apenas após montagem para evitar SSR mismatch */}
      {mounted && <CookieBanner />}

      {/* Componente original de scroll (mantido por compatibilidade) */}
      <ScrollIndicator />
    </>
  );
}
