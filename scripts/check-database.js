import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../server/database.js';

try {
  await connectDatabase();
  const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
  console.info(`Connexion vérifiée. Collections présentes dans cette base : ${collections.length}.`);
  console.info('Vérification en lecture seule terminée.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
