'use client';

import React, { useRef, useEffect } from 'react';
import { Zap, ShieldCheck, Users } from 'lucide-react';
import { useFunnel } from '../FunnelProvider';
import { resolveCopy } from '@/lib/copy';
import FaqAccordion from '../FaqAccordion';
import type { TenantConfig, FaqItem } from '@/lib/types';

interface Props {
  tenant: TenantConfig;
}

const HOW_IT_WORKS = [
  {
    title: 'Share your vision',
    desc: 'Tell us your target pool size and the features you want. Takes about 2 minutes.',
  },
  {
    title: 'We run the numbers',
    desc: 'Our proprietary pricing engine builds a personalized range from our actual internal pricing data',
  },
  {
    title: 'Review your breakdown',
    desc: 'See every cost itemised: pool model, equipment, decking, and more.',
  },
  {
    title: 'Book if you\'re ready',
    desc: 'Schedule a free consultation with our team whenever it suits you. No pressure.',
  },
];

const INTRO_FAQS: FaqItem[] = [
  {
    question: 'Is this free to use?',
    answer: 'Completely free. No account, no credit card, no strings attached. You answer a few questions and get a real number.',
  },
  {
    question: "Do I have to talk to anyone to see my estimate?",
    answer: "No. You'll get your personalized estimate range instantly, no phone calls, no meetings required. The free design consultation is only if you want to finalize exact pricing and get a 3D rendering of your pool.",
  },
  {
    question: "What's included in the base price of the pool I select?",
    answer: "The base pool packages cover excavation, steel reinforcement, shotcrete shell, premium plaster finish, pump, filter, salt system, plumbing, electrical, startup chemicals, LED lighting, and entry steps. Heaters, automation, enclosures, decking, etc. are priced as add-ons based on your selections.",
  },
  {
    question: 'Will someone call me afterward?',
    answer: 'We\'ll typically have someone (a real person) text a quick hello, and check in with you to see if you have any questions. Our sales process is purely consultative, we make ourselves useful and let you move at your own pace. Besides, we\'re a pool builder, we frankly don\'t have time to spam you.',
  },
  {
    question: 'I don\'t get it... What\'s in it for you?',
    answer: 'Honestly? We\'d rather earn your trust before asking for anything. Most contractors make you sit through a 2-hour consultation before you see a single number. We think that\'s backwards. Give you something useful upfront, let you do your homework, and if it\'s a good fit, you\'ll let us know. If not, at least you\'ve got a ballpark for your project.',
  },
  {
    question: 'How accurate is the estimate?',
    answer: 'Typically within 5-10% of our final quote - as long as the scope doesn\'t change. We use our actual internal pricing data, so what you see reflects what we charge. The only variable we can\'t account for upfront is your yard\'s specific conditions, which is why we give a range instead of a single number.',
  },
  {
    question: 'How long does this take?',
    answer: 'Under 2 minutes. Select your pool size and options, click Submit, and that\'s it. No waiting around for someone to send you numbers. You get a real estimate instantly.',
  },
  {
    question: 'Do I need to know exactly what I want?',
    answer: 'Not at all. We walk you through every option step by step, with descriptions and pricing shown along the way.',
  },
];

export default function IntroStep({ tenant }: Props) {
  const { handleNext } = useFunnel();
  const copy = resolveCopy(tenant);

  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!timelineRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);
        ctx = gsap.context(() => {
          const items    = Array.from(timelineRef.current!.querySelectorAll<HTMLElement>('.nst-item'));
          const segments = Array.from(timelineRef.current!.querySelectorAll<HTMLElement>('.nst-segment'));
          if (!items.length) return;

          gsap.set(items,    { opacity: 0, x: (i) => i % 2 === 0 ? -28 : 28 });
          gsap.set(segments, { scaleY: 0 });

          const ITEM_DUR = 0.45;
          const SEG_DUR  = 0.6;
          const BEAT     = ITEM_DUR + SEG_DUR;

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: timelineRef.current,
              start: 'top bottom',
              once: true,
            },
          });

          items.forEach((item, i) => {
            tl.to(item, { opacity: 1, x: 0, duration: ITEM_DUR, ease: 'power2.out' }, i * BEAT);
          });
          segments.forEach((seg, i) => {
            tl.to(seg, { scaleY: 1, duration: SEG_DUR, ease: 'power1.inOut', transformOrigin: 'top center' }, i * BEAT + ITEM_DUR);
          });
        }, timelineRef);
      }
    );
    return () => ctx?.revert();
  }, []);

  return (
    <div style={{ width: '100%' }}>

      {/* Hero */}
      <main className="page-content">
        <div className="intro-content">
          <div className="eyebrow">{copy.intro.eyebrow}</div>
          <h1 className="headline-display" style={{ marginBottom: 'var(--space-lg)' }}>
            {copy.intro.headline}
          </h1>
          <p className="subheadline" style={{ maxWidth: 530, marginBottom: 'var(--space-xl)' }}>
            {copy.intro.subheadline}
          </p>

          <button className="btn-primary btn-lg" onClick={() => handleNext()}>
            {copy.intro.cta}
          </button>

          <div className="trust-list">
            {([
              [Zap,         copy.intro.trust1],
              [ShieldCheck, copy.intro.trust2],
              [Users,       copy.intro.trust3],
            ] as const).map(([Icon, text], i) => (
              <div className="trust-item" key={i}>
                <div className="trust-item-icon">
                  <Icon size={16} strokeWidth={1.5} />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* How it works */}
      <section className="page-section bg-off-white">
        <div className="page-section-inner">
          <div className="eyebrow" style={{ justifyContent: 'center' }}>How it works</div>
          <h2 className="headline-section" style={{ marginBottom: 'var(--space-2xl)' }}>
            Your estimate in 4 simple steps
          </h2>
          <div className="nst-timeline" ref={timelineRef}>
            {HOW_IT_WORKS.map((step, i) => {
              const isLeft = i % 2 === 0;
              return (
                <React.Fragment key={i}>
                  <div className="nst-item">
                    {isLeft ? (
                      <>
                        <div className="nst-content nst-content-left">
                          <h4>{step.title}</h4>
                          <p>{step.desc}</p>
                        </div>
                        <div className="nst-dot">{i + 1}</div>
                        <div className="nst-spacer" />
                      </>
                    ) : (
                      <>
                        <div className="nst-spacer" />
                        <div className="nst-dot">{i + 1}</div>
                        <div className="nst-content nst-content-right">
                          <h4>{step.title}</h4>
                          <p>{step.desc}</p>
                        </div>
                      </>
                    )}
                  </div>
                  {i < HOW_IT_WORKS.length - 1 && (
                    <div className="nst-connector">
                      <div className="nst-segment" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pre-CTA FAQ */}
      <section className="page-section">
        <div className="page-section-inner">
          <div className="eyebrow">Common questions</div>
          <h2 className="headline-section" style={{ marginBottom: 'var(--space-xl)' }}>
            Good to know before you start
          </h2>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'left' }}>
            <FaqAccordion items={INTRO_FAQS} />
          </div>
        </div>
      </section>

    </div>
  );
}
