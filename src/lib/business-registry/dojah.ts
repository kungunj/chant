import type { BusinessType } from "@prisma/client";
import type { LookupResult, RegistryProvider } from "./index";

// Dojah's Kenya business lookup reads the Registrar's (BRS) CR12 / CR13 records.
// Docs: https://docs.dojah.io/api-reference/business-verification/lookup-kenya-business
const REGISTRATION_TYPE: Record<BusinessType, string> = {
  BUSINESS_NAME: "bn",
  PARTNERSHIP: "bn",
  LIMITED_COMPANY: "pvt",
  LLP: "llp",
};

type DojahPartner = { name?: string; type?: string };
type DojahEntity = {
  business_name?: string;
  status?: string;
  registration_number?: string;
  registration_date?: string;
  partners?: DojahPartner[];
};

export function dojahProvider(appId: string, secretKey: string, baseUrl = "https://api.dojah.io"): RegistryProvider {
  return {
    name: "dojah",
    async lookup(type, regNo): Promise<LookupResult> {
      const url = new URL("/api/v1/ke/kyb/business", baseUrl);
      url.searchParams.set("registration_type", REGISTRATION_TYPE[type]);
      url.searchParams.set("registration_number", regNo);
      const res = await fetch(url, {
        headers: { AppId: appId, Authorization: secretKey, Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 404) return { kind: "not_found" };
      if (!res.ok) return { kind: "error", message: `Registry check failed (Dojah HTTP ${res.status})` };
      const body = (await res.json()) as { entity?: DojahEntity };
      const entity = body.entity;
      if (!entity?.business_name) return { kind: "not_found" };
      return {
        kind: "found",
        record: {
          regNo: entity.registration_number ?? regNo,
          name: entity.business_name,
          status: entity.status ?? "unknown",
          owners: (entity.partners ?? []).map((p) => p.name ?? "").filter(Boolean),
          registrationDate: entity.registration_date,
        },
      };
    },
  };
}
