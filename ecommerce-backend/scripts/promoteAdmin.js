import { sequelize } from '../models/index.js';
import { User } from '../models/User.js';

const email = process.argv[2]?.trim().toLowerCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run admin:promote -- <existing-user-email>');
  process.exitCode = 1;
} else {
  try {
    await sequelize.authenticate();
    const userColumns = await sequelize.getQueryInterface().describeTable('Users');
    if (!userColumns.role) {
      throw new Error('The role migration is missing. Start the backend once, then retry.');
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error(`No account exists for ${email}. Create the account before promoting it.`);
    }

    if (user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    console.log(`Admin access enabled for ${email}.`);
  } catch (error) {
    console.error('Could not promote user to admin:', error.message);
    process.exitCode = 1;
  }
}

await sequelize.close();
