(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const navbar   = document.getElementById('navbar');
    const menuBtn  = document.getElementById('menuBtn');
    const navLinks = document.querySelectorAll('#navLinks a');
    const progress = document.getElementById('progress');
    const toTop    = document.getElementById('toTop');
    const heroBg   = document.getElementById('heroBg');

    /* ---------- dark / light theme ---------- */
    const root     = document.documentElement;
    const themeBtn = document.getElementById('themeBtn');

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
        themeBtn.setAttribute('aria-label', label);
        themeBtn.title = label;
    }

    applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

    themeBtn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.classList.add('theme-anim');
        applyTheme(next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        setTimeout(() => root.classList.remove('theme-anim'), 600);
    });

    /* ---------- animated logo: split "Kana Net" into letters ---------- */
    const logo = document.getElementById('logo');
    if (logo) {
        const text = logo.textContent.trim();
        logo.textContent = '';
        [...text].forEach((ch, i) => {
            const s = document.createElement('span');
            s.className = 'ch' + (ch === ' ' ? ' sp' : '');
            s.textContent = ch === ' ' ? '\u00A0' : ch;
            s.style.setProperty('--i', i);
            s.setAttribute('aria-hidden', 'true');
            logo.appendChild(s);
        });
    }

    /* ---------- hero: scroll-driven background ---------- */
    const hero        = document.getElementById('home');
    const heroShade   = document.getElementById('heroShade');
    const heroContent = document.getElementById('heroContent');
    let heroScrollY = 0;

    function heroScroll(y) {
        if (reduceMotion || !hero) return;
        const vh = window.innerHeight;
        if (y > vh * 1.2) return;
        const p = Math.min(y / vh, 1);
        heroScrollY = y;

        heroBg.style.transform = `translate3d(0, ${y * 0.28}px, 0) scale(${1 + p * 0.18})`;
        heroShade.style.opacity = (p * 0.6).toFixed(3);
        heroContent.style.transform = `translate3d(0, ${-p * 70}px, 0)`;
        heroContent.style.opacity = Math.max(0, 1 - p * 1.3).toFixed(3);
        hero.style.setProperty('--sy', y);
    }

    /* ---------- hero: particle network + mouse trail + cursor ---------- */
    const canvas = document.getElementById('heroCanvas');
    const glow   = document.getElementById('heroGlow');
    const ring   = document.getElementById('cursorRing');
    const dotEl  = document.getElementById('cursorDot');

    if (canvas && hero && !reduceMotion) {
        const ctx = canvas.getContext('2d');
        let w = 0, h = 0, dots = [], sparks = [], raf = 0, visible = true;

        // raw pointer (hero-local) and smoothed pointer
        const ptr = { x: -9999, y: -9999, active: false };
        const sm  = { x: -9999, y: -9999 };
        const rg  = { x: 0, y: 0 };   // ring position (lags behind)

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = hero.clientWidth;
            h = hero.clientHeight;
            canvas.width  = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const n = Math.min(90, Math.round((w * h) / 15000));
            dots = Array.from({ length: n }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                z: 0.3 + Math.random() * 0.7,          // depth: bigger = closer
                r: 0.8 + Math.random() * 1.6
            }));
        }

        function frame() {
            ctx.clearRect(0, 0, w, h);

            if (ptr.active) {
                if (sm.x < -9000) { sm.x = ptr.x; sm.y = ptr.y; rg.x = ptr.x; rg.y = ptr.y; }
                sm.x += (ptr.x - sm.x) * 0.2;
                sm.y += (ptr.y - sm.y) * 0.2;
                rg.x += (ptr.x - rg.x) * 0.14;
                rg.y += (ptr.y - rg.y) * 0.14;
                glow.style.transform = `translate3d(${sm.x}px, ${sm.y}px, 0)`;
                ring.style.transform = `translate3d(${rg.x}px, ${rg.y}px, 0)`;
                dotEl.style.transform = `translate3d(${ptr.x}px, ${ptr.y}px, 0)`;
            }

            const pos = dots.map(d => {
                d.x += d.vx * d.z; d.y += d.vy * d.z;
                if (d.x < -10) d.x = w + 10; else if (d.x > w + 10) d.x = -10;
                if (d.y < -10) d.y = h + 10; else if (d.y > h + 10) d.y = -10;

                let x = d.x;
                let y = (((d.y - heroScrollY * d.z * 0.45) % h) + h) % h;

                if (ptr.active) {
                    const dx = x - sm.x, dy = y - sm.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 130 && dist > 0.1) {
                        const f = (130 - dist) / 130;
                        x += (dx / dist) * f * 28;
                        y += (dy / dist) * f * 28;
                    }
                }
                return { x, y, d };
            });

            for (let i = 0; i < pos.length; i++) {
                for (let j = i + 1; j < pos.length; j++) {
                    const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
                    const dist = dx * dx + dy * dy;
                    if (dist < 12100) {                       // 110px
                        const a = (1 - Math.sqrt(dist) / 110) * 0.2;
                        ctx.strokeStyle = `rgba(255,255,255,${a})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(pos[i].x, pos[i].y);
                        ctx.lineTo(pos[j].x, pos[j].y);
                        ctx.stroke();
                    }
                }
                if (ptr.active) {
                    const dx = pos[i].x - sm.x, dy = pos[i].y - sm.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 170) {
                        ctx.strokeStyle = `rgba(255,255,255,${(1 - dist / 170) * 0.45})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(pos[i].x, pos[i].y);
                        ctx.lineTo(sm.x, sm.y);
                        ctx.stroke();
                    }
                }
            }

            pos.forEach(p => {
                ctx.fillStyle = `rgba(255,255,255,${0.25 + p.d.z * 0.5})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.d.r * p.d.z + 0.4, 0, Math.PI * 2);
                ctx.fill();
            });

            for (let i = sparks.length - 1; i >= 0; i--) {
                const s = sparks[i];
                s.x += s.vx; s.y += s.vy;
                s.vy += 0.02;
                s.vx *= 0.98;
                s.life -= 0.022;
                if (s.life <= 0) { sparks.splice(i, 1); continue; }
                ctx.fillStyle = `rgba(255,255,255,${s.life * 0.9})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r * s.life + 0.3, 0, Math.PI * 2);
                ctx.fill();
            }

            raf = requestAnimationFrame(frame);
        }

        function start() { if (!raf && visible) raf = requestAnimationFrame(frame); }
        function stop()  { cancelAnimationFrame(raf); raf = 0; }

        window.addEventListener('pointermove', e => {
            const r = hero.getBoundingClientRect();
            const inside = r.bottom > 0 && e.clientY >= r.top && e.clientY <= r.bottom;
            ptr.active = inside;
            [glow, ring, dotEl].forEach(el => el.classList.toggle('on', inside && e.pointerType === 'mouse'));
            if (!inside) return;

            ptr.x = e.clientX - r.left;
            ptr.y = e.clientY - r.top;

            ring.classList.toggle('big', !!(e.target.closest && e.target.closest('a, button')));

            if (sparks.length < 140) {
                for (let i = 0; i < 2; i++) {
                    sparks.push({
                        x: ptr.x, y: ptr.y,
                        vx: (Math.random() - 0.5) * 1.6,
                        vy: (Math.random() - 0.5) * 1.6 - 0.3,
                        r: 1 + Math.random() * 2.2,
                        life: 1
                    });
                }
            }
        }, { passive: true });

        document.addEventListener('pointerleave', () => {
            ptr.active = false;
            [glow, ring, dotEl].forEach(el => el.classList.remove('on'));
        });

        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            visible ? start() : stop();
        }).observe(hero);

        let rt;
        window.addEventListener('resize', () => {
            clearTimeout(rt);
            rt = setTimeout(resize, 150);
        });

        resize();
        start();
    }

    /* ---------- scroll effects (navbar, progress bar, back-to-top, parallax) ---------- */
    let ticking = false;

    function onScroll() {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;

        navbar.classList.toggle('scrolled', y > 40);
        toTop.classList.toggle('show', y > window.innerHeight * 0.6);
        progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

        heroScroll(y);
        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();

    /* ---------- mobile menu ---------- */
    function setMenu(open) {
        menuBtn.classList.toggle('open', open);
        navbar.classList.toggle('menu-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
    }

    menuBtn.addEventListener('click', () => setMenu(!menuBtn.classList.contains('open')));
    navLinks.forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('click', e => {
        if (!navbar.contains(e.target)) setMenu(false);
    });

    /* ---------- active nav link follows the section in view ---------- */
    const sections = ['home', 'aboutme', 'myhobbyy', 'contactme']
        .map(id => document.getElementById(id))
        .filter(Boolean);

    const spy = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            navLinks.forEach(a => {
                a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
            });
        });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(s => spy.observe(s));

    /* ---------- reveal on scroll ---------- */
    const revealEls = document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window && !reduceMotion) {
        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        revealEls.forEach(el => io.observe(el));
    } else {
        revealEls.forEach(el => el.classList.add('in'));
    }

    /* ---------- hover a capability row -> highlight its logos ---------- */
    const tilesWrap = document.querySelector('.tiles');

    if (tilesWrap) {
        const tiles = tilesWrap.querySelectorAll('.tile');

        const spotlight = (keys) => {
            tiles.forEach(t => t.classList.toggle('hl', keys.includes(t.dataset.key)));
            tilesWrap.classList.toggle('filtering', keys.length > 0);
        };

        document.querySelectorAll('.cap-row').forEach(row => {
            const keys = (row.dataset.tech || '').split(' ').filter(Boolean);
            ['mouseenter', 'focus'].forEach(ev => row.addEventListener(ev, () => spotlight(keys)));
            ['mouseleave', 'blur'].forEach(ev => row.addEventListener(ev, () => spotlight([])));
        });
    }


    /* ---------- contact form -> email (Web3Forms) ---------- */
    const WEB3FORMS_KEY = 'ISI_ACCESS_KEY_DI_SINI';
    const MY_EMAIL = 'endradyawma07@gmail.com';

    const form    = document.getElementById('contactForm');
    const sendBtn = document.getElementById('sendBtn');
    const statusEl = document.getElementById('formStatus');

    if (form) {
        const say = (msg, type) => { statusEl.textContent = msg; statusEl.className = 'form-status ' + (type || ''); };

        form.addEventListener('submit', async e => {
            e.preventDefault();

            const data = new FormData(form);
            if (data.get('botcheck')) return;   // bot

            const name = (data.get('name') || '').trim();
            const email = (data.get('email') || '').trim();
            const message = (data.get('message') || '').trim();

            if (!name || !email || !message) { say('Please fill in Name, Email and Message.', 'err'); return; }
            if (!/^\S+@\S+\.\S+$/.test(email)) { say('Please enter a valid email address.', 'err'); return; }

            const phone = (data.get('phone') || '').trim() || '-';
            const address = (data.get('address') || '').trim() || '-';

            // belum ada access key -> fallback buka aplikasi email
            if (WEB3FORMS_KEY === 'ISI_ACCESS_KEY_DI_SINI') {
                const body = `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nAddress: ${address}\n\n${message}`;
                window.location.href = `mailto:${MY_EMAIL}?subject=${encodeURIComponent('Portfolio message from ' + name)}&body=${encodeURIComponent(body)}`;
                say('Opening your email app…', '');
                return;
            }

            sendBtn.disabled = true;
            const label = sendBtn.textContent;
            sendBtn.textContent = 'SENDING…';
            say('', '');

            try {
                const res = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        access_key: WEB3FORMS_KEY,
                        subject: 'Portfolio message from ' + name,
                        from_name: 'Kana Net Portfolio',
                        name, email, phone, address, message,
                        replyto: email
                    })
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    say('Thanks! Your message has been sent.', 'ok');
                    form.reset();
                } else {
                    say(json.message || 'Something went wrong. Please try again.', 'err');
                }
            } catch (err) {
                say('Network error. Please try again or email me directly.', 'err');
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = label;
            }
        });
    }

    /* ---------- typewriter in the hero ---------- */
    const typed = document.getElementById('typed');
    const roles = [
        'Informatics Engineering Student',
        'Web Developer',
        'Problem Solver',
        'Always Learning'
    ];

    if (typed) {
        if (reduceMotion) {
            typed.textContent = roles[0];
        } else {
            let r = 0, c = 0, deleting = false;

            const tick = () => {
                const word = roles[r];
                typed.textContent = word.slice(0, c);

                let delay = deleting ? 35 : 70;

                if (!deleting && c === word.length) {
                    delay = 1600;
                    deleting = true;
                } else if (deleting && c === 0) {
                    deleting = false;
                    r = (r + 1) % roles.length;
                    delay = 350;
                } else {
                    c += deleting ? -1 : 1;
                }
                setTimeout(tick, delay);
            };
            setTimeout(tick, 700);
        }
    }
})();
