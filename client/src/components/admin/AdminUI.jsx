import clsx from 'clsx'
import { Search } from 'lucide-react'

export const AdminPageShell = ({ eyebrow = 'Admin portal', title, description, actions, children }) => (
  <div className="space-y-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-slate-500 sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
    {children}
  </div>
)

export const AdminSurface = ({ className, children }) => (
  <div className={clsx('admin-surface', className)}>{children}</div>
)

export const AdminSectionCard = ({ title, description, action, className, children }) => (
  <AdminSurface className={clsx('p-5 sm:p-6', className)}>
    {(title || action || description) ? (
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {title ? <h2 className="text-base font-semibold text-slate-950 sm:text-lg">{title}</h2> : null}
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    ) : null}
    {children}
  </AdminSurface>
)

export const AdminStatCard = ({ icon: Icon, label, value, helper, tone = 'blue', trend }) => (
  <AdminSurface className="p-4 sm:p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]">{value}</p>
        {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
        {trend ? <div className="mt-3 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{trend}</div> : null}
      </div>
      <div className={clsx('admin-icon-shell', `admin-icon-shell-${tone}`)}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
    </div>
  </AdminSurface>
)

export const AdminSearchField = ({ value, onChange, placeholder, className = '' }) => (
  <label className={clsx('admin-filter-field min-w-0', className)}>
    <Search className="h-4 w-4 text-slate-400" />
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full min-w-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
    />
  </label>
)

export const AdminSelect = ({ value, onChange, children, className = '' }) => (
  <select
    value={value}
    onChange={onChange}
    className={clsx('admin-select-field', className)}
  >
    {children}
  </select>
)

const toneClasses = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-50 text-blue-700',
  indigo: 'bg-blue-50 text-blue-700',
  violet: 'bg-blue-50 text-blue-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-rose-50 text-rose-700'
}

export const AdminStatusBadge = ({ tone = 'slate', children, className = '' }) => (
  <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', toneClasses[tone] || toneClasses.slate, className)}>
    {children}
  </span>
)

export const AdminTable = ({ headers, children }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-left">
      <thead>
        <tr className="border-b border-slate-100">
          {headers.map((header) => (
            <th key={header} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 first:pl-0 last:pr-0">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
)

export const AdminEmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
  </div>
)

export const AdminPagination = ({ page = 1, pages = 0, onPageChange }) => {
  if (!pages || pages <= 1) return null

  const start = Math.max(1, page - 1)
  const end = Math.min(pages, start + 2)
  const visiblePages = []

  for (let index = start; index <= end; index += 1) {
    visiblePages.push(index)
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
      <p className="text-sm text-slate-500">Page {page} of {pages}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Previous
        </button>
        {visiblePages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={clsx(
              'h-10 w-10 rounded-full text-sm font-semibold transition',
              item === page
                ? 'bg-blue-600 text-white shadow-[0_14px_30px_-16px_rgba(37,99,235,0.8)]'
                : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
            )}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pages, page + 1))}
          disabled={page === pages}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Next
        </button>
      </div>
    </div>
  )
}
