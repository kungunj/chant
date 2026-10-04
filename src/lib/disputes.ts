type Viewer = { id: string; role: string };
type DisputeWithParties = { order: { buyerId: string; store: { ownerId: string } } };

/** Buyer, seller and any moderator (admin) can read and post in a dispute. */
export function canAccessDispute(user: Viewer, dispute: DisputeWithParties) {
  return user.role === "ADMIN" || dispute.order.buyerId === user.id || dispute.order.store.ownerId === user.id;
}
