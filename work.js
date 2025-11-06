// Work detail page script
(function(){
  document.addEventListener('DOMContentLoaded', () => {
    mountHero();
    loadShowcase();
    wireNav();
    watchHeroForReturn();
    lazyContactMedia();
    initShortWordScramble();
  });

  function get(key){
    try{ return sessionStorage.getItem(key); }catch{ return null; }
  }
  function set(key,val){
    try{ sessionStorage.setItem(key,val); }catch{}
  }

  function mountHero(){
    const mount = document.getElementById('work-hero-mount');
    if(!mount) return;
    const html = get('work:heroHTML');
    if(html){
      mount.innerHTML = html;
    }else{
      // Fallback simple hero
      mount.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center"><h1 style="letter-spacing:.15em">WORK</h1></div>';
    }
  }

  async function loadShowcase(){
    const slot = document.getElementById('work-showcase-slot');
    if(!slot) return;
    slot.setAttribute('aria-busy','true');
    const params = new URLSearchParams(location.search);
    const type = params.get('type') || get('work:type') || 'storytelling';
    try{
      const res = await fetch(`components/work-${type}.html`, { cache: 'no-store' });
      const html = await res.text();
      slot.innerHTML = html;
      // initialize minimal slideshow behavior similar to index (optional)
      initInjectedShowcase(slot.querySelector('.ws-component'));
    }catch(err){
      console.error('Failed to load work component', err);
      slot.innerHTML = '<div class="ws-error">Failed to load content.</div>';
    }finally{
      slot.setAttribute('aria-busy','false');
    }
  }

  function initInjectedShowcase(section){
    if(!section) return;
    const items = Array.from(section.querySelectorAll('.ws-item'));
    const preview = section.querySelector('.ws-preview');
    const slideshow = section.querySelector('.ws-slideshow');
    const left = section.querySelector('.ws-left');

    const colors = ['#df8383ff', '#8db78dff', '#8686b4ff', '#e9e99cff', '#f4abf4ff', '#b4f7f7ff', '#edd2a1ff', '#f59bf5ff', '#ffc0cb', '#e89595ff'];

    let timer=null, idx=0, slides=[];
    function renderSlides(){
      if(!slideshow) return;
      slideshow.innerHTML = '';
      slides.forEach((src,i)=>{
        const img=document.createElement('img');
        img.src=src.trim();img.alt='';
        img.className='ws-slide'+(i===0?' show':'');
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        img.style.border = `80px solid ${randomColor}`;
        img.style.backgroundColor = randomColor;
        slideshow.appendChild(img);
      });
    }
    function start(){ if(timer||slides.length<=1) return; timer=setInterval(()=>{
      const imgs=Array.from(slideshow.querySelectorAll('.ws-slide'));
      if(imgs.length===0) return;
      imgs.forEach(el=>el.classList.remove('show'));
      idx=(idx+1)%imgs.length; imgs[idx].classList.add('show');
    },1800);} 
    function stop(){ if(timer){clearInterval(timer); timer=null;} }
    function activate(item){
      items.forEach(li=>li.classList.toggle('active', li===item));
      const data=(item.getAttribute('data-slides')||'').split(',').filter(Boolean);
      slides=data.length?data:[
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
        'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=1200',
        'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=1200'
      ];
      idx=0; renderSlides();
      if(preview) preview.classList.add('show');
      if(left) left.classList.add('shift');
      // Removed auto-start of slideshow
    }
    // Do not auto-activate; preview only on hover/focus
    items.forEach(item=>{
      item.addEventListener('mouseenter',()=>activate(item));
      item.addEventListener('focusin',()=>activate(item));
    });
    const list=section.querySelector('.ws-list');
    if(list){ list.addEventListener('mouseleave',()=>{
      stop(); items.forEach(li=>li.classList.remove('active'));
      if(preview) preview.classList.remove('show');
      if(left) left.classList.remove('shift');
      if(slideshow) slideshow.innerHTML='';
    }); }
  }

  function wireNav(){
    const links = Array.from(document.querySelectorAll('.site-bottom-nav a'));
    links.forEach(a=>{
      a.addEventListener('click', (e)=>{
        const target = a.getAttribute('data-target');
        if(target === 'home'){
          e.preventDefault();
          goHome();
          return;
        }
        const href = a.getAttribute('href') || '';
        if(href.startsWith('#')){
          e.preventDefault();
          const id = href.slice(1);
          const el = document.getElementById(id);
          if(el) el.scrollIntoView({ behavior:'smooth' });
        }
      });
    });
  }

  function goHome(){
    // Use the original position captured on click from the homepage
    const y = get('home:scrollY');
    const reelId = get('home:reelId');
    if(y) set('returnScrollPosition', y);
    if(reelId) set('returnReelId', reelId);
    window.location.href = 'index.html';
  }

  function watchHeroForReturn(){
    const hero = document.getElementById('work-hero');
    if(!hero) return;
    let hasScrolled = false; // user moved down at least once
    let armed = false;       // safe to return triggers
    let sectionsViewed = { hero: false, showcase: false, contact: false };

    // Observe sections to mark as viewed
    const heroIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) sectionsViewed.hero = true;
      });
    }, { threshold: 0.5 });
    heroIO.observe(hero);

    const showcaseEl = document.getElementById('work-showcase');
    if (showcaseEl) {
      const showcaseIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) sectionsViewed.showcase = true;
        });
      }, { threshold: 0.5 });
      showcaseIO.observe(showcaseEl);
    }

    const contactEl = document.getElementById('contact');
    if (contactEl) {
      const contactIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) sectionsViewed.contact = true;
        });
      }, { threshold: 0.5 });
      contactIO.observe(contactEl);
    }

    const onScroll = () => {
      // Consider the user as having scrolled once they leave the top a little
      if(!hasScrolled && window.scrollY > 4){
        hasScrolled = true;
      }
      // Arm after user leaves hero by ~30% viewport OR once scrolled any amount
      if(!armed && (window.scrollY > window.innerHeight * 0.3 || (hasScrolled && window.scrollY > 20))){
        armed = true;
      }
      // Allow return on scroll to top if all sections viewed
      if(window.scrollY <= 10 && sectionsViewed.hero && sectionsViewed.showcase){
        goHome();
      }
      // If armed and at top (or very near), return home immediately
      if(armed && window.scrollY <= 2){
        tryReturn();
      }
    };
    // Debounced top detection for mobile browsers with dynamic toolbars
    let topTimer = null;
    window.addEventListener('scroll', () => {
      onScroll();
      if(armed && window.scrollY <= 10){
        clearTimeout(topTimer);
        topTimer = setTimeout(() => {
          if(armed && window.scrollY <= 10){ tryReturn(); }
        }, 160);
      }
    }, { passive: true });

    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(!armed) return;
        if(entry.isIntersecting && entry.intersectionRatio > 0.7){
          tryReturn();
        }
      });
    }, { threshold: [0,0.4,0.7,1] });
    io.observe(hero);

    // Pointer-based fallback: hovering/touching the hero after scrolling back
    const tryReturn = () => {
      if (!sectionsViewed.hero || !sectionsViewed.showcase) return;
      armed = false; goHome();
    };
    hero.addEventListener('mouseenter', tryReturn);
    hero.addEventListener('touchstart', tryReturn, { passive: true });
  }

  function lazyContactMedia(){
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
  }

  // ==============================
  // Scramble utilities for work page
  // ==============================
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
              if(Math.random() < 0.28 || !q.char){ q.char = MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0]; }
              out += q.char;
            } else {
              out += q.from;
            }
          }
          el.textContent = out;
          if(done === len) resolve(); else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }, delay);
    });
  }
  function scrambleToFast(el, targetText, duration){
    const len = targetText.length;
    const queue = [];
    for(let i=0;i<len;i++){
      const to = targetText[i];
      const start = Math.random() * (duration * 0.2);
      const end = start + (duration * 0.8);
      queue.push({ to, start, end, char: '' });
    }
    const t0 = performance.now();
    function frame(now){
      const t = now - t0; let out = ''; let done = 0;
      for(let i=0;i<len;i++){
        const q = queue[i];
        if(t >= q.end){ done++; out += q.to; }
        else if(t >= q.start){
          if(Math.random() < 0.3 || !q.char){ q.char = MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0]; }
          out += q.char;
        } else {
          out += MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0];
        }
      }
      el.textContent = out;
      if(done < len) requestAnimationFrame(frame); else el.textContent = targetText;
    }
    requestAnimationFrame(frame);
  }

  function initShortWordScramble(){
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; if(reduce) return;
    const candidates = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,.title,.ws-item,a,button,.name,.meta'));
    const uniq = Array.from(new Set(candidates));
    const shortTexts = uniq.filter(el => {
      if(!el || !el.textContent) return false;
      const txt = el.textContent.trim().replace(/\s+/g,' ');
      const words = txt.split(' ').filter(Boolean);
      return words.length > 0 && words.length <= 2;
    });

    shortTexts.forEach(el => {
      if(el.dataset.scrambleBound) return;
      el.dataset.scrambleBound = '1';
      const original = el.textContent;
      el.dataset.scrambleOriginal = original;
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            scrambleToMixed(el, original, { duration: 900 }).then(()=>{ el.textContent = el.dataset.scrambleOriginal || original; });
            io.unobserve(el);
          }
        });
      }, { threshold: 0.6 });
      io.observe(el);
    });

    shortTexts.forEach(el => {
      const originalText = (el.dataset.scrambleOriginal || el.textContent).trim();
      let raf = null;
      el.addEventListener('mouseenter', () => {
        if(raf) cancelAnimationFrame(raf);
        const start = performance.now();
        (function frame(now){
          if(now - start > 300){ scrambleToFast(el, originalText, 120); return; }
          let out = '';
          for(let i=0;i<originalText.length;i++) out += MIXED_CHARS[(Math.random()*MIXED_CHARS.length)|0];
          el.textContent = out;
          raf = requestAnimationFrame(frame);
        })(start);
      });
      el.addEventListener('mouseleave', () => { if(raf) cancelAnimationFrame(raf); scrambleToFast(el, originalText, 100); });
    });
  }
})();
