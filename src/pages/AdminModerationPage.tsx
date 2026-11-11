import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, ShieldOff, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/design-system';
import { Button } from '@/components/shared/ui/Button';
import { Badge } from '@/components/shared/ui/Badge';
import { relativeDate } from '@/utils/labels';
import { LoopLoader } from '@/components/shared/ui/LoopLoader';
import {
  adminRemovePost,
  adminRestorePost,
  adminVerifyPost,
  checkIsAdmin,
  fetchModerationQueue,
} from '@/features/feed/services/feedApi';
import type { ModerationQueueItem } from '@/features/feed/types';

/** Flagged/removed posts, for admins only — report_count and not_helpful_count
 * are never exposed through the regular feed queries (column grant excludes
 * them), so this page is the only place those numbers are visible. */
export function AdminModerationPage() {
  const { loading } = useAuth();
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<ModerationQueueItem[] | null>(null);

  useEffect(() => {
    checkIsAdmin().then((v) => {
      setIsAdmin(v);
      setChecked(true);
      if (v) fetchModerationQueue().then(setItems);
    });
  }, []);

  if (loading || !checked) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoopLoader size={28} />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/feed" replace />;

  async function removeOrRestore(item: ModerationQueueItem) {
    if (item.removed_at) {
      await adminRestorePost(item.id);
    } else {
      const reason = window.prompt('Reason for removing this post?') ?? '';
      await adminRemovePost(item.id, reason);
    }
    setItems(await fetchModerationQueue());
  }

  async function toggleVerified(item: ModerationQueueItem) {
    await adminVerifyPost(item.id, !item.is_verified);
    setItems(await fetchModerationQueue());
  }

  return (
    <div className="container-page py-8">
      <h1 className="heading text-2xl">Moderation queue</h1>
      <p className="mt-1 text-sm text-slate-400">Posts with reports, "not helpful" marks, or that are currently removed.</p>

      <div className="mt-6 flex flex-col gap-3">
        {items === null ? (
          <LoopLoader size={24} />
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing to review.</p>
        ) : (
          items.map((item) => (
            <GlassCard key={item.id} raised className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-500">
                  by {item.author_name} · {relativeDate(item.created_at)}
                </p>
              </div>
              {item.report_count > 0 && <Badge tone="rose">{item.report_count} reports</Badge>}
              {item.not_helpful_count > 0 && <Badge tone="amber">{item.not_helpful_count} not helpful</Badge>}
              {item.removed_at && <Badge tone="rose">Removed{item.removed_reason ? `: ${item.removed_reason}` : ''}</Badge>}
              {item.is_verified && <Badge tone="accent">Verified</Badge>}
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => toggleVerified(item)}>
                  {item.is_verified ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                  {item.is_verified ? 'Unverify' : 'Verify'}
                </Button>
                <Button size="sm" variant={item.removed_at ? 'secondary' : 'danger'} onClick={() => removeOrRestore(item)}>
                  <Shield size={13} /> {item.removed_at ? 'Restore' : 'Remove'}
                </Button>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
