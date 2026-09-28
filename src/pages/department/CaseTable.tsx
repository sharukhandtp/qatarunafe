import clsx from 'clsx'
import { AlarmClock } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { DepartmentRequestSummary } from '../../api/types'
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge'
import { Table, Td, Th } from '../../components/ui/Layout'
import { formatRelative } from '../../lib/format'
import { t } from '../../i18n'
import { isTerminal } from '../../lib/labels'

export function CaseTable({ items, compact }: { items: DepartmentRequestSummary[]; compact?: boolean }) {
  const navigate = useNavigate()

  return (
    <Table>
      <thead>
        <tr>
          <Th>{t('department.table.reference')}</Th>
          <Th>{t('department.table.case')}</Th>
          {!compact && <Th className="hidden md:table-cell">{t('department.table.applicant')}</Th>}
          <Th className="hidden sm:table-cell">{t('department.table.priority')}</Th>
          <Th>{t('department.table.status')}</Th>
          {!compact && <Th className="hidden lg:table-cell">{t('department.table.assigned')}</Th>}
          <Th className="hidden lg:table-cell">{t('department.table.due')}</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {items.map((c) => (
          <tr key={c.id} onClick={() => navigate(`/department/cases/${c.id}`)} className="cursor-pointer hover:bg-slate-50">
            <Td className="font-mono text-xs whitespace-nowrap">{c.referenceNumber}</Td>
            <Td>
              <p className="max-w-xs truncate font-medium text-slate-900">{c.title}</p>
              <p className="max-w-xs truncate text-xs text-slate-500">
                {c.serviceName} · {c.serviceCode}
              </p>
            </Td>
            {!compact && <Td className="hidden md:table-cell">{c.applicantName}</Td>}
            <Td className="hidden sm:table-cell">
              <PriorityBadge priority={c.priority} />
            </Td>
            <Td>
              <StatusBadge status={c.status} />
            </Td>
            {!compact && (
              <Td className="hidden lg:table-cell">
                {c.assignedToName ?? <span className="text-slate-400">{t('department.unassigned')}</span>}
              </Td>
            )}
            <Td className={clsx('hidden whitespace-nowrap lg:table-cell', c.isOverdue && 'font-medium text-red-600')}>
              {c.isOverdue && <AlarmClock className="me-1 inline size-3.5 align-[-2px]" aria-hidden />}
              {c.dueAt && !isTerminal(c.status) ? formatRelative(c.dueAt) : '—'}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
