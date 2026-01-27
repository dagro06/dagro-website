// ============================================
// DAGRO DIGITAL - Main JavaScript
// Out-of-the-box Effects & Interactions
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollAnimations();
    initMobileMenu();
    initSmoothScroll();
    initFormValidation();
    initCursorTrail();
    initTiltCards();
    initAnimatedCounters();
    initTextReveal();
    initMagneticButtons();
    initRippleEffect();
});

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    const nav = document.querySelector('.nav-wrapper');
    if (!nav) return;

    let lastScroll = 0;
    const scrollThreshold = 100;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > scrollThreshold) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        if (currentScroll > lastScroll && currentScroll > 500) {
            nav.style.transform = 'translateY(-100%)';
        } else {
            nav.style.transform = 'translateY(0)';
        }

        lastScroll = currentScroll;
    });
}

// ============================================
// MOBILE MENU
// ============================================
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    const menuLinks = document.querySelectorAll('.mobile-menu a');

    if (!menuBtn || !mobileMenu) return;

    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

// ============================================
// SCROLL ANIMATIONS
// ============================================
function initScrollAnimations() {
    const reveals = document.querySelectorAll('.reveal, .stagger-children');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    reveals.forEach(el => observer.observe(el));
}

// ============================================
// SMOOTH SCROLL
// ============================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 100;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============================================
// FORM VALIDATION
// ============================================
function initFormValidation() {
    const form = document.querySelector('.contact-form form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = form.querySelector('input[name="name"]');
        const email = form.querySelector('input[name="email"]');
        const message = form.querySelector('textarea[name="message"]');

        let isValid = true;

        if (!name.value.trim()) {
            showError(name, 'Vul je naam in');
            isValid = false;
        } else {
            clearError(name);
        }

        if (!email.value.trim() || !isValidEmail(email.value)) {
            showError(email, 'Vul een geldig e-mailadres in');
            isValid = false;
        } else {
            clearError(email);
        }

        if (!message.value.trim()) {
            showError(message, 'Vul een bericht in');
            isValid = false;
        } else {
            clearError(message);
        }

        if (isValid) {
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>Verzonden!</span>';
            submitBtn.disabled = true;

            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                form.reset();
            }, 3000);
        }
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(input, message) {
    input.style.borderColor = '#ff4444';
    const errorEl = input.parentElement.querySelector('.error-message');
    if (errorEl) {
        errorEl.textContent = message;
    } else {
        const error = document.createElement('span');
        error.className = 'error-message';
        error.style.cssText = 'color: #ff4444; font-size: 13px; margin-top: 4px; display: block;';
        error.textContent = message;
        input.parentElement.appendChild(error);
    }
}

function clearError(input) {
    input.style.borderColor = 'transparent';
    const errorEl = input.parentElement.querySelector('.error-message');
    if (errorEl) errorEl.remove();
}

// ============================================
// CURSOR TRAIL EFFECT
// ============================================
function initCursorTrail() {
    // Only on desktop
    if (window.innerWidth < 1024) return;

    const trailCount = 12;
    const trails = [];
    const positions = [];

    // Create trail elements
    for (let i = 0; i < trailCount; i++) {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.cssText = `
            position: fixed;
            width: ${8 - i * 0.5}px;
            height: ${8 - i * 0.5}px;
            background: linear-gradient(135deg, #C5A572, #D4AF37);
            border-radius: 50%;
            pointer-events: none;
            z-index: ${9999 - i};
            opacity: ${0.6 - i * 0.04};
            transition: transform 0.1s ease;
        `;
        document.body.appendChild(trail);
        trails.push(trail);
        positions.push({ x: 0, y: 0 });
    }

    let mouseX = 0, mouseY = 0;
    let isMoving = false;
    let timeout;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        isMoving = true;

        trails.forEach(trail => trail.style.opacity = trail.dataset.opacity || '0.6');

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            isMoving = false;
            trails.forEach(trail => trail.style.opacity = '0');
        }, 150);
    });

    function animate() {
        positions.forEach((pos, i) => {
            const prevPos = i === 0 ? { x: mouseX, y: mouseY } : positions[i - 1];
            const delay = 0.15;

            pos.x += (prevPos.x - pos.x) * delay;
            pos.y += (prevPos.y - pos.y) * delay;

            trails[i].style.left = pos.x + 'px';
            trails[i].style.top = pos.y + 'px';
            trails[i].style.transform = 'translate(-50%, -50%)';
            trails[i].dataset.opacity = (0.6 - i * 0.04).toString();
        });

        requestAnimationFrame(animate);
    }

    animate();
}

// ============================================
// 3D TILT CARDS
// ============================================
function initTiltCards() {
    const cards = document.querySelectorAll('.service-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// ============================================
// ANIMATED COUNTERS
// ============================================
function initAnimatedCounters() {
    const counters = document.querySelectorAll('.stat-large, .stat-counter');

    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                entry.target.classList.add('counted');
                animateCounter(entry.target);
            }
        });
    }, observerOptions);

    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
    const text = element.textContent;
    const match = text.match(/(\d+)/);

    if (!match) return;

    const target = parseInt(match[1]);
    const suffix = text.replace(/\d+/, '');
    const prefix = text.substring(0, text.indexOf(match[0]));
    const duration = 2000;
    const start = Date.now();

    function update() {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(target * easeOut);

        element.textContent = prefix + current + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = text;
        }
    }

    update();
}

// ============================================
// TEXT REVEAL ANIMATION
// ============================================
function initTextReveal() {
    const heroTitle = document.querySelector('.hero-title');
    if (!heroTitle || heroTitle.classList.contains('text-animated')) return;

    heroTitle.classList.add('text-animated');

    // Split text into characters for animation
    const text = heroTitle.innerHTML;
    const words = text.split(/(<[^>]+>|\s+)/);

    let charIndex = 0;
    const newHTML = words.map(word => {
        if (word.startsWith('<') || word.match(/^\s+$/)) {
            return word;
        }

        return word.split('').map(char => {
            const delay = charIndex * 0.03;
            charIndex++;
            return `<span class="char" style="animation-delay: ${delay}s">${char}</span>`;
        }).join('');
    }).join('');

    heroTitle.innerHTML = newHTML;
}

// ============================================
// ENHANCED MAGNETIC BUTTONS
// ============================================
function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-magnetic');

    buttons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const strength = 0.15;
            btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;

            // Move inner content slightly more
            const inner = btn.querySelector('span');
            if (inner) {
                inner.style.transform = `translate(${x * 0.05}px, ${y * 0.05}px)`;
            }
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translate(0, 0)';
            const inner = btn.querySelector('span');
            if (inner) {
                inner.style.transform = 'translate(0, 0)';
            }
        });
    });
}

// ============================================
// RIPPLE EFFECT
// ============================================
function initRippleEffect() {
    const buttons = document.querySelectorAll('.btn-magnetic');

    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';

            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// ============================================
// PARALLAX EFFECTS
// ============================================
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;

    // Parallax for hero orbs
    document.querySelectorAll('.hero-orb').forEach((orb, index) => {
        const speed = (index + 1) * 0.05;
        orb.style.transform = `translateY(${scrolled * speed}px)`;
    });

    // Parallax for floating badges
    document.querySelectorAll('.floating-badge').forEach((badge, index) => {
        const speed = (index + 1) * 0.02;
        const baseTransform = badge.style.transform || '';
        badge.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// ============================================
// LOGO ANIMATION ON LOAD
// ============================================
window.addEventListener('load', () => {
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.classList.add('loaded');
    }
});
