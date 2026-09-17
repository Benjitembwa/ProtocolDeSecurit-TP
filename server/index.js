import { connectDatabase, disconnectDatabase } from './database.js';
import { seedDatabase } from './seed-data.js';
import { createApp } from './app.js';
import { config } from './config.js';

try {
  await connectDatabase();
  await seedDatabase();
  const server = createApp().listen(config.port, process.env.HOST || '127.0.0.1', () =>
    console.info(`Sentinel API : http://127.0.0.1:${config.port}`),
  );
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} catch (error) {
  console.error('Démarrage impossible :', error.message);
  await disconnectDatabase();
  process.exitCode = 1;
}
