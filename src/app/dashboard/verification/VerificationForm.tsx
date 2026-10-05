"use client";

import { useState } from "react";
import { submitVerification } from "@/app/actions/verification";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { regNoExamples } from "@/lib/business-registry/match";
import { businessTypeLabels, idTypeLabels } from "@/lib/format";

const accept = "image/jpeg,image/png,image/webp,application/pdf";

export function VerificationForm({ legalName, phone }: { legalName: string; phone: string }) {
  const [sellerType, setSellerType] = useState<"BUSINESS" | "INDIVIDUAL">("BUSINESS");
  const [idType, setIdType] = useState("NATIONAL_ID");
  const [businessType, setBusinessType] = useState<keyof typeof businessTypeLabels>("BUSINESS_NAME");
  return (
    <ActionForm action={submitVerification} className="space-y-4">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="label">I am selling as</legend>
        {(
          [
            [
              "BUSINESS",
              "A registered business",
              "Business name, partnership or company. Shown as a verified business.",
            ],
            [
              "INDIVIDUAL",
              "An individual",
              "Selling my own used items. Needs your ID and an M-Pesa line in your name.",
            ],
          ] as const
        ).map(([value, title, hint]) => (
          <label
            key={value}
            className={`card flex cursor-pointer gap-3 p-3 text-sm ${sellerType === value ? "ring-2 ring-brand-600" : ""}`}
          >
            <input
              type="radio"
              name="sellerType"
              value={value}
              checked={sellerType === value}
              onChange={() => setSellerType(value)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{title}</span>
              <span className="text-stone-500">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {sellerType === "BUSINESS" ? (
        <>
          <h2 className="font-semibold">Your registered business</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="businessType">
                Registered as
              </label>
              <select
                id="businessType"
                name="businessType"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as keyof typeof businessTypeLabels)}
                className="input"
              >
                {Object.entries(businessTypeLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="businessRegNo">
                Registration number
              </label>
              <input
                id="businessRegNo"
                name="businessRegNo"
                required
                className="input font-mono"
                placeholder={regNoExamples[businessType]}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="businessName">
                Business name exactly as registered
              </label>
              <input id="businessName" name="businessName" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="kraPin">
                KRA PIN
              </label>
              <input id="kraPin" name="kraPin" required className="input font-mono" placeholder="A123456789B" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="certificate">
                {businessType === "LIMITED_COMPANY" ? "Certificate of incorporation" : "Certificate of registration"}
              </label>
              <input id="certificate" name="certificate" type="file" accept={accept} required className="input" />
            </div>
            {businessType === "LIMITED_COMPANY" && (
              <div>
                <label className="label" htmlFor="cr12">
                  CR12 (list of directors)
                </label>
                <input id="cr12" name="cr12" type="file" accept={accept} required className="input" />
              </div>
            )}
          </div>
          <p className="text-xs text-stone-500">
            We check these details with the Business Registration Service (Registrar of Companies). You must be one of
            the registered owners or directors.
          </p>
        </>
      ) : (
        <>
          <h2 className="font-semibold">Your M-Pesa line</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="mpesaPhone">
                M-Pesa number registered in your name
              </label>
              <input id="mpesaPhone" name="mpesaPhone" defaultValue={phone} required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="kraPin">
                KRA PIN (optional)
              </label>
              <input id="kraPin" name="kraPin" className="input font-mono" placeholder="A123456789B" />
            </div>
          </div>
          <p className="text-xs text-stone-500">
            After you submit, approve a KSh 1 M-Pesa prompt. Safaricom tells us the name the line is registered in, and
            it must match the name on your ID.
          </p>
        </>
      )}

      <h2 className="pt-2 font-semibold">Your identity</h2>
      <div>
        <label className="label" htmlFor="legalName">
          Full name as on your ID
        </label>
        <input id="legalName" name="legalName" defaultValue={legalName} required className="input" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="idType">
            Document type
          </label>
          <select
            id="idType"
            name="idType"
            value={idType}
            onChange={(e) => setIdType(e.target.value)}
            className="input"
          >
            {Object.entries(idTypeLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="idNumber">
            ID / passport number
          </label>
          <input id="idNumber" name="idNumber" required className="input font-mono" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="idFront">
            {idType === "PASSPORT" ? "Passport photo page" : "ID front"}
          </label>
          <input id="idFront" name="idFront" type="file" accept={accept} required className="input" />
        </div>
        {idType !== "PASSPORT" && (
          <div>
            <label className="label" htmlFor="idBack">
              ID back
            </label>
            <input id="idBack" name="idBack" type="file" accept={accept} required className="input" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="selfie">
            Selfie holding your ID
          </label>
          <input
            id="selfie"
            name="selfie"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="businessPermit">
            Business permit (optional)
          </label>
          <input id="businessPermit" name="businessPermit" type="file" accept={accept} className="input" />
        </div>
      </div>
      <p className="text-xs text-stone-500">
        JPG, PNG, WebP or PDF, up to 5 MB each. Documents are stored privately and only seen by SparesHub moderators.
      </p>
      <SubmitButton pendingText="Uploading…">Submit for approval</SubmitButton>
    </ActionForm>
  );
}
