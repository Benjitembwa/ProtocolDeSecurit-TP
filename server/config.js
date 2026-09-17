import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';

if (process.env.NODE_ENV !== 'test') dotenv.config({ quiet: true });

export const production = process.env.NODE_ENV === 'production';
if (production && (!process.env.MONGODB_URI || (process.env.JWT_SECRET?.length ?? 0) < 48)) {
  throw new Error('Production : MONGODB_URI et JWT_SECRET (48 caractères minimum) sont obligatoires.');
}
export const config = {
  port: Number(process.env.PORT || 4000),
  origin: process.env.CLIENT_ORIGIN || (production ? '' : 'http://127.0.0.1:5173'),
  jwtSecret: process.env.JWT_SECRET || randomBytes(48).toString('hex'),
  cookieName: production ? '__Host-sentinel' : 'sentinel',
  sessionSeconds: 8 * 60 * 60,
};
if (production && !config.origin.startsWith('https://'))
  throw new Error('CLIENT_ORIGIN doit utiliser HTTPS en production.');
