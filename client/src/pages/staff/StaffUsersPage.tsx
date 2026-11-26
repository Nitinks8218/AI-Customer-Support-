import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError, formatDateOnly } from '../../lib/api';
import type { User, UserRole } from '../../types/api';
import { Card, ErrorState, PageHeader, Select, Skeleton } from '../../components/ui/Primitives';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../app/AuthContext';

export function StaffUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await apiRequest<User[]>('/staff/users')).data
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) =>
      apiRequest<User>(`/staff/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      pushToast({ type: 'success', title: `Updated ${res.data.name} to ${res.data.role}` });
    },
    onError: (err) => {
      pushToast({
        type: 'error',
        title: 'Role update failed',
        description: err instanceof ApiError ? err.message : 'Unable to update role'
      });
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Access Control"
        title="Team & User Roles"
        description="Admin-only view for managing customer, support, and administrator permissions."
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : isError || !data ? (
        <ErrorState message={(error as Error)?.message ?? 'Unable to load users'} onRetry={() => void refetch()} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-subtle/50 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-semibold text-ink">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{u.email}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{formatDateOnly(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Select
                        aria-label={`Role for ${u.name}`}
                        value={u.role}
                        disabled={u.id === currentUser?.id || roleMutation.isPending}
                        onChange={(e) =>
                          roleMutation.mutate({ userId: u.id, role: e.target.value as UserRole })
                        }
                        className="w-36 py-1.5 text-xs"
                      >
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="SUPPORT">SUPPORT</option>
                        <option value="ADMIN">ADMIN</option>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
