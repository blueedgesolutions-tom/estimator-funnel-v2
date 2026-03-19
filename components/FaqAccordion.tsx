'use client';

import { useRef, useState } from 'react';
import type { FaqItem } from '@/lib/types';

interface FaqAccordionProps {
  items: FaqItem[];
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const answerRefs = useRef<(HTMLDivElement | null)[]>([]);

  async function toggle(index: number) {
    const isOpen = openIndex === index;

    // Try GSAP for smooth height animation, fall back to instant toggle
    try {
      const { gsap } = await import('gsap');

      // Close previously open item
      if (openIndex !== null && openIndex !== index) {
        const prevEl = answerRefs.current[openIndex];
        if (prevEl) {
          gsap.to(prevEl, { height: 0, duration: 0.3, ease: 'power2.inOut' });
        }
      }

      const el = answerRefs.current[index];
      if (!el) return;

      if (isOpen) {
        gsap.to(el, { height: 0, duration: 0.3, ease: 'power2.inOut' });
        setOpenIndex(null);
      } else {
        gsap.fromTo(
          el,
          { height: 0 },
          { height: el.scrollHeight, duration: 0.3, ease: 'power2.inOut' }
        );
        setOpenIndex(index);
      }
    } catch {
      // Fallback without GSAP
      setOpenIndex(isOpen ? null : index);
      const el = answerRefs.current[index];
      if (el) {
        el.style.height = isOpen ? '0' : `${el.scrollHeight}px`;
      }
    }
  }

  return (
    <div className="faq-list">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index} className={`faq-item${isOpen ? ' open' : ''}`}>
            <button
              className="faq-question"
              onClick={() => toggle(index)}
              aria-expanded={isOpen}
            >
              <span>{item.question}</span>
              <span className="faq-chevron" aria-hidden="true" />
            </button>
            <div
              className="faq-answer"
              ref={(el) => { answerRefs.current[index] = el; }}
              style={{ height: 0 }}
            >
              <div className="faq-answer-inner">{item.answer}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
