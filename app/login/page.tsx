import type { Metadata } from "next";
import { headers } from "next/headers";
import { Space_Grotesk } from "next/font/google";
import { LoginScreen } from "@/components/auth/login-screen";
import { normalizeLanguageTag } from "@/lib/language";
import { logger } from "@/lib/logger";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-login",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Login | Gerit",
  description: "Acesso a plataforma Gerit",
};

interface TenantResponseItem {
  id: number;
  name: string;
}

async function getTenants() {
  try {
    const requestHeaders = headers();
    const preferredLanguage = normalizeLanguageTag(
      requestHeaders.get("accept-language"),
    );
    const response = await fetch("http://82.29.172.68/v1/auth/tenants", {
      method: "GET",
      headers: {
        "Accept-Language": preferredLanguage,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      logger.warn("Falha ao carregar tenants", {
        context: "login.getTenants",
        statusCode: response.status,
      });

      return {
        tenants: [] as TenantResponseItem[],
        tenantsLoadError: true,
      };
    }

    const data = (await response.json()) as unknown;

    if (!Array.isArray(data)) {
      return {
        tenants: [] as TenantResponseItem[],
        tenantsLoadError: true,
      };
    }

    const tenants = data.filter((item): item is TenantResponseItem => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof item.name === "string"
      );
    });

    logger.info("Tenants carregados com sucesso", {
      context: "login.getTenants",
      totalTenants: tenants.length,
    });

    return {
      tenants,
      tenantsLoadError: false,
    };
  } catch (error) {
    logger.error("Erro ao carregar tenants", {
      context: "login.getTenants",
      error,
    });

    return {
      tenants: [] as TenantResponseItem[],
      tenantsLoadError: true,
    };
  }
}

export default async function LoginPage() {
  const { tenants, tenantsLoadError } = await getTenants();

  return (
    <div className={`${spaceGrotesk.variable} h-[100dvh]`}>
      <LoginScreen tenants={tenants} tenantsLoadError={tenantsLoadError} />
    </div>
  );
}
