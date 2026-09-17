import { createHash, randomUUID, randomInt } from 'node:crypto';

export const sha256 = (content) => createHash('sha256').update(content, 'utf8').digest('hex');
export const now = () => new Date().toISOString();
export const id = (prefix) => `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const ensure = (condition, message, status = 400) => {
  if (!condition) throw new AppError(status, message);
};
export const findById = (items, value, label) => {
  const item = items.find((entry) => entry.id === value);
  ensure(item, `${label} introuvable.`, 404);
  return item;
};
export const PLAN = [
  ['detect', 'Détection'],
  ['isolate', 'Confinement'],
  ['analyze', 'Analyse'],
  ['select', 'Sauvegarde fiable'],
  ['verify', 'Vérification SHA-256'],
  ['restore', 'Restauration'],
  ['test', 'Contrôle d’intégrité'],
  ['reactivate', 'Reprise des services'],
  ['close', 'Clôture'],
];
export function audit(lab, actor, action, detail, level = 'INFO') {
  lab.logs.unshift({
    id: id('LOG'),
    at: now(),
    level,
    action,
    actor: actor.name,
    actorId: String(actor._id),
    detail,
  });
  lab.logs = lab.logs.slice(0, 2000);
}
export function manifestHash(files) {
  return sha256(
    JSON.stringify(
      [...files]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(({ id, name, machineId, size, hash }) => ({ id, name, machineId, size, hash })),
    ),
  );
}
export function inspectBackup(backup) {
  const files = backup.files.map((file) => ({
    id: file.id,
    name: file.name,
    expectedHash: file.hash,
    actualHash: sha256(file.content),
    valid: sha256(file.content) === file.hash,
  }));
  const actualHash = manifestHash(backup.files);
  return {
    valid:
      files.every((file) => file.valid) &&
      actualHash === backup.hash &&
      backup.fileCount === files.length &&
      backup.size === backup.files.reduce((sum, f) => sum + f.size, 0),
    expectedHash: backup.hash,
    actualHash,
    files,
  };
}
export function metrics(lab, at = Date.now()) {
  const safe = lab.files.filter((f) => f.status === 'SAFE').length;
  const compromised = lab.files.filter((f) => f.status === 'COMPROMISED').length;
  const restored = lab.files.filter((f) => f.status === 'RESTORED').length;
  const reliable = lab.backups.filter(
    (b) =>
      b.status !== 'CORRUPTED' &&
      b.verifiedAt &&
      (at - new Date(b.createdAt).getTime()) / 60000 <= lab.settings.rpoMinutes,
  );
  const covered = lab.files.filter((f) =>
    reliable.some((b) => b.files.some((s) => s.id === f.id && s.hash === f.hash)),
  ).length;
  const online = lab.services.filter((s) => s.status === 'ONLINE').length;
  const score = Math.round(
    (50 * (safe + restored)) / Math.max(1, lab.files.length) +
      (30 * covered) / Math.max(1, lab.files.length) +
      (20 * online) / Math.max(1, lab.services.length),
  );
  const activeIncidents = lab.incidents.filter((i) => i.status !== 'RESOLVED').length;
  return {
    totalFiles: lab.files.length,
    safe,
    compromised,
    restored,
    machines: lab.machines.length,
    workstations: lab.machines.filter((m) => m.type === 'WORKSTATION').length,
    servers: lab.machines.filter((m) => m.type === 'SERVER').length,
    backups: lab.backups.length,
    validBackups: lab.backups.filter((b) => b.status !== 'CORRUPTED').length,
    incidents: lab.incidents.length,
    activeIncidents,
    score,
    coverage: Math.round((covered / Math.max(1, lab.files.length)) * 100),
    onlineServices: online,
    totalServices: lab.services.length,
    latestBackup: lab.backups[0]?.createdAt || null,
    systemStatus: compromised ? 'COMPROMISED' : activeIncidents ? 'RECOVERING' : 'PROTECTED',
  };
}
export function recordScore(lab) {
  lab.scoreHistory.push({ at: now(), score: metrics(lab).score });
  lab.scoreHistory = lab.scoreHistory.slice(-180);
}
export function createBackup(lab, actor, { name, fileIds }) {
  ensure(
    lab.backups.length < 30,
    'Limite du laboratoire : 30 sauvegardes. Supprimez une ancienne sauvegarde.',
  );
  let files = fileIds?.length
    ? lab.files.filter((f) => fileIds.includes(f.id))
    : lab.files.filter((f) => f.status !== 'COMPROMISED');
  ensure(files.length, 'Aucun fichier sain à sauvegarder.');
  ensure(!fileIds?.length || new Set(fileIds).size === files.length, 'Sélection de fichiers invalide.');
  ensure(
    files.every((f) => f.status !== 'COMPROMISED' && sha256(f.content) === f.hash),
    'Un fichier compromis ou altéré ne peut pas servir de sauvegarde fiable.',
  );
  const createdAt = now();
  const snapshots = files.map(({ id, name, machineId, content, hash, size }) => ({
    id,
    name,
    machineId,
    content,
    hash,
    size,
  }));
  const backup = {
    id: id('BKP'),
    name,
    createdAt,
    creatorId: String(actor._id),
    creator: actor.name,
    size: files.reduce((sum, f) => sum + f.size, 0),
    fileCount: files.length,
    status: 'VALID',
    hash: manifestHash(snapshots),
    files: snapshots,
    verifiedAt: createdAt,
  };
  lab.backups.unshift(backup);
  files.forEach((f) => {
    f.lastBackupAt = createdAt;
  });
  audit(lab, actor, 'BACKUP_CREATED', `${name} · ${files.length} fichiers · SHA-256 calculé`);
  recordScore(lab);
  return backup;
}
export function verifyBackup(lab, actor, backupId) {
  const backup = findById(lab.backups, backupId, 'Sauvegarde');
  const result = inspectBackup(backup);
  backup.status = result.valid ? (backup.status === 'RESTORED' ? 'RESTORED' : 'VALID') : 'CORRUPTED';
  backup.verifiedAt = now();
  audit(
    lab,
    actor,
    'INTEGRITY_CHECK',
    `${backup.name} · ${result.valid ? 'Integrity verified' : 'Integrity check failed'}`,
    result.valid ? 'SUCCESS' : 'ERROR',
  );
  recordScore(lab);
  return result;
}
export function deleteBackup(lab, actor, backupId) {
  const backup = findById(lab.backups, backupId, 'Sauvegarde');
  ensure(
    !lab.incidents.some((i) => i.backupId === backupId || i.verifiedBackupId === backupId),
    'Cette sauvegarde est référencée par un incident et doit être conservée.',
    409,
  );
  lab.backups = lab.backups.filter((b) => b.id !== backupId);
  audit(lab, actor, 'BACKUP_DELETED', backup.name, 'WARNING');
  recordScore(lab);
}
export function simulate(lab, actor, input) {
  ensure(
    !lab.incidents.some((i) => i.status !== 'RESOLVED'),
    'Terminez l’incident en cours avant de lancer un nouvel exercice.',
    409,
  );
  ensure(
    lab.incidents.length < 100,
    'Limite du laboratoire : 100 incidents. Archivez cette base et démarrez une nouvelle base de laboratoire.',
    409,
  );
  const { scenario, machineIds = [], serviceIds = [], fileCount } = input;
  machineIds.forEach((value) => findById(lab.machines, value, 'Machine'));
  serviceIds.forEach((value) => findById(lab.services, value, 'Service'));
  const targetMachines = new Set([
    ...machineIds,
    ...lab.services.filter((s) => serviceIds.includes(s.id)).flatMap((s) => s.machineIds),
  ]);
  const eligible = lab.files.filter(
    (f) => f.status !== 'COMPROMISED' && (!targetMachines.size || targetMachines.has(f.machineId)),
  );
  const rates = { LOW: [10, 20], MEDIUM: [30, 50], CRITICAL: [70, 90] };
  const rate = rates[scenario] ? randomInt(rates[scenario][0], rates[scenario][1] + 1) / 100 : null;
  const count = scenario === 'CUSTOM' ? fileCount : Math.max(1, Math.floor(eligible.length * rate));
  ensure(
    count >= 1 && count <= eligible.length,
    `Le périmètre contient ${eligible.length} fichiers disponibles. Réduisez le nombre ou élargissez la sélection.`,
  );
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  const affected = eligible.slice(0, count);
  const impactedMachines = [...new Set(affected.map((f) => f.machineId))];
  const impactedServices = lab.services.filter(
    (s) => serviceIds.includes(s.id) || s.machineIds.some((m) => impactedMachines.includes(m)),
  );
  const createdAt = now();
  const impact = Math.round((count / lab.files.length) * 100);
  const severity =
    scenario === 'CUSTOM'
      ? impact >= 70
        ? 'CRITICAL'
        : impact >= 50
          ? 'HIGH'
          : impact >= 30
            ? 'MEDIUM'
            : 'LOW'
      : scenario;
  const incident = {
    id: id('INC'),
    title:
      input.title ||
      `Exercice de résilience · ${severity === 'CRITICAL' ? 'critique' : severity === 'MEDIUM' ? 'modéré' : severity === 'HIGH' ? 'élevé' : 'faible'}`,
    createdAt,
    severity,
    status: 'DETECTED',
    scenario,
    origin: 'Changement d’état fictif · scénario pédagogique',
    fileIds: affected.map((f) => f.id),
    machineIds: impactedMachines,
    serviceIds: impactedServices.map((s) => s.id),
    restoredFileIds: [],
    launchedBy: actor.name,
    launchedById: String(actor._id),
    impact,
    scoreBefore: metrics(lab).score,
    integrity: 'PENDING',
    rtoMinutes: lab.settings.rtoMinutes,
    rpoMinutes: lab.settings.rpoMinutes,
    timeline: [
      {
        at: createdAt,
        action: 'DETECTED',
        actor: actor.name,
        detail: `${count} fichiers fictifs compromis sur ${impactedMachines.length} systèmes.`,
      },
    ],
    plan: PLAN.map(([key, label], index) => ({
      key,
      label,
      status: index === 0 ? 'COMPLETED' : index === 1 ? 'IN_PROGRESS' : 'PENDING',
      ...(index === 0 ? { completedAt: createdAt } : {}),
    })),
  };
  affected.forEach((f) => {
    f.status = 'COMPROMISED';
    f.compromisedAt = createdAt;
  });
  lab.machines
    .filter((m) => impactedMachines.includes(m.id))
    .forEach((m) => {
      m.status = 'COMPROMISED';
    });
  impactedServices.forEach((s) => {
    s.status = 'DEGRADED';
  });
  lab.incidents.unshift(incident);
  audit(
    lab,
    actor,
    'SIMULATION_LAUNCHED',
    `${incident.id} · ${count} fichiers compromis · impact ${impact} %`,
    'WARNING',
  );
  recordScore(lab);
  return incident;
}
function completeStep(incident, key) {
  const index = incident.plan.findIndex((s) => s.key === key);
  const step = incident.plan[index];
  ensure(step.status !== 'COMPLETED', 'Cette étape est déjà terminée.', 409);
  ensure(
    incident.plan.slice(0, index).every((s) => s.status === 'COMPLETED'),
    'Terminez les étapes précédentes avant de continuer.',
    409,
  );
  step.status = 'COMPLETED';
  step.completedAt = now();
  if (incident.plan[index + 1]) incident.plan[index + 1].status = 'IN_PROGRESS';
}
export function incidentAction(lab, actor, incidentId, action, input = {}) {
  const incident = findById(lab.incidents, incidentId, 'Incident');
  ensure(incident.status !== 'RESOLVED', 'Cet incident est clôturé.', 409);
  let result = {};
  let detail = '';
  if (action === 'isolate') {
    completeStep(incident, 'isolate');
    lab.machines
      .filter((m) => incident.machineIds.includes(m.id))
      .forEach((m) => {
        m.isolated = true;
        m.status = 'OFFLINE';
      });
    lab.services
      .filter((s) => incident.serviceIds.includes(s.id))
      .forEach((s) => {
        s.status = 'OFFLINE';
      });
    incident.status = 'CONTAINED';
    detail = 'Systèmes isolés et services suspendus dans le laboratoire.';
  } else if (action === 'analyze') {
    completeStep(incident, 'analyze');
    detail = `Périmètre analysé : ${incident.fileIds.length} fichiers, ${incident.machineIds.length} systèmes.`;
  } else if (action === 'select') {
    const backup = findById(lab.backups, input.backupId, 'Sauvegarde');
    ensure(
      backup.status !== 'CORRUPTED',
      'Cette sauvegarde est corrompue. Sélectionnez une sauvegarde fiable.',
    );
    ensure(
      incident.fileIds.every((fileId) => backup.files.some((f) => f.id === fileId)),
      'Sélectionnez une sauvegarde couvrant tous les fichiers de l’incident.',
    );
    const step = incident.plan.find((s) => s.key === 'select');
    if (step.status === 'COMPLETED') {
      ensure(
        !incident.restoredFileIds.length,
        'La sauvegarde ne peut plus être modifiée après une restauration.',
        409,
      );
      const verify = incident.plan.find((s) => s.key === 'verify');
      verify.status = 'IN_PROGRESS';
      verify.completedAt = undefined;
      incident.plan.find((s) => s.key === 'restore').status = 'PENDING';
    } else completeStep(incident, 'select');
    incident.backupId = backup.id;
    incident.verifiedBackupId = undefined;
    incident.integrity = 'PENDING';
    incident.recoveryPointAt = backup.createdAt;
    incident.actualRpoMinutes = Math.max(
      0,
      Math.round((new Date(incident.createdAt) - new Date(backup.createdAt)) / 60000),
    );
    detail = `Sauvegarde sélectionnée : ${backup.name}.`;
  } else if (action === 'verify') {
    ensure(
      incident.plan.find((s) => s.key === 'select').status === 'COMPLETED',
      'Sélectionnez d’abord une sauvegarde.',
      409,
    );
    result = verifyBackup(lab, actor, incident.backupId);
    incident.integrity = result.valid ? 'VERIFIED' : 'FAILED';
    if (result.valid) {
      if (incident.plan.find((s) => s.key === 'verify').status !== 'COMPLETED')
        completeStep(incident, 'verify');
      incident.verifiedBackupId = incident.backupId;
    } else {
      incident.verifiedBackupId = undefined;
    }
    detail = result.valid
      ? 'Integrity verified · contenu et manifeste SHA-256 conformes.'
      : 'Integrity check failed · restauration bloquée.';
  } else if (action === 'restore') {
    ensure(
      incident.plan.find((s) => s.key === 'verify').status === 'COMPLETED' &&
        incident.verifiedBackupId === incident.backupId,
      'Vérifiez la sauvegarde avant de restaurer.',
      409,
    );
    const backup = findById(lab.backups, incident.backupId, 'Sauvegarde');
    ensure(
      inspectBackup(backup).valid,
      'Integrity check failed : la sauvegarde a été altérée. Restauration annulée.',
      409,
    );
    const fileIds = [...new Set(input.fileIds || [])];
    ensure(fileIds.length > 0, 'Sélectionnez au moins un fichier.');
    ensure(
      fileIds.every(
        (fileId) => incident.fileIds.includes(fileId) && !incident.restoredFileIds.includes(fileId),
      ),
      'Sélection invalide : fichiers extérieurs à l’incident ou déjà restaurés.',
    );
    ensure(
      fileIds.every((fileId) => backup.files.some((f) => f.id === fileId)),
      'La sauvegarde ne contient pas tous les fichiers sélectionnés.',
    );
    ensure(
      incident.machineIds.every((machineId) => findById(lab.machines, machineId, 'Machine').isolated),
      'L’isolation des systèmes est obligatoire.',
      409,
    );
    for (const fileId of fileIds) {
      const snapshot = findById(backup.files, fileId, 'Fichier sauvegardé');
      const file = findById(lab.files, fileId, 'Fichier');
      file.content = snapshot.content;
      file.hash = sha256(snapshot.content);
      file.status = 'RESTORED';
      file.restoredAt = now();
      incident.restoredFileIds.push(fileId);
    }
    incident.status = 'RECOVERY';
    backup.status = 'RESTORED';
    lab.machines
      .filter((m) => incident.machineIds.includes(m.id))
      .forEach((m) => {
        m.status = 'RECOVERING';
      });
    if (incident.restoredFileIds.length === incident.fileIds.length) completeStep(incident, 'restore');
    detail = `${fileIds.length} fichiers restaurés · ${incident.restoredFileIds.length}/${incident.fileIds.length} au total.`;
  } else if (action === 'test') {
    ensure(
      incident.restoredFileIds.length === incident.fileIds.length,
      'Restaurez tous les fichiers avant le contrôle final.',
      409,
    );
    const backup = findById(lab.backups, incident.backupId, 'Sauvegarde');
    ensure(inspectBackup(backup).valid, 'La sauvegarde de référence a été altérée.', 409);
    ensure(
      incident.fileIds.every((fileId) => {
        const file = findById(lab.files, fileId, 'Fichier');
        const snapshot = findById(backup.files, fileId, 'Fichier sauvegardé');
        return (
          sha256(file.content) === snapshot.hash && file.hash === snapshot.hash && file.status === 'RESTORED'
        );
      }),
      'Integrity check failed : les fichiers restaurés ne correspondent pas à la sauvegarde.',
      409,
    );
    completeStep(incident, 'test');
    incident.integrity = 'VERIFIED';
    detail = 'Contrôle post-restauration réussi pour tous les fichiers.';
  } else if (action === 'reactivate') {
    completeStep(incident, 'reactivate');
    lab.machines
      .filter((m) => incident.machineIds.includes(m.id))
      .forEach((m) => {
        m.status = 'ONLINE';
        m.isolated = false;
      });
    lab.services
      .filter((s) => incident.serviceIds.includes(s.id))
      .forEach((s) => {
        s.status = 'ONLINE';
      });
    detail = 'Systèmes reconnectés et services réactivés.';
  } else if (action === 'close') {
    completeStep(incident, 'close');
    incident.status = 'RESOLVED';
    incident.resolvedAt = now();
    incident.durationSeconds = Math.max(
      1,
      Math.round((Date.now() - new Date(incident.createdAt).getTime()) / 1000),
    );
    incident.scoreAfter = metrics(lab).score;
    detail = 'Incident clôturé. Rapport de résilience disponible.';
  } else throw new AppError(400, 'Action inconnue.');
  incident.timeline.push({ at: now(), action: action.toUpperCase(), actor: actor.name, detail });
  audit(
    lab,
    actor,
    `INCIDENT_${action.toUpperCase()}`,
    `${incident.id} · ${detail}`,
    action === 'close' ? 'SUCCESS' : 'INFO',
  );
  recordScore(lab);
  return { incident, ...result };
}
