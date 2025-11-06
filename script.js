// Ensure we always start at the very top and prevent the browser from restoring scroll
try{ if('scrollRestoration' in history){ history.scrollRestoration = 'manual'; } }catch{}
window.scrollTo(0,0);

document.addEventListener('DOMContentLoaded', () => {
  // Restore scroll position if returning from work detail page
  const returnScrollPos = sessionStorage.getItem('returnScrollPosition');
  const returnReelId = sessionStorage.getItem('returnReelId');
  const isReturning = returnScrollPos || returnReelId;

  if(isReturning){
    // Returning from work page, skip preloader for seamless experience
    const pre = document.getElementById('preloader');
    if(pre) pre.classList.add('hide');
    if(returnScrollPos){
      window.scrollTo(0, parseInt(returnScrollPos, 10));
      sessionStorage.removeItem('returnScrollPosition');
    }
    if(returnReelId){
      const target = document.getElementById(returnReelId);
      if(target){
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
        // Optional: focus for a11y without scrolling
        try{ target.focus({ preventScroll: true }); }catch{ try{ target.focus(); }catch{} }
      }
      sessionStorage.removeItem('returnReelId');
    }
    // Hide any leftover showcase from previous in-page mode
    const slot = document.getElementById('work-showcase-slot');
    if(slot) slot.innerHTML = '';
    const showcase = document.getElementById('work-showcase');
    if(showcase) showcase.hidden = true;
    initHeroScramble();
    initReveals();
    initReelPanels();
    initHeroWorkTransition();
    initNav();
    initTestimonialsLoop();
    initContactMedia();
    initAboutMotion();
    initSilkParallax();
    initGlobalLiquidBg();
    initScrollScramble();
    initSpecificHoverScramble();
    initWorkShowcaseNavigation();
    initShortWordScramble();
  } else {
    initPreloader().then(() => {
      // If we have a specific reel to restore to, do that now (after preloader)
      if(returnReelId){
        const target = document.getElementById(returnReelId);
        if(target){
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
          // Optional: focus for a11y without scrolling
          try{ target.focus({ preventScroll: true }); }catch{ try{ target.focus(); }catch{} }
        }
        sessionStorage.removeItem('returnReelId');
      }
      // Hide any leftover showcase from previous in-page mode
      const slot = document.getElementById('work-showcase-slot');
      if(slot) slot.innerHTML = '';
      const showcase = document.getElementById('work-showcase');
      if(showcase) showcase.hidden = true;
      initHeroScramble();
      initReveals();
      initReelPanels();
      initHeroWorkTransition();
      initNav();
      initTestimonialsLoop();
      initContactMedia();
      initAboutMotion();
      initSilkParallax();
      initGlobalLiquidBg();
      initScrollScramble();
      initSpecificHoverScramble();
      initWorkShowcaseNavigation();
      initShortWordScramble();
    });
  }
});

// Work Showcase Components — keep URL at domain root and scroll to showcase
function initWorkShowcaseNavigation(){
  const slot = document.getElementById('work-showcase-slot');
  const showcase = document.getElementById('work-showcase');
  if(!slot || !showcase) return;
  // Hide the showcase section initially if empty
  if(!slot.innerHTML.trim()) showcase.hidden = true;

  // State to restore position and avoid double-injection
  let currentMode = 'home'; // 'home' | 'work'
  let lastClickedIndex = -1;
  let heroClone = null;

  const panels = Array.from(document.querySelectorAll('.reel-panel'));

  // Accessibility: make panels focusable and operable by keyboard
  panels.forEach(panel => {
    if(!panel.hasAttribute('tabindex')) panel.tabIndex = 0;
    if(!panel.hasAttribute('role')) panel.setAttribute('role', 'button');
    const titleEl = panel.querySelector('.reel-overlay .title');
    if(titleEl && !panel.hasAttribute('aria-label')){
      panel.setAttribute('aria-label', `Open work: ${titleEl.textContent?.trim() || ''}`);
    }
  });

  async function openWorkFromPanel(panel){
    // NEW FLOW: Navigate to a dedicated work page with hero + showcase + get-in-touch
    const workType = panel.getAttribute('data-work');
    if(!workType) return;
    // Persist the hero markup and return position so the new page can render
    const heroHTML = panel.outerHTML;
    try{
      sessionStorage.setItem('work:heroHTML', heroHTML);
      sessionStorage.setItem('work:type', workType);
      sessionStorage.setItem('home:scrollY', String(window.scrollY || 0));
      sessionStorage.setItem('home:reelId', panel.id || '');
      sessionStorage.setItem('home:reelIndex', String(Array.from(document.querySelectorAll('.reel-panel')).indexOf(panel)));
    }catch{}
    // Navigate to the dedicated page (keeps domain root + simple routing)
    window.location.href = `work.html?type=${encodeURIComponent(workType)}`;
  }

  panels.forEach(panel => {
    panel.addEventListener('click', () => openWorkFromPanel(panel));
    panel.addEventListener('keydown', (e) => {
      const key = e.key;
      if(key === 'Enter' || key === ' '){
        e.preventDefault();
        openWorkFromPanel(panel);
      }
    });
  });

  // Previous in-page teardown no longer needed for new-page flow

  // Teardown helper on scroll is configured per open via setupTeardownOnHero
}

async function loadWorkComponent(workType, { append = false } = {}){
  const slot = document.getElementById('work-showcase-slot');
  if(!slot) return;
  slot.setAttribute('aria-busy', 'true');
  try{
    const res = await fetch(`components/work-${workType}.html`, { cache: 'no-store' });
    const html = await res.text();
    if(append){
      slot.insertAdjacentHTML('beforeend', html);
    } else {
      slot.innerHTML = html;
    }
    const section = slot.querySelector('.ws-component');
    initInjectedShowcase(section);
  }catch(err){
    console.error('Failed to load work component', err);
    slot.innerHTML = `<div class="ws-error">Failed to load content. Please try again.</div>`;
  }finally{
    slot.setAttribute('aria-busy', 'false');
  }
}

async function loadContactComponent({ append = true } = {}){
  const slot = document.getElementById('work-showcase-slot');
  if(!slot) return;
  try{
    const res = await fetch(`components/get-in-touch.html`, { cache: 'no-store' });
    const html = await res.text();
    if(append){
      slot.insertAdjacentHTML('beforeend', html);
    } else {
      slot.innerHTML = html;
    }
  }catch(err){
    console.error('Failed to load contact component', err);
  }
}

function initInjectedShowcase(section){
  if(!section) return;
  const list = section.querySelector('.ws-list');
  const items = Array.from(section.querySelectorAll('.ws-item'));
  const preview = section.querySelector('.ws-preview');
  const slideshow = section.querySelector('.ws-slideshow');
  const left = section.querySelector('.ws-left');

  let timer = null;
  let idx = 0;
  let slides = [];

  function renderSlides(){
    if(!slideshow) return;
    slideshow.innerHTML = '';
    slides.forEach((src, i) => {
      const img = document.createElement('img');
      img.src = src.trim();
      img.alt = '';
      img.className = 'ws-slide' + (i === 0 ? ' show' : '');
      slideshow.appendChild(img);
    });
  }

  function start(){
    if(timer || slides.length <= 1) return;
    timer = setInterval(() => {
      const imgs = Array.from(slideshow.querySelectorAll('.ws-slide'));
      if(imgs.length === 0) return;
      imgs.forEach(el => el.classList.remove('show'));
      idx = (idx + 1) % imgs.length;
      imgs[idx].classList.add('show');
    }, 1800);
  }

  function stop(){
    if(timer){ clearInterval(timer); timer = null; }
  }

  function activate(item){
    items.forEach(li => li.classList.toggle('active', li === item));
    const data = (item.getAttribute('data-slides') || '').split(',').filter(Boolean);
    slides = data.length ? data : [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=1200',
      'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1200'
    ];
    idx = 0;
    renderSlides();
    if(preview){ preview.classList.add('show'); }
    if(left){ left.classList.add('shift'); }
    stop();
    start();
  }

  // Initial state: do not auto-activate; preview appears only on hover

  // Interactions
  items.forEach(item => {
    item.addEventListener('mouseenter', () => activate(item));
    item.addEventListener('focusin', () => activate(item));
  });
  if(list){
    list.addEventListener('mouseleave', () => {
      stop();
      items.forEach(li => li.classList.remove('active'));
      if(preview){ preview.classList.remove('show'); }
      if(left){ left.classList.remove('shift'); }
      if(slideshow) slideshow.innerHTML = '';
    });
  }
}

// (Removed featured image block per requirement: no block before About)

// Full-screen cover to mask programmatic scroll transitions
function ensureTransitionCover(){
  let cover = document.querySelector('.transition-cover');
  if(!cover){
    cover = document.createElement('div');
    cover.className = 'transition-cover';
    document.body.appendChild(cover);
  }
  return cover;
}

function showTransitionCover(){
  return new Promise(resolve => {
    const cover = ensureTransitionCover();
    // Force reflow then show
    void cover.offsetWidth;
    cover.classList.add('show');
    // Resolve after transition (fallback 300ms)
    let done = false;
    const onEnd = () => { if(done) return; done = true; cover.removeEventListener('transitionend', onEnd); resolve(); };
    cover.addEventListener('transitionend', onEnd);
    setTimeout(onEnd, 320);
  });
}

function hideTransitionCover(){
  const cover = ensureTransitionCover();
  cover.classList.remove('show');
}

// Clear the injected details when user scrolls upward back to the top of the showcase section
// Teardown now handled by observing when Home becomes dominant

function showShowcase(){
  const section = document.getElementById('work-showcase');
  if(section) section.hidden = false;
}

function hideShowcase(){
  const section = document.getElementById('work-showcase');
  const slot = document.getElementById('work-showcase-slot');
  if(slot) slot.innerHTML = '';
  if(section) section.hidden = true;
}

// Preloader + splash brand flow
function initPreloader(){
  return new Promise(resolve => {
    const pre = document.getElementById('preloader');
    const splash = document.getElementById('splashBrand');
    if(!pre){ resolve(); return; }
    const MIN_MS = 1500;
    const SPLASH_MS = 1100;
    const endPreloader = () => {
      pre.classList.add('hide');
      if(splash){
        splash.classList.add('show');
        setTimeout(() => {
          splash.classList.add('hide');
          setTimeout(resolve, 450);
        }, SPLASH_MS);
      } else {
        setTimeout(resolve, 300);
      }
    };
    if(document.readyState === 'complete'){
      setTimeout(endPreloader, MIN_MS);
    } else {
      window.addEventListener('load', () => setTimeout(endPreloader, MIN_MS));
      // Safety timeout
      setTimeout(endPreloader, 7000);
    }
  });
}

// Reveal-on-scroll for .reveal with 100ms stagger per group
function initReveals(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const groups = [
    document.querySelector('.hero-inner'),
    document.getElementById('work'),
    document.querySelector('.about-wrap'),
    document.querySelector('.testi-inner'),
    document.querySelector('.contact-wrap')
  ].filter(Boolean);

  // Assign per-group stagger indices
  groups.forEach(group => {
    Array.from(group.querySelectorAll('.reveal')).forEach((el, i) => {
      el.dataset.stagger = i.toString();
    });
  });

  const els = Array.from(document.querySelectorAll('.reveal'));
  if(reduce){
    els.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if(entry.isIntersecting){
        const d = parseInt(el.dataset.stagger || '0', 10) || 0;
        setTimeout(() => el.classList.add('in'), d * 100);
        io.unobserve(el); // reveal once
      }
    });
  }, { threshold: 0.6 });
  els.forEach(el => io.observe(el));
}

// Sticky reel panels slide up when active
function initReelPanels(){
  const panels = Array.from(document.querySelectorAll('.reel-panel'));
  if(panels.length === 0) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('is-active', entry.isIntersecting);
    });
  }, { threshold: 0.6 });
  panels.forEach(p => io.observe(p));
}

// Bottom pill nav: active section + smooth scroll
function initNav(){
  const links = Array.from(document.querySelectorAll('.site-bottom-nav a'));
  const setActive = (i) => links.forEach((a,idx) => a.classList.toggle('active', idx === i));
  let current = 0;
  const set = (i) => { if(i !== null && i !== current){ current = i; setActive(i); } };

  // Smooth scroll
  links.forEach(a => {
    a.addEventListener('click', (e) => {
      const targetId = a.getAttribute('data-target') || a.getAttribute('href').replace('#','');
      const el = document.getElementById(targetId);
      if(el){ e.preventDefault(); el.scrollIntoView({ behavior:'smooth' }); }
    });
  });

  // Observe main sections
  const home = document.getElementById('home');
  const about = document.getElementById('about');
  const contact = document.getElementById('contact');
  const showcase = document.getElementById('work-showcase');
  const workPanels = Array.from(document.querySelectorAll('.reel-panel'));

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const id = entry.target.id || '';
      if(id === 'home') set(0);
      else if(id === 'about') set(2);
      else if(id === 'contact') set(3);
    });
  }, { threshold: 0.6 });
  if(home) obs.observe(home);
  if(about) obs.observe(about);
  if(contact) obs.observe(contact);
  if(showcase) obs.observe(showcase);

  const workObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if(entry.isIntersecting) set(1); });
  }, { threshold: 0.6 });
  workPanels.forEach(p => workObs.observe(p));
  if(showcase) workObs.observe(showcase);
}

function initAboutMotion(){
  const about = document.getElementById('about');
  if(!about) return;
  const bgImg = about.querySelector('.about-bg img');
  if(!bgImg) return;
  function update(){
    const rect = about.getBoundingClientRect();
    const py = (-rect.top) * 0.7; // ~0.7 parallax rate
    bgImg.style.setProperty('--py', `${py.toFixed(1)}px`);
  }
  update();
  window.addEventListener('scroll', update, { passive: true });
}

function initSilkParallax(){
  // Parallax disabled to prevent glitching
  return;
}

function initGlobalLiquidBg(){
  const globalBg = document.querySelector('.global-liquid-bg');
  const about = document.getElementById('about');
  const work = document.getElementById('work');
  if(!globalBg || !about) return;
  
  // Only show background when About section is actually visible (not at the end of work)
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting && entry.intersectionRatio > 0.3){
        globalBg.classList.add('active');
      } else if(entry.intersectionRatio < 0.1){
        globalBg.classList.remove('active');
      }
    });
  }, { threshold: [0, 0.1, 0.3, 0.5, 0.7, 1] });
  
  io.observe(about);
  
  // Also keep it active through testimonials and contact
  const testimonials = document.getElementById('testimonials');
  const contact = document.getElementById('contact');
  
  if(testimonials){
    const testIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          globalBg.classList.add('active');
        }
      });
    }, { threshold: 0.1 });
    testIO.observe(testimonials);
  }
  
  if(contact){
    const contactIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          globalBg.classList.add('active');
        }
      });
    }, { threshold: 0.1 });
    contactIO.observe(contact);
  }
}

// Hero letter-scramble cycle
function initHeroScramble(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const h1a = document.getElementById('h1a');
  const h1b = document.getElementById('h1b');
  if(!h1a || !h1b) return;
  if(reduce){
    h1a.textContent = 'VISUAL';
    h1b.textContent = 'DESIGNER';
    return;
  }
  const PAIRS = [
    ['VISUAL','DESIGNER'],
    ['WEBFLOW','DEVELOPER'],
    ['MOTION','DESIGNER'],
    ['VIDEO','EDITOR'],
    ['CREATIVE','DIRECTOR'],
    ['BRAND','STRATEGIST'],
    ['UI','ENGINEER'],
    ['INTERACTION','DESIGNER'],
    ['FILM','MAKER'],
    ['ART','DIRECTOR'],
    ['SOUND','DESIGNER']
  ];
  let idx = 0;
  const SCRAMBLE_MS = 1000;
  const HOLD_MS = 1400;
  function cycle(){
    const [a,b] = PAIRS[idx % PAIRS.length];
    Promise.all([
      scrambleTo(h1a, a, { duration: SCRAMBLE_MS }),
      scrambleTo(h1b, b, { duration: SCRAMBLE_MS })
    ]).then(()=> setTimeout(()=>{ idx++; cycle(); }, HOLD_MS));
  }
  cycle();
}

// Letters-only scramble helper
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function scrambleTo(el, newText, { duration = 1000 } = {}){
  return new Promise(resolve => {
    const oldText = (el.textContent || '').toUpperCase();
    const target = (newText || '').toUpperCase();
    const len = Math.max(oldText.length, target.length);
    const queue = [];
    for(let i=0;i<len;i++){
      const from = oldText[i] || ' ';
      const to = target[i] || ' ';
      const start = Math.random() * (duration * 0.35);
      const end = start + (duration * (0.45 + Math.random()*0.55));
      queue.push({ from, to, start, end, char: '' });
    }
    const t0 = performance.now();
    function frame(now){
      const t = now - t0;
      let out = '';
      let done = 0;
      for(let i=0;i<len;i++){
        const q = queue[i];
        if(t >= q.end){ done++; out += q.to; }
        else if(t >= q.start){
          if(Math.random() < 0.28 || !q.char){
            q.char = LETTERS[(Math.random()*LETTERS.length)|0];
          }
          out += q.char;
        }else{
          out += q.from;
        }
      }
      el.textContent = out;
      if(done === len) resolve();
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

function initTestimonialsLoop(){
  const track = document.querySelector('.marquee-track');
  const wrap = document.querySelector('.testi-marquee');
  if(!track || !wrap) return;
  const base = Array.from(track.children);
  if(base.length === 0) return;
  track.innerHTML = '';
  const wrapW = wrap.getBoundingClientRect().width;
  let firstHalfBuilt = false;
  let guard = 0;
  while(!firstHalfBuilt && guard < 30){
    base.forEach(node => track.appendChild(node.cloneNode(true)));
    if(track.getBoundingClientRect().width >= wrapW * 1.05){
      firstHalfBuilt = true;
    }
    guard++;
  }
  const halfHTML = track.innerHTML;
  track.insertAdjacentHTML('beforeend', halfHTML);
}

function initContactMedia(){
  const section = document.getElementById('contact');
  if(!section) return;
  const items = Array.from(section.querySelectorAll('.cm'));
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        items.forEach(el=>{
          const bg = el.getAttribute('data-bg');
          if(bg){ el.style.backgroundImage = `url("${bg}")`; }
          el.classList.add('show');
        });
        io.disconnect();
      }
    });
  }, { threshold: 0.35 });
  io.observe(section);
  
  // Scramble animation for contact details and socials
  initContactScramble();
}

function initContactScramble(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return;
  
  const email = document.querySelector('.contact-email');
  const phone = document.querySelector('.contact-phone');
  const socials = Array.from(document.querySelectorAll('.contact-socials a'));
  
  const section = document.getElementById('contact');
  if(!section) return;
  
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        // Scramble email
        if(email){
          const emailText = email.textContent;
          scrambleToMixed(email, emailText, { duration: 1200, delay: 0 });
        }
        // Scramble phone
        if(phone){
          const phoneText = phone.textContent;
          scrambleToMixed(phone, phoneText, { duration: 1200, delay: 200 });
        }
        // Scramble social links with stagger
        socials.forEach((link, i)=>{
          const text = link.textContent;
          scrambleToMixed(link, text, { duration: 1000, delay: 400 + i * 120 });
        });
        io.disconnect();
      }
    });
  }, { threshold: 0.4 });
  io.observe(section);
}

// Mixed character scramble (letters, numbers, symbols)
const MIXED_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@.+-()';
function scrambleToMixed(el, newText, { duration = 1000, delay = 0 } = {}){
  return new Promise(resolve => {
    setTimeout(()=>{
      const oldText = el.textContent || '';
      const target = newText || '';
      const len = Math.max(oldText.length, target.length);
      const queue = [];
      for(let i=0;i<len;i++){
        const from = oldText[i] || ' ';
        const to = target[i] || ' ';
        const start = Math.random() * (duration * 0.35);
        const end = start + (duration * (0.45 + Math.random()*0.55));
        queue.push({ from, to, start, end, char: '' });
      }
      const t0 = performance.now();
      function frame(now){
        const t = now - t0;
        let out = '';
        let done = 0;
        for(let i=0;i<len;i++){
          const q = queue[i];
          if(t >= q.end){ done++; out += q.to; }
          else if(t >= q.start){
            if(Math.random() < 0.28 || !q.char){
              q.char = MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0];
            }
            out += q.char;
          }else{
            out += q.from;
          }
        }
        el.textContent = out;
        if(done === len) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }, delay);
  });
}

// Best-in-class scroll-up transition between hero and first work reel
function initHeroWorkTransition(){
  const firstReel = document.getElementById('reel-1');
  if(!firstReel) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return; // keep it simple when reduced motion

  const thresholds = [0, 0.1, 0.6, 1];
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const r = entry.intersectionRatio;
      if(r >= 0.6){
        document.body.classList.add('to-work-start');
        document.body.classList.add('to-work-end');
      } else if(r >= 0.1){
        document.body.classList.add('to-work-start');
        document.body.classList.remove('to-work-end');
      } else {
        document.body.classList.remove('to-work-start');
        document.body.classList.remove('to-work-end');
      }
    });
  }, { threshold: thresholds });
  io.observe(firstReel);
}

// Scroll-based scramble for specific elements only
function initScrollScramble(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return;
  
  // Only these specific elements scramble on scroll
  const selectors = [
    '.site-bottom-nav a',              // nav
    '.contact-socials a',              // socials
    '.stat-num',                       // numbers in about
    '.stat-label',                     // labels in about
    '.about-cta',                      // about button
    '.testi-kicker',                   // "[ Testimonials ]"
    '.contact-email',                  // contact info
    '.contact-phone'                   // contact info
  ];
  
  const elements = Array.from(document.querySelectorAll(selectors.join(',')));
  
  elements.forEach(el => {
    const originalText = el.textContent;
    let hasScrambled = false;
    
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting && !hasScrambled){
          hasScrambled = true;
          scrambleToMixed(el, originalText, { duration: 1200, delay: 0 });
          io.unobserve(el);
        }
      });
    }, { threshold: 0.6 });
    
    io.observe(el);
  });
}

// Specific hover scramble with 80ms restore time
function initSpecificHoverScramble(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return;
  
  // Only these specific elements scramble on hover
  const selectors = [
    '.site-bottom-nav a',              // nav
    '.contact-socials a',              // socials
    '.stat-num',                       // numbers in about
    '.stat-label',                     // labels in about
    '.about-cta',                      // about button
    '.testi-kicker',                   // "[ Testimonials ]"
    '.contact-email',                  // contact info
    '.contact-phone'                   // contact info
  ];
  
  const elements = document.querySelectorAll(selectors.join(','));
  
  elements.forEach(el => {
    // Store original text ONCE at initialization
    const originalText = el.textContent.trim();
    let animationFrame = null;
    
    el.addEventListener('mouseenter', () => {
      if(animationFrame) cancelAnimationFrame(animationFrame);
      
      // Bounded scramble burst (max 300ms) even if still hovered
      const start = performance.now();
      (function frame(now){
        if(now - start > 300) { // stop after burst
          scrambleToFast(el, originalText, 120);
          return;
        }
        let out = '';
        for(let i=0;i<originalText.length;i++){
          out += MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0];
        }
        el.textContent = out;
        animationFrame = requestAnimationFrame(frame);
      })(start);
    });
    
    el.addEventListener('mouseleave', () => {
      if(animationFrame) cancelAnimationFrame(animationFrame);
      
      // Restore immediately to original in 80ms
      scrambleToFast(el, originalText, 80);
    });
  });
}

// Short-word scramble (<= 2 words) applied broadly, excluding homepage hero words
function initShortWordScramble(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return;

  const EXCLUDE = new Set(['h1a','h1b']);
  const candidates = Array.from(document.querySelectorAll(
    'h1,h2,h3,h4,h5,h6,.title,.ws-item,a,button,.stat-num,.stat-label,.about-cta,.contact-email,.contact-phone,.name,.meta,.reel-overlay .title'
  ));

  // De-dupe and filter by short word count
  const uniq = Array.from(new Set(candidates));
  const shortTexts = uniq.filter(el => {
    if(!el || !el.textContent) return false;
    // keep the entire homepage hero intact (not just spans)
    if(EXCLUDE.has(el.id)) return false;
    if(el.closest('.hero')) return false;
    const txt = el.textContent.trim().replace(/\s+/g,' ');
    const words = txt.split(' ').filter(Boolean);
    return words.length > 0 && words.length <= 2;
  });

  // On scroll into view: one-time scramble then restore to original
  shortTexts.forEach(el => {
    if(el.dataset.scrambleBound) return;
    el.dataset.scrambleBound = '1';
    const original = el.textContent;
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          scrambleToMixed(el, original, { duration: 900, delay: 0 }).then(()=>{ el.textContent = el.dataset.scrambleOriginal || original; });
          io.unobserve(el);
        }
      });
    }, { threshold: 0.6 });
    io.observe(el);
    // persist original
    el.dataset.scrambleOriginal = original;
  });

  // Hover burst everywhere for short texts
  shortTexts.forEach(el => {
    const originalText = el.textContent.trim();
    let raf = null;
    el.addEventListener('mouseenter', () => {
      if(raf) cancelAnimationFrame(raf);
      const start = performance.now();
      (function frame(now){
        if(now - start > 300){
          const target = el.dataset.scrambleOriginal || originalText;
          scrambleToFast(el, target, 120);
          return;
        }
        let out = '';
        for(let i=0;i<originalText.length;i++){
          out += MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0];
        }
        el.textContent = out;
        raf = requestAnimationFrame(frame);
      })(start);
    });
    el.addEventListener('mouseleave', () => {
      if(raf) cancelAnimationFrame(raf);
      const target = el.dataset.scrambleOriginal || originalText;
      scrambleToFast(el, target, 100);
    });
  });
}

// Fast scramble away - keeps scrambling while hovering
function scrambleAwayImmediate(el, originalText){
  const len = originalText.length;
  
  function frame(){
    if(!el.matches(':hover')) return; // Stop if no longer hovering
    
    let out = '';
    for(let i=0; i<len; i++){
      out += MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0];
    }
    el.textContent = out;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Fast restore to original text in specified duration
function scrambleToFast(el, targetText, duration){
  const len = targetText.length;
  const queue = [];
  
  for(let i=0; i<len; i++){
    const to = targetText[i];
    const start = Math.random() * (duration * 0.2);
    const end = start + (duration * 0.8);
    queue.push({ to, start, end, char: '' });
  }
  
  const t0 = performance.now();
  
  function frame(now){
    const t = now - t0;
    let out = '';
    let done = 0;
    
    for(let i=0; i<len; i++){
      const q = queue[i];
      if(t >= q.end){ 
        done++; 
        out += q.to; 
      }
      else if(t >= q.start){
        if(Math.random() < 0.3 || !q.char){
          q.char = MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0];
        }
        out += q.char;
      }else{
        out += MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0];
      }
    }
    
    el.textContent = out;
    
    if(done < len){
      requestAnimationFrame(frame);
    } else {
      // Ensure exact text is set
      el.textContent = targetText;
    }
  }
  requestAnimationFrame(frame);
}

// Scramble away from text (makes it random)
function scrambleAway(el, fromText, { duration = 400 } = {}){
  const len = fromText.length;
  const t0 = performance.now();
  
  function frame(now){
    const t = now - t0;
    const progress = Math.min(t / duration, 1);
    
    let out = '';
    for(let i=0; i<len; i++){
      if(Math.random() > progress * 0.7){
        out += MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0];
      } else {
        out += MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0];
      }
    }
    el.textContent = out;
    
    if(progress < 1){
      requestAnimationFrame(frame);
    }
  }
  requestAnimationFrame(frame);
}


