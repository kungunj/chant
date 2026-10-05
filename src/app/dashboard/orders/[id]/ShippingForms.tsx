"use client";

import type { Courier } from "@prisma/client";
import { addTrackingUpdate, shipOrder } from "@/app/actions/orders";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/SubmitButton";
import { courierLabels, shipmentStatusLabels } from "@/lib/format";

export function ShipForm({ orderId, courier }: { orderId: string; courier: Courier }) {
  return (
    <ActionForm action={shipOrder} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="courier">Courier</label>
          <select id="courier" name="courier" defaultValue={courier} className="input">
            {Object.entries(courierLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="trackingNumber">Tracking / waybill number</label>
          <input id="trackingNumber" name="trackingNumber" required className="input font-mono" />
        </div>
      </div>
      <SubmitButton>Mark as shipped</SubmitButton>
    </ActionForm>
  );
}

export function TrackingUpdateForm({ shipmentId }: { shipmentId: string }) {
  return (
    <ActionForm action={addTrackingUpdate} className="space-y-3">
      <input type="hidden" name="shipmentId" value={shipmentId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue="IN_TRANSIT" className="input">
            {Object.entries(shipmentStatusLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="location">Location</label>
          <input id="location" name="location" className="input" placeholder="e.g. Nakuru branch" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="note">Note for the buyer</label>
        <input id="note" name="note" className="input" />
      </div>
      <SubmitButton className="btn-secondary">Post update</SubmitButton>
    </ActionForm>
  );
}
