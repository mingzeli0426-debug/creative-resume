(() => {
  const progress = document.querySelector('.reading-progress span');
  const links = [...document.querySelectorAll('.navigation a')];
  const headings = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    const amount = scrollable > 0 ? (scrollY / scrollable) * 100 : 0;
    progress.style.width = `${Math.min(100, Math.max(0, amount))}%`;
  };

  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(section => revealObserver.observe(section));

    const sectionObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach(link => {
        const active = link.hash === `#${visible.target.id}`;
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-25% 0px -55% 0px', threshold: [0, .1, .25, .5] });
    headings.forEach(heading => sectionObserver.observe(heading));

    const hero = document.querySelector('.hero-photo img');
    let frame = 0;
    addEventListener('scroll', () => {
      updateProgress();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (innerWidth > 760) hero.style.transform = `scale(1.035) translateY(${Math.min(13, scrollY * .024)}px)`;
      });
    }, { passive: true });
  } else {
    document.querySelectorAll('.reveal').forEach(section => section.classList.add('is-visible'));
    addEventListener('scroll', updateProgress, { passive: true });
  }
  updateProgress();
})();
