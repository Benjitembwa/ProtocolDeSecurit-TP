import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { z, ZodError } from 'zod';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { config, production } from './config.js';
import { User, Lab, Session, ROLES } from './models.js';
import { authenticate, authorize, login, logout, csrfFor, publicUser } from './auth.js';
import {
  AppError,
  ensure,
  audit,
  metrics,
  simulate,
  createBackup,
  verifyBackup,
  deleteBackup,
  incidentAction,
  findById,
  sha256,
  recordScore,
} from './domain.js';

const passwordSchema = z
  .string()
  .min(12, '12 caractères minimum.')
  .refine((s) => Buffer.byteLength(s, 'utf8') <= 72, '72 octets maximum.');
const idsSchema = z
  .array(z.string().min(1).max(60))
  .max(144)
  .refine((ids) => new Set(ids).size === ids.length, 'Identifiants dupliqués.');
const backupInput = z
  .object({ name: z.string().trim().min(3).max(100), fileIds: idsSchema.optional() })
  .strict();
const simulationInput = z
  .object({
    scenario: z.enum(['LOW', 'MEDIUM', 'CRITICAL', 'CUSTOM']),
    title: z.string().trim().min(3).max(100).optional(),
    fileCount: z.number().int().min(1).max(144).optional(),
    machineIds: idsSchema.optional(),
    serviceIds: idsSchema.optional(),
  })
  .strict()
  .refine((v) => v.scenario !== 'CUSTOM' || v.fileCount, {
    message: 'Nombre de fichiers obligatoire pour un scénario personnalisé.',
  });
const actionInput = z
  .object({ backupId: z.string().max(60).optional(), fileIds: idsSchema.optional() })
  .strict();
const adminOnly = authorize('ADMIN');
const securityOnly = authorize('ADMIN', 'SECURITY_ANALYST');

async function mutate(operation) {
  const doc = await Lab.findById('main');
  if (!doc) throw new AppError(503, 'Le laboratoire n’est pas encore initialisé.');
  const state = doc.toObject();
  const result = await operation(state);
  const { _id, __v, createdAt, updatedAt, ...changes } = state;
  doc.set(changes);
  await doc.save(); // optimisticConcurrency: concurrent workflows cannot overwrite one another.
  return result;
}
const cleanFile = ({ content, ...file }) => file;
function cleanBackup(backup) {
  return { ...backup, files: backup.files.map(({ content, ...file }) => file) };
}
function viewState(state, user) {
  const isUser = user.role === 'USER';
  const files = state.files.filter((f) => !isUser || f.ownerId === String(user._id));
  const machines = state.machines
    .filter((m) => !isUser || files.some((f) => f.machineId === m.id))
    .map((m) => ({
      ...m,
      fileCount: files.filter((f) => f.machineId === m.id).length,
      lastBackupAt:
        files
          .filter((f) => f.machineId === m.id && f.lastBackupAt)
          .map((f) => f.lastBackupAt)
          .sort()
          .at(-1) || null,
    }));
  return {
    name: state.name,
    metrics: metrics(state),
    files: files.map(cleanFile),
    machines,
    services: state.services,
    backups: isUser ? [] : state.backups.map(cleanBackup),
    incidents: isUser ? [] : state.incidents,
    logs: user.role === 'ADMIN' ? state.logs : [],
    scoreHistory: state.scoreHistory,
    settings: state.settings,
    updatedAt: state.updatedAt,
  };
}
export function createApp({ rateLimits = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: production ? [] : null,
        },
      },
    }),
  );
  const allowedOrigins = new Set([
    config.origin,
    ...(!production ? ['http://localhost:5173', 'http://127.0.0.1:4000', 'http://localhost:4000'] : []),
  ]);
  app.use(
    cors({
      credentials: true,
      origin: (origin, cb) =>
        cb(
          origin && !allowedOrigins.has(origin) ? new AppError(403, 'Origine non autorisée.') : null,
          origin || false,
        ),
    }),
  );
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !allowedOrigins.has(req.get('Origin')))
      return next(new AppError(403, 'Origine non autorisée.'));
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.use(cookieParser());
  if (rateLimits)
    app.use(
      '/api',
      rateLimit({
        windowMs: 60000,
        limit: 240,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Trop de requêtes. Réessayez dans une minute.' },
      }),
    );
  app.get('/api/health', (req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({ status: mongoose.connection.readyState === 1 ? 'ok' : 'unavailable', simulated: true }),
  );
  app.get('/api/meta', (req, res) =>
    res.json({
      demo: !production && !process.env.ADMIN_PASSWORD && !process.env.ADMIN_EMAIL,
      name: 'Sentinel',
      version: '1.0.0',
    }),
  );
  if (rateLimits)
    app.use(
      '/api/auth/login',
      rateLimit({
        windowMs: 15 * 60000,
        limit: 10,
        skipSuccessfulRequests: true,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
      }),
    );
  app.post('/api/auth/login', async (req, res) => {
    const input = z
      .object({
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((s) => s.toLowerCase()),
        password: z.string().min(1).max(100),
      })
      .strict()
      .parse(req.body);
    const data = await login(req, res, input);
    await mutate((state) =>
      audit(state, { name: data.user.name, _id: data.user.id }, 'AUTH_LOGIN', 'Connexion réussie.'),
    );
    res.json(data);
  });
  app.use('/api', authenticate);
  app.get('/api/auth/me', (req, res) =>
    res.json({ user: publicUser(req.user), csrfToken: csrfFor(req.session.tokenId) }),
  );
  app.post('/api/auth/logout', async (req, res) => {
    await mutate((state) => audit(state, req.user, 'AUTH_LOGOUT', 'Déconnexion.'));
    await logout(req, res);
  });
  app.post('/api/auth/password', async (req, res) => {
    const input = z
      .object({ currentPassword: z.string().min(1).max(100), newPassword: passwordSchema })
      .strict()
      .parse(req.body);
    const user = await User.findById(req.user._id).select('+passwordHash');
    ensure(
      await bcrypt.compare(input.currentPassword, user.passwordHash),
      'Mot de passe actuel incorrect.',
      400,
    );
    user.passwordHash = await bcrypt.hash(input.newPassword, 12);
    await user.save();
    await Session.deleteMany({ userId: user._id });
    await mutate((state) =>
      audit(
        state,
        req.user,
        'PASSWORD_CHANGED',
        'Mot de passe modifié. Toutes les sessions ont été révoquées.',
      ),
    );
    res.json({ message: 'Mot de passe modifié. Reconnectez-vous.' });
  });
  app.get('/api/state', async (req, res) => {
    const state = await Lab.findById('main').lean();
    ensure(state, 'Laboratoire indisponible.', 503);
    res.json(viewState(state, req.user));
  });
  app.post('/api/simulations', adminOnly, async (req, res) => {
    const input = simulationInput.parse(req.body);
    res.status(201).json(await mutate((state) => simulate(state, req.user, input)));
  });
  app.post('/api/backups', adminOnly, async (req, res) => {
    const input = backupInput.parse(req.body);
    res.status(201).json(cleanBackup(await mutate((state) => createBackup(state, req.user, input))));
  });
  app.post('/api/backups/:id/verify', securityOnly, async (req, res) =>
    res.json(await mutate((state) => verifyBackup(state, req.user, req.params.id))),
  );
  app.delete('/api/backups/:id', adminOnly, async (req, res) => {
    await mutate((state) => deleteBackup(state, req.user, req.params.id));
    res.status(204).end();
  });
  app.post('/api/integrity/files', securityOnly, async (req, res) => {
    const { fileIds } = z
      .object({ fileIds: idsSchema.refine((ids) => ids.length > 0, 'Sélectionnez au moins un fichier.') })
      .strict()
      .parse(req.body);
    res.json(
      await mutate((state) => {
        const files = fileIds
          .map((value) => findById(state.files, value, 'Fichier'))
          .map((f) => ({
            id: f.id,
            name: f.name,
            status: f.status,
            expectedHash: f.hash,
            actualHash: sha256(f.content),
            valid: f.hash === sha256(f.content),
          }));
        const valid = files.every((f) => f.valid);
        audit(
          state,
          req.user,
          'FILE_INTEGRITY_CHECK',
          `${files.length} fichiers · ${valid ? 'Integrity verified' : 'Integrity check failed'}`,
          valid ? 'SUCCESS' : 'ERROR',
        );
        return { valid, files };
      }),
    );
  });
  app.post('/api/incidents/:id/actions/:action', adminOnly, async (req, res) => {
    const input = actionInput.parse(req.body || {});
    res.json(
      await mutate((state) => incidentAction(state, req.user, req.params.id, req.params.action, input)),
    );
  });
  app.get('/api/reports/:id', securityOnly, async (req, res) => {
    const state = await Lab.findById('main').lean();
    const incident = findById(state.incidents, req.params.id, 'Incident');
    res.json({
      ...incident,
      organization: state.name,
      restoreRate: Math.round((incident.restoredFileIds.length / Math.max(1, incident.fileIds.length)) * 100),
      machines: state.machines.filter((m) => incident.machineIds.includes(m.id)),
      backup: state.backups.find((b) => b.id === incident.backupId)?.name || null,
      currentScore: metrics(state).score,
      generatedAt: new Date().toISOString(),
    });
  });
  app.patch('/api/settings', adminOnly, async (req, res) => {
    const input = z
      .object({
        rtoMinutes: z.number().int().min(1).max(10080),
        rpoMinutes: z.number().int().min(1).max(43200),
      })
      .strict()
      .parse(req.body);
    await mutate((state) => {
      state.settings = input;
      audit(
        state,
        req.user,
        'SETTINGS_UPDATED',
        `Objectifs RTO ${input.rtoMinutes} min / RPO ${input.rpoMinutes} min.`,
      );
      recordScore(state);
    });
    res.json(input);
  });
  app.get('/api/users', adminOnly, async (req, res) =>
    res.json((await User.find().sort({ createdAt: 1 })).map(publicUser)),
  );
  app.patch('/api/files/:id/owner', adminOnly, async (req, res) => {
    const input = z
      .object({ ownerId: z.string().refine((id) => mongoose.isValidObjectId(id), 'Utilisateur invalide.') })
      .strict()
      .parse(req.body);
    const owner = await User.findOne({ _id: input.ownerId, active: true });
    ensure(owner, 'Utilisateur actif introuvable.', 404);
    await mutate((state) => {
      const file = findById(state.files, req.params.id, 'Fichier');
      file.ownerId = String(owner._id);
      file.owner = owner.name;
      audit(state, req.user, 'FILE_OWNER_UPDATED', `${file.id} · ressource attribuée à ${owner.email}.`);
    });
    res.json({ message: 'Propriétaire mis à jour.' });
  });
  app.post('/api/users', adminOnly, async (req, res) => {
    const input = z
      .object({
        name: z.string().trim().min(2).max(80),
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((s) => s.toLowerCase()),
        password: passwordSchema,
        role: z.enum(ROLES),
      })
      .strict()
      .parse(req.body);
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: input.role,
    });
    await mutate((state) => audit(state, req.user, 'USER_CREATED', `${input.email} · ${input.role}`));
    res.status(201).json(publicUser(user));
  });
  app.patch('/api/users/:id', adminOnly, async (req, res) => {
    ensure(mongoose.isValidObjectId(req.params.id), 'Utilisateur introuvable.', 404);
    const input = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        role: z.enum(ROLES).optional(),
        active: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    const user = await User.findById(req.params.id);
    ensure(user, 'Utilisateur introuvable.', 404);
    // Administrators are protected here; administrators can manage analyst/user accounts.
    // This invariant cannot be defeated by two concurrent requests demoting each other.
    ensure(
      user.role !== 'ADMIN' || ((!input.role || input.role === 'ADMIN') && input.active !== false),
      'Les comptes administrateurs ne peuvent pas être désactivés ou rétrogradés depuis cette interface.',
      409,
    );
    Object.assign(user, input);
    await user.save();
    await Session.deleteMany({ userId: user._id });
    await mutate((state) =>
      audit(
        state,
        req.user,
        'USER_UPDATED',
        `${user.email} · ${user.role} · ${user.active ? 'actif' : 'désactivé'}`,
      ),
    );
    res.json(publicUser(user));
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Route introuvable.' }));
  const dist = path.resolve('dist');
  if (existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: production ? '1h' : 0 }));
    app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ZodError)
      return res.status(400).json({
        error: 'Données invalides.',
        details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    if (error.name === 'VersionError')
      return res
        .status(409)
        .json({ error: 'Le laboratoire a été modifié par une autre action. Actualisez puis réessayez.' });
    if (error.code === 11000)
      return res.status(409).json({ error: 'Cette adresse e-mail est déjà utilisée.' });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'Requête trop volumineuse.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalide.' });
    if (!(error instanceof AppError)) console.error('API error:', error.name, error.message);
    res
      .status(error.status || 500)
      .json({ error: error instanceof AppError ? error.message : 'Une erreur interne est survenue.' });
  });
  return app;
}
