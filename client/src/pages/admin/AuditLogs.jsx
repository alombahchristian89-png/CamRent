import { useState } from 'react'
import { useQuery } from 'react-query'
import { ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import {
  AdminEmptyState,
  AdminPageShell,
  AdminPagination,
  AdminSectionCard,
  AdminTable
} from '../../components/admin/AdminUI'
import { formatDateTimeLabel } from '../../components/admin/adminUtils'

const AdminAuditLogs = () => {
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery(
    ['adminAuditLogs', { page }],
    () => adminAPI.getAuditLogs({ page }),
    {
      keepPreviousData: true,
      select: (response) => response.data.data,
      onError: () => {
        toast.error('Failed to load audit logs')
      }
    }
  )

  const { logs = [], pagination } = data || {}

  const getDetailsText = (log) => {
    if (log?.details?.message) return log.details.message
    if (log?.details?.reason) return log.details.reason

    const actorName = log?.actor?.name || log?.admin?.name || log?.details?.actorName || 'System'
    const action = String(log?.actionType || 'updated').replaceAll('_', ' ')
    const entity = String(log?.entityType || 'record').replaceAll('_', ' ')
    const targetName = log?.targetUser?.name || log?.targetUser?.email || null

    return targetName
      ? `${actorName} ${action} ${entity} for ${targetName}`
      : `${actorName} ${action} ${entity}`
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <AdminPageShell
        eyebrow="Dashboard / Audit Logs"
        title="Audit Logs"
        description="Trace sensitive admin actions for accountability, compliance, and support investigations."
      >
        <AdminSectionCard title="Recent activity" description="Every verification change, role edit, and moderation action is recorded here.">
          <AdminEmptyState
            icon={ClipboardList}
            title="Unable to load audit records"
            description={error?.response?.data?.message || 'There was a problem loading audit data. Retry to continue.'}
          />
          <div className="mt-5">
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </AdminSectionCard>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      eyebrow="Dashboard / Audit Logs"
      title="Audit Logs"
      description="Trace sensitive admin actions for accountability, compliance, and support investigations."
    >
      {isFetching ? (
        <p className="text-xs text-slate-500">Refreshing activity feed...</p>
      ) : null}
      <AdminSectionCard title="Recent activity" description="Every verification change, role edit, and moderation action is recorded here.">
        {logs.length === 0 ? (
          <AdminEmptyState
            icon={ClipboardList}
            title="No audit records yet"
            description="Audit entries will appear automatically when admins approve, reject, suspend, edit, or delete records."
          />
        ) : (
          <>
            <AdminTable headers={['Actor', 'Role', 'Action', 'Target', 'Details', 'Time']}>
              {logs.map((log) => (
                <tr key={log.id} className="admin-table-row">
                  <td className="px-4 py-4 first:pl-0 text-sm font-semibold text-slate-900">
                    {log.actor?.name || log.admin?.name || log.details?.actorName || 'System'}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600 capitalize">
                    {log.actor?.role || log.actorRole || 'system'}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600 capitalize">
                    {String(log.actionType || '').replaceAll('_', ' ')}
                    <div className="mt-1 text-xs text-slate-400 capitalize">{log.entityType}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {log.targetUser?.name || log.targetUser?.email || 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500">
                    {getDetailsText(log)}
                  </td>
                  <td className="px-4 py-4 last:pr-0 text-sm text-slate-500">
                    {formatDateTimeLabel(log.createdAt)}
                  </td>
                </tr>
              ))}
            </AdminTable>

            <AdminPagination
              page={pagination?.page || 1}
              pages={pagination?.pages || 0}
              onPageChange={setPage}
            />
          </>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  )
}

export default AdminAuditLogs