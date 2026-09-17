import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bell,
  BookOpen,
  Boxes,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  FileClock,
  FileText,
  FlaskConical,
  HardDriveDownload,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Network,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LabProvider, useAuth, useLab } from './state';
import { errorMessage } from './api';
import { Badge, Button, Empty, Loading, Modal, relativeTime } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Simulations from './pages/Simulations';
import { Incidents, Recovery, RecoveryPlan, Reports } from './pages/Incidents';
import { Backups, Integrity } from './pages/Backups';
import { Infrastructure, Files, Logs, UsersPage, SettingsPage } from './pages/Resources';

export const navigation = [
  { path: '/', label: 'Vue d’ensemble', icon: LayoutDashboard, group: 'ESPACE DE TRAVAIL' },
  { path: '/simulations', label: 'Simulations', icon: FlaskConical, security: true },
  { path: '/incidents', label: 'Centre des incidents', icon: Shield, security: true, count: true },
  { path: '/infrastructure', label: 'Infrastructure', icon: Network },
  { path: '/files', label: 'Fichiers simulés', icon: FileText },
  { path: '/backups', label: 'Sauvegardes', icon: HardDriveDownload, group: 'RÉSILIENCE', security: true },
  { path: '/integrity', label: 'Vérification d’intégrité', icon: FileCheck2, security: true },
  { path: '/recovery', label: 'Restauration', icon: Activity, security: true },
  { path: '/recovery-plan', label: 'Plan de reprise', icon: BookOpen, security: true },
  { path: '/reports', label: 'Rapports', icon: FileClock, security: true },
  { path: '/users', label: 'Utilisateurs', icon: Users, group: 'ADMINISTRATION', admin: true },
  { path: '/logs', label: 'Journaux d’audit', icon: Boxes, admin: true },
  { path: '/settings', label: 'Paramètres', icon: Settings },
];
function Guard({ children, admin = false }) {
  const { user } = useAuth();
  return (admin ? user.role === 'ADMIN' : user.role !== 'USER') ? children : <Navigate to="/" replace />;
}
function Workspace() {
  const { user, logout } = useAuth();
  const { data, error, refresh, refreshing } = useLab();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('sentinel:theme') || 'dark');
  const available = navigation.filter(
    (n) => (!n.admin || user.role === 'ADMIN') && (!n.security || user.role !== 'USER'),
  );
  const current = available.find((n) => n.path === location.pathname);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('sentinel:theme', theme);
  }, [theme]);
  useEffect(() => {
    setMobileOpen(false);
    setNotifications(false);
    window.scrollTo(0, 0);
    document.title = `${current?.label || 'Sentinel'} · Sentinel`;
  }, [location.pathname, current?.label]);
  useEffect(() => {
    const handle = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <Link to="/" className="brand">
          <span className="brand-mark">
            <ShieldCheck size={25} strokeWidth={1.8} />
          </span>
          <span>
            sentinel<span className="brand-dot">.</span>
            <small>RESILIENCE LAB</small>
          </span>
        </Link>
        <div className="org-switch">
          <div className="org-icon">N</div>
          <div>
            <strong>{data?.name || 'Nexus Industries'}</strong>
            <span>Organisation fictive</span>
          </div>
          <span className="tiny-dot" />
        </div>
        <nav aria-label="Navigation principale">
          {available.map((item) => (
            <div key={item.path}>
              {item.group && <div className="nav-group">{item.group}</div>}
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={18} strokeWidth={1.65} />
                <span>{item.label}</span>
                {item.count && data?.metrics.activeIncidents > 0 && (
                  <span className="nav-count">{data.metrics.activeIncidents}</span>
                )}
              </NavLink>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="lab-note" onClick={() => setHelp(true)}>
            <span className="lab-note-icon">
              <FlaskConical size={18} />
            </span>
            <strong>Un terrain d’exercice sûr</strong>
            <p>Apprenez. Simulez. Renforcez.</p>
            <span>
              Découvrir le laboratoire <ArrowRight size={13} />
            </span>
          </button>
          <div className="sidebar-foot">
            <span className="tiny-dot" />
            Environnement de simulation<span>v1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-toggle"
              aria-label="Ouvrir le menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-root">Espace de travail</span>
            <ChevronRight size={14} />
            <strong>{current?.label || 'Page introuvable'}</strong>
          </div>
          <div className="topbar-actions">
            <button className="global-search" onClick={() => setSearchOpen(true)}>
              <Search size={16} />
              <span>Rechercher…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-btn"
              title={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
              aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="notification-wrap">
              <button
                className="icon-btn"
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={18} />
                {data?.metrics.activeIncidents > 0 && <i className="notification-dot" />}
              </button>
              {notifications && (
                <div className="notification-menu">
                  <div className="panel-heading">
                    <h2>Notifications</h2>
                    <button
                      className="icon-btn small"
                      aria-label="Fermer les notifications"
                      onClick={() => setNotifications(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {data?.incidents
                    .filter((i) => i.status !== 'RESOLVED')
                    .map((i) => (
                      <Link key={i.id} to="/incidents" className="notification-item">
                        <Shield size={20} />
                        <div>
                          <strong>{i.title}</strong>
                          <p>
                            {relativeTime(i.createdAt)} · {i.fileIds.length} fichiers compromis
                          </p>
                        </div>
                        <Badge value={i.severity} />
                      </Link>
                    ))}
                  {!data?.metrics.activeIncidents && (
                    <Empty
                      title="Vous êtes à jour"
                      description="Aucun incident actif dans le laboratoire."
                      icon={ShieldCheck}
                    />
                  )}
                  {user.role === 'USER' && data?.metrics.activeIncidents > 0 && (
                    <p className="padded">Un exercice est en cours. Consultez l’état général.</p>
                  )}
                </div>
              )}
            </div>
            <Link className="profile-avatar" to="/settings" title={user.name}>
              {user.name
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')}
            </Link>
            <div className="topbar-profile">
              <strong>{user.name}</strong>
              <span>
                {user.role === 'ADMIN'
                  ? 'Administrateur'
                  : user.role === 'USER'
                    ? 'Utilisateur'
                    : 'Analyste sécurité'}
              </span>
            </div>
            <button
              className="icon-btn logout-btn"
              aria-label="Se déconnecter"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true);
                try {
                  await logout();
                } catch (e) {
                  toast.error(errorMessage(e));
                } finally {
                  setSigningOut(false);
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main id="main-content" className="page-content">
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <Button busy={refreshing} onClick={() => refresh().catch(() => {})}>
                Réessayer
              </Button>
            </div>
          )}
          {data ? (
            <Outlet />
          ) : error ? (
            <Empty
              title="Le laboratoire est temporairement indisponible"
              description="Vérifiez la connexion à l’API puis réessayez."
            />
          ) : (
            <Loading />
          )}
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={13} /> Sentinel · Conçu pour apprendre, prêt à simuler.
          </span>
          <span>
            <i className={`tiny-dot ${error ? 'red' : ''}`} />
            {error ? 'Connexion interrompue' : 'Données synchronisées'}
            <span className="footer-separator">/</span>100 % fictif
          </span>
        </footer>
      </div>
      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Rechercher dans Sentinel"
        description="Accédez rapidement aux modules du laboratoire."
      >
        <div className="search-field command-input">
          <Search size={19} />
          <input
            autoFocus
            placeholder="Simulation, sauvegardes, incidents…"
            aria-label="Rechercher une page"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="command-results">
          {available
            .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
            .map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSearchOpen(false);
                  setSearch('');
                }}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                <ArrowRight size={15} />
              </button>
            ))}
        </div>
      </Modal>
      <Modal
        open={help}
        onClose={() => setHelp(false)}
        title="Bienvenue dans le laboratoire"
        description="Un projet de Master en Réseau et Sécurité Informatique."
      >
        <div className="help-content">
          <p>
            Sentinel représente une organisation fictive : 12 systèmes, 144 documents et 4 services. Les
            adresses IP appartiennent au réseau de documentation 192.0.2.0/24.
          </p>
          <ol>
            <li>Créez une sauvegarde et vérifiez ses empreintes.</li>
            <li>Lancez un scénario faible, moyen, critique ou personnalisé.</li>
            <li>Contenez l’incident, analysez son impact et suivez l’assistant de reprise.</li>
            <li>Comparez les résultats aux objectifs RTO et RPO puis imprimez le rapport.</li>
          </ol>
          <div className="info-box">
            <ShieldCheck size={20} />
            <p>
              La simulation modifie uniquement des statuts en base de données. SHA-256 utilise réellement les
              contenus fictifs ; aucun fichier du système hôte n’est ciblé.
            </p>
          </div>
          <p className="muted">
            Le score pédagogique combine la santé des fichiers (50 %), la couverture par une sauvegarde
            vérifiée respectant le RPO (30 %) et la disponibilité des services (20 %).
          </p>
        </div>
      </Modal>
    </div>
  );
}
export default function App() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="boot-screen">
        <span className="brand-mark">
          <ShieldCheck size={30} />
        </span>
        <span>Connexion au laboratoire…</span>
        <div className="boot-progress" />
      </div>
    );
  if (!user) return <Login />;
  return (
    <LabProvider>
      <Routes>
        <Route element={<Workspace />}>
          <Route index element={<Dashboard />} />
          <Route
            path="simulations"
            element={
              <Guard>
                <Simulations />
              </Guard>
            }
          />
          <Route
            path="incidents"
            element={
              <Guard>
                <Incidents />
              </Guard>
            }
          />
          <Route path="infrastructure" element={<Infrastructure />} />
          <Route path="files" element={<Files />} />
          <Route
            path="backups"
            element={
              <Guard>
                <Backups />
              </Guard>
            }
          />
          <Route
            path="integrity"
            element={
              <Guard>
                <Integrity />
              </Guard>
            }
          />
          <Route
            path="recovery"
            element={
              <Guard>
                <Recovery />
              </Guard>
            }
          />
          <Route
            path="recovery-plan"
            element={
              <Guard>
                <RecoveryPlan />
              </Guard>
            }
          />
          <Route
            path="reports"
            element={
              <Guard>
                <Reports />
              </Guard>
            }
          />
          <Route
            path="logs"
            element={
              <Guard admin>
                <Logs />
              </Guard>
            }
          />
          <Route
            path="users"
            element={
              <Guard admin>
                <UsersPage />
              </Guard>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="login" element={<Navigate to="/" replace />} />
          <Route
            path="*"
            element={
              <Empty
                title="Cette page n’existe pas"
                description="Retrouvez les modules dans le menu du laboratoire."
              >
                <Link className="btn primary" to="/">
                  Retour au tableau de bord
                </Link>
              </Empty>
            }
          />
        </Route>
      </Routes>
    </LabProvider>
  );
}
