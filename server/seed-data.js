import bcrypt from 'bcrypt';
import { User, Lab } from './models.js';
import { production } from './config.js';
import { sha256, createBackup, audit } from './domain.js';

export const DEMO_PASSWORD = 'Sentinel!2026';
export async function seedDatabase() {
  if (await Lab.exists({ _id: 'main' })) return;
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sentinel.lab';
  const password = process.env.ADMIN_PASSWORD || (!production ? DEMO_PASSWORD : '');
  if (
    production &&
    (!process.env.ADMIN_EMAIL || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72)
  )
    throw new Error(
      'Initialisation : ADMIN_EMAIL et ADMIN_PASSWORD (12 caractères minimum, 72 octets maximum) requis.',
    );
  const accounts = [
    { name: 'Alex Morgan', email: adminEmail, role: 'ADMIN' },
    ...(!production
      ? [
          { name: 'Sarah Chen', email: 'analyst@sentinel.lab', role: 'SECURITY_ANALYST' },
          { name: 'Lucas Martin', email: 'user@sentinel.lab', role: 'USER' },
        ]
      : []),
  ];
  const passwordHash = await bcrypt.hash(password, 12);
  const users = [];
  for (const account of accounts)
    users.push(
      await User.findOneAndUpdate(
        { email: account.email },
        { $setOnInsert: { ...account, passwordHash } },
        { new: true, upsert: true },
      ),
    );
  const admin = users[0];
  const ordinary = users.find((u) => u.role === 'USER') || admin;
  const analyst = users.find((u) => u.role === 'SECURITY_ANALYST') || admin;
  const hostnames = [
    'PC-DIRECTION-01',
    'PC-COMPTABILITE-01',
    'PC-RH-01',
    'PC-MARKETING-01',
    'PC-FINANCE-01',
    'PC-ACCUEIL-01',
    'PC-IT-01',
    'PC-COMMERCIAL-01',
    'SERVER-FILES-01',
    'SERVER-DATABASE-01',
    'SERVER-WEB-01',
    'SERVER-BACKUP-01',
  ];
  const machines = hostnames.map((hostname, i) => ({
    id: `SYS-${String(i + 1).padStart(3, '0')}`,
    hostname,
    ip: `192.0.2.${10 + i}`,
    type: i < 8 ? 'WORKSTATION' : 'SERVER',
    os: i < 8 ? 'Windows 11 Enterprise' : i === 8 ? 'Windows Server 2022' : 'Ubuntu Server 24.04',
    status: 'ONLINE',
    criticality: i >= 8 ? 'HIGH' : i < 3 ? 'MEDIUM' : 'LOW',
    isolated: false,
  }));
  const names = [
    'rapport-financier.pdf',
    'clients.xlsx',
    'budget-2026.xlsx',
    'employes.csv',
    'contrats.pdf',
    'inventaire.xlsx',
    'strategie.docx',
    'procedures.pdf',
    'planning.xlsx',
    'factures.csv',
    'projets.docx',
    'documentation.pdf',
  ];
  const files = machines.flatMap((machine, index) =>
    names.map((name, j) => {
      const owner = index < 3 ? ordinary : index < 8 ? analyst : admin;
      const content = `Document fictif SENTINEL / ${machine.hostname} / ${name}. Données pédagogiques générées pour un exercice de résilience. Référence ${index}-${j}. Aucune donnée réelle.`;
      return {
        id: `FILE-${String(index * 12 + j + 1).padStart(4, '0')}`,
        name,
        content,
        hash: sha256(content),
        machineId: machine.id,
        ownerId: String(owner._id),
        owner: owner.name,
        size: (80 + ((index * 117 + j * 71) % 4200)) * 1024,
        status: 'SAFE',
      };
    }),
  );
  const lab = {
    _id: 'main',
    name: 'Nexus Industries',
    machines,
    files,
    services: [
      {
        id: 'SVC-001',
        name: 'Partage de fichiers',
        description: 'Documents & collaboration',
        machineIds: ['SYS-009'],
        status: 'ONLINE',
        criticality: 'HIGH',
      },
      {
        id: 'SVC-002',
        name: 'Base de données',
        description: 'Données métiers',
        machineIds: ['SYS-010'],
        status: 'ONLINE',
        criticality: 'CRITICAL',
      },
      {
        id: 'SVC-003',
        name: 'Portail intranet',
        description: 'Applications internes',
        machineIds: ['SYS-011', 'SYS-010'],
        status: 'ONLINE',
        criticality: 'MEDIUM',
      },
      {
        id: 'SVC-004',
        name: 'Service de sauvegarde',
        description: 'Protection des données',
        machineIds: ['SYS-012'],
        status: 'ONLINE',
        criticality: 'HIGH',
      },
    ],
    backups: [],
    incidents: [],
    logs: [],
    scoreHistory: [],
    settings: { rtoMinutes: 60, rpoMinutes: 1440 },
  };
  createBackup(lab, admin, { name: 'Sauvegarde complète · référence' });
  const corrupted = structuredClone(lab.backups[0]);
  corrupted.id = 'BKP-DEMO-FAIL';
  corrupted.name = 'Échantillon altéré · test d’intégrité';
  corrupted.status = 'CORRUPTED';
  corrupted.files[0].content += ' [ALTÉRATION FICTIVE]';
  corrupted.createdAt = new Date(Date.now() - 86400000).toISOString();
  lab.backups.push(corrupted);
  audit(
    lab,
    admin,
    'LAB_INITIALIZED',
    'Laboratoire initialisé · 12 systèmes, 144 fichiers fictifs et 2 sauvegardes.',
    'SUCCESS',
  );
  await Lab.create(lab);
  if (!production)
    console.info(
      'Comptes de démonstration initialisés : admin@sentinel.lab, analyst@sentinel.lab, user@sentinel.lab. Voir README pour le mot de passe initial.',
    );
}
