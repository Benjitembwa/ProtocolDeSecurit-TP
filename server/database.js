import mongoose from 'mongoose';
import dns from 'node:dns/promises';
import { isIP } from 'node:net';
import './config.js';

export function getDatabaseDnsServers(env = process.env) {
  const value = env.MONGODB_DNS_SERVERS?.trim();
  if (!value) return [];
  const servers = value.split(',').map((server) => server.trim());
  if (servers.some((server) => !isIP(server))) {
    throw new Error('MONGODB_DNS_SERVERS doit contenir des adresses IP séparées par des virgules.');
  }
  return servers;
}

export function getDatabaseSettings(env = process.env) {
  const uri = env.MONGODB_URI?.trim();
  if (!uri)
    throw new Error('MONGODB_URI est obligatoire. Configurez votre connexion MongoDB Atlas dans .env.');
  let address;
  try {
    address = new URL(uri);
  } catch {
    throw new Error('MONGODB_URI est invalide. Utilisez la chaîne mongodb+srv fournie par Atlas.');
  }
  if (address.protocol !== 'mongodb+srv:' || !address.hostname.endsWith('.mongodb.net')) {
    throw new Error('Une connexion MongoDB Atlas mongodb+srv est requise. La base locale est désactivée.');
  }
  let username, password;
  try {
    username = decodeURIComponent(address.username);
    password = decodeURIComponent(address.password);
  } catch {
    throw new Error('Les identifiants de MONGODB_URI doivent être encodés correctement dans l’URL.');
  }
  if (!username || !password || /[<>]/.test(username + password)) {
    throw new Error('Complétez le nom d’utilisateur et le mot de passe Atlas dans MONGODB_URI (.env).');
  }
  if (address.hash) throw new Error('Encodez les caractères spéciaux du mot de passe dans MONGODB_URI.');
  const dbName = env.MONGODB_DB_NAME?.trim() || address.pathname.slice(1) || 'sentinel';
  if (!/^[a-zA-Z0-9_-]{1,63}$/.test(dbName)) {
    throw new Error(
      'Le nom de base doit contenir 1 à 63 lettres, chiffres, tirets ou traits de soulignement.',
    );
  }
  for (const [key, value] of address.searchParams) {
    if (
      (['tls', 'ssl'].includes(key.toLowerCase()) && value.toLowerCase() === 'false') ||
      (['tlsinsecure', 'tlsallowinvalidcertificates', 'tlsallowinvalidhostnames'].includes(
        key.toLowerCase(),
      ) &&
        value.toLowerCase() === 'true')
    ) {
      throw new Error('La connexion Atlas doit utiliser TLS avec un certificat valide.');
    }
  }
  return { uri, options: { dbName, tls: true, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 } };
}

export function databaseErrorMessage(error) {
  if (error.code === 18 || /authentication failed|bad auth/i.test(error.message || '')) {
    return 'Authentification Atlas refusée. Vérifiez le nom et le mot de passe de l’utilisateur de base de données.';
  }
  if (
    ['ENOTFOUND', 'EAI_AGAIN', 'ENODATA', 'ESERVFAIL'].includes(error.code) ||
    ['querySrv', 'queryTxt'].includes(error.syscall)
  ) {
    return 'Résolution DNS Atlas impossible. Vérifiez le cluster et votre DNS ; MONGODB_DNS_SERVERS permet de configurer les résolveurs du processus Node.js.';
  }
  if (error.name === 'MongoParseError')
    return 'Options de connexion Atlas invalides. Vérifiez MONGODB_URI dans .env.';
  return 'Connexion à MongoDB Atlas impossible. Vérifiez le réseau, les accès IP Atlas et la disponibilité du cluster.';
}

export async function connectDatabase() {
  const { uri, options } = getDatabaseSettings();
  const servers = getDatabaseDnsServers();
  // Explicit process-only override for environments whose system DNS cannot resolve SRV records.
  if (servers.length) dns.setServers(servers);
  try {
    await mongoose.connect(uri, options);
    await mongoose.connection.db.admin().command({ ping: 1 });
  } catch (error) {
    // Raw driver errors may contain connection credentials: never log them.
    throw new Error(databaseErrorMessage(error));
  }
  console.info(`MongoDB Atlas connecté — base : ${options.dbName}`);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
