import { cookies } from 'next/headers';

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('current_user_id')?.value;
  return userId || null;
}

export async function getCurrentUser() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  
  const { db } = await import('./db');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  return user as { id: string; name: string; email: string; role: string; department: string; institution: string } | undefined;
}
