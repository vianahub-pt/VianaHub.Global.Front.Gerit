"use client";

import { AuthProvider } from "@/components/auth/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { TranslationProvider } from "@/components/translation-context";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TranslationProvider>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </TranslationProvider>
    </ThemeProvider>
  );
}
