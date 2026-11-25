import { createHash, pbkdf2 as deriveKey, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import express from 'express';
import { AuthSession } from '../models/AuthSession.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();
const pbkdf2 = promisify(deriveKey);
const passwordIterations = 100000;
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  address: user.address
});

async function createSession(user) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await AuthSession.create({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + sessionLifetimeMs)
  });
  return token;
}

router.post('/signup', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return res.status(400).json({
      error: 'Enter a name, valid email, and password with at least 8 characters.'
    });
  }

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = (await pbkdf2(password, salt, passwordIterations, 64, 'sha512')).toString('hex');
    const user = await User.create({ name, email, passwordSalt: salt, passwordHash });
    const token = await createSession(user);

    return res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Could not create account:', error);
    return res.status(500).json({ error: 'Could not create account.' });
  }
});

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const passwordHash = await pbkdf2(password, user.passwordSalt, passwordIterations, 64, 'sha512');
    const storedHash = Buffer.from(user.passwordHash, 'hex');
    if (storedHash.length !== passwordHash.length || !timingSafeEqual(storedHash, passwordHash)) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const token = await createSession(user);
    return res.json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('Could not log in:', error);
    return res.status(500).json({ error: 'Could not log in.' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put('/profile', requireAuth, async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
  const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone || !address) {
    return res.status(400).json({ error: 'Name, valid email, phone number, and address are required.' });
  }
  const phoneDigits = phone.replace(/\D/g, '');
  if (!/^[+()\d\s-]{7,20}$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    return res.status(400).json({ error: 'Enter a valid phone number.' });
  }

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    req.user.name = name;
    req.user.email = email;
    req.user.phone = phone;
    req.user.address = address;
    await req.user.save();

    return res.json({ user: publicUser(req.user) });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('Could not update buyer profile:', error);
    return res.status(500).json({ error: 'Could not update your details.' });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await req.authSession.destroy();
    return res.status(204).send();
  } catch (error) {
    console.error('Could not log out:', error);
    return res.status(500).json({ error: 'Could not log out.' });
  }
});

export default router;
