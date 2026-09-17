import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Activity,
  Check,
  CircleHelp,
  Clock3,
  Database,
  Download,
  Eye,
  File,
  FileText,
  HardDriveDownload,
  KeyRound,
  LockKeyhole,
  Monitor,
  Network,
  Pencil,
  Plus,
  Save,
  Search,
  Server,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, errorMessage } from '../api';
import { useAuth, useLab } from '../state';
import {
  Badge,
  Button,
  bytes,
  DataTable,
  dateTime,
  Empty,
  Hash,
  labels,
  Modal,
  PageHeader,
  Panel,
  StatCard,
} from '../components/ui';

export function Infrastructure() {
  const { data } = useLab();
  const { user } = useAuth();
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const machine = data.machines.find((m) => m.id === selected);
  return (
    <>
      <PageHeader
        eyebrow="CARTOGRAPHIE DU LABORATOIRE"
        title="Infrastructure"
        description={
          user.role === 'USER'
            ? 'Les systèmes associés aux ressources qui vous sont autorisées.'
            : 'Connaissez votre surface de simulation. Surveillez chaque système.'
        }
      />
      <div className="stat-grid three">
        <StatCard
          label="Postes de travail visibles"
          value={data.machines.filter((m) => m.type === 'WORKSTATION').length}
          icon={Monitor}
          tone="blue"
          detail="Environnement Windows Enterprise fictif"
        />
        <StatCard
          label="Serveurs visibles"
          value={data.machines.filter((m) => m.type === 'SERVER').length}
          icon={Server}
          tone="purple"
          detail="Services métiers et protection des données"
        />
        <StatCard
          label="Systèmes isolés"
          value={data.machines.filter((m) => m.isolated).length}
          icon={LockKeyhole}
          tone="orange"
          detail="Confinement appliqué dans le laboratoire"
        />
      </div>
      <Panel
        title="Inventaire des systèmes"
        subtitle="Adresses de documentation · Aucun accès réseau réel aux machines."
      >
        <div className="tabs padded-inline">
          {[
            ['ALL', 'Tous les systèmes'],
            ['WORKSTATION', 'Postes de travail'],
            ['SERVER', 'Serveurs'],
          ].map(([value, text]) => (
            <button key={value} className={type === value ? 'active' : ''} onClick={() => setType(value)}>
              {text}
            </button>
          ))}
        </div>
        <DataTable
          rows={data.machines.filter(
            (m) => (type === 'ALL' || m.type === type) && (status === 'ALL' || m.status === status),
          )}
          searchKeys={['hostname', 'ip', 'os']}
          searchPlaceholder="Rechercher un système ou une IP…"
          toolbar={
            <select
              aria-label="Filtrer l’état des systèmes"
              className="select-compact"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">Tous les états</option>
              {['ONLINE', 'OFFLINE', 'COMPROMISED', 'RECOVERING'].map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          }
          columns={[
            {
              key: 'hostname',
              label: 'SYSTÈME',
              sortable: true,
              render: (m) => (
                <div className="table-title">
                  <span className="table-icon">
                    {m.type === 'SERVER' ? <Server size={18} /> : <Monitor size={18} />}
                  </span>
                  <div>
                    <button className="table-link" onClick={() => setSelected(m.id)}>
                      {m.hostname}
                    </button>
                    <small>
                      {m.ip} {m.isolated && '· ISOLÉ'}
                    </small>
                  </div>
                </div>
              ),
            },
            { key: 'os', label: 'SYSTÈME D’EXPLOITATION' },
            { key: 'status', label: 'ÉTAT', render: (m) => <Badge value={m.status} /> },
            { key: 'criticality', label: 'CRITICITÉ', render: (m) => <Badge value={m.criticality} /> },
            { key: 'fileCount', label: 'FICHIERS', sortable: true },
            { key: 'lastBackupAt', label: 'DERNIÈRE SAUVEGARDE', render: (m) => dateTime(m.lastBackupAt) },
            {
              key: 'actions',
              label: '',
              render: (m) => (
                <button
                  className="icon-btn"
                  aria-label={`Détails de ${m.hostname}`}
                  onClick={() => setSelected(m.id)}
                >
                  <Eye size={16} />
                </button>
              ),
            },
          ]}
        />
      </Panel>
      <Panel title="Services de l’organisation">
        <div className="service-cards">
          {data.services.map((s) => (
            <div key={s.id} className="service-card">
              <Database size={23} />
              <Badge value={s.status} />
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <span>
                {s.machineIds
                  .map((id) => data.machines.find((m) => m.id === id)?.hostname)
                  .filter(Boolean)
                  .join(', ') || 'Infrastructure supervisée'}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <Modal
        open={!!machine}
        onClose={() => setSelected(null)}
        title={machine?.hostname}
        description={machine && `${machine.ip} · ${machine.os}`}
        wide
      >
        {machine && (
          <>
            <div className="detail-meta">
              <Badge value={machine.status} />
              <Badge value={machine.criticality} />
              {machine.isolated && <span className="orange-text">Système isolé</span>}
            </div>
            <DataTable
              rows={data.files.filter((f) => f.machineId === machine.id)}
              searchKeys={['name']}
              columns={[
                { key: 'name', label: 'FICHIER' },
                { key: 'owner', label: 'PROPRIÉTAIRE' },
                { key: 'size', label: 'TAILLE', render: (f) => bytes(f.size) },
                { key: 'status', label: 'ÉTAT', render: (f) => <Badge value={f.status} /> },
                { key: 'hash', label: 'SHA-256', render: (f) => <Hash value={f.hash} /> },
              ]}
            />
          </>
        )}
      </Modal>
    </>
  );
}
export function Files() {
  const { data } = useLab();
  const { user } = useAuth();
  const [status, setStatus] = useState('ALL');
  const [machine, setMachine] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const rows = data.files.map((f) => ({
    ...f,
    hostname: data.machines.find((m) => m.id === f.machineId)?.hostname || f.machineId,
  }));
  const file = rows.find((f) => f.id === selected);
  return (
    <>
      <PageHeader
        eyebrow="PATRIMOINE NUMÉRIQUE FICTIF"
        title="Fichiers simulés"
        description={
          user.role === 'USER'
            ? 'Consultez uniquement les fichiers qui vous sont attribués.'
            : 'Des documents fictifs, une traçabilité réelle de leur état et de leur intégrité.'
        }
      />
      <div className="file-stats-strip">
        {[
          ['ALL', 'Tous les fichiers'],
          ['SAFE', 'Sains'],
          ['COMPROMISED', 'Compromis'],
          ['RESTORED', 'Restaurés'],
        ].map(([value, label]) => (
          <button key={value} onClick={() => setStatus(value)} className={status === value ? 'active' : ''}>
            <span className={`file-stat-dot ${value.toLowerCase()}`} />
            <span>{label}</span>
            <strong>
              {value === 'ALL' ? data.files.length : data.files.filter((f) => f.status === value).length}
            </strong>
          </button>
        ))}
      </div>
      <Panel>
        <DataTable
          rows={rows.filter(
            (f) =>
              (status === 'ALL' || f.status === status) && (machine === 'ALL' || f.machineId === machine),
          )}
          searchKeys={['name', 'id', 'owner', 'hostname', 'hash']}
          searchPlaceholder="Nom, propriétaire, système, SHA-256…"
          toolbar={
            <select
              className="select-compact"
              aria-label="Filtrer les fichiers par système"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
            >
              <option value="ALL">Tous les systèmes</option>
              {data.machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.hostname}
                </option>
              ))}
            </select>
          }
          columns={[
            {
              key: 'name',
              label: 'FICHIER',
              sortable: true,
              render: (f) => (
                <div className="table-title">
                  <span className={`file-type-icon ext-${f.name.split('.').at(-1)}`}>
                    <FileText size={17} />
                  </span>
                  <div>
                    <button className="table-link" onClick={() => setSelected(f.id)}>
                      {f.name}
                    </button>
                    <small>{f.id}</small>
                  </div>
                </div>
              ),
            },
            { key: 'hostname', label: 'SYSTÈME', sortable: true },
            { key: 'owner', label: 'PROPRIÉTAIRE', sortable: true },
            { key: 'size', label: 'TAILLE', sortable: true, render: (f) => bytes(f.size) },
            { key: 'status', label: 'ÉTAT', render: (f) => <Badge value={f.status} /> },
            { key: 'hash', label: 'SHA-256', render: (f) => <Hash value={f.hash} /> },
            { key: 'lastBackupAt', label: 'SAUVEGARDE', render: (f) => dateTime(f.lastBackupAt) },
          ]}
        />
      </Panel>
      <Modal open={!!file} onClose={() => setSelected(null)} title={file?.name} description={file?.id}>
        {file && (
          <>
            <div className="detail-meta">
              <Badge value={file.status} />
              <span>{bytes(file.size)} simulés</span>
            </div>
            <dl className="resource-details">
              <div>
                <dt>Système</dt>
                <dd>{file.hostname}</dd>
              </div>
              <div>
                <dt>Propriétaire</dt>
                <dd>{file.owner}</dd>
              </div>
              <div>
                <dt>Dernière sauvegarde</dt>
                <dd>{dateTime(file.lastBackupAt)}</dd>
              </div>
              <div>
                <dt>Compromission</dt>
                <dd>{dateTime(file.compromisedAt)}</dd>
              </div>
              <div>
                <dt>Restauration</dt>
                <dd>{dateTime(file.restoredAt)}</dd>
              </div>
            </dl>
            <label>
              SHA-256 du contenu fictif
              <Hash value={file.hash} full />
            </label>
            {user.role === 'ADMIN' && <OwnershipEditor key={file.id} file={file} />}
            <p className="field-hint">
              Le contenu fictif est conservé côté serveur et n’est jamais interprété comme un fichier
              exécutable.
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
function OwnershipEditor({ file }) {
  const { mutate, pending } = useLab();
  const [users, setUsers] = useState([]);
  const [ownerId, setOwnerId] = useState(file.ownerId);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .get('/users')
      .then(({ data }) => setUsers(data.filter((u) => u.active)))
      .catch((e) => setError(errorMessage(e)));
  }, []);
  return (
    <div className="ownership-editor">
      <label>
        Attribuer cette ressource à
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="" disabled>
            Sélectionner un propriétaire
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {u.email}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="field-error">{error}</p>}
      <Button
        icon={UserCheck}
        busy={pending}
        disabled={!ownerId || ownerId === file.ownerId}
        onClick={() =>
          mutate(
            `/files/${file.id}/owner`,
            { ownerId },
            'patch',
            'Ressource attribuée. Les droits de consultation sont mis à jour.',
          )
        }
      >
        Enregistrer le propriétaire
      </Button>
    </div>
  );
}
export function Logs() {
  const { data } = useLab();
  const [level, setLevel] = useState('ALL');
  const rows = data.logs.filter((l) => level === 'ALL' || l.level === level);
  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <PageHeader
        eyebrow="TRAÇABILITÉ & SUPERVISION"
        title="Journaux d’audit"
        description="Chaque action a un auteur, un instant et une conséquence documentée."
      >
        <Button icon={Download} onClick={exportLogs}>
          Exporter les journaux filtrés
        </Button>
      </PageHeader>
      <div className="info-box">
        <LockKeyhole size={21} />
        <p>
          Les 2 000 derniers événements sont conservés. Ce registre est consultable par l’administrateur ;
          aucune route ne permet de modifier ou supprimer un événement individuel.
        </p>
      </div>
      <Panel title="Événements du laboratoire" subtitle={`${data.logs.length} événements conservés`}>
        <DataTable
          rows={rows}
          pageSize={12}
          searchKeys={['action', 'detail', 'actor', 'id']}
          searchPlaceholder="Rechercher une action, un utilisateur…"
          toolbar={
            <select
              aria-label="Filtrer le niveau des journaux"
              className="select-compact"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="ALL">Tous les niveaux</option>
              {['INFO', 'SUCCESS', 'WARNING', 'ERROR'].map((l) => (
                <option key={l} value={l}>
                  {labels[l]}
                </option>
              ))}
            </select>
          }
          columns={[
            {
              key: 'at',
              label: 'HORODATAGE',
              sortable: true,
              render: (l) => <span className="mono">{dateTime(l.at)}</span>,
            },
            { key: 'level', label: 'NIVEAU', render: (l) => <Badge value={l.level} /> },
            { key: 'action', label: 'ACTION', render: (l) => <code className="event-code">{l.action}</code> },
            { key: 'actor', label: 'UTILISATEUR' },
            { key: 'detail', label: 'DÉTAIL', render: (l) => <span className="log-detail">{l.detail}</span> },
          ]}
        />
      </Panel>
    </>
  );
}
const userSchema = z.object({
  name: z.string().trim().min(2, 'Nom : 2 caractères minimum.').max(80),
  email: z.string().email('Adresse e-mail invalide.'),
  password: z.string().min(12, 'Mot de passe : 12 caractères minimum.').max(72),
  role: z.enum(['ADMIN', 'SECURITY_ANALYST', 'USER']),
});
export function UsersPage() {
  const { mutate, pending } = useLab();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [role, setRole] = useState('USER');
  const [active, setActive] = useState(true);
  const [name, setName] = useState('');
  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', password: '', role: 'USER' },
  });
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <PageHeader
        eyebrow="GESTION DES ACCÈS"
        title="Utilisateurs"
        description="La bonne personne, le bon niveau d’accès. Les autorisations sont contrôlées par le serveur."
      >
        <Button
          icon={Plus}
          variant="primary"
          onClick={() => {
            form.reset();
            setCreateOpen(true);
          }}
        >
          Ajouter un utilisateur
        </Button>
      </PageHeader>
      <div className="role-cards">
        {[
          [
            'ADMIN',
            'Pilote le laboratoire',
            'Simulations, sauvegardes, restauration, utilisateurs et audit.',
          ],
          [
            'SECURITY_ANALYST',
            'Analyse la résilience',
            'Incidents, ressources, vérifications SHA-256 et rapports.',
          ],
          ['USER', 'Consulte son périmètre', 'État général et fichiers explicitement attribués.'],
        ].map(([r, title, description]) => (
          <div className="role-card" key={r}>
            <Badge value={r} />
            <h3>{title}</h3>
            <p>{description}</p>
            <strong>{users.filter((u) => u.role === r && u.active).length} compte(s) actif(s)</strong>
          </div>
        ))}
      </div>
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <Button onClick={load}>Réessayer</Button>
        </div>
      )}
      <Panel title="Comptes du laboratoire">
        {loading ? (
          <div className="skeleton sk-chart" />
        ) : (
          <DataTable
            rows={users}
            searchKeys={['name', 'email', 'role']}
            columns={[
              {
                key: 'name',
                label: 'UTILISATEUR',
                sortable: true,
                render: (u) => (
                  <div className="table-title">
                    <span className="profile-avatar small-avatar">
                      {u.name
                        .split(' ')
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <div>
                      <strong>
                        {u.name} {u.id === user.id && <span className="muted">(vous)</span>}
                      </strong>
                      <small>{u.email}</small>
                    </div>
                  </div>
                ),
              },
              { key: 'role', label: 'RÔLE', render: (u) => <Badge value={u.role} /> },
              {
                key: 'active',
                label: 'ACCÈS',
                render: (u) => (
                  <Badge value={u.active ? 'ONLINE' : 'OFFLINE'}>{u.active ? 'Actif' : 'Désactivé'}</Badge>
                ),
              },
              { key: 'createdAt', label: 'CRÉATION', render: (u) => dateTime(u.createdAt) },
              {
                key: 'actions',
                label: '',
                render: (u) => (
                  <Button
                    icon={Pencil}
                    onClick={() => {
                      setEditing(u);
                      setRole(u.role);
                      setActive(u.active);
                      setName(u.name);
                    }}
                  >
                    Modifier
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Panel>
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Ajouter un utilisateur"
        description="Les nouveaux utilisateurs n’ont pas de fichiers attribués par défaut."
      >
        <form
          onSubmit={form.handleSubmit(async (values) => {
            const r = await mutate('/users', values, 'post', 'Utilisateur créé.');
            if (r) {
              setCreateOpen(false);
              await load();
            }
          })}
        >
          <label>
            Nom complet
            <input autoComplete="off" {...form.register('name')} />
          </label>
          <label>
            Adresse e-mail
            <input type="email" autoComplete="off" {...form.register('email')} />
          </label>
          <label>
            Mot de passe initial
            <input type="password" autoComplete="new-password" {...form.register('password')} />
            <span className="field-hint">12 caractères minimum, 72 octets maximum.</span>
          </label>
          <label>
            Rôle
            <select {...form.register('role')}>
              {['USER', 'SECURITY_ANALYST', 'ADMIN'].map((r) => (
                <option key={r} value={r}>
                  {labels[r]}
                </option>
              ))}
            </select>
          </label>
          {Object.values(form.formState.errors).map((e, i) => (
            <p className="field-error" key={i}>
              {e.message}
            </p>
          ))}
          <div className="modal-actions">
            <Button type="button" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" busy={pending}>
              Créer le compte
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Modifier les accès"
        description={editing?.email}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await mutate(
              `/users/${editing.id}`,
              { name, role, active },
              'patch',
              'Accès mis à jour. Sessions de cet utilisateur révoquées.',
            );
            if (r) {
              setEditing(null);
              await load();
            }
          }}
        >
          <label>
            Nom complet
            <input
              value={name}
              minLength={2}
              maxLength={80}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Rôle
            <select
              value={role}
              disabled={editing?.role === 'ADMIN'}
              onChange={(e) => setRole(e.target.value)}
            >
              {['USER', 'SECURITY_ANALYST', 'ADMIN'].map((r) => (
                <option key={r} value={r}>
                  {labels[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              disabled={editing?.role === 'ADMIN'}
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Compte actif
          </label>
          {editing?.role === 'ADMIN' && (
            <p className="field-hint">
              Les comptes administrateurs sont protégés contre la désactivation et la rétrogradation.
            </p>
          )}
          <div className="modal-actions">
            <Button type="button" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" busy={pending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
export function SettingsPage() {
  const { data, mutate, pending } = useLab();
  const { user, clear } = useAuth();
  const [rto, setRto] = useState(data.settings.rtoMinutes);
  const [rpo, setRpo] = useState(data.settings.rpoMinutes);
  const [passwordPending, setPasswordPending] = useState(false);
  const form = useForm({
    resolver: zodResolver(
      z
        .object({
          currentPassword: z.string().min(1, 'Saisissez votre mot de passe actuel.'),
          newPassword: z.string().min(12, '12 caractères minimum.').max(72),
          confirm: z.string(),
        })
        .refine((v) => v.newPassword === v.confirm, {
          message: 'Les mots de passe ne correspondent pas.',
          path: ['confirm'],
        }),
    ),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  return (
    <>
      <PageHeader
        eyebrow="PRÉFÉRENCES & SÉCURITÉ"
        title="Paramètres"
        description="Personnalisez vos objectifs de reprise et protégez votre accès."
      />
      <div className="settings-grid">
        <div>
          <Panel title="Votre profil" subtitle="Informations du compte connecté.">
            <div className="profile-card">
              <span className="profile-avatar large-avatar">
                {user.name
                  .split(' ')
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <div>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <Badge value={user.role} />
              </div>
            </div>
          </Panel>
          <Panel
            title="Objectifs de continuité"
            subtitle="Ces valeurs seront attachées aux prochains incidents."
          >
            <form
              className="padded"
              onSubmit={async (e) => {
                e.preventDefault();
                await mutate(
                  '/settings',
                  { rtoMinutes: Number(rto), rpoMinutes: Number(rpo) },
                  'patch',
                  'Objectifs de reprise enregistrés.',
                );
              }}
            >
              <label>
                RTO · Temps cible de reprise (minutes)
                <input
                  type="number"
                  min={1}
                  max={10080}
                  required
                  disabled={user.role !== 'ADMIN'}
                  value={rto}
                  onChange={(e) => setRto(e.target.value)}
                />
                <span className="field-hint">
                  Durée cible entre la détection et la clôture de l’incident.
                </span>
              </label>
              <label>
                RPO · Âge cible de sauvegarde (minutes)
                <input
                  type="number"
                  min={1}
                  max={43200}
                  required
                  disabled={user.role !== 'ADMIN'}
                  value={rpo}
                  onChange={(e) => setRpo(e.target.value)}
                />
                <span className="field-hint">
                  Une copie plus ancienne réduit la couverture du score de résilience.
                </span>
              </label>
              {user.role === 'ADMIN' && (
                <Button type="submit" variant="primary" icon={Save} busy={pending}>
                  Enregistrer les objectifs
                </Button>
              )}
            </form>
          </Panel>
        </div>
        <div>
          <Panel
            title="Changer le mot de passe"
            subtitle="Toutes vos sessions seront révoquées après le changement."
          >
            <form
              className="padded"
              onSubmit={form.handleSubmit(async (values) => {
                setPasswordPending(true);
                try {
                  await api.post('/auth/password', {
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                  });
                  toast.success('Mot de passe modifié. Reconnectez-vous.');
                  clear();
                } catch (e) {
                  toast.error(errorMessage(e));
                } finally {
                  setPasswordPending(false);
                }
              })}
            >
              <label>
                Mot de passe actuel
                <input
                  type="password"
                  autoComplete="current-password"
                  {...form.register('currentPassword')}
                />
              </label>
              <label>
                Nouveau mot de passe
                <input type="password" autoComplete="new-password" {...form.register('newPassword')} />
                <span className="field-hint">Au moins 12 caractères et au plus 72 octets.</span>
              </label>
              <label>
                Confirmer le nouveau mot de passe
                <input type="password" autoComplete="new-password" {...form.register('confirm')} />
              </label>
              {Object.values(form.formState.errors).map((e, i) => (
                <p className="field-error" key={i}>
                  {e.message}
                </p>
              ))}
              <Button type="submit" icon={KeyRound} busy={passwordPending}>
                Modifier le mot de passe
              </Button>
            </form>
          </Panel>
          <div className="info-box">
            <ShieldCheck size={22} />
            <p>
              <strong>Laboratoire pédagogique.</strong> L’application ne contacte aucune machine fictive, ne
              chiffre aucun fichier réel et ne déploie aucun agent. Les sauvegardes sont des instantanés de
              contenus générés dans MongoDB.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
