import mongoose from 'mongoose';

const { Schema } = mongoose;
const embedded = { _id: false, strict: 'throw' };
export const ROLES = ['ADMIN', 'SECURITY_ANALYST', 'USER'];
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, strict: 'throw' },
);
export const User = mongoose.model('User', userSchema);
const sessionSchema = new Schema(
  {
    tokenId: { type: String, unique: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    csrfHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Session = mongoose.model('Session', sessionSchema);
const fileSchema = new Schema(
  {
    id: String,
    name: String,
    content: String,
    hash: String,
    machineId: String,
    ownerId: String,
    owner: String,
    size: Number,
    status: { type: String, enum: ['SAFE', 'COMPROMISED', 'RESTORED'] },
    lastBackupAt: String,
    compromisedAt: String,
    restoredAt: String,
  },
  embedded,
);
const machineSchema = new Schema(
  {
    id: String,
    hostname: String,
    ip: String,
    type: { type: String, enum: ['WORKSTATION', 'SERVER'] },
    os: String,
    status: { type: String, enum: ['ONLINE', 'OFFLINE', 'COMPROMISED', 'RECOVERING'] },
    criticality: String,
    isolated: Boolean,
  },
  embedded,
);
const serviceSchema = new Schema(
  {
    id: String,
    name: String,
    description: String,
    machineIds: [String],
    status: String,
    criticality: String,
  },
  embedded,
);
const snapshotSchema = new Schema(
  { id: String, name: String, machineId: String, content: String, hash: String, size: Number },
  embedded,
);
const backupSchema = new Schema(
  {
    id: String,
    name: String,
    createdAt: String,
    creatorId: String,
    creator: String,
    size: Number,
    fileCount: Number,
    status: { type: String, enum: ['VALID', 'CORRUPTED', 'RESTORED'] },
    hash: String,
    files: [snapshotSchema],
    verifiedAt: String,
  },
  embedded,
);
const timelineSchema = new Schema({ at: String, action: String, actor: String, detail: String }, embedded);
const stepSchema = new Schema(
  {
    key: String,
    label: String,
    status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
    completedAt: String,
  },
  embedded,
);
const incidentSchema = new Schema(
  {
    id: String,
    title: String,
    createdAt: String,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    status: { type: String, enum: ['DETECTED', 'CONTAINED', 'RECOVERY', 'RESOLVED'] },
    scenario: String,
    origin: String,
    fileIds: [String],
    machineIds: [String],
    serviceIds: [String],
    restoredFileIds: [String],
    launchedBy: String,
    launchedById: String,
    impact: Number,
    scoreBefore: Number,
    scoreAfter: Number,
    backupId: String,
    verifiedBackupId: String,
    integrity: String,
    durationSeconds: Number,
    resolvedAt: String,
    rtoMinutes: Number,
    rpoMinutes: Number,
    actualRpoMinutes: Number,
    recoveryPointAt: String,
    timeline: [timelineSchema],
    plan: [stepSchema],
  },
  embedded,
);
const logSchema = new Schema(
  { id: String, at: String, level: String, action: String, actor: String, actorId: String, detail: String },
  embedded,
);
const labSchema = new Schema(
  {
    _id: { type: String, default: 'main' },
    name: String,
    files: [fileSchema],
    machines: [machineSchema],
    services: [serviceSchema],
    backups: [backupSchema],
    incidents: [incidentSchema],
    logs: [logSchema],
    scoreHistory: [new Schema({ at: String, score: Number }, embedded)],
    settings: new Schema({ rtoMinutes: Number, rpoMinutes: Number }, embedded),
  },
  { strict: 'throw', optimisticConcurrency: true, timestamps: true },
);
export const Lab = mongoose.model('Lab', labSchema);
