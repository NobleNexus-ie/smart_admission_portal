import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Users, Shield, Eye, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/AnimatedPage';
import { getErrorMessage } from '@/lib/utils';
import { staffApi, type StaffMember } from '@/api/staff';

const ROLE_LABELS: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  school_admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700', icon: ShieldCheck },
  reviewer: { label: 'Reviewer', color: 'bg-blue-100 text-blue-700', icon: Shield },
  viewer: { label: 'Viewer', color: 'bg-slate-100 text-slate-600', icon: Eye },
};

export function StaffMembersPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('reviewer');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await staffApi.listMembers();
      setMembers(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    try {
      await staffApi.inviteMember({
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
      });
      setShowInvite(false);
      setInviteName('');
      setInviteEmail('');
      setInviteRole('reviewer');
      loadMembers();
    } catch (e) {
      setInviteError(getErrorMessage(e));
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await staffApi.removeMember(removeTarget.id);
      setRemoveTarget(null);
      loadMembers();
    } catch (e) {
      setError(getErrorMessage(e));
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <AnimatedPage className="page-container max-w-3xl">
      <FadeIn>
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-glow">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="section-title">Staff Members</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Manage who has access to your school's applications
              </p>
            </div>
          </div>
          <Button onClick={() => setShowInvite(true)} className="shadow-glow">
            <Plus className="h-4 w-4" />
            Invite staff
          </Button>
        </div>
      </FadeIn>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {members.length === 0 ? (
        <FadeIn>
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No staff members yet.</p>
          </div>
        </FadeIn>
      ) : (
        <StaggerContainer className="space-y-3">
          {members.map((member) => {
            const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.viewer;
            const RoleIcon = roleInfo.icon;
            return (
              <StaggerItem key={member.id}>
                <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-soft transition hover:shadow-card">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <RoleIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {member.name}
                      </p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleInfo.color}`}
                    >
                      {roleInfo.label}
                    </span>
                    {member.role !== 'school_admin' && (
                      <button
                        onClick={() => setRemoveTarget(member)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        title="Remove staff member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {/* Invite modal */}
      <Modal
        open={showInvite}
        onClose={() => {
          setShowInvite(false);
          setInviteError(null);
        }}
        title="Invite staff member"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowInvite(false);
                setInviteError(null);
              }}
            >
              Cancel
            </Button>
            <Button loading={inviting} onClick={() => {
              const form = document.getElementById('invite-form') as HTMLFormElement;
              form?.requestSubmit();
            }}>
              Send invite
            </Button>
          </>
        }
      >
        <form id="invite-form" onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Full name"
            required
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="John Doe"
          />
          <Input
            label="Email"
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="staff@school.edu"
          />
          <Select
            label="Role"
            required
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={[
              { value: 'reviewer', label: 'Reviewer — can review and act on applications' },
              { value: 'viewer', label: 'Viewer — can only view applications' },
              { value: 'school_admin', label: 'Admin — full access including settings' },
            ]}
          />
          {inviteError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {inviteError}
            </p>
          )}
        </form>
      </Modal>

      {/* Remove confirmation */}
      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove staff member"
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              loading={removing}
              onClick={handleRemove}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to remove{' '}
          <span className="font-semibold">{removeTarget?.name}</span> (
          {removeTarget?.email})? They will lose access to the school portal
          immediately.
        </p>
      </Modal>
    </AnimatedPage>
  );
}
