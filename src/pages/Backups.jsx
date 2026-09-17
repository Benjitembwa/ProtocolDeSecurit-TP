import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle2,
  Database,
  Eye,
  FileCheck2,
  Fingerprint,
  HardDriveDownload,
  Plus,
  SearchCheck,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useAuth, useLab } from '../state';
import {
  Badge,
  Button,
  bytes,
  DataTable,
  dateTime,
  Empty,
  Hash,
  Modal,
  PageHeader,
  Panel,
  StatCard,
} from '../components/ui';

function IntegrityResult({ result }) {
  return (
    <>
      <div className={`integrity-result ${result.valid ? 'valid' : 'invalid'}`}>
        {result.valid ? <ShieldCheck size={29} /> : <TriangleAlert size={29} />}
        <div>
          <h3>{result.valid ? 'Integrity verified' : 'Integrity check failed'}</h3>
          <p>
            {result.valid
              ? 'Les empreintes recalculées correspondent aux empreintes de référence.'
              : 'Une différence a été détectée. Cette sauvegarde ne peut pas être restaurée.'}
          </p>
        </div>
      </div>
      {result.expectedHash && (
        <div className="manifest-hashes">
          <label>
            SHA-256 du manifeste · référence
            <Hash value={result.expectedHash} full />
          </label>
          <label>
            SHA-256 du manifeste · recalculé
            <Hash value={result.actualHash} full />
          </label>
        </div>
      )}
      <DataTable
        rows={result.files}
        searchKeys={['name', 'id']}
        searchPlaceholder="Rechercher un fichier vérifié…"
        columns={[
          {
            key: 'name',
            label: 'FICHIER',
            render: (f) => (
              <div className="table-title">
                <FileCheck2 size={16} />
                <div>
                  <strong>{f.name}</strong>
                  <small>{f.id}</small>
                </div>
              </div>
            ),
          },
          {
            key: 'expectedHash',
            label: 'EMPREINTE ATTENDUE',
            render: (f) => <Hash value={f.expectedHash} />,
          },
          { key: 'actualHash', label: 'EMPREINTE CALCULÉE', render: (f) => <Hash value={f.actualHash} /> },
          {
            key: 'valid',
            label: 'RÉSULTAT',
            render: (f) => <Badge value={f.valid ? 'VERIFIED' : 'FAILED'} />,
          },
        ]}
      />
    </>
  );
}
export function Backups() {
  const { data, mutate, pending } = useLab();
  const { user } = useAuth();
  const admin = user.role === 'ADMIN';
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [result, setResult] = useState(null);
  const [scope, setScope] = useState('all');
  const [fileIds, setFileIds] = useState([]);
  const form = useForm({
    resolver: zodResolver(z.object({ name: z.string().trim().min(3, '3 caractères minimum.').max(100) })),
    defaultValues: { name: '' },
  });
  const chart = ['VALID', 'CORRUPTED', 'RESTORED'].map((status) => ({
    name: status === 'VALID' ? 'Valides' : status === 'CORRUPTED' ? 'Corrompues' : 'Restaurées',
    count: data.backups.filter((b) => b.status === status).length,
  }));
  return (
    <>
      <PageHeader
        eyebrow="PROTECTION DES DONNÉES"
        title="Sauvegardes"
        description="Votre point de retour fiable. Créez, vérifiez et protégez vos copies."
      >
        {admin && (
          <Button
            icon={Plus}
            variant="primary"
            onClick={() => {
              form.reset({ name: `Sauvegarde complète · ${new Date().toLocaleDateString('fr-FR')}` });
              setScope('all');
              setFileIds([]);
              setCreateOpen(true);
            }}
          >
            Créer une sauvegarde
          </Button>
        )}
      </PageHeader>
      <div className="backup-overview">
        <StatCard
          label="Sauvegardes conservées"
          value={data.backups.length}
          icon={HardDriveDownload}
          detail="30 sauvegardes maximum par laboratoire"
        />
        <StatCard
          label="Volume simulé total"
          value={bytes(data.backups.reduce((sum, b) => sum + b.size, 0))}
          icon={Database}
          tone="blue"
          detail="Tailles pédagogiques, contenus stockés dans MongoDB"
        />
        <Panel title="État des sauvegardes" className="backup-chart">
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={chart}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
              />
              <Tooltip
                cursor={false}
                contentStyle={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="count" name="Sauvegardes" radius={[4, 4, 0, 0]} maxBarSize={35}>
                {chart.map((entry, index) => (
                  <Cell key={entry.name} fill={['#a8e989', '#f1807b', '#85a5f8'][index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <Panel
        title="Bibliothèque de sauvegardes"
        subtitle="Les copies sont indépendantes des fichiers actifs du laboratoire."
      >
        <DataTable
          rows={data.backups}
          searchKeys={['name', 'id', 'creator']}
          searchPlaceholder="Rechercher une sauvegarde…"
          columns={[
            {
              key: 'name',
              label: 'SAUVEGARDE',
              sortable: true,
              render: (b) => (
                <div className="table-title">
                  <span className="table-icon">
                    <HardDriveDownload size={18} />
                  </span>
                  <div>
                    <strong>{b.name}</strong>
                    <small>{b.id}</small>
                  </div>
                </div>
              ),
            },
            {
              key: 'createdAt',
              label: 'CRÉATION',
              sortable: true,
              render: (b) => (
                <div className="cell-stack">
                  {dateTime(b.createdAt)}
                  <small>{b.creator}</small>
                </div>
              ),
            },
            { key: 'fileCount', label: 'FICHIERS', sortable: true },
            { key: 'size', label: 'VOLUME', render: (b) => bytes(b.size) },
            { key: 'status', label: 'STATUT', render: (b) => <Badge value={b.status} /> },
            {
              key: 'actions',
              label: 'ACTIONS',
              render: (b) => (
                <div className="row-actions">
                  <button
                    className="icon-btn"
                    title="Voir la sauvegarde"
                    aria-label={`Voir ${b.name}`}
                    onClick={() => setView(b)}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    disabled={pending}
                    title="Vérifier SHA-256"
                    aria-label={`Vérifier ${b.name}`}
                    onClick={async () => {
                      const r = await mutate(`/backups/${b.id}/verify`);
                      if (r) setResult(r);
                    }}
                  >
                    <FileCheck2 size={16} />
                  </button>
                  {admin && (
                    <button
                      className="icon-btn danger-icon"
                      title="Supprimer"
                      aria-label={`Supprimer ${b.name}`}
                      onClick={() => setDeleting(b)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Panel>
      <div className="info-box">
        <Fingerprint size={23} />
        <p>
          <strong>Une copie corrompue pour apprendre.</strong> L’échantillon « test d’intégrité » contient une
          altération fictive. Vérifiez-le pour observer un échec SHA-256. Son manifeste peut correspondre
          alors que le hash d’un contenu ne correspond plus.
        </p>
      </div>
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Créer une sauvegarde"
        description="Seuls les fichiers sains ou restaurés peuvent être sauvegardés."
      >
        <form
          onSubmit={form.handleSubmit(async (values) => {
            const response = await mutate(
              '/backups',
              { ...values, ...(scope === 'custom' ? { fileIds } : {}) },
              'post',
              'Sauvegarde créée et empreintes vérifiées.',
            );
            if (response) setCreateOpen(false);
          })}
        >
          <label>
            Nom de la sauvegarde
            <input {...form.register('name')} autoFocus />
          </label>
          {form.formState.errors.name && <p className="field-error">{form.formState.errors.name.message}</p>}
          <label>
            Périmètre
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">
                Tous les fichiers sains ({data.files.filter((f) => f.status !== 'COMPROMISED').length})
              </option>
              <option value="custom">Choisir les fichiers</option>
            </select>
          </label>
          {scope === 'custom' && (
            <div className="file-checkbox-list">
              {data.files
                .filter((f) => f.status !== 'COMPROMISED')
                .map((f) => (
                  <label key={f.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={fileIds.includes(f.id)}
                      onChange={() =>
                        setFileIds(
                          fileIds.includes(f.id) ? fileIds.filter((id) => id !== f.id) : [...fileIds, f.id],
                        )
                      }
                    />
                    <span>
                      {f.name}
                      <small>{data.machines.find((m) => m.id === f.machineId)?.hostname}</small>
                    </span>
                  </label>
                ))}
            </div>
          )}
          <div className="modal-actions">
            <Button type="button" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              busy={pending}
              disabled={scope === 'custom' && !fileIds.length}
              variant="primary"
              icon={HardDriveDownload}
            >
              Créer la sauvegarde
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!view}
        onClose={() => setView(null)}
        title={view?.name}
        description={view && `${view.fileCount} fichiers · ${bytes(view.size)} · ${dateTime(view.createdAt)}`}
        wide
      >
        {view && (
          <>
            <div className="detail-meta">
              <Badge value={view.status} />
              <span>Par {view.creator}</span>
            </div>
            <label>
              Empreinte SHA-256 du manifeste
              <Hash value={view.hash} full />
            </label>
            <DataTable
              rows={view.files}
              searchKeys={['name', 'id']}
              columns={[
                { key: 'name', label: 'FICHIER' },
                {
                  key: 'machineId',
                  label: 'SYSTÈME',
                  render: (f) => data.machines.find((m) => m.id === f.machineId)?.hostname,
                },
                { key: 'size', label: 'TAILLE', render: (f) => bytes(f.size) },
                { key: 'hash', label: 'SHA-256', render: (f) => <Hash value={f.hash} /> },
              ]}
            />
            <div className="modal-actions">
              <Link to={`/integrity?backup=${view.id}`} className="btn secondary">
                Vérifier l’intégrité
              </Link>
              {admin && (
                <Link to={`/recovery?backup=${view.id}`} className="btn primary">
                  Utiliser pour restaurer
                </Link>
              )}
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Supprimer cette sauvegarde ?"
        description={deleting?.name}
      >
        <p>
          La copie fictive sera supprimée. Les sauvegardes utilisées par un incident sont conservées et ne
          peuvent pas être supprimées.
        </p>
        <div className="modal-actions">
          <Button onClick={() => setDeleting(null)}>Annuler</Button>
          <Button
            variant="danger"
            busy={pending}
            icon={Trash2}
            onClick={async () => {
              const r = await mutate(`/backups/${deleting.id}`, {}, 'delete', 'Sauvegarde supprimée.');
              if (r) setDeleting(null);
            }}
          >
            Supprimer la copie
          </Button>
        </div>
      </Modal>
      <Modal open={!!result} onClose={() => setResult(null)} title="Vérification SHA-256" wide>
        {result && <IntegrityResult result={result} />}
      </Modal>
    </>
  );
}
export function Integrity() {
  const { data, mutate, pending } = useLab();
  const [params] = useSearchParams();
  const [tab, setTab] = useState('backups');
  const [selected, setSelected] = useState(params.get('backup') || data.backups[0]?.id || '');
  const [result, setResult] = useState(null);
  return (
    <>
      <PageHeader
        eyebrow="CONFIANCE & VÉRIFICATION"
        title="Vérification d’intégrité"
        description="Une empreinte. Une référence. La certitude que vos données sont intactes."
      />
      <div className="integrity-intro">
        <div className="integrity-art">
          <Fingerprint size={64} strokeWidth={1} />
        </div>
        <div>
          <span className="eyebrow">SHA-256 · EMPREINTE DE 256 BITS</span>
          <h2>La confiance se vérifie.</h2>
          <p>
            Chaque contenu fictif possède une empreinte calculée par le serveur. Comparez-la à la référence
            pour détecter la moindre altération.
          </p>
        </div>
        <span className="algorithm-tag">
          SHA
          <br />
          <strong>256</strong>
        </span>
      </div>
      <Panel
        title="Lancer une vérification"
        subtitle="Les vérifications et leurs résultats sont inscrits dans le journal d’audit."
      >
        <div className="padded">
          <div className="tabs">
            <button
              className={tab === 'backups' ? 'active' : ''}
              onClick={() => {
                setTab('backups');
                setResult(null);
              }}
            >
              Sauvegardes
            </button>
            <button
              className={tab === 'files' ? 'active' : ''}
              onClick={() => {
                setTab('files');
                setResult(null);
              }}
            >
              Fichiers actifs
            </button>
          </div>
          {tab === 'backups' ? (
            <div className="integrity-form">
              <label>
                Sauvegarde à vérifier
                <select
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setResult(null);
                  }}
                >
                  <option value="" disabled>
                    Sélectionnez une sauvegarde
                  </option>
                  {data.backups.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} · {b.fileCount} fichiers
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="primary"
                busy={pending}
                disabled={!selected}
                icon={SearchCheck}
                onClick={async () => {
                  setResult(null);
                  const r = await mutate(`/backups/${selected}/verify`);
                  if (r) setResult(r);
                }}
              >
                Vérifier SHA-256
              </Button>
            </div>
          ) : (
            <div className="integrity-form">
              <div>
                <h3>{data.files.length} fichiers actifs</h3>
                <p className="muted">Le contrôle compare le contenu actuel à l’empreinte de référence.</p>
              </div>
              <Button
                variant="primary"
                busy={pending}
                icon={SearchCheck}
                onClick={async () => {
                  setResult(null);
                  const r = await mutate('/integrity/files', { fileIds: data.files.map((f) => f.id) });
                  if (r) setResult(r);
                }}
              >
                Vérifier les fichiers
              </Button>
            </div>
          )}
        </div>
      </Panel>
      {result && (
        <Panel title="Résultats de la vérification">
          <IntegrityResult result={result} />
        </Panel>
      )}
      <div className="info-box">
        <ShieldCheck size={21} />
        <p>
          <strong>Statut de simulation et intégrité sont distincts.</strong> Un fichier marqué COMPROMISED
          conserve son contenu fictif : son SHA-256 peut donc rester valide. Le parcours de reprise exige tout
          de même isolation, restauration et contrôle final.
        </p>
      </div>
    </>
  );
}
