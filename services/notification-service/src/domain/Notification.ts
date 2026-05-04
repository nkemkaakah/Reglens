/**
 * In-app notification document stored in MongoDB (`reglens_notifications.notifications`).
 * `_id` is `{eventId}:{recipientRole}` for idempotent fan-out on Kafka redelivery.
 * ADMIN summary uses `{eventId}:ADMIN` — one document per Kafka event, not per role.
 */
export type Notification = {
  _id: string
  recipientRole: string
  type: string
  title: string
  deepLink: string
  read: boolean
  createdAt: Date
  metadata: Record<string, unknown>
}
