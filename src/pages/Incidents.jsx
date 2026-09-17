import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Flag,
  HardDriveDownload,
  LockKeyhole,
  Play,
  Printer,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useAuth, useLab } from '../state';
import { api, errorMessage } from '../api';
import {
  Badge,
  Button,
  DataTable,
  dateTime,
  duration,
  Empty,
  Hash,
  labels,
  Modal,
  PageHeader,
  Panel,
  Progress,
  SafetyNote,
  StatCard,
} from '../components/ui';

function Timeline({ incident }) {
  return (
    <div className="timeline">
      {incident.timeline.map((entry, index) => (
        <div className="timeline-item" key={`${entry.at}-${index}`}>
          <span className="timeline-dot">
            {index === incident.timeline.length - 1 ? <Check size={11} /> : null}
          </span>
          <div>
            <strong>{entry.detail}</strong>
            <p>
              {entry.actor} · {dateTime(entry.at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
export function Incidents() {
  const { data } = useLab();
  const [status, setStatus] = useState('ALL');
  const [severity, setSeverity] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const incident = selected ? data.incidents.find((i) => i.id === selected) : null;
  const rows = data.incidents.filter(
    (i) =>
      (status === 'ALL' || (status === 'ACTIVE' ? i.status !== 'RESOLVED' : i.status === 'RESOLVED')) &&
      (severity === 'ALL' || i.severity === severity),
  );
  return (
    <>
      <PageHeader
        eyebrow="DÉTECTION & RÉPONSE"
        title="Centre des incidents"
        description="Du premier signal à la résolution. Gardez chaque action en perspective."
      />
      <div className="stat-grid three">
        <StatCard
          label="Total des exercices"
          value={data.incidents.length}
          icon={Shield}
          tone="blue"
          detail="Historique conservé dans le laboratoire"
        />
        <StatCard
          label="Incidents en cours"
          value={data.metrics.activeIncidents}
          icon={Activity}
          tone="orange"
          detail="À contenir, restaurer ou clôturer"
        />
        <StatCard
          label="Incidents résolus"
          value={data.incidents.filter((i) => i.status === 'RESOLVED').length}
          icon={ShieldCheck}
          detail="Parcours de reprise terminé"
        />
      </div>
      <Panel title="Registre des incidents">
        <div className="tabs padded-inline">
          {[
            ['ALL', 'Tous les incidents'],
            ['ACTIVE', 'En cours'],
            ['RESOLVED', 'Résolus'],
          ].map(([value, label]) => (
            <button key={value} className={status === value ? 'active' : ''} onClick={() => setStatus(value)}>
              {label}
            </button>
          ))}
        </div>
        <DataTable
          rows={rows}
          searchKeys={['title', 'id', 'launchedBy']}
          searchPlaceholder="Rechercher un incident…"
          toolbar={
            <select
              className="select-compact"
              aria-label="Filtrer la gravité"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="ALL">Toutes les gravités</option>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((v) => (
                <option key={v} value={v}>
                  {labels[v]}
                </option>
              ))}
            </select>
          }
          columns={[
            {
              key: 'title',
              label: 'INCIDENT',
              sortable: true,
              render: (i) => (
                <div className="table-title">
                  <span className="table-icon">
                    <ShieldAlert size={18} />
                  </span>
                  <div>
                    <button className="table-link" onClick={() => setSelected(i.id)}>
                      {i.title}
                    </button>
                    <small>{i.id}</small>
                  </div>
                </div>
              ),
            },
            { key: 'severity', label: 'GRAVITÉ', render: (i) => <Badge value={i.severity} /> },
            { key: 'status', label: 'STATUT', render: (i) => <Badge value={i.status} /> },
            { key: 'createdAt', label: 'DÉTECTION', sortable: true, render: (i) => dateTime(i.createdAt) },
            {
              key: 'impact',
              label: 'IMPACT',
              sortable: true,
              render: (i) => (
                <div className="cell-stack">
                  {i.fileIds.length} fichiers
                  <small>
                    {i.machineIds.length} systèmes · {i.impact} %
                  </small>
                </div>
              ),
            },
            {
              key: 'actions',
              label: '',
              render: (i) => (
                <button
                  className="icon-btn"
                  aria-label={`Consulter ${i.id}`}
                  onClick={() => setSelected(i.id)}
                >
                  <Eye size={17} />
                </button>
              ),
            },
          ]}
          empty={{
            title: 'Aucun incident à afficher',
            description: 'Vos exercices de simulation apparaîtront ici avec leur chronologie complète.',
            icon: ShieldCheck,
          }}
        />
      </Panel>
      <Modal
        open={!!incident}
        onClose={() => setSelected(null)}
        title={incident?.title}
        description={incident?.id}
        wide
      >
        {incident && (
          <>
            <div className="detail-meta">
              <Badge value={incident.severity} />
              <Badge value={incident.status} />
              <span>Lancé par {incident.launchedBy}</span>
            </div>
            <div className="incident-detail-grid">
              <div>
                <span>Fichiers affectés</span>
                <strong>{incident.fileIds.length}</strong>
              </div>
              <div>
                <span>Impact initial</span>
                <strong>{incident.impact} %</strong>
              </div>
              <div>
                <span>Durée de reprise</span>
                <strong>{duration(incident.durationSeconds)}</strong>
              </div>
              <div>
                <span>Fichiers restaurés</span>
                <strong>
                  {incident.restoredFileIds.length} / {incident.fileIds.length}
                </strong>
              </div>
            </div>
            <h3>Systèmes concernés</h3>
            <div className="system-chips">
              {incident.machineIds.map((id) => (
                <span key={id}>{data.machines.find((m) => m.id === id)?.hostname || id}</span>
              ))}
            </div>
            <h3>Chronologie</h3>
            <Timeline incident={incident} />
            <div className="modal-actions">
              <Link to={`/reports?incident=${incident.id}`} className="btn secondary">
                <FileText size={16} />
                Rapport d’incident
              </Link>
              {incident.status !== 'RESOLVED' && (
                <Link to={`/recovery?incident=${incident.id}`} className="btn primary">
                  Prendre en charge <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
const stepInfo = {
  isolate: {
    title: 'Contenir l’incident',
    subtitle:
      'Isolez les systèmes affectés et suspendez leurs services fictifs pour préparer une reprise contrôlée.',
    button: 'Isoler les systèmes',
    icon: LockKeyhole,
  },
  analyze: {
    title: 'Comprendre le périmètre',
    subtitle: 'Identifiez les ressources touchées, mesurez l’impact et confirmez l’analyse de l’incident.',
    button: 'Confirmer l’analyse',
    icon: Search,
  },
  select: {
    title: 'Choisir un point de retour fiable',
    subtitle:
      'La sauvegarde doit couvrir tous les fichiers de l’incident. Son intégrité sera vérifiée à l’étape suivante.',
    button: 'Sélectionner cette sauvegarde',
    icon: HardDriveDownload,
  },
  verify: {
    title: 'Vérifier avant de restaurer',
    subtitle:
      'Le serveur recalcule les empreintes SHA-256 de chaque contenu et du manifeste de la sauvegarde.',
    button: 'Vérifier les empreintes SHA-256',
    icon: FileCheck2,
  },
  restore: {
    title: 'Restaurer les données fictives',
    subtitle:
      'Choisissez les fichiers à restaurer. Vous pouvez avancer par lots ; tous les fichiers doivent être restaurés pour continuer.',
    button: 'Restaurer la sélection',
    icon: HardDriveDownload,
  },
  test: {
    title: 'Contrôler le résultat',
    subtitle: 'Les contenus restaurés sont comparés aux empreintes de la sauvegarde de référence.',
    button: 'Contrôler l’intégrité finale',
    icon: ShieldCheck,
  },
  reactivate: {
    title: 'Rétablir les services',
    subtitle:
      'Les fichiers sont vérifiés. Levez l’isolation des systèmes et réactivez les services concernés.',
    button: 'Réactiver les services',
    icon: Activity,
  },
  close: {
    title: 'Clôturer et apprendre',
    subtitle:
      'L’exercice est terminé. Mesurez le temps de reprise, le RPO et votre score de résilience final.',
    button: 'Clôturer l’incident',
    icon: Flag,
  },
};
export function Recovery() {
  const { data, mutate, pending } = useLab();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [backupId, setBackupId] = useState(params.get('backup') || '');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const incident =
    data.incidents.find((i) => i.id === params.get('incident')) ||
    data.incidents.find((i) => i.status !== 'RESOLVED') ||
    data.incidents[0];
  const step = incident?.plan.find((s) => s.status !== 'COMPLETED');
  const info = stepInfo[step?.key];
  const compatible = incident
    ? data.backups.filter(
        (b) => b.status !== 'CORRUPTED' && incident.fileIds.every((id) => b.files.some((f) => f.id === id)),
      )
    : [];
  const selectedBackup =
    compatible.find((b) => b.id === backupId) ||
    compatible.find((b) => b.id === incident?.backupId) ||
    compatible[0];
  const remaining = incident?.fileIds.filter((id) => !incident.restoredFileIds.includes(id)) || [];
  const selectedRemaining = selectedFiles.filter((id) => remaining.includes(id));
  useEffect(() => {
    if (step?.key === 'restore')
      setSelectedFiles(incident.fileIds.filter((id) => !incident.restoredFileIds.includes(id)));
  }, [incident?.id, step?.key]);
  const perform = async () => {
    const payload =
      step.key === 'select'
        ? { backupId: selectedBackup?.id }
        : step.key === 'restore'
          ? { fileIds: selectedRemaining }
          : {};
    await mutate(
      `/incidents/${incident.id}/actions/${step.key}`,
      payload,
      'post',
      step.key === 'close' ? 'Incident clôturé. Le rapport est disponible.' : undefined,
    );
  };
  return (
    <>
      <PageHeader
        eyebrow="ASSISTANT DE REPRISE"
        title="Restauration"
        description="Reprenez le contrôle, une étape vérifiée à la fois."
      />
      {!incident ? (
        <Panel>
          <Empty
            title="Aucun incident à restaurer"
            description="Lancez une simulation pour parcourir toutes les étapes de reprise."
            icon={ShieldCheck}
          >
            <Link to="/simulations" className="btn primary">
              <Play size={15} />
              Explorer les scénarios
            </Link>
          </Empty>
        </Panel>
      ) : (
        <>
          <div className="recovery-selector">
            <label>
              Incident à prendre en charge
              <select
                value={incident.id}
                onChange={(e) => {
                  setParams({ incident: e.target.value });
                  setBackupId('');
                }}
              >
                {data.incidents.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title} · {i.id} · {labels[i.status]}
                  </option>
                ))}
              </select>
            </label>
            <Badge value={incident.severity} />
            <Badge value={incident.status} />
            <span className="recovery-objective">
              <Clock3 size={16} />
              Objectif RTO : {incident.rtoMinutes} min
            </span>
          </div>
          <div className="recovery-layout">
            <Panel title="Votre parcours de reprise" className="recovery-stepper">
              <div className="step-list">
                {incident.plan.map((s, index) => (
                  <div key={s.key} className={`recovery-step step-${s.status.toLowerCase()}`}>
                    <span className="step-number">
                      {s.status === 'COMPLETED' ? <Check size={16} /> : String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <strong>{s.label}</strong>
                      <small>{labels[s.status]}</small>
                    </div>
                    {s.status === 'IN_PROGRESS' && <ChevronRight size={16} />}
                  </div>
                ))}
              </div>
              <div className="padded">
                <Progress
                  value={Math.round((incident.plan.filter((s) => s.status === 'COMPLETED').length / 9) * 100)}
                  label="Progression du plan"
                />
              </div>
            </Panel>
            <div className="recovery-content">
              {!step ? (
                <Panel className="recovery-complete">
                  <div className="complete-shield">
                    <ShieldCheck size={54} strokeWidth={1.4} />
                  </div>
                  <span className="eyebrow">EXERCICE TERMINÉ</span>
                  <h2>Votre organisation a rebondi.</h2>
                  <p>Tous les fichiers sont restaurés, les empreintes vérifiées et les services réactivés.</p>
                  <div className="completion-stats">
                    <div>
                      <strong>{incident.restoredFileIds.length}</strong>
                      <span>fichiers restaurés</span>
                    </div>
                    <div>
                      <strong>{duration(incident.durationSeconds)}</strong>
                      <span>temps de reprise</span>
                    </div>
                    <div>
                      <strong>{incident.scoreAfter}/100</strong>
                      <span>score final</span>
                    </div>
                  </div>
                  <Link to={`/reports?incident=${incident.id}`} className="btn primary">
                    <FileText size={16} />
                    Consulter le rapport
                  </Link>
                </Panel>
              ) : (
                <Panel className="recovery-action-panel">
                  <div className="recovery-action-heading">
                    <span className="recovery-action-icon">
                      <info.icon size={27} />
                    </span>
                    <span className="eyebrow">
                      ÉTAPE {incident.plan.findIndex((s) => s.key === step.key) + 1} SUR 9
                    </span>
                    <h2>{info.title}</h2>
                    <p>{info.subtitle}</p>
                  </div>
                  {['isolate', 'analyze'].includes(step.key) && (
                    <>
                      <div className="impact-summary">
                        <div>
                          <strong>{incident.fileIds.length}</strong>
                          <span>fichiers compromis</span>
                        </div>
                        <div>
                          <strong>{incident.machineIds.length}</strong>
                          <span>systèmes affectés</span>
                        </div>
                        <div>
                          <strong>{incident.serviceIds.length}</strong>
                          <span>services concernés</span>
                        </div>
                      </div>
                      <div className="system-chips">
                        {incident.machineIds.map((id) => (
                          <span key={id}>{data.machines.find((m) => m.id === id)?.hostname}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {step.key === 'select' && (
                    <div className="backup-selection">
                      {compatible.length ? (
                        compatible.map((b) => (
                          <label
                            className={`backup-option ${selectedBackup?.id === b.id ? 'selected' : ''}`}
                            key={b.id}
                          >
                            <input
                              type="radio"
                              name="backup"
                              value={b.id}
                              checked={selectedBackup?.id === b.id}
                              onChange={() => setBackupId(b.id)}
                            />
                            <HardDriveDownload size={22} />
                            <span>
                              <strong>{b.name}</strong>
                              <small>
                                {dateTime(b.createdAt)} · {b.fileCount} fichiers
                              </small>
                            </span>
                            <Badge value={b.status} />
                          </label>
                        ))
                      ) : (
                        <div className="form-error">
                          Aucune sauvegarde fiable ne couvre tous les fichiers affectés. La reprise complète
                          est impossible sans copie couvrant ce périmètre.
                        </div>
                      )}
                    </div>
                  )}
                  {['verify', 'test', 'reactivate', 'close'].includes(step.key) && (
                    <div className="verification-summary">
                      <div>
                        <HardDriveDownload size={19} />
                        <span>
                          Sauvegarde de référence
                          <strong>{data.backups.find((b) => b.id === incident.backupId)?.name || '—'}</strong>
                        </span>
                      </div>
                      <div>
                        <FileCheck2 size={19} />
                        <span>
                          État de l’intégrité
                          <Badge value={incident.integrity} />
                        </span>
                      </div>
                      {incident.integrity === 'FAILED' && (
                        <div className="form-error">
                          La sauvegarde a échoué au contrôle.{' '}
                          <Button
                            onClick={() => {
                              const other = compatible.find((b) => b.id !== incident.backupId);
                              if (other)
                                mutate(`/incidents/${incident.id}/actions/select`, { backupId: other.id });
                            }}
                            disabled={!compatible.some((b) => b.id !== incident.backupId)}
                            busy={pending}
                          >
                            Sélectionner la dernière autre sauvegarde fiable
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {step.key === 'restore' && (
                    <>
                      <div className="selection-heading">
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={selectedRemaining.length === remaining.length && remaining.length > 0}
                            onChange={(e) => setSelectedFiles(e.target.checked ? remaining : [])}
                          />
                          Tout sélectionner
                        </label>
                        <span>
                          {selectedRemaining.length} / {remaining.length} fichiers restants
                        </span>
                      </div>
                      <div className="file-checkbox-list restore-file-list">
                        {data.files
                          .filter((f) => remaining.includes(f.id))
                          .map((f) => (
                            <label key={f.id} className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={selectedFiles.includes(f.id)}
                                onChange={() =>
                                  setSelectedFiles(
                                    selectedFiles.includes(f.id)
                                      ? selectedFiles.filter((id) => id !== f.id)
                                      : [...selectedFiles, f.id],
                                  )
                                }
                              />
                              <span>
                                {f.name}
                                <small>{data.machines.find((m) => m.id === f.machineId)?.hostname}</small>
                              </span>
                              <Badge value={f.status} />
                            </label>
                          ))}
                      </div>
                    </>
                  )}
                  <div className="recovery-action-footer">
                    <span>
                      <ShieldCheck size={15} />
                      Action enregistrée dans le journal d’audit
                    </span>
                    <Button
                      variant="primary"
                      icon={info.icon}
                      busy={pending}
                      disabled={
                        user.role !== 'ADMIN' ||
                        (step.key === 'select' && !selectedBackup) ||
                        (step.key === 'restore' && !selectedRemaining.length)
                      }
                      onClick={perform}
                    >
                      {info.button}
                    </Button>
                  </div>
                  {user.role !== 'ADMIN' && (
                    <p className="field-hint">
                      Vous consultez le parcours en tant qu’analyste. L’administrateur exécute les actions de
                      reprise.
                    </p>
                  )}
                </Panel>
              )}
              <Panel title="Avancement de la restauration">
                <div className="recovery-progress">
                  <Progress
                    value={incident.plan.find((s) => s.key === 'analyze').status === 'COMPLETED' ? 100 : 0}
                    label="Analyse"
                  />
                  <Progress
                    value={incident.plan.find((s) => s.key === 'verify').status === 'COMPLETED' ? 100 : 0}
                    label="Vérification SHA-256"
                  />
                  <Progress
                    value={Math.round((incident.restoredFileIds.length / incident.fileIds.length) * 100)}
                    label="Restauration des fichiers"
                    tone="blue"
                  />
                </div>
                {pending && (
                  <div className="operation-running">
                    <span className="tiny-dot" />
                    Traitement en cours sur les données fictives…
                  </div>
                )}
              </Panel>
            </div>
          </div>
          <Panel title="Chronologie des actions">
            <Timeline incident={incident} />
          </Panel>
          <SafetyNote />
        </>
      )}
    </>
  );
}
export function RecoveryPlan() {
  const { data } = useLab();
  const [selected, setSelected] = useState('');
  const incident =
    data.incidents.find((i) => i.id === selected) ||
    data.incidents.find((i) => i.status !== 'RESOLVED') ||
    data.incidents[0];
  return (
    <>
      <PageHeader
        eyebrow="CONTINUITÉ D’ACTIVITÉ"
        title="Plan de reprise"
        description="Un processus reproductible, mesurable et documenté."
      />
      <div className="stat-grid three">
        <StatCard
          label="Objectif RTO"
          value={`${data.settings.rtoMinutes} min`}
          icon={Clock3}
          detail="Temps cible de rétablissement des services"
          tone="blue"
        />
        <StatCard
          label="Objectif RPO"
          value={`${data.settings.rpoMinutes} min`}
          icon={HardDriveDownload}
          detail="Âge maximal cible de la sauvegarde au moment de l’incident"
        />
        <StatCard
          label="Étapes de contrôle"
          value="09"
          icon={CheckCircle2}
          detail="Chaque étape dépend de la précédente"
          tone="purple"
        />
      </div>
      <Panel
        title="Procédure de reprise après incident"
        subtitle="Les statuts évoluent avec les actions réelles du workflow, sans validation arbitraire."
        action={
          incident && (
            <select
              aria-label="Incident du plan"
              className="select-compact"
              value={incident.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {data.incidents.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.id}
                </option>
              ))}
            </select>
          )
        }
      >
        <div className="plan-table">
          {[
            ['detect', 'Détection', 'Créer l’incident et identifier les premiers fichiers compromis.'],
            ['isolate', 'Confinement', 'Isoler les systèmes touchés et suspendre les services dépendants.'],
            ['analyze', 'Analyse', 'Établir le périmètre, l’impact et les priorités de reprise.'],
            [
              'select',
              'Sauvegarde fiable',
              'Sélectionner une copie couvrant l’ensemble des fichiers affectés.',
            ],
            ['verify', 'Vérification de l’intégrité', 'Recalculer les SHA-256 des contenus et du manifeste.'],
            ['restore', 'Restauration', 'Restaurer les fichiers sélectionnés depuis la copie vérifiée.'],
            [
              'test',
              'Tests et contrôle final',
              'Comparer les contenus restaurés à la sauvegarde de référence.',
            ],
            ['reactivate', 'Reprise des services', 'Lever l’isolation et rétablir les services fictifs.'],
            ['close', 'Clôture de l’incident', 'Évaluer RTO, RPO, intégrité et score de résilience.'],
          ].map(([key, title, description], index) => (
            <div className="plan-row" key={key}>
              <span className="plan-index">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
              <Badge value={incident?.plan.find((s) => s.key === key)?.status || 'PENDING'} />
            </div>
          ))}
        </div>
        {incident && (
          <div className="plan-footer">
            <Progress
              value={Math.round((incident.plan.filter((s) => s.status === 'COMPLETED').length / 9) * 100)}
              label="Avancement du plan"
            />
            <Link className="btn primary" to={`/recovery?incident=${incident.id}`}>
              Ouvrir l’assistant <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </Panel>
    </>
  );
}
export function Reports() {
  const { data } = useLab();
  const [params, setParams] = useSearchParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const incidentId = data.incidents.find((i) => i.id === params.get('incident'))?.id || data.incidents[0]?.id;
  useEffect(() => {
    if (!incidentId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setReport(null);
    api
      .get(`/reports/${incidentId}`)
      .then(({ data }) => {
        if (!cancelled) setReport(data);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [incidentId, data.updatedAt, retry]);
  const exportJSON = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentinel-${report.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <PageHeader
        eyebrow="ANALYSE & ENSEIGNEMENTS"
        title="Rapports d’incident"
        description="Transformez chaque exercice en preuve de votre capacité de reprise."
      >
        {report && (
          <>
            <Button icon={Download} onClick={exportJSON}>
              Exporter JSON
            </Button>
            <Button variant="primary" icon={Printer} onClick={() => window.print()}>
              Imprimer / PDF
            </Button>
          </>
        )}
      </PageHeader>
      {!incidentId ? (
        <Panel>
          <Empty
            title="Votre premier rapport vous attend"
            description="Lancez un exercice pour générer son rapport, enrichi à chaque étape de reprise."
            icon={FileText}
          >
            <Link className="btn primary" to="/simulations">
              Explorer les scénarios <ArrowRight size={15} />
            </Link>
          </Empty>
        </Panel>
      ) : (
        <>
          <div className="report-selector">
            <label>
              Rapport à consulter
              <select value={incidentId} onChange={(e) => setParams({ incident: e.target.value })}>
                {data.incidents.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title} · {i.id}
                  </option>
                ))}
              </select>
            </label>
            <span className="muted">
              Pour un PDF : choisissez « Enregistrer au format PDF » dans la fenêtre d’impression.
            </span>
          </div>
          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <Button onClick={() => setRetry(retry + 1)}>Réessayer</Button>
            </div>
          )}
          {loading && <div className="skeleton sk-chart" />}
          {report && (
            <article className="report-document">
              <div className="report-header">
                <div>
                  <div className="report-brand">
                    <ShieldCheck size={27} />
                    sentinel.
                  </div>
                  <span className="eyebrow">RAPPORT DE RÉSILIENCE · EXERCICE FICTIF</span>
                  <h2>{report.title}</h2>
                  <p>
                    {report.organization} · {report.id}
                  </p>
                </div>
                <div className="report-header-meta">
                  <Badge value={report.status} />
                  <Badge value={report.severity} />
                  <span>{dateTime(report.createdAt)}</span>
                </div>
              </div>
              <div className="report-kpis">
                <div>
                  <span>Fichiers compromis</span>
                  <strong>{report.fileIds.length}</strong>
                </div>
                <div>
                  <span>Taux de restauration</span>
                  <strong>{report.restoreRate} %</strong>
                </div>
                <div>
                  <span>Temps de reprise</span>
                  <strong>{duration(report.durationSeconds)}</strong>
                </div>
                <div>
                  <span>Score avant → après</span>
                  <strong>
                    {report.scoreBefore} <ArrowRight size={20} /> {report.scoreAfter ?? '—'}
                  </strong>
                </div>
              </div>
              <div className="report-details-grid">
                <section>
                  <h3>Contexte de l’exercice</h3>
                  <dl>
                    <div>
                      <dt>Origine simulée</dt>
                      <dd>{report.origin}</dd>
                    </div>
                    <div>
                      <dt>Déclenché par</dt>
                      <dd>{report.launchedBy}</dd>
                    </div>
                    <div>
                      <dt>Date de détection</dt>
                      <dd>{dateTime(report.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Date de clôture</dt>
                      <dd>{dateTime(report.resolvedAt)}</dd>
                    </div>
                    <div>
                      <dt>Impact initial</dt>
                      <dd>{report.impact} % des fichiers</dd>
                    </div>
                    <div>
                      <dt>Services affectés</dt>
                      <dd>{report.serviceIds.length}</dd>
                    </div>
                  </dl>
                </section>
                <section>
                  <h3>Résultats de la reprise</h3>
                  <dl>
                    <div>
                      <dt>Sauvegarde utilisée</dt>
                      <dd>{report.backup || 'Non sélectionnée'}</dd>
                    </div>
                    <div>
                      <dt>Résultat SHA-256</dt>
                      <dd>
                        <Badge value={report.integrity} />
                      </dd>
                    </div>
                    <div>
                      <dt>RTO cible / mesuré</dt>
                      <dd>
                        {report.rtoMinutes} min / {duration(report.durationSeconds)}
                      </dd>
                    </div>
                    <div>
                      <dt>Objectif RTO</dt>
                      <dd>
                        {report.durationSeconds == null
                          ? 'À mesurer à la clôture'
                          : report.durationSeconds <= report.rtoMinutes * 60
                            ? 'Atteint'
                            : 'Dépassé'}
                      </dd>
                    </div>
                    <div>
                      <dt>RPO cible / âge mesuré</dt>
                      <dd>
                        {report.rpoMinutes} min /{' '}
                        {report.actualRpoMinutes == null ? '—' : `${report.actualRpoMinutes} min`}
                      </dd>
                    </div>
                    <div>
                      <dt>Objectif RPO</dt>
                      <dd>
                        {report.actualRpoMinutes == null
                          ? 'À mesurer'
                          : report.actualRpoMinutes <= report.rpoMinutes
                            ? 'Atteint'
                            : 'Dépassé'}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
              <section className="report-section">
                <h3>Ressources touchées</h3>
                <div className="system-chips">
                  {report.machines.map((m) => (
                    <span key={m.id}>
                      {m.hostname} · {m.ip}
                    </span>
                  ))}
                </div>
              </section>
              <section className="report-section">
                <h3>Chronologie complète</h3>
                <Timeline incident={report} />
              </section>
              <section className="report-section report-method">
                <h3>Méthode de calcul</h3>
                <p>
                  Score pédagogique : 50 % de santé des fichiers + 30 % de couverture par une sauvegarde
                  vérifiée respectant le RPO + 20 % de disponibilité des services. Le temps de reprise est la
                  durée entre détection et clôture. Le RPO mesuré correspond à l’âge de la copie au moment de
                  la détection ; ce n’est pas une mesure de perte de transactions réelles.
                </p>
                <p>
                  Les données et événements sont fictifs. L’intégrité SHA-256 est calculée réellement par le
                  serveur. Ce score n’est pas une certification de sécurité.
                </p>
              </section>
              <div className="report-footer">
                Généré le {dateTime(report.generatedAt)} · Sentinel Resilience Lab · Master Réseau & Sécurité
                Informatique
              </div>
            </article>
          )}
        </>
      )}
    </>
  );
}
