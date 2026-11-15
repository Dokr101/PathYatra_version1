import { useEffect, useState } from 'react'
import { ShieldCheck, UserCheck, UserX, UsersRound } from 'lucide-react'
import type { AdminUser, UserRole } from '../../lib/api'
import { apiErrorMessage } from '../../lib/api'
import { useApp } from '../../context/AppContext'
import {
  useAdminApi,
  useDebounced,
  useFlash,
  usePageTitle,
  usePagedList,
} from '../../lib/adminHooks'
import { ConfirmDialog } from '../../components/admin/ConfirmDialog'
import {
  AdminButton,
  InlineAlert,
  LoadingBlock,
  PageHeader,
  Pagination,
  SearchBox,
  Select,
  StatusBadge,
  UpdatedCell,
} from '../../components/admin/AdminUI'
import { formatDate } from '../../lib/adminFormat'

type Pending =
  | { kind: 'status'; user: AdminUser; next: boolean }
  | { kind: 'role'; user: AdminUser; next: UserRole }
  | null

export function AdminUsers() {
  usePageTitle('Users')
  const api = useAdminApi()
  const { user: me } = useApp()
  const { flash, success, fail } = useFlash()

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query)
  const [role, setRole] = useState('')
  const [active, setActive] = useState('')
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<Pending>(null)

  useEffect(() => setPage(1), [debouncedQuery, role, active])

  const { data, loading, error, reload } = usePagedList(
    () =>
      api.users.list({
        q: debouncedQuery,
        role,
        isActive: active,
        page,
        pageSize: 20,
      }),
    [debouncedQuery, role, active, page],
  )

  const isSuper = me?.role === 'SUPER_ADMIN'

  const apply = async () => {
    if (!pending) return
    try {
      if (pending.kind === 'status') {
        await api.users.setStatus(pending.user.id, pending.next)
        success(
          pending.next
            ? `${pending.user.email} reactivated.`
            : `${pending.user.email} disabled. Existing sessions are blocked immediately.`,
        )
      } else {
        await api.users.setRole(pending.user.id, pending.next)
        success(`${pending.user.email} is now ${pending.next.replace('_', ' ')}.`)
      }
      setPending(null)
      reload()
    } catch (reason) {
      fail(reason)
      throw reason
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Registered accounts and admin roles. Password hashes, tokens and secrets are never shown in this panel."
        actions={
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-mute">
            <span className="chip">
              <UsersRound size={11} /> {data?.total ?? 0} accounts
            </span>
            {data?.roleCounts
              ? (['USER', 'ADMIN', 'SUPER_ADMIN'] as const).map((key) => (
                  <span key={key} className="chip">
                    {key.replace('_', ' ')}: {data.roleCounts[key] ?? 0}
                  </span>
                ))
              : null}
          </div>
        }
      />

      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

      <div className="rounded-2xl border border-line bg-[#fffdf8] p-3">
        <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_1fr]">
          <SearchBox value={query} onChange={setQuery} placeholder="Search name or email…" />
          <Select value={role} onChange={setRole}>
            <option value="">All roles</option>
            <option value="USER">Users</option>
            <option value="ADMIN">Admins</option>
            <option value="SUPER_ADMIN">Super admins</option>
          </Select>
          <Select value={active} onChange={setActive}>
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Disabled</option>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-[#fffdf8]">
        {loading && !data ? (
          <div className="p-4">
            <LoadingBlock rows={5} />
          </div>
        ) : data && data.items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <UsersRound size={22} className="mx-auto mb-3 text-ink-mute" />
            <h3 className="font-display text-xl">No accounts match this view</h3>
            <p className="mt-1.5 text-sm text-ink-soft">
              Public accounts are created by signing up on the site. Admins are seeded or promoted by
              a super admin.
            </p>
          </div>
        ) : data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-2/50 text-[10px] uppercase tracking-[0.12em] text-ink-mute">
                    <th className="px-4 py-3 font-semibold">Account</th>
                    <th className="px-3 py-3 font-semibold">Role</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Joined</th>
                    <th className="px-3 py-3 font-semibold">Activity</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.items.map((account) => {
                    const isSelf = account.id === me?.id
                    return (
                      <tr key={account.id} className="hover:bg-paper-2/30">
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            {account.fullName}
                            {isSelf ? (
                              <span className="ml-2 rounded-full bg-paper-2 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-ink-mute">
                                You
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] text-ink-mute">{account.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          {isSuper && !isSelf ? (
                            <Select
                              value={account.role}
                              onChange={(value) =>
                                setPending({ kind: 'role', user: account, next: value as UserRole })
                              }
                              className="!w-[150px] !py-1.5 text-xs"
                            >
                              <option value="USER">User</option>
                              <option value="ADMIN">Admin</option>
                              <option value="SUPER_ADMIN">Super admin</option>
                            </Select>
                          ) : (
                            <StatusBadge status={account.role} />
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={account.isActive ? 'ACTIVE' : 'DISABLED'} />
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-soft">{formatDate(account.createdAt)}</td>
                        <td className="px-3 py-3 text-[11px] text-ink-soft">
                          {account._count.itineraries} trips · {account._count.reviews} reviews
                          <span className="block text-[10px] text-ink-mute">
                            {account._count.favorites} saved destinations
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <AdminButton
                              size="sm"
                              variant={account.isActive ? 'danger' : 'secondary'}
                              disabled={isSelf}
                              title={isSelf ? 'You cannot change your own status' : undefined}
                              onClick={() =>
                                setPending({ kind: 'status', user: account, next: !account.isActive })
                              }
                            >
                              {account.isActive ? (
                                <>
                                  <UserX size={11} /> Disable
                                </>
                              ) : (
                                <>
                                  <UserCheck size={11} /> Reactivate
                                </>
                              )}
                            </AdminButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-3">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                pageSize={data.pageSize}
                onPage={setPage}
              />
            </div>
          </>
        ) : (
          <div className="p-4">
            <InlineAlert tone="error">{apiErrorMessage(error)}</InlineAlert>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper-2/50 px-4 py-3 text-[11px] text-ink-soft">
        <ShieldCheck size={14} className="text-pine" />
        Role changes require a super admin. Admins can disable ordinary users, but only a super admin
        can disable another administrator. At least one active super admin always remains.
      </div>

      <ConfirmDialog
        open={pending?.kind === 'status'}
        title={pending?.kind === 'status' && pending.next ? 'Reactivate this account?' : 'Disable this account?'}
        description={
          pending?.kind === 'status' ? (
            pending.next ? (
              <>
                <strong>{pending.user.email}</strong> will be able to sign in again. Their saved trips
                are untouched.
              </>
            ) : (
              <>
                <strong>{pending.user.email}</strong> will be blocked immediately, including existing
                tokens. Their data is kept. You can reactivate the account later.
              </>
            )
          ) : null
        }
        confirmLabel={pending?.kind === 'status' && pending.next ? 'Reactivate account' : 'Disable account'}
        tone={pending?.kind === 'status' && pending.next ? 'primary' : 'danger'}
        onCancel={() => setPending(null)}
        onConfirm={apply}
      />

      <ConfirmDialog
        open={pending?.kind === 'role'}
        title="Change this account’s role?"
        description={
          pending?.kind === 'role' ? (
            <>
              <strong>{pending.user.email}</strong> will change from{' '}
              <strong>{pending.user.role.replace('_', ' ')}</strong> to{' '}
              <strong>{pending.next.replace('_', ' ')}</strong>.{' '}
              {pending.next === 'SUPER_ADMIN'
                ? 'Super admins can change other roles and disable administrators.'
                : pending.next === 'ADMIN'
                  ? 'Admins can manage all content but not roles.'
                  : 'This removes all admin panel access.'}
            </>
          ) : null
        }
        confirmLabel="Change role"
        tone="primary"
        onCancel={() => setPending(null)}
        onConfirm={apply}
      />
    </div>
  )
}
