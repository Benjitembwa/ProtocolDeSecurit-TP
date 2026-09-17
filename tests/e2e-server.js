// Disposable database dedicated to browser tests; never connects to the user's database.
process.env.NODE_ENV = 'test';
process.env.CLIENT_ORIGIN = 'http://127.0.0.1:4100';
delete process.env.MONGODB_URI;
delete process.env.ADMIN_EMAIL;
delete process.env.ADMIN_PASSWORD;
const { MongoMemoryServer } = await import('mongodb-memory-server');
const { default: mongoose } = await import('mongoose');
const { createApp } = await import('../server/app.js');
const { seedDatabase } = await import('../server/seed-data.js');
const mongo = await MongoMemoryServer.create();
await mongoose.connect(mongo.getUri('sentinel-browser-tests'));
await seedDatabase();
const server = createApp({ rateLimits: false }).listen(4100, '127.0.0.1', () =>
  console.info('Browser test server listening on 4100'),
);
const stop = () =>
  server.close(async () => {
    await mongoose.disconnect();
    await mongo.stop();
    process.exit(0);
  });
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
