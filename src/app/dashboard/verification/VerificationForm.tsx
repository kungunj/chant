"use client";

import { useState } from "react";
import { submitVerification } from "@/app/actions/verification";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { idTypeLabels } from "@/lib/format";

const accept = "image/jpeg,image/png,image/webp,application/pdf";

export function VerificationForm({ legalName }: { legalName: string }) {
  const [idType, setIdType] = useState("NATIONAL_ID");
  return (
    <ActionForm action={submitVerification} className="space-y-4">
      <div>
        <label className="label" htmlFor="legalName">Full name as on your ID</label>
        <input id="legalName" name="legalName" defaultValue={legalName} required className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="idType">Document type</label>
          <select id="idType" name="idType" value={idType} onChange={(e) => setIdType(e.target.value)} className="input">
            {Object.entries(idTypeLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="idNumber">ID / passport number</label>
          <input id="idNumber" name="idNumber" required className="input font-mono" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="kraPin">KRA PIN (optional)</label>
        <input id="kraPin" name="kraPin" className="input font-mono" placeholder="A123456789B" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="idFront">{idType === "PASSPORT" ? "Passport photo page" : "ID front"}</label>
          <input id="idFront" name="idFront" type="file" accept={accept} required className="input" />
        </div>
        {idType !== "PASSPORT" && (
          <div>
            <label className="label" htmlFor="idBack">ID back</label>
            <input id="idBack" name="idBack" type="file" accept={accept} required className="input" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="selfie">Selfie holding your ID</label>
          <input id="selfie" name="selfie" type="file" accept="image/jpeg,image/png,image/webp" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="businessPermit">Business permit (optional)</label>
          <input id="businessPermit" name="businessPermit" type="file" accept={accept} className="input" />
        </div>
      </div>
      <p className="text-xs text-stone-500">
        JPG, PNG, WebP or PDF, up to 5 MB each. Documents are stored privately and only seen by SparesHub
        moderators.
      </p>
      <SubmitButton pendingText="Uploading…">Submit for approval</SubmitButton>
    </ActionForm>
  );
}
