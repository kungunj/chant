import type { Condition, Courier, DeviceCategory, OrderStatus, PaymentStatus, ShipmentStatus } from "@prisma/client";

export function formatKes(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

export const categoryLabels: Record<DeviceCategory, string> = {
  LAPTOP: "Laptops",
  DESKTOP: "Desktops",
  PHONE: "Phones & tablets",
  TV: "TVs",
  RADIO: "Radios",
  AUDIO: "Audio & amplifiers",
  CAR: "Car electronics",
  APPLIANCE: "Home appliances",
  OTHER: "Other",
};

export const conditionLabels: Record<Condition, string> = {
  NEW_SPARE: "New spare",
  USED_WORKING: "Used, working",
  USED_FOR_PARTS: "For parts / dead unit",
  REFURBISHED: "Refurbished",
};

export const courierLabels: Record<Courier, string> = {
  POSTA_KENYA: "Posta Kenya",
  FARGO_COURIER: "Fargo Courier",
  OTHER: "Other courier",
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Waiting for M-Pesa confirmation",
  SUCCESS: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const shipmentStatusLabels: Record<ShipmentStatus, string> = {
  AWAITING_PICKUP: "Awaiting courier pickup",
  IN_TRANSIT: "In transit",
  ARRIVED_AT_BRANCH: "Arrived at branch",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  RETURNED: "Returned to sender",
};
