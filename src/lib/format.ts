import type {
  BusinessType,
  Condition,
  Courier,
  DeviceCategory,
  EscrowStatus,
  IdDocumentType,
  NameCheckStatus,
  OrderStatus,
  PaymentStatus,
  RegistryStatus,
  ShipmentStatus,
  StoreDocumentKind,
  StoreStatus,
  WalletEntryType,
  WithdrawalStatus,
} from "@prisma/client";

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
  DELIVERED: "Completed",
  REFUNDED: "Refunded",
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

export const storeStatusLabels: Record<StoreStatus, string> = {
  DRAFT: "Documents not submitted",
  PENDING_REVIEW: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

export const idTypeLabels: Record<IdDocumentType, string> = {
  NATIONAL_ID: "National ID",
  PASSPORT: "Passport",
  ALIEN_ID: "Alien ID",
};

export const documentKindLabels: Record<StoreDocumentKind, string> = {
  ID_FRONT: "ID front",
  ID_BACK: "ID back",
  SELFIE: "Selfie holding ID",
  BUSINESS_PERMIT: "Business permit",
  REGISTRATION_CERTIFICATE: "Registration certificate",
  CR12: "CR12 (directors list)",
};

export const businessTypeLabels: Record<BusinessType, string> = {
  BUSINESS_NAME: "Registered business name (sole proprietor)",
  PARTNERSHIP: "Partnership",
  LIMITED_COMPANY: "Limited company",
  LLP: "Limited liability partnership (LLP)",
};

export const nameCheckStatusLabels: Record<NameCheckStatus, string> = {
  NOT_CHECKED: "Not checked yet",
  PENDING: "Waiting for the KSh 1 M-Pesa payment",
  MATCHED: "M-Pesa name matches the ID",
  MISMATCH: "M-Pesa name doesn't match the ID",
  ERROR: "M-Pesa name check failed",
  MANUALLY_VERIFIED: "Confirmed by a moderator",
};

export const registryStatusLabels: Record<RegistryStatus, string> = {
  NOT_CHECKED: "Not checked yet",
  MATCHED: "Matches the Registrar",
  MISMATCH: "Doesn't match the Registrar",
  NOT_FOUND: "Not found at the Registrar",
  ERROR: "Registry check failed",
  MANUALLY_VERIFIED: "Checked by hand on BRS",
};

export const escrowStatusLabels: Record<EscrowStatus, string> = {
  HELD: "Held in escrow",
  RELEASED: "Released to seller",
  REFUNDED: "Refunded to buyer",
  SPLIT: "Split by moderator",
};

export const walletEntryLabels: Record<WalletEntryType, string> = {
  ESCROW_RELEASE: "Sale paid out of escrow",
  REFUND: "Refund",
  WITHDRAWAL: "Withdrawal to M-Pesa",
  WITHDRAWAL_REVERSAL: "Withdrawal rejected, money returned",
};

export const withdrawalStatusLabels: Record<WithdrawalStatus, string> = {
  REQUESTED: "Processing",
  PAID: "Sent to M-Pesa",
  REJECTED: "Rejected",
};

export function displayPhone(phone: string) {
  return phone.startsWith("254") ? `0${phone.slice(3)}` : phone;
}
