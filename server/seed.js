import { connectDatabase, disconnectDatabase } from './database.js';
import { seedDatabase } from './seed-data.js';
try {
  await connectDatabase();
  await seedDatabase();
  console.info('Initialisation terminée (aucune donnée existante écrasée).');
} finally {
  await disconnectDatabase();
}
