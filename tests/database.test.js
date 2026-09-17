import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { getDatabaseSettings, getDatabaseDnsServers, databaseErrorMessage } =
  await import('../server/database.js');
const example =
  'mongodb+srv://test-user:test-password@cluster0.example.mongodb.net/sentinel?retryWrites=true';

test('configuration Atlas : URI obligatoire, aucun repli vers une base locale', () => {
  assert.throws(() => getDatabaseSettings({}), /MONGODB_URI est obligatoire/);
  assert.throws(
    () => getDatabaseSettings({ MONGODB_URI: 'mongodb://127.0.0.1:27017/sentinel' }),
    /base locale est désactivée/,
  );
  assert.throws(() => getDatabaseSettings({ MONGODB_URI: 'invalid' }), /invalide/);
});
test('configuration Atlas : identifiants manquants ou modèles refusés avant connexion', () => {
  assert.throws(
    () => getDatabaseSettings({ MONGODB_URI: example.replace('test-user', '<db_username>') }),
    /Complétez/,
  );
  assert.throws(
    () => getDatabaseSettings({ MONGODB_URI: example.replace('test-user', '%3Cdb_username%3E') }),
    /Complétez/,
  );
  assert.throws(
    () => getDatabaseSettings({ MONGODB_URI: 'mongodb+srv://cluster0.example.mongodb.net/' }),
    /Complétez/,
  );
});
test('configuration Atlas : base explicite et connexion TLS obligatoire', () => {
  const result = getDatabaseSettings({ MONGODB_URI: example, MONGODB_DB_NAME: 'sentinel-academic' });
  assert.equal(result.uri, example);
  assert.equal(result.options.dbName, 'sentinel-academic');
  assert.equal(result.options.tls, true);
  assert.equal(getDatabaseSettings({ MONGODB_URI: example }).options.dbName, 'sentinel');
  assert.equal(
    getDatabaseSettings({ MONGODB_URI: example.replace('/sentinel?', '/?') }).options.dbName,
    'sentinel',
  );
  assert.throws(() => getDatabaseSettings({ MONGODB_URI: `${example}&tls=false` }), /TLS/);
  assert.throws(
    () => getDatabaseSettings({ MONGODB_URI: `${example}&tlsAllowInvalidCertificates=true` }),
    /TLS/,
  );
  assert.throws(
    () => getDatabaseSettings({ MONGODB_URI: example, MONGODB_DB_NAME: '../local' }),
    /nom de base/,
  );
});
test('les résolveurs DNS sont optionnels et limités à des adresses IP', () => {
  assert.deepEqual(getDatabaseDnsServers({}), []);
  assert.deepEqual(getDatabaseDnsServers({ MONGODB_DNS_SERVERS: '1.1.1.1, 8.8.8.8' }), [
    '1.1.1.1',
    '8.8.8.8',
  ]);
  assert.deepEqual(getDatabaseDnsServers({ MONGODB_DNS_SERVERS: '2606:4700:4700::1111' }), [
    '2606:4700:4700::1111',
  ]);
  for (const value of ['dns.example.org', '1.1.1.1,', '1.1.1.999']) {
    assert.throws(() => getDatabaseDnsServers({ MONGODB_DNS_SERVERS: value }), /adresses IP/);
  }
  assert.match(databaseErrorMessage({ code: 'ECONNREFUSED', syscall: 'querySrv' }), /DNS/);
});

test('les erreurs de connexion ne divulguent ni URI ni secret du pilote', () => {
  for (const error of [
    new Error(`Connection failed: ${example}`),
    { code: 18, message: `bad auth ${example}` },
    { code: 'ENOTFOUND', message: example },
    { name: 'MongoParseError', message: example },
    { code: 'ECONNREFUSED', syscall: 'querySrv', message: example },
  ]) {
    const message = databaseErrorMessage(error);
    assert.ok(!message.includes('test-password'));
    assert.ok(!message.includes('test-user'));
    assert.ok(!message.includes('mongodb+srv://'));
  }
});
