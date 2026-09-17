import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck,
  Clock3,
  Database,
  FileCheck2,
  Files,
  HardDriveDownload,
  Monitor,
  Play,
  RefreshCw,
  Shield,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import { useAuth, useLab } from '../state';
import {
  Badge,
  Button,
  DataTable,
  dateTime,
  Empty,
  PageHeader,
  Panel,
  Progress,
  relativeTime,
  StatCard,
} from '../components/ui';

const chartColors = ['#a8e989', '#f1807b', '#85a5f8'];
export default function Dashboard() {
  const { data, refresh, refreshing } = useLab();
  const { user } = useAuth();
  const [days, setDays] = useState(7);
  const [chart, setChart] = useState('score');
  const m = data.metrics;
  const admin = user.role === 'ADMIN';
  const security = user.role !== 'USER';
  const trend = Array.from({ length: days }, (_, index) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - (days - index - 1));
    const start = new Date(end);
    start.setHours(0, 0, 0, 0);
    const entries = data.scoreHistory.filter((s) => new Date(s.at) <= end);
    return {
      date: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(end),
      score: index === days - 1 ? m.score : (entries.at(-1)?.score ?? null),
      incidents: data.incidents.filter((i) => new Date(i.createdAt) >= start && new Date(i.createdAt) <= end)
        .length,
    };
  });
  const cutoff = Date.now() - days * 86400000;
  const scoreTrend = data.scoreHistory
    .filter((point) => new Date(point.at).getTime() >= cutoff)
    .map((point) => ({
      date: new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(point.at)),
      score: point.score,
    }));
  if (scoreTrend.at(-1)?.score !== m.score) scoreTrend.push({ date: 'Maintenant', score: m.score });
  const distribution = [
    { name: 'Sains', value: m.safe },
    { name: 'Compromis', value: m.compromised },
    { name: 'Restaurés', value: m.restored },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <PageHeader
        eyebrow="CENTRE DE COMMANDement"
        title="Vue d’ensemble"
        description="Une vision claire de votre sécurité. Un pas d’avance sur l’incident."
      >
        <Button
          icon={RefreshCw}
          busy={refreshing}
          onClick={() => refresh().catch(() => {})}
          className="refresh-button"
        >
          Actualiser
        </Button>
        {admin && (
          <Link to="/simulations" className="btn primary">
            <Play size={15} fill="currentColor" />
            Lancer une simulation
          </Link>
        )}
      </PageHeader>
      <div className={`system-banner ${m.activeIncidents ? 'system-warning' : ''}`}>
        <div className="system-banner-icon">
          {m.activeIncidents ? <Activity size={25} /> : <ShieldCheck size={25} />}
        </div>
        <div>
          <div className="system-banner-title">
            {m.compromised
              ? 'Un exercice est en cours. Gardez le contrôle.'
              : m.activeIncidents
                ? 'Vos données sont restaurées. Finalisez la reprise.'
                : 'Tous vos systèmes sont opérationnels.'}
            <span className="live-pill">
              <span className="tiny-dot" /> EN DIRECT
            </span>
          </div>
          <p>
            {m.activeIncidents
              ? `${m.compromised} fichiers compromis · ${m.activeIncidents} incident actif · Suivez votre plan de reprise.`
              : 'Votre environnement est protégé. Le prochain exercice commence quand vous le décidez.'}
          </p>
        </div>
        <div className="banner-right">
          <span>État du laboratoire</span>
          <Badge value={m.systemStatus} />
        </div>
      </div>
      <div className="section-label">
        <h2>Votre environnement</h2>
        <span>
          <Clock3 size={13} /> Mis à jour {relativeTime(data.updatedAt).toLowerCase()}
        </span>
      </div>
      <div className="stat-grid">
        <StatCard
          label="Systèmes surveillés"
          value={m.machines}
          icon={Monitor}
          tone="blue"
          detail={
            <>
              <span className="muted">{m.workstations} postes de travail</span>
              <span className="stat-sep">·</span>
              {m.servers} serveurs
            </>
          }
        />
        <StatCard
          label="Fichiers simulés"
          value={m.totalFiles}
          icon={Files}
          tone="purple"
          detail={
            <>
              <span className="green-text">{m.safe + m.restored} protégés</span>
              <span className="stat-sep">·</span>
              {m.compromised} compromis
            </>
          }
        />
        <StatCard
          label="Sauvegardes disponibles"
          value={m.backups.toString().padStart(2, '0')}
          icon={HardDriveDownload}
          tone="green"
          detail={
            <>
              <span className="green-text">
                <Check size={12} />
                {m.validBackups} fiable{m.validBackups > 1 ? 's' : ''}
              </span>
              <span className="stat-sep">·</span>
              {relativeTime(m.latestBackup)}
            </>
          }
        />
        <StatCard
          label="Incidents actifs"
          value={m.activeIncidents.toString().padStart(2, '0')}
          icon={Shield}
          tone="orange"
          detail={
            m.activeIncidents ? (
              <span className="orange-text">Intervention requise</span>
            ) : (
              <span className="green-text">
                <CircleCheck size={12} />
                Aucune menace en cours
              </span>
            )
          }
        />
      </div>
      <div className="dashboard-main-grid">
        <Panel
          title="L’évolution de votre résilience"
          subtitle="Mesurez l’efficacité de vos actions au fil des exercices."
          className="trend-panel"
          action={
            <select
              aria-label="Période du graphique"
              className="select-compact"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7 derniers jours</option>
              <option value={14}>14 derniers jours</option>
              <option value={30}>30 derniers jours</option>
            </select>
          }
        >
          <div className="chart-tabs">
            <button className={chart === 'score' ? 'active' : ''} onClick={() => setChart('score')}>
              <span className="chart-dot" />
              Score de résilience
            </button>
            {security && (
              <button className={chart === 'incidents' ? 'active' : ''} onClick={() => setChart('incidents')}>
                <span className="chart-dot blue" />
                Incidents
              </button>
            )}
            <span className="chart-unit">{chart === 'score' ? 'SCORE / 100' : 'NOMBRE D’INCIDENTS'}</span>
          </div>
          <div className="trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              {chart === 'score' ? (
                <AreaChart data={scoreTrend} margin={{ top: 12, right: 14, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a8e989" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#a8e989" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                    minTickGap={30}
                    dy={9}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      color: 'var(--text)',
                    }}
                    formatter={(value) => [`${value}/100`, 'Résilience']}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#a8e989"
                    strokeWidth={2.5}
                    fill="url(#scoreGradient)"
                    dot={{ r: 3, fill: '#a8e989', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                </AreaChart>
              ) : (
                <BarChart data={trend} margin={{ top: 12, right: 14, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                    }}
                  />
                  <Bar
                    name="Incidents"
                    dataKey="incidents"
                    fill="#85a5f8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="chart-footnote">
            <span className="tiny-dot" />
            {chart === 'score'
              ? 'Les mesures commencent à l’initialisation du laboratoire.'
              : 'Incidents réellement créés dans cet environnement fictif.'}
          </div>
        </Panel>
        <Panel
          title="Score de résilience"
          action={<ShieldCheck size={18} className="muted" />}
          className="score-panel"
        >
          <div className="score-gauge">
            <svg viewBox="0 0 220 166">
              <path
                d="M 35 139 A 87 87 0 1 1 185 139"
                fill="none"
                stroke="var(--track)"
                strokeWidth="13"
                strokeLinecap="round"
              />
              <motion.path
                d="M 35 139 A 87 87 0 1 1 185 139"
                fill="none"
                stroke={m.score >= 75 ? '#a8e989' : m.score >= 40 ? '#eabe7b' : '#f1807b'}
                strokeWidth="13"
                strokeLinecap="round"
                pathLength="100"
                initial={{ strokeDasharray: '0 100' }}
                animate={{ strokeDasharray: `${m.score} 100` }}
                transition={{ duration: 1 }}
              />
            </svg>
            <div className="gauge-label">
              <strong>
                {m.score}
                <span>/100</span>
              </strong>
              <span className={m.score >= 75 ? 'green-text' : 'orange-text'}>
                {m.score >= 90
                  ? 'Excellente résilience'
                  : m.score >= 75
                    ? 'Bonne résilience'
                    : m.score >= 40
                      ? 'À renforcer'
                      : 'Risque critique'}
              </span>
            </div>
          </div>
          <div className="score-breakdown">
            <div>
              <span>Santé des fichiers</span>
              <strong>{Math.round(((m.safe + m.restored) / m.totalFiles) * 100)} %</strong>
            </div>
            <div>
              <span>Couverture des sauvegardes</span>
              <strong>{m.coverage} %</strong>
            </div>
            <div>
              <span>Disponibilité des services</span>
              <strong>{Math.round((m.onlineServices / m.totalServices) * 100)} %</strong>
            </div>
          </div>
          <div className="score-hint">
            <Zap size={15} />
            <span>Chaque exercice renforce votre préparation.</span>
          </div>
        </Panel>
      </div>
      <div className="dashboard-secondary-grid">
        <Panel
          title="État des fichiers"
          subtitle="L’intégrité de votre patrimoine numérique."
          action={
            <Link to="/files" className="text-link">
              Explorer <ArrowUpRight size={14} />
            </Link>
          }
        >
          <div className="file-distribution">
            <div className="donut-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    isAnimationActive={false}
                    data={distribution}
                    dataKey="value"
                    innerRadius={49}
                    outerRadius={64}
                    strokeWidth={0}
                    paddingAngle={m.compromised || m.restored ? 4 : 0}
                  >
                    {distribution.map((entry, i) => (
                      <Cell key={entry.name} fill={chartColors[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-label">
                <strong>{m.totalFiles}</strong>
                <span>fichiers</span>
              </div>
            </div>
            <div className="donut-legend">
              {distribution.map((d, i) => (
                <div key={d.name}>
                  <span>
                    <i style={{ background: chartColors[i] }} />
                    {d.name}
                  </span>
                  <strong>{d.value}</strong>
                  <span>{Math.round((d.value / m.totalFiles) * 100)} %</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel
          title="Disponibilité des services"
          subtitle={`${m.onlineServices} services opérationnels sur ${m.totalServices}`}
          action={
            <Link to="/infrastructure" className="text-link">
              Infrastructure <ArrowUpRight size={14} />
            </Link>
          }
        >
          <div className="services-list">
            {data.services.map((s, i) => (
              <div className="service-row" key={s.id}>
                <div className={`service-icon service-${i}`}>
                  <Database size={17} />
                </div>
                <div>
                  <strong>{s.name}</strong>
                  <span>{s.description}</span>
                </div>
                <Badge value={s.status} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
      {security && (
        <Panel
          title="Derniers incidents"
          subtitle="Suivez le cycle de vie de vos exercices de sécurité."
          action={
            <Link to="/incidents" className="text-link">
              Tous les incidents <ArrowRight size={14} />
            </Link>
          }
        >
          <DataTable
            rows={data.incidents.slice(0, 5)}
            columns={[
              {
                key: 'id',
                label: 'INCIDENT',
                render: (i) => (
                  <div className="table-title">
                    <span className="table-icon">
                      <Shield size={17} />
                    </span>
                    <div>
                      <strong>{i.title}</strong>
                      <small>{i.id}</small>
                    </div>
                  </div>
                ),
              },
              { key: 'severity', label: 'GRAVITÉ', render: (i) => <Badge value={i.severity} /> },
              { key: 'status', label: 'STATUT', render: (i) => <Badge value={i.status} /> },
              { key: 'createdAt', label: 'DÉTECTION', render: (i) => dateTime(i.createdAt) },
              { key: 'files', label: 'IMPACT', render: (i) => `${i.fileIds.length} fichiers` },
              {
                key: 'action',
                label: '',
                render: () => (
                  <Link to="/incidents" className="icon-btn" aria-label="Consulter les incidents">
                    <ArrowUpRight size={17} />
                  </Link>
                ),
              },
            ]}
            empty={{
              title: 'Le calme avant votre prochain exercice',
              description:
                'Lancez une simulation pour observer la détection et tester votre capacité de reprise.',
              icon: ShieldCheck,
            }}
          />
        </Panel>
      )}
      {admin && (
        <Panel
          title="Journal d’activité"
          action={
            <Link to="/logs" className="text-link">
              Voir les journaux <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="activity-list">
            {data.logs.slice(0, 4).map((log) => (
              <div key={log.id} className="activity-item">
                <span className={`activity-icon ${log.level.toLowerCase()}`}>
                  <Activity size={15} />
                </span>
                <div>
                  <strong>{log.detail}</strong>
                  <span>
                    {log.actor} <span className="stat-sep">·</span>{' '}
                    {log.action.replaceAll('_', ' ').toLowerCase()}
                  </span>
                </div>
                <time>{relativeTime(log.at)}</time>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <div className="dashboard-bottom-note">
        <FlaskNote />
        Toutes les ressources sont fictives. Votre apprentissage, lui, est bien réel.
      </div>
    </motion.div>
  );
}
function FlaskNote() {
  return <ShieldCheck size={14} />;
}
