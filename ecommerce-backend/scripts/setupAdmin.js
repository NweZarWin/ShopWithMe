import { pbkdf2 as deriveKey, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { AuthSession } from '../models/AuthSession.js';
import { sequelize } from '../models/index.js';
import { User } from '../models/User.js';

const pbkdf2 = promisify(deriveKey);
const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const replaceExistingAdmins = process.argv.includes('--replace-existing');

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: ADMIN_PASSWORD=<password> npm run admin:setup -- <email> [--replace-existing]');
  process.exitCode = 1;
} else if (!password || password.length < 8) {
  console.error('Set ADMIN_PASSWORD to a password with at least 8 characters.');
  process.exitCode = 1;
} else {
  try {
    await sequelize.authenticate();
    const userColumns = await sequelize.getQueryInterface().describeTable('Users');
    if (!userColumns.role) {
      throw new Error('The role migration is missing. Start the backend once, then retry.');
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = (await pbkdf2(password, salt, 100000, 64, 'sha512')).toString('hex');
    let adminUser = await User.findOne({ where: { email } });

    if (adminUser) {
      adminUser.role = 'admin';
      adminUser.passwordSalt = salt;
      adminUser.passwordHash = passwordHash;
      await adminUser.save();
    } else {
      adminUser = await User.create({
        name: 'Admin',
        email,
        role: 'admin',
        passwordSalt: salt,
        passwordHash
      });
    }

    await AuthSession.destroy({ where: { userId: adminUser.id } });

    if (replaceExistingAdmins) {
      const otherAdmins = await User.findAll({ where: { role: 'admin' } });
      for (const otherAdmin of otherAdmins) {
        if (otherAdmin.id !== adminUser.id) {
          otherAdmin.role = 'customer';
          await otherAdmin.save();
          await AuthSession.destroy({ where: { userId: otherAdmin.id } });
        }
      }
    }

    console.log(`Admin account configured for ${email}.`);
  } catch (error) {
    console.error('Could not configure admin account:', error.message);
    process.exitCode = 1;
  }
}

await sequelize.close();
