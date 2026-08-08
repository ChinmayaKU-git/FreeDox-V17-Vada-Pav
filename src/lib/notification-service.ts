import db from './db';
import crypto from 'crypto';

export function getNotifications(userId: string) {
  return db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(userId);
}

export function getUnreadCount(userId: string): number {
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(userId) as { count: number };
  return result.count;
}

export function markAsRead(notificationIds: string[], userId: string) {
  const placeholders = notificationIds.map(() => '?').join(',');
  db.prepare(`
    UPDATE notifications SET is_read = 1
    WHERE id IN (${placeholders}) AND user_id = ?
  `).run(...notificationIds, userId);
}

export function markAllAsRead(userId: string) {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
}

export function createNotification(userId: string, type: string, referenceId: string | null, message: string) {
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO notifications (id, user_id, type, reference_id, message) VALUES (?, ?, ?, ?, ?)'
  ).run(id, userId, type, referenceId, message);
  return id;
}
