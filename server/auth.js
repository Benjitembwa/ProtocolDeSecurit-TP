import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { User, Session } from './models.js';
import { config, production } from './config.js';
import { AppError, sha256 } from './domain.js';

export const publicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active,
  createdAt: user.createdAt,
});
export const csrfFor = (tokenId) =>
  createHmac('sha256', config.jwtSecret).update(`csrf:${tokenId}`).digest('hex');
const cookieOptions = { httpOnly: true, secure: production, sameSite: 'strict', path: '/' };
// Constant-cost comparison also runs for unknown accounts to reduce enumeration signals.
const dummyHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
export async function login(req, res, { email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const correct = await bcrypt.compare(password, user?.passwordHash || dummyHash);
  if (!user || !user.active || !correct) throw new AppError(401, 'Adresse e-mail ou mot de passe incorrect.');
  // A new login revokes the previous cookie session, if any.
  try {
    const previous = jwt.verify(req.cookies[config.cookieName], config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'sentinel',
      audience: 'sentinel-web',
    });
    await Session.deleteOne({ tokenId: previous.jti });
  } catch {
    /* no valid previous session */
  }
  const tokenId = randomBytes(32).toString('hex');
  const csrfToken = csrfFor(tokenId);
  await Session.create({
    tokenId,
    userId: user._id,
    csrfHash: sha256(csrfToken),
    expiresAt: new Date(Date.now() + config.sessionSeconds * 1000),
  });
  const token = jwt.sign({}, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.sessionSeconds,
    subject: String(user._id),
    jwtid: tokenId,
    issuer: 'sentinel',
    audience: 'sentinel-web',
  });
  res.cookie(config.cookieName, token, { ...cookieOptions, maxAge: config.sessionSeconds * 1000 });
  return { user: publicUser(user), csrfToken };
}
export async function authenticate(req, res, next) {
  try {
    const payload = jwt.verify(req.cookies[config.cookieName], config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: 'sentinel',
      audience: 'sentinel-web',
    });
    const [session, user] = await Promise.all([
      Session.findOne({ tokenId: payload.jti, userId: payload.sub, expiresAt: { $gt: new Date() } }),
      User.findById(payload.sub),
    ]);
    if (!session || !user?.active) throw new Error('Session invalid');
    req.user = user;
    req.session = session;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const supplied = sha256(req.get('X-CSRF-Token') || '');
      if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(session.csrfHash)))
        return next(new AppError(403, 'Jeton de sécurité invalide. Rechargez la page.'));
    }
    next();
  } catch {
    next(new AppError(401, 'Votre session a expiré. Reconnectez-vous.'));
  }
}
export const authorize =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : next(new AppError(403, 'Votre rôle ne permet pas cette action.'));
export async function logout(req, res) {
  await Session.deleteOne({ _id: req.session._id });
  res.clearCookie(config.cookieName, cookieOptions).status(204).end();
}
