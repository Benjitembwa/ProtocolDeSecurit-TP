import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileSearch,
  LoaderCircle,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const labels = {
  SAFE: 'Sain',
  COMPROMISED: 'Compromis',
  RESTORED: 'Restauré',
  ONLINE: 'En ligne',
  OFFLINE: 'Hors ligne',
  RECOVERING: 'En reprise',
  PROTECTED: 'Protégé',
  DEGRADED: 'Dégradé',
  VALID: 'Valide',
  CORRUPTED: 'Corrompue',
  DETECTED: 'Détecté',
  CONTAINED: 'Contenu',
  RECOVERY: 'Restauration',
  RESOLVED: 'Résolu',
  LOW: 'Faible',
  MEDIUM: 'Modérée',
  HIGH: 'Élevée',
  CRITICAL: 'Critique',
  ADMIN: 'Administrateur',
  SECURITY_ANALYST: 'Analyste sécurité',
  USER: 'Utilisateur',
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  VERIFIED: 'Intégrité vérifiée',
  FAILED: 'Échec d’intégrité',
  INFO: 'Information',
  WARNING: 'Attention',
  ERROR: 'Erreur',
  SUCCESS: 'Succès',
};
export const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—';
export const shortDate = (value) =>
  value ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(value)) : '—';
export const relativeTime = (value) => {
  if (!value) return 'Jamais';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(value)) / 60000));
  return mins < 1
    ? 'À l’instant'
    : mins < 60
      ? `Il y a ${mins} min`
      : mins < 1440
        ? `Il y a ${Math.floor(mins / 60)} h`
        : `Il y a ${Math.floor(mins / 1440)} j`;
};
export const bytes = (value) =>
  value >= 1073741824
    ? `${(value / 1073741824).toFixed(1)} Go`
    : value >= 1048576
      ? `${(value / 1048576).toFixed(1)} Mo`
      : `${Math.round(value / 1024)} Ko`;
export const duration = (seconds) =>
  seconds == null
    ? 'En cours'
    : seconds < 60
      ? `${seconds} s`
      : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
export function Badge({ value, children, className = '' }) {
  return (
    <span className={`badge badge-${value?.toLowerCase()} ${className}`}>
      <span className="badge-dot" />
      {children || labels[value] || value}
    </span>
  );
}
export function Button({ children, icon: Icon, busy, variant = 'secondary', className = '', ...props }) {
  return (
    <button className={`btn ${variant} ${className}`} {...props} disabled={props.disabled || busy}>
      {busy ? <LoaderCircle size={16} className="spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title = 'Aucun résultat',
  description = 'Essayez de modifier vos filtres.',
  icon: Icon = FileSearch,
  children,
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={25} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-skeleton" aria-label="Chargement" role="status">
      <div className="skeleton sk-title" />
      <div className="stat-grid">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="skeleton sk-stat" />
        ))}
      </div>
      <div className="skeleton sk-chart" />
      <div className="skeleton sk-chart" />
    </div>
  );
}
export function Modal({ open, onClose, title, description, children, wide }) {
  const headingId = useId();
  const dialog = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => dialog.current?.querySelector('input, select, button')?.focus(), 30);
    const keydown = (e) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const items = [
          ...(dialog.current?.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], textarea:not(:disabled), [tabindex="0"]',
          ) || []),
        ].filter((el) => el.getClientRects().length);
        const first = items[0];
        const last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [open]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.section
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className={`modal ${wide ? 'modal-wide' : ''}`}
            initial={{ y: 16, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
          >
            <div className="modal-heading">
              <div>
                <h2 id={headingId}>{title}</h2>
                {description && <p>{description}</p>}
              </div>
              <button className="icon-btn" aria-label="Fermer" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
export function Hash({ value, full = false }) {
  if (!value) return <span className="muted">—</span>;
  return (
    <button
      className={`hash ${full ? 'hash-full' : ''}`}
      title={`Copier SHA-256 : ${value}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast.success('Empreinte SHA-256 copiée.');
        } catch {
          toast.error('Copie indisponible dans ce navigateur.');
        }
      }}
    >
      <span>{full ? value : `${value.slice(0, 10)}…${value.slice(-6)}`}</span>
      <Copy size={12} />
    </button>
  );
}
export function Progress({ value, tone = 'green', label }) {
  return (
    <div className="progress-wrap">
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          <strong>{value} %</strong>
        </div>
      )}
      <div
        className={`progress-track ${tone}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progression'}
      >
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.6 }} />
      </div>
    </div>
  );
}
export function StatCard({ label, value, icon: Icon, detail, tone = 'green', children }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className={`stat-icon ${tone}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="stat-value">
        {value}
        {children}
      </div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}
export function DataTable({
  columns,
  rows,
  searchKeys = [],
  searchPlaceholder = 'Rechercher…',
  empty,
  toolbar,
  pageSize = 8,
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(null);
  const filtered = rows.filter(
    (row) =>
      !query ||
      searchKeys.some((key) =>
        String(row[key] || '')
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
  );
  const sorted = sort
    ? [...filtered].sort((a, b) =>
        typeof a[sort.key] === 'number'
          ? (a[sort.key] - b[sort.key]) * sort.direction
          : String(a[sort.key] || '').localeCompare(String(b[sort.key] || ''), 'fr', { numeric: true }) *
            sort.direction,
      )
    : filtered;
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  return (
    <div className="data-table">
      {(searchKeys.length > 0 || toolbar) && (
        <div className="table-toolbar">
          {searchKeys.length > 0 && (
            <div className="search-field">
              <Search size={16} />
              <input
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
              {query && (
                <button
                  className="icon-btn small"
                  onClick={() => {
                    setQuery('');
                    setPage(1);
                  }}
                  aria-label="Effacer la recherche"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          {toolbar}
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>
                  {col.sortable ? (
                    <button
                      className="sort-btn"
                      onClick={() =>
                        setSort({ key: col.key, direction: sort?.key === col.key ? -sort.direction : 1 })
                      }
                    >
                      {col.label}
                      {sort?.key === col.key ? (
                        sort.direction === 1 ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        )
                      ) : null}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice((current - 1) * pageSize, current * pageSize).map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!sorted.length && <Empty {...empty} />}
      <div className="table-footer">
        <span>
          {sorted.length ? (current - 1) * pageSize + 1 : 0}–{Math.min(current * pageSize, sorted.length)} sur{' '}
          {sorted.length} résultat{sorted.length > 1 ? 's' : ''}
        </span>
        <div className="pagination">
          <button
            className="icon-btn small"
            aria-label="Page précédente"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {current} / {pages}
          </span>
          <button
            className="icon-btn small"
            aria-label="Page suivante"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
export function SafetyNote({ children }) {
  return (
    <div className="safety-note">
      <ShieldCheck size={17} />
      <span>
        {children ||
          'Environnement isolé · Les simulations affectent uniquement les données fictives du laboratoire.'}
      </span>
    </div>
  );
}
export function CheckLine({ checked, children }) {
  return (
    <div className={`check-line ${checked ? 'checked' : ''}`}>
      <span>{checked && <Check size={12} />}</span>
      {children}
    </div>
  );
}
