import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  Flame,
  FlaskConical,
  Monitor,
  Play,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Zap,
} from 'lucide-react';
import { useAuth, useLab } from '../state';
import { Badge, Button, CheckLine, Modal, PageHeader, Panel, Progress, SafetyNote } from '../components/ui';

const scenarios = [
  {
    id: 'LOW',
    title: 'Premiers signaux',
    label: 'Simulation faible',
    rate: '10–20',
    icon: Shield,
    color: 'green',
    description: 'Un incident limité pour découvrir les mécanismes de détection et de reprise.',
    steps: ['Périmètre d’impact restreint', 'Idéal pour un premier exercice', 'Parcours de reprise complet'],
  },
  {
    id: 'MEDIUM',
    title: 'Sous pression',
    label: 'Simulation moyenne',
    rate: '30–50',
    icon: Zap,
    color: 'orange',
    description: 'Une perturbation significative pour éprouver la coordination de votre réponse.',
    steps: [
      'Plusieurs ressources affectées',
      'Services potentiellement dégradés',
      'Priorisation de la restauration',
    ],
  },
  {
    id: 'CRITICAL',
    title: 'Épreuve de résilience',
    label: 'Simulation critique',
    rate: '70–90',
    icon: Flame,
    color: 'red',
    description: 'Un scénario de crise pour tester votre capacité à rétablir toute l’organisation.',
    steps: [
      'Impact étendu à l’organisation',
      'Interruption majeure des services',
      'Évaluation de vos objectifs RTO',
    ],
  },
];
export default function Simulations() {
  const { data, mutate, pending } = useLab();
  const { user } = useAuth();
  const [selected, setSelected] = useState('LOW');
  const [machineIds, setMachineIds] = useState([]);
  const [serviceIds, setServiceIds] = useState([]);
  const [fileCount, setFileCount] = useState(20);
  const [title, setTitle] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(0);
  const active = data.incidents.find((i) => i.status !== 'RESOLVED');
  const targetIds = new Set([
    ...machineIds,
    ...data.services.filter((s) => serviceIds.includes(s.id)).flatMap((s) => s.machineIds),
  ]);
  const eligible = data.files.filter(
    (f) => f.status !== 'COMPROMISED' && (!targetIds.size || targetIds.has(f.machineId)),
  ).length;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setProgress((value) => Math.min(result ? 100 : 80, value + 10)), 220);
    return () => clearInterval(timer);
  }, [running, result]);
  const toggle = (value, items, setter) =>
    setter(items.includes(value) ? items.filter((id) => id !== value) : [...items, value]);
  const launch = async () => {
    setConfirm(false);
    setResult(null);
    setProgress(0);
    setRunning(true);
    const input = {
      scenario: selected,
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(selected === 'CUSTOM' ? { fileCount: Number(fileCount), machineIds, serviceIds } : {}),
    };
    const response = await mutate('/simulations', input);
    if (response) setResult(response);
    else setRunning(false);
  };
  return (
    <>
      <PageHeader
        eyebrow="LABORATOIRE D’EXERCICES"
        title="Scénarios de simulation"
        description="Préparez-vous à l’imprévu. Choisissez votre prochain défi."
      />
      <SafetyNote />
      {active && (
        <div className="warning-banner">
          <ShieldAlert size={20} />
          <div>
            <strong>Un incident est déjà en cours</strong>
            <p>Clôturez {active.id} avant de lancer un nouvel exercice.</p>
          </div>
          <Link className="btn secondary" to={`/recovery?incident=${active.id}`}>
            Reprendre l’incident <ArrowRight size={15} />
          </Link>
        </div>
      )}
      <div className="section-label">
        <h2>
          01 <span>Choisissez votre scénario</span>
        </h2>
        <span>Trois niveaux. Un même objectif : être prêt.</span>
      </div>
      <div className="scenario-grid">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            className={`scenario-card ${scenario.color} ${selected === scenario.id ? 'selected' : ''}`}
            onClick={() => setSelected(scenario.id)}
          >
            <div className="scenario-top">
              <span className="scenario-icon">
                <scenario.icon size={25} />
              </span>
              <span className="radio-indicator">{selected === scenario.id && <span />}</span>
            </div>
            <span className="scenario-label">{scenario.label}</span>
            <h2>{scenario.title}</h2>
            <p>{scenario.description}</p>
            <div className="scenario-rate">
              {scenario.rate}
              <span>%</span>
              <small>des fichiers du laboratoire</small>
            </div>
            <div className="scenario-features">
              {scenario.steps.map((step) => (
                <span key={step}>
                  <Check size={14} />
                  {step}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
      <button
        className={`custom-scenario-button ${selected === 'CUSTOM' ? 'selected' : ''}`}
        onClick={() => setSelected('CUSTOM')}
      >
        <span className="custom-icon">
          <Settings2 size={22} />
        </span>
        <span>
          <strong>Votre scénario, vos règles</strong>
          <small>Définissez le nombre de fichiers et le périmètre des systèmes affectés.</small>
        </span>
        <span className="custom-tag">PERSONNALISÉ</span>
        <span className="radio-indicator">{selected === 'CUSTOM' && <span />}</span>
      </button>
      {selected === 'CUSTOM' && (
        <Panel
          title="Configuration personnalisée"
          subtitle="Sans sélection de système ou service, l’ensemble du laboratoire est éligible."
        >
          <div className="custom-config">
            <div className="form-grid">
              <label>
                Nombre de fichiers affectés
                <input
                  type="number"
                  min={1}
                  max={eligible}
                  value={fileCount}
                  onChange={(e) => setFileCount(e.target.value)}
                />
              </label>
              <div className="config-count">
                <strong>{eligible}</strong>
                <span>fichiers disponibles dans le périmètre</span>
              </div>
            </div>
            <div className="form-grid">
              <div>
                <h3>Postes de travail</h3>
                {data.machines
                  .filter((m) => m.type === 'WORKSTATION')
                  .map((m) => (
                    <label className="checkbox-row" key={m.id}>
                      <input
                        type="checkbox"
                        checked={machineIds.includes(m.id)}
                        onChange={() => toggle(m.id, machineIds, setMachineIds)}
                      />
                      <Monitor size={15} />
                      {m.hostname}
                    </label>
                  ))}
              </div>
              <div>
                <h3>Serveurs</h3>
                {data.machines
                  .filter((m) => m.type === 'SERVER')
                  .map((m) => (
                    <label className="checkbox-row" key={m.id}>
                      <input
                        type="checkbox"
                        checked={machineIds.includes(m.id)}
                        onChange={() => toggle(m.id, machineIds, setMachineIds)}
                      />
                      {m.hostname}
                    </label>
                  ))}
                <h3 className="mt">Services concernés</h3>
                {data.services.map((s) => (
                  <label className="checkbox-row" key={s.id}>
                    <input
                      type="checkbox"
                      checked={serviceIds.includes(s.id)}
                      onChange={() => toggle(s.id, serviceIds, setServiceIds)}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
            <p className="muted">
              Les services sélectionnés ajoutent leurs serveurs au périmètre. Les services dépendant des
              fichiers touchés sont automatiquement marqués comme dégradés.
            </p>
          </div>
        </Panel>
      )}
      <div className="simulation-bottom-grid">
        <Panel
          title="02  Préparez votre exercice"
          subtitle="Donnez un nom à cette simulation pour la retrouver dans vos rapports."
        >
          <div className="padded">
            <label>
              Nom de l’exercice <span className="muted">(facultatif)</span>
              <input
                placeholder="Ex. Exercice de reprise — département finance"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <div className="simulation-summary">
              <span>Scénario sélectionné</span>
              <Badge value={selected === 'CUSTOM' ? 'INFO' : selected}>
                {selected === 'CUSTOM' ? 'Personnalisé' : scenarios.find((s) => s.id === selected)?.label}
              </Badge>
            </div>
            <Button
              variant="primary"
              icon={Play}
              disabled={
                user.role !== 'ADMIN' ||
                !!active ||
                (selected === 'CUSTOM' &&
                  (!Number.isInteger(Number(fileCount)) ||
                    Number(fileCount) < 1 ||
                    Number(fileCount) > eligible)) ||
                (title.trim().length > 0 && title.trim().length < 3)
              }
              onClick={() => setConfirm(true)}
              className="full-width"
            >
              Lancer la simulation
            </Button>
            {user.role !== 'ADMIN' && (
              <p className="field-hint">Le lancement d’un exercice est réservé à l’administrateur.</p>
            )}
          </div>
        </Panel>
        <Panel title="Ce qui va se passer" className="simulation-explainer">
          <div className="padded">
            {[
              ['01', 'Un incident est détecté', 'Les fichiers sélectionnés passent à l’état COMPROMISED.'],
              ['02', 'Votre environnement réagit', 'Les systèmes, services et indicateurs sont mis à jour.'],
              ['03', 'À vous de reprendre la main', 'Suivez l’assistant de restauration jusqu’à la clôture.'],
            ].map(([num, heading, text]) => (
              <div className="explain-step" key={num}>
                <span>{num}</span>
                <div>
                  <strong>{heading}</strong>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Lancer cet exercice ?"
        description="Les statuts fictifs du laboratoire seront mis à jour."
      >
        <div className="padded-inline">
          <div className="info-box">
            <FlaskConical size={24} />
            <p>
              {selected === 'CUSTOM'
                ? `${fileCount} fichiers du périmètre choisi seront compromis.`
                : `${scenarios.find((s) => s.id === selected)?.rate} % des fichiers seront sélectionnés aléatoirement.`}{' '}
              Un nouvel incident et ses journaux seront créés.
            </p>
          </div>
          <CheckLine checked={data.metrics.validBackups > 0}>
            {data.metrics.validBackups} sauvegarde(s) fiable(s) disponible(s)
          </CheckLine>
          <p className="muted">Une sauvegarde complète récente facilite le parcours de restauration.</p>
          <div className="modal-actions">
            <Button onClick={() => setConfirm(false)}>Annuler</Button>
            <Button variant="primary" busy={pending} icon={Play} onClick={launch}>
              Lancer l’exercice
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={running}
        onClose={() => {
          if (!pending) setRunning(false);
        }}
        title={progress === 100 ? 'Incident détecté' : 'Simulation en cours'}
        description="Animation pédagogique · Aucun chiffrement réel."
      >
        <div className="simulation-console">
          <div className="console-heading">
            <Terminal size={16} />
            <span>SENTINEL / SIMULATION ENGINE</span>
            <span className="tiny-dot" />
          </div>
          <p>
            <span>›</span> Initialisation du scénario {selected.toLowerCase()}…
          </p>
          {progress >= 20 && (
            <p>
              <span>›</span> Sélection des ressources fictives…
            </p>
          )}
          {progress >= 40 && (
            <p>
              <span>›</span> Application des changements d’état…
            </p>
          )}
          {result && progress >= 60 && (
            <p className="orange-text">
              <span>!</span> {result.fileIds.length} fichiers signalés COMPROMISED
            </p>
          )}
          {result && progress >= 80 && (
            <p>
              <span>›</span> Incident {result.id} enregistré.
            </p>
          )}
          {progress === 100 && (
            <p className="green-text">
              <span>✓</span> Détection confirmée. À vous de jouer.
            </p>
          )}
        </div>
        <Progress value={progress} label="Visualisation de l’exercice" tone="orange" />
        {result && progress === 100 && (
          <Link to={`/recovery?incident=${result.id}`} className="btn primary full-width mt">
            Prendre en charge l’incident <ArrowRight size={16} />
          </Link>
        )}
      </Modal>
    </>
  );
}
