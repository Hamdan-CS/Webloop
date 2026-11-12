import type { ReactNode } from 'react';
import { Cloud } from '@/design-system/illustrations/Cloud';
import { LoopMark } from '@/design-system/illustrations/LoopMark';
import { ClayObject } from '@/design-system/illustrations/ClayObject';
import { VerifyRow } from '@/components/shared/ui/VerifyRow';

/**
 * Split auth layout (F5): the page's existing form card on the left, a sky
 * panel on the right with clouds, the loop mark and a sample verified
 * project. Purely presentational — the form JSX, its handlers and its
 * Supabase calls are passed through untouched as `children`.
 */
export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="auth-split">
      <div className="auth-split-form">{children}</div>
      <aside className="auth-split-aside" aria-hidden="true">
        <Cloud tone="white" width="62%" style={{ left: '-14%', bottom: '-6%' }} className="g-drift" />
        <Cloud tone="sky" width="48%" style={{ right: '-12%', bottom: '10%' }} className="g-drift" />
        <Cloud tone="white" width="30%" style={{ right: '6%', top: '6%' }} className="g-drift" />
        <ClayObject kind="star" size={58} style={{ position: 'absolute', left: '12%', top: '14%' }} />
        <ClayObject kind="shield" size={54} style={{ position: 'absolute', right: '14%', top: '40%' }} />
        {aside ?? (
          <div className="auth-split-inner">
            <LoopMark variant="glossy" pulse width={120} />
            <p className="auth-split-cap">Build real. <span className="acc">Prove it.</span></p>
            <div className="auth-split-card">
              <div className="auth-split-hd">
                <b>Carbon Ledger</b>
                <span className="chip chip-ok">Shipped</span>
              </div>
              <VerifyRow status="verified" label="Commit linked" source="a91f3c2" time="2 min" />
              <VerifyRow status="verified" label="Reviewed by GreenLeaf" time="1 h" />
              <VerifyRow status="pending" label="Mentor sign-off" />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
