import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
process.env.NODE_ENV = 'test';
process.env.CLIENT_ORIGIN = 'http://127.0.0.1:5173/';
process.env.RENDER_EXTERNAL_URL = 'https://sentinel.example/';
delete process.env.ADMIN_EMAIL;
delete process.env.ADMIN_PASSWORD;
const { createApp } = await import('../server/app.js');
const { seedDatabase, DEMO_PASSWORD } = await import('../server/seed-data.js');
const { Lab, User, Session } = await import('../server/models.js');
const { config } = await import('../server/config.js');
const { sha256, inspectBackup, manifestHash, metrics } = await import('../server/domain.js');

let mongo, original, accounts;
const app = createApp({ rateLimits: false });
const origin = config.origin;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('sentinel-tests'));
  await seedDatabase();
  original = await Lab.findById('main').lean();
  accounts = (await User.find().select('+passwordHash').lean()).map((u) => ({ ...u, _id: String(u._id) }));
});
beforeEach(async () => {
  await Lab.replaceOne({ _id: 'main' }, structuredClone(original));
  await Session.deleteMany({});
  await User.deleteMany({});
  await User.insertMany(structuredClone(accounts));
});
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
async function client(role = 'admin', targetApp = app) {
  const agent = supertest.agent(targetApp);
  const response = await agent
    .post('/api/auth/login')
    .set('Origin', origin)
    .send({ email: `${role}@sentinel.lab`, password: DEMO_PASSWORD });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return {
    agent,
    csrf: response.body.csrfToken,
    user: response.body.user,
    login: response,
    get: (url) => agent.get(`/api${url}`),
    post: (url, body = {}) =>
      agent.post(`/api${url}`).set('Origin', origin).set('X-CSRF-Token', response.body.csrfToken).send(body),
    patch: (url, body = {}) =>
      agent.patch(`/api${url}`).set('Origin', origin).set('X-CSRF-Token', response.body.csrfToken).send(body),
    delete: (url) =>
      agent.delete(`/api${url}`).set('Origin', origin).set('X-CSRF-Token', response.body.csrfToken),
  };
}
async function launch(c, body = { scenario: 'CUSTOM', fileCount: 4, machineIds: ['SYS-009'] }) {
  const response = await c.post('/simulations', body);
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body;
}
async function action(c, incident, key, body = {}) {
  const response = await c.post(`/incidents/${incident.id}/actions/${key}`, body);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return response.body;
}
async function prepareRestore(c, incident) {
  await action(c, incident, 'isolate');
  await action(c, incident, 'analyze');
  await action(c, incident, 'select', { backupId: original.backups[0].id });
  await action(c, incident, 'verify');
}

test('SHA-256 : vecteur connu et caractères UTF-8', () => {
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256('').length, 64);
  assert.notEqual(sha256('résilience'), sha256('resilience'));
});
test('une sauvegarde détecte contenu altéré, manifeste modifié, taille et nombre incohérents', () => {
  const good = structuredClone(original.backups[0]);
  assert.equal(inspectBackup(good).valid, true);
  assert.equal(manifestHash([...good.files].reverse()), good.hash);
  const alteredContent = structuredClone(good);
  alteredContent.files[0].content += 'altéré';
  assert.equal(inspectBackup(alteredContent).valid, false);
  const alteredMetadata = structuredClone(good);
  alteredMetadata.files[0].name = 'substitution.pdf';
  assert.equal(inspectBackup(alteredMetadata).valid, false);
  const alteredCount = structuredClone(good);
  alteredCount.fileCount--;
  assert.equal(inspectBackup(alteredCount).valid, false);
  const alteredSize = structuredClone(good);
  alteredSize.size++;
  assert.equal(inspectBackup(alteredSize).valid, false);
  assert.equal(inspectBackup(original.backups[1]).valid, false);
});
test('l’API exige une session et ne révèle pas les détails de connexion', async () => {
  assert.equal((await supertest(app).get('/api/state')).status, 401);
  const bad = await supertest(app)
    .post('/api/auth/login')
    .set('Origin', origin)
    .send({ email: 'unknown@sentinel.lab', password: 'incorrect' });
  assert.equal(bad.status, 401);
  assert.equal(bad.body.error, 'Adresse e-mail ou mot de passe incorrect.');
  assert.equal(
    (
      await supertest(app)
        .post('/api/auth/login')
        .set('Origin', origin)
        .send({ email: { $ne: null }, password: 'incorrect' })
    ).status,
    400,
  );
});
test('mots de passe bcrypt, cookie HttpOnly et profil sans secrets', async () => {
  assert.match(accounts[0].passwordHash, /^\$2[ab]\$12\$/);
  const c = await client();
  const cookie = c.login.headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(c.login.body.user.passwordHash, undefined);
  const response = await c.get('/auth/me');
  assert.equal(response.status, 200);
  assert.equal(response.body.csrfToken, c.csrf);
  assert.ok(!JSON.stringify(response.body).includes('passwordHash'));
});
test('les origines et les jetons CSRF sont contrôlés avant toute mutation', async () => {
  assert.equal(config.origin, 'http://127.0.0.1:5173');
  assert.equal(config.deploymentOrigin, 'https://sentinel.example');
  assert.equal(
    (
      await supertest(app)
        .post('/api/auth/login')
        .set('Origin', config.deploymentOrigin)
        .send({ email: 'nobody@example.org', password: 'invalid' })
    ).status,
    401,
  );
  const c = await client();
  assert.equal(
    (await c.agent.post('/api/simulations').set('Origin', origin).send({ scenario: 'LOW' })).status,
    403,
  );
  assert.equal(
    (
      await c.agent
        .post('/api/simulations')
        .set('Origin', 'https://attacker.invalid')
        .set('X-CSRF-Token', c.csrf)
        .send({ scenario: 'LOW' })
    ).status,
    403,
  );
  assert.equal((await c.agent.post('/api/auth/logout').set('X-CSRF-Token', c.csrf)).status, 403);
  assert.equal((await Lab.findById('main')).incidents.length, 0);
});
test('déconnexion : une copie de l’ancien JWT ne rétablit pas la session', async () => {
  const c = await client();
  const cookie = c.login.headers['set-cookie'][0].split(';')[0];
  assert.equal((await c.post('/auth/logout')).status, 204);
  assert.equal((await supertest(app).get('/api/state').set('Cookie', cookie)).status, 401);
});
test('expiration JWT et session MongoDB sont toutes deux respectées', async () => {
  const c = await client();
  await Session.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await c.get('/auth/me')).status, 401);
  const expired = jwt.sign({}, config.jwtSecret, {
    subject: c.user.id,
    expiresIn: -1,
    issuer: 'sentinel',
    audience: 'sentinel-web',
  });
  assert.equal(
    (await supertest(app).get('/api/state').set('Cookie', `${config.cookieName}=${expired}`)).status,
    401,
  );
});
test('USER : seuls ses fichiers sont visibles et toutes les mutations métiers sont interdites', async () => {
  const c = await client('user');
  const state = (await c.get('/state')).body;
  assert.equal(state.files.length, 36);
  assert.ok(state.files.every((f) => f.ownerId === c.user.id));
  assert.equal(state.machines.length, 3);
  assert.deepEqual(state.incidents, []);
  assert.deepEqual(state.backups, []);
  assert.deepEqual(state.logs, []);
  assert.ok(state.files.every((f) => f.content === undefined));
  assert.equal((await c.post('/simulations', { scenario: 'LOW' })).status, 403);
  assert.equal((await c.post('/backups', { name: 'Interdit' })).status, 403);
  assert.equal((await c.post('/integrity/files', { fileIds: [state.files[0].id] })).status, 403);
  assert.equal((await c.get('/users')).status, 403);
  assert.equal((await c.get('/reports/anything')).status, 403);
});
test('SECURITY_ANALYST : vérifie SHA-256 mais ne simule, restaure, supprime ni administre', async () => {
  const c = await client('analyst');
  assert.equal((await c.post(`/backups/${original.backups[0].id}/verify`)).body.valid, true);
  assert.equal((await c.post(`/backups/${original.backups[1].id}/verify`)).body.valid, false);
  assert.equal((await c.post('/simulations', { scenario: 'LOW' })).status, 403);
  assert.equal((await c.post('/incidents/test/actions/restore', { fileIds: ['FILE-0001'] })).status, 403);
  assert.equal((await c.delete(`/backups/${original.backups[0].id}`)).status, 403);
  assert.equal((await c.patch('/settings', { rtoMinutes: 1, rpoMinutes: 1 })).status, 403);
  assert.equal((await c.get('/users')).status, 403);
});
test('les scénarios respectent leurs plages de fichiers et ne changent pas le contenu', async () => {
  const c = await client();
  for (const [scenario, min, max] of [
    ['LOW', 10, 20],
    ['MEDIUM', 30, 50],
    ['CRITICAL', 70, 90],
  ]) {
    await Lab.replaceOne({ _id: 'main' }, structuredClone(original));
    const i = await launch(c, { scenario });
    assert.ok(i.fileIds.length >= Math.floor((144 * min) / 100));
    assert.ok(i.fileIds.length <= Math.floor((144 * max) / 100));
    const state = await Lab.findById('main').lean();
    assert.equal(state.files.filter((f) => f.status === 'COMPROMISED').length, i.fileIds.length);
    assert.ok(
      state.files.every(
        (f, n) => f.content === original.files[n].content && f.hash === original.files[n].hash,
      ),
    );
    assert.ok(metrics(state).score < i.scoreBefore);
    assert.equal(i.launchedById, c.user.id);
  }
});
test('scénario personnalisé : périmètre machine/service et entrées invalides', async () => {
  const c = await client();
  assert.equal(
    (await c.post('/simulations', { scenario: 'CUSTOM', fileCount: 13, machineIds: ['SYS-009'] })).status,
    400,
  );
  assert.equal(
    (await c.post('/simulations', { scenario: 'CUSTOM', fileCount: 1, machineIds: ['UNKNOWN'] })).status,
    404,
  );
  assert.equal((await c.post('/simulations', { scenario: 'CUSTOM', fileCount: -1 })).status, 400);
  assert.equal((await c.post('/simulations', { scenario: 'CUSTOM' })).status, 400);
  const i = await launch(c, { scenario: 'CUSTOM', fileCount: 6, serviceIds: ['SVC-001'] });
  assert.deepEqual(i.machineIds, ['SYS-009']);
  assert.deepEqual(i.serviceIds, ['SVC-001']);
  assert.equal((await c.post('/simulations', { scenario: 'LOW' })).status, 409);
});
test('deux simulations concurrentes ne peuvent créer deux incidents actifs ou écraser leurs journaux', async () => {
  const c = await client();
  const responses = await Promise.all([
    c.post('/simulations', { scenario: 'LOW' }),
    c.post('/simulations', { scenario: 'MEDIUM' }),
  ]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
  const state = await Lab.findById('main').lean();
  assert.equal(state.incidents.length, 1);
  assert.equal(state.logs.filter((l) => l.action === 'SIMULATION_LAUNCHED').length, 1);
});
test('les étapes sautées, les copies corrompues ou incomplètes et les fichiers étrangers sont refusés', async () => {
  const c = await client();
  const partial = await c.post('/backups', { name: 'Copie partielle', fileIds: ['FILE-0097'] });
  assert.equal(partial.status, 201);
  const i = await launch(c);
  assert.equal((await c.post(`/incidents/${i.id}/actions/close`)).status, 409);
  assert.equal((await c.post(`/incidents/${i.id}/actions/restore`, { fileIds: i.fileIds })).status, 409);
  await action(c, i, 'isolate');
  await action(c, i, 'analyze');
  assert.equal(
    (await c.post(`/incidents/${i.id}/actions/select`, { backupId: original.backups[1].id })).status,
    400,
  );
  assert.equal(
    (await c.post(`/incidents/${i.id}/actions/select`, { backupId: partial.body.id })).status,
    400,
  );
  await action(c, i, 'select', { backupId: original.backups[0].id });
  await action(c, i, 'verify');
  assert.equal((await c.post(`/incidents/${i.id}/actions/restore`, { fileIds: ['FILE-0001'] })).status, 400);
  assert.equal((await c.post(`/incidents/${i.id}/actions/reactivate`)).status, 409);
});
test('altération entre vérification et restauration : aucune restauration partielle n’est appliquée', async () => {
  const c = await client();
  const i = await launch(c);
  await prepareRestore(c, i);
  const doc = await Lab.findById('main');
  doc.backups[0].files[0].content += 'ALTÉRATION';
  await doc.save();
  assert.equal((await c.post(`/incidents/${i.id}/actions/restore`, { fileIds: i.fileIds })).status, 409);
  const state = await Lab.findById('main').lean();
  assert.equal(state.incidents[0].restoredFileIds.length, 0);
  assert.equal(state.files.filter((f) => f.status === 'COMPROMISED').length, 4);
});
test('parcours complet : confinement, sauvegarde, lots de restauration, contrôle, services et rapport', async () => {
  const c = await client();
  const i = await launch(c);
  await prepareRestore(c, i);
  await action(c, i, 'restore', { fileIds: i.fileIds.slice(0, 2) });
  let state = (await c.get('/state')).body;
  assert.equal(state.metrics.restored, 2);
  assert.equal(state.incidents[0].status, 'RECOVERY');
  assert.equal((await c.post(`/incidents/${i.id}/actions/test`)).status, 409);
  assert.equal(
    (await c.post(`/incidents/${i.id}/actions/restore`, { fileIds: i.fileIds.slice(0, 2) })).status,
    400,
  );
  await action(c, i, 'restore', { fileIds: i.fileIds.slice(2) });
  await action(c, i, 'test');
  await action(c, i, 'reactivate');
  await action(c, i, 'close');
  state = (await c.get('/state')).body;
  assert.equal(state.metrics.compromised, 0);
  assert.equal(state.metrics.restored, 4);
  assert.equal(state.metrics.score, 100);
  assert.ok(state.machines.every((m) => m.status === 'ONLINE' && !m.isolated));
  assert.ok(state.services.every((s) => s.status === 'ONLINE'));
  const report = (await c.get(`/reports/${i.id}`)).body;
  assert.equal(report.status, 'RESOLVED');
  assert.equal(report.restoreRate, 100);
  assert.equal(report.integrity, 'VERIFIED');
  assert.equal(report.scoreBefore, 100);
  assert.equal(report.scoreAfter, 100);
  assert.ok(report.durationSeconds >= 1);
  assert.equal(report.plan.filter((p) => p.status === 'COMPLETED').length, 9);
  assert.equal(report.timeline.length, 10);
  assert.equal((await c.delete(`/backups/${original.backups[0].id}`)).status, 409);
  assert.equal((await c.post(`/incidents/${i.id}/actions/close`)).status, 409);
});
test('sauvegardes : aucun fichier compromis ou altéré ne sert de référence fiable', async () => {
  const c = await client();
  const i = await launch(c);
  assert.equal((await c.post('/backups', { name: 'Copie compromise', fileIds: [i.fileIds[0]] })).status, 400);
  const result = await c.post('/backups', { name: 'Copie des fichiers sains' });
  assert.equal(result.status, 201);
  assert.equal(result.body.fileCount, 140);
  assert.equal(result.body.files[0].content, undefined);
  const doc = await Lab.findById('main');
  doc.files[0].content += 'ALTÉRATION';
  await doc.save();
  assert.equal((await c.post('/backups', { name: 'Copie altérée', fileIds: ['FILE-0001'] })).status, 400);
  const check = await c.post('/integrity/files', { fileIds: ['FILE-0001'] });
  assert.equal(check.status, 200);
  assert.equal(check.body.valid, false);
});
test('gestion des comptes et attribution des ressources : restriction appliquée au serveur', async () => {
  const c = await client();
  const created = await c.post('/users', {
    name: 'Test Account',
    email: 'new@sentinel.lab',
    password: 'NewPassword!2026',
    role: 'USER',
  });
  assert.equal(created.status, 201);
  assert.equal(
    (
      await c.post('/users', {
        name: 'Test Account',
        email: 'new@sentinel.lab',
        password: 'NewPassword!2026',
        role: 'USER',
      })
    ).status,
    409,
  );
  assert.equal((await c.patch(`/files/FILE-0001/owner`, { ownerId: created.body.id })).status, 200);
  const userClient = await client('user');
  const state = (await userClient.get('/state')).body;
  assert.equal(state.files.length, 35);
  assert.equal(
    (await userClient.patch('/files/FILE-0002/owner', { ownerId: userClient.user.id })).status,
    403,
  );
  assert.equal((await c.patch(`/users/${userClient.user.id}`, { active: false })).status, 200);
  assert.equal((await userClient.get('/state')).status, 401);
  assert.equal((await c.patch(`/users/${c.user.id}`, { role: 'USER' })).status, 409);
});
test('changement de rôle : toutes les sessions de l’utilisateur sont révoquées', async () => {
  const admin = await client();
  const analyst = await client('analyst');
  assert.equal((await admin.patch(`/users/${analyst.user.id}`, { role: 'USER' })).status, 200);
  assert.equal((await analyst.get('/state')).status, 401);
  const reconnected = await client('analyst');
  assert.equal(reconnected.user.role, 'USER');
  assert.equal((await reconnected.post(`/backups/${original.backups[0].id}/verify`)).status, 403);
});
test('changement de mot de passe : ancien secret refusé et sessions révoquées', async () => {
  const c = await client('user');
  assert.equal(
    (await c.post('/auth/password', { currentPassword: 'wrong', newPassword: 'NewSecret!2026' })).status,
    400,
  );
  assert.equal(
    (await c.post('/auth/password', { currentPassword: DEMO_PASSWORD, newPassword: 'NewSecret!2026' }))
      .status,
    200,
  );
  assert.equal((await c.get('/state')).status, 401);
  assert.equal(
    (
      await supertest(app)
        .post('/api/auth/login')
        .set('Origin', origin)
        .send({ email: 'user@sentinel.lab', password: DEMO_PASSWORD })
    ).status,
    401,
  );
  assert.equal(
    (
      await supertest(app)
        .post('/api/auth/login')
        .set('Origin', origin)
        .send({ email: 'user@sentinel.lab', password: 'NewSecret!2026' })
    ).status,
    200,
  );
});
test('le RPO expiré réduit réellement la couverture et le score', async () => {
  const state = structuredClone(original);
  state.backups[0].createdAt = new Date(Date.now() - 2 * 86400000).toISOString();
  assert.equal(metrics(state).coverage, 0);
  assert.equal(metrics(state).score, 70);
  const c = await client();
  assert.equal((await c.patch('/settings', { rtoMinutes: 30, rpoMinutes: 60 })).status, 200);
  const i = await launch(c);
  assert.equal(i.rtoMinutes, 30);
  assert.equal(i.rpoMinutes, 60);
});
test('limitation des tentatives de connexion et en-têtes de sécurité', async () => {
  const limited = createApp();
  for (let n = 0; n < 10; n++)
    assert.equal(
      (await supertest(limited).post('/api/auth/login').set('Origin', origin).send({ email: 'bad' })).status,
      400,
    );
  assert.equal(
    (await supertest(limited).post('/api/auth/login').set('Origin', origin).send({ email: 'bad' })).status,
    429,
  );
  const health = await supertest(limited).get('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.headers['x-content-type-options'], 'nosniff');
  assert.match(health.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.equal(health.headers['cache-control'], 'no-store');
});
