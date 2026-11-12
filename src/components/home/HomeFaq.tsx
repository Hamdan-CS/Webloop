import { useRef } from 'react';
import { Accordion } from '@/components/shared/ui/Accordion';
import { StickerTrail } from './StickerTrail';
import { FAQ } from './homeContent';

/** 10 · FAQ: Genie accordion with the sticker trail behind it. */
export function HomeFaq() {
  const ref = useRef<HTMLElement>(null);
  return (
    <section ref={ref} className="gh-faq" id="faq" aria-labelledby="gh-faq-h">
      <StickerTrail targetRef={ref} />
      <div className="gh-wrap">
        <div className="gh-sechd"><h2 id="gh-faq-h" className="gh-display">Questions</h2></div>
        <Accordion items={FAQ} />
      </div>
    </section>
  );
}
