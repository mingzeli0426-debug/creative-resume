(() => {
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navLinks = [...document.querySelectorAll('.navigation a')];
  const progress = document.createElement('span');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);

  const updateProgress = () => {
    const range = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${range > 0 ? Math.min(1, scrollY / range) : 0})`;
  };
  addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    }), { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    const navObserver = new IntersectionObserver(entries => {
      const current = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
      if (!current) return;
      navLinks.forEach(link => {
        if (link.hash === `#${current.target.id}`) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin:'-20% 0px -65% 0px', threshold:[0,.15,.35] });
    document.querySelectorAll('#strategy,#content,#plan,#review').forEach(el => navObserver.observe(el));
  } else document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));

  const cards = [...document.querySelectorAll('.sample-card')];
  const featureImage = document.querySelector('#sample-hero-image');
  const pageLabel = document.querySelector('#sample-image-index');
  const pageNumber = document.querySelector('#carousel-number');
  const dialog = document.querySelector('#sample-dialog');
  const dialogImage = document.querySelector('#dialog-image');
  const dialogCaption = document.querySelector('#dialog-caption');
  const descriptions = [
    '01 / 05 · 封面：力量有分寸',
    '02 / 05 · 拍学员第一次做这个动作，交代这是晚课里的哪一组练习',
    '03 / 05 · 拍教练调整弹簧的手，让读者先看到她改了哪里',
    '04 / 05 · 同机位拍调整后的下一次动作，保留滑床往返的细节',
    '05 / 05 · 放教练的一句现场解释：这一次为什么这样调整'
  ];
  let activeIndex = 0;
  const setSlide = (index, openDialog = false) => {
    activeIndex = (index + cards.length) % cards.length;
    const card = cards[activeIndex];
    const src = card.dataset.src;
    const alt = card.dataset.alt;
    cards.forEach((item, i) => {
      const active = i === activeIndex;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    featureImage.src = src;
    featureImage.alt = alt;
    pageLabel.textContent = `${String(activeIndex + 1).padStart(2,'0')} / 05`;
    pageNumber.textContent = String(activeIndex + 1).padStart(2,'0');
    dialogImage.src = src;
    dialogImage.alt = alt;
    dialogCaption.textContent = descriptions[activeIndex];
    if (openDialog && !dialog.open) dialog.showModal();
  };
  cards.forEach((card, index) => card.addEventListener('click', () => setSlide(index, true)));
  document.querySelector('#slide-prev').addEventListener('click', () => setSlide(activeIndex - 1));
  document.querySelector('#slide-next').addEventListener('click', () => setSlide(activeIndex + 1));
  document.querySelector('[data-open-sample]').addEventListener('click', () => setSlide(activeIndex, true));
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  document.querySelector('.dialog-prev').addEventListener('click', () => setSlide(activeIndex - 1, true));
  document.querySelector('.dialog-next').addEventListener('click', () => setSlide(activeIndex + 1, true));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  addEventListener('keydown', event => {
    if (!dialog.open) return;
    if (event.key === 'ArrowRight') setSlide(activeIndex + 1, true);
    if (event.key === 'ArrowLeft') setSlide(activeIndex - 1, true);
  });
  cards.forEach(card => { card.style.backgroundImage = `url("${card.dataset.src}")`; });
  setSlide(0);

  const heroImages = document.querySelector('.hero-images');
  if (!prefersReducedMotion && matchMedia('(pointer:fine)').matches) {
    let tick = 0;
    addEventListener('scroll', () => {
      cancelAnimationFrame(tick);
      tick = requestAnimationFrame(() => {
        heroImages.style.setProperty('--hero-shift', `${Math.min(14, scrollY * .018)}px`);
      });
    }, { passive:true });
  }
})();

