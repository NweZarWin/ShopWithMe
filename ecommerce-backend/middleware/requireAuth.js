import { createHash } from 'node:crypto';
import { AuthSession } from '../models/AuthSession.js';
import { User } from '../models/User.js';

export async function requireAuth(req, res, next) {
  const authorization = req.get('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (!token) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await AuthSession.findOne({ where: { tokenHash } });

    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      if (session) {
        await session.destroy();
      }
      return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    }

    const user = await User.findByPk(session.userId);
    if (!user) {
      await session.destroy();
      return res.status(401).json({ error: 'Please log in to continue.' });
    }

    req.user = user;
    req.authSession = session;
    return next();
  } catch (error) {
    console.error('Could not verify session:', error);
    return res.status(500).json({ error: 'Could not verify your session.' });
  }
}
