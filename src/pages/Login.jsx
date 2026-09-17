import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  FlaskConical,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../state';
import { api, errorMessage } from '../api';
import { Button } from '../components/ui';

const schema = z.object({
  email: z.string().email('Saisissez une adresse e-mail valide.'),
  password: z.string().min(1, 'Saisissez votre mot de passe.'),
});
export default function Login() {
  const { login, connectionError, restore } = useAuth();
  const [demo, setDemo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  useEffect(() => {
    api
      .get('/meta')
      .then(({ data }) => setDemo(data.demo))
      .catch(() => {});
  }, []);
  return (
    <div className="login-page">
      <div className="login-story">
        <div className="brand">
          <span className="brand-mark">
            <ShieldCheck size={27} />
          </span>
          <span>
            sentinel<span className="brand-dot">.</span>
            <small>RESILIENCE LAB</small>
          </span>
        </div>
        <div className="login-story-content">
          <div className="eyebrow">
            <span className="tiny-dot" /> ANTICIPER. PROTÉGER. REBONDIR.
          </div>
          <h1>
            La résilience
            <br />
            se construit.
            <br />
            <span>Avant l’incident.</span>
          </h1>
          <p>
            Votre laboratoire pour comprendre les rançongiciels, éprouver vos défenses et maîtriser la reprise
            d’activité.
          </p>
          <div className="orbital">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="orbital-center">
              <ShieldCheck size={69} strokeWidth={1.1} />
            </div>
            <div className="orbit-node node-one">
              <LockKeyhole size={21} />
            </div>
            <div className="orbit-node node-two">
              <Fingerprint size={23} />
            </div>
            <div className="orbit-node node-three">
              <Activity size={22} />
            </div>
            <div className="orbit-label">
              <span className="tiny-dot" /> ENVIRONNEMENT PROTÉGÉ
            </div>
          </div>
        </div>
        <div className="login-story-footer">
          <FlaskConical size={16} /> Simulation fictive. Apprentissage réel.
        </div>
      </div>
      <div className="login-form-side">
        <div className="login-top-tag">
          <span className="tiny-dot" /> PLATEFORME PÉDAGOGIQUE
        </div>
        <motion.div className="login-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <div className="login-lock">
            <LockKeyhole size={23} />
          </div>
          <h2>Bienvenue dans Sentinel</h2>
          <p>Connectez-vous à votre espace de sécurité.</p>
          {connectionError && (
            <div className="form-error" role="alert">
              {connectionError}
              <button className="text-btn" onClick={restore}>
                Réessayer la connexion
              </button>
            </div>
          )}
          <form
            onSubmit={handleSubmit(async (values) => {
              setError('');
              try {
                await login(values);
              } catch (e) {
                setError(errorMessage(e));
              }
            })}
          >
            <label>
              Adresse e-mail
              <input
                type="email"
                placeholder="vous@organisation.fr"
                autoComplete="username"
                {...register('email')}
              />
            </label>
            {errors.email && <p className="field-error">{errors.email.message}</p>}
            <label>
              Mot de passe
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
                  autoComplete="current-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {errors.password && <p className="field-error">{errors.password.message}</p>}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <Button type="submit" variant="primary" busy={isSubmitting} className="login-submit">
              Se connecter <ArrowRight size={17} />
            </Button>
          </form>
          {demo && (
            <div className="demo-login">
              <div className="divider-label">
                <span>EXPLORER LE LABORATOIRE</span>
              </div>
              <div className="demo-roles">
                {[
                  ['admin', 'Administrateur'],
                  ['analyst', 'Analyste'],
                  ['user', 'Utilisateur'],
                ].map(([role, label]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setValue('email', `${role}@sentinel.lab`);
                      setValue('password', 'Sentinel!2026');
                      setError('');
                    }}
                  >
                    {label}
                    <ArrowRight size={13} />
                  </button>
                ))}
              </div>
              <p>
                Comptes de démonstration · Mot de passe : <code>Sentinel!2026</code>
              </p>
            </div>
          )}
          <div className="login-security">
            <ShieldCheck size={14} /> Session protégée · Accès selon votre rôle
          </div>
        </motion.div>
        <div className="login-footer">
          Master Réseau & Sécurité Informatique<span>Sentinel © {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
