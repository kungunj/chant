import type { BusinessType, Prisma, RegistryStatus } from "@prisma/client";
import { prisma } from "../db";
import { dojahProvider } from "./dojah";
import { businessNamesMatch, normalizeRegNo, personIsOwner } from "./match";

/** What the Registrar (BRS) holds for a registration number. */
export type RegistryRecord = {
  regNo: string;
  name: string;
  /** e.g. "Registered", "Active", "Dissolved", "Deregistered" */
  status: string;
  /** Proprietors or partners for a business name; directors and shareholders for a company */
  owners: string[];
  registrationDate?: string;
};

export type LookupResult =
  | { kind: "found"; record: RegistryRecord }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

export interface RegistryProvider {
  name: string;
  lookup(type: BusinessType, regNo: string): Promise<LookupResult>;
}

/** For demos and tests: knows only the seeded demo business. */
const mockProvider: RegistryProvider = {
  name: "mock",
  async lookup(_type, regNo) {
    if (regNo === "BN-DEMO1234") {
      return {
        kind: "found",
        record: { regNo, name: "Wanjiru Electronics", status: "Registered", owners: ["WANJIRU KAMAU"], registrationDate: "2019-03-01" },
      };
    }
    return { kind: "not_found" };
  },
};

/**
 * The registry lookup in use: Dojah when DOJAH_APP_ID and DOJAH_SECRET_KEY are set, the demo mock when
 * BUSINESS_REGISTRY_MOCK=true, otherwise none and moderators check businesses by hand on eCitizen.
 */
export function getRegistryProvider(): RegistryProvider | null {
  const { DOJAH_APP_ID, DOJAH_SECRET_KEY, DOJAH_BASE_URL } = process.env;
  if (DOJAH_APP_ID && DOJAH_SECRET_KEY) return dojahProvider(DOJAH_APP_ID, DOJAH_SECRET_KEY, DOJAH_BASE_URL || undefined);
  if (process.env.BUSINESS_REGISTRY_MOCK === "true") return mockProvider;
  return null;
}

const ACTIVE = /^(REGISTERED|ACTIVE|LIVE|IN EXISTENCE)$/i;

/** Compares the registry's record with what the seller entered and says what doesn't match. */
export function evaluateRecord(
  record: RegistryRecord,
  entered: { businessName: string; legalName: string },
): { status: RegistryStatus; problems: string[] } {
  const problems: string[] = [];
  if (!businessNamesMatch(record.name, entered.businessName)) {
    problems.push(`Registered name is "${record.name}", not "${entered.businessName}"`);
  }
  if (!ACTIVE.test(record.status.trim())) problems.push(`Registry status is "${record.status}"`);
  if (record.owners.length > 0 && !personIsOwner(entered.legalName, record.owners)) {
    problems.push(`${entered.legalName} is not listed as an owner or director`);
  }
  return { status: problems.length === 0 ? "MATCHED" : "MISMATCH", problems };
}

/** Looks the store's business up with the registry provider and records the result on the store. */
export async function checkStoreRegistration(storeId: string): Promise<RegistryStatus> {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const provider = getRegistryProvider();
  if (!provider || !store.businessType || !store.businessRegNo || !store.businessName) return store.registryStatus;

  let status: RegistryStatus;
  let details: Prisma.InputJsonValue;
  try {
    const result = await provider.lookup(store.businessType, normalizeRegNo(store.businessRegNo));
    if (result.kind === "found") {
      const evaluation = evaluateRecord(result.record, { businessName: store.businessName, legalName: store.legalName ?? "" });
      status = evaluation.status;
      details = { record: result.record, problems: evaluation.problems };
    } else if (result.kind === "not_found") {
      status = "NOT_FOUND";
      details = { problems: [`No business with number ${store.businessRegNo} at the Registrar`] };
    } else {
      status = "ERROR";
      details = { problems: [result.message] };
    }
  } catch (error) {
    status = "ERROR";
    details = { problems: [error instanceof Error ? error.message : "Registry check failed"] };
  }
  await prisma.store.update({
    where: { id: storeId },
    data: { registryStatus: status, registryCheckedAt: new Date(), registrySource: provider.name, registryDetails: details },
  });
  return status;
}
