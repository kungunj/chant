"use client";

import { markMpesaNameVerified, markRegistryVerified, recheckRegistry, setIdNames } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";

export function RegistryActions({ storeId, canRecheck }: { storeId: string; canRecheck: boolean }) {
  return (
    <div className="space-y-3">
      {canRecheck && (
        <ActionForm action={recheckRegistry}>
          <input type="hidden" name="storeId" value={storeId} />
          <SubmitButton className="btn-secondary">Check with the Registrar again</SubmitButton>
        </ActionForm>
      )}
      <ActionForm action={markRegistryVerified} className="space-y-2">
        <input type="hidden" name="storeId" value={storeId} />
        <label className="label" htmlFor="registryNote">
          Checked it yourself on eCitizen (BRS)? Record the search here
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="registryNote"
            name="note"
            className="input flex-1"
            placeholder="e.g. CR12 search ref, owner names and status match"
          />
          <SubmitButton className="btn-secondary">Mark as checked</SubmitButton>
        </div>
      </ActionForm>
    </div>
  );
}

export function MpesaNameActions({ storeId }: { storeId: string }) {
  return (
    <ActionForm action={markMpesaNameVerified} className="space-y-2">
      <input type="hidden" name="storeId" value={storeId} />
      <label className="label" htmlFor="mpesaNote">
        Confirmed the M-Pesa name another way? Record it here
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="mpesaNote"
          name="note"
          className="input flex-1"
          placeholder="e.g. sent KSh 10, M-Pesa showed JANE W. KAMAU"
        />
        <SubmitButton className="btn-secondary">Mark as confirmed</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function IdNamesForm({ storeId, current }: { storeId: string; current: string | null }) {
  return (
    <ActionForm action={setIdNames} className="space-y-2">
      <input type="hidden" name="storeId" value={storeId} />
      <label className="label" htmlFor="idNames">
        {current ? "Correct the names on the ID photo" : "Type the names you see on the ID photo"}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="idNames"
          name="names"
          defaultValue={current ?? ""}
          className="input flex-1"
          placeholder="e.g. JANE WANJIRU KAMAU"
        />
        <SubmitButton className="btn-secondary">Save names</SubmitButton>
      </div>
    </ActionForm>
  );
}
