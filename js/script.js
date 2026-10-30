'use strict';

/* ==========================================================================
   EDIT HERE: every link and the EmailJS setup live in this one object.
   Leave a value empty until you have the real URL. Empty links stay on the
   page but show "This link isn't available yet" instead of going nowhere.
   ========================================================================== */
const SITE = {
  github: '',
  linkedin: '',
  email: '',
  x: '', // optional: hidden on the Contact section while empty
  resume: 'assets/resume.pdf',

  projects: {
    gym:     { view: '', github: '', demo: '' },
    finance: { view: '', github: '', demo: '' },
    venue:   { view: '', github: '', demo: '' },
    medibox: { view: '', github: '', demo: '' },
  },

  // Create these at https://www.emailjs.com. The template can use
  // {{from_name}}, {{from_email}}, {{subject}} and {{message}}.
  emailjs: {
    publicKey: '',
    serviceId: '',
    templateId: '',
  },
};

const EMAILJS_SDK = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/dist/email.min.js';
const MIN_MESSAGE_LENGTH = 20;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/* --------------------------------------------------------------------------
   Toast
   -------------------------------------------------------------------------- */
let toastTimer;

function showToast(text) {
  const toast = $('#toast');
  toast.textContent = text;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

/* --------------------------------------------------------------------------
   Links: fill every [data-link] from SITE
   -------------------------------------------------------------------------- */
function resolveLink(path) {
  return path.split('.').reduce((value, key) => value?.[key], SITE) || '';
}

function initLinks() {
  $$('[data-link]').forEach((link) => {
    const key = link.dataset.link;
    const value = resolveLink(key);

    if (!value) {
      if ('hideIfEmpty' in link.dataset) {
        link.remove();
        return;
      }
      link.classList.add('is-unset');
      link.setAttribute('aria-disabled', 'true');
      link.addEventListener('click', (event) => {
        event.preventDefault();
        showToast("This link isn't available yet.");
      });
      return;
    }

    if (key === 'resume') {
      link.href = value;
    } else if (key === 'email') {
      link.href = `mailto:${value}`;
      if ('linkText' in link.dataset) $('span', link).textContent = value;
    } else {
      link.href = value;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  });
}

/* --------------------------------------------------------------------------
   Navigation: sticky state, mobile menu, active section
   -------------------------------------------------------------------------- */
function initNavigation() {
  const nav = $('#siteNav');
  const menu = $('#navMenu');
  const toTop = $('#toTop');
  const links = $$('.nav-link', nav);

  const onScroll = () => {
    nav.classList.toggle('is-stuck', window.scrollY > 24);
    toTop.classList.toggle('is-visible', window.scrollY > 700);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  menu.addEventListener('show.bs.collapse', () => nav.classList.add('is-open'));
  menu.addEventListener('hidden.bs.collapse', () => nav.classList.remove('is-open'));

  // Close the mobile menu after a link is chosen
  links.forEach((link) => {
    link.addEventListener('click', () => {
      if (menu.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(menu).hide();
    });
  });

  const setActive = (id) => {
    links.forEach((link) => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  // A section is active while it crosses a thin band in the middle of the screen
  const observer = new IntersectionObserver((entries) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry) => setActive(entry.target.id));
  }, { rootMargin: '-45% 0px -50% 0px' });

  $$('main section[id]').forEach((section) => observer.observe(section));
}

/* --------------------------------------------------------------------------
   Hero: typed roles
   -------------------------------------------------------------------------- */
function initTyping() {
  const roles = ['Full Stack Developer', 'Aspiring Startup Founder', 'Product Builder', 'Tech Enthusiast'];
  const target = $('#typedText');
  if (reducedMotion) return;

  let role = 0;
  let length = roles[0].length;
  let deleting = true;

  const tick = () => {
    const word = roles[role];
    length += deleting ? -1 : 1;
    target.textContent = word.slice(0, length);

    let delay = deleting ? 35 : 75;
    if (!deleting && length === word.length) {
      deleting = true;
      delay = 1800;
    } else if (deleting && length === 0) {
      deleting = false;
      role = (role + 1) % roles.length;
      delay = 300;
    }
    setTimeout(tick, delay);
  };

  setTimeout(tick, 2000);
}

/* --------------------------------------------------------------------------
   Scroll reveal
   -------------------------------------------------------------------------- */
function initReveal() {
  const items = $$('.reveal');

  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

  items.forEach((item) => observer.observe(item));
}

/* --------------------------------------------------------------------------
   Contact form: validation, then EmailJS when it is configured
   -------------------------------------------------------------------------- */
const VALIDATORS = {
  name: (value) => (value ? '' : 'Enter your full name.'),
  email: (value) => {
    if (!value) return 'Enter your email address.';
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? '' : 'Enter a valid email address, like name@example.com.';
  },
  subject: (value) => (value ? '' : 'Enter a subject.'),
  message: (value) => {
    if (!value) return 'Enter your message.';
    return value.length >= MIN_MESSAGE_LENGTH
      ? ''
      : `Write at least ${MIN_MESSAGE_LENGTH} characters. You have ${value.length}.`;
  },
};

function validateField(field) {
  const error = VALIDATORS[field.name](field.value.trim());
  field.classList.toggle('is-invalid', Boolean(error));
  field.setAttribute('aria-invalid', String(Boolean(error)));
  $(`#${field.name}Error`).textContent = error;
  return !error;
}

function loadEmailJs() {
  if (window.emailjs) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = EMAILJS_SDK;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

async function sendMessage(values) {
  const { publicKey, serviceId, templateId } = SITE.emailjs;
  await loadEmailJs();
  await window.emailjs.send(serviceId, templateId, {
    from_name: values.name,
    from_email: values.email,
    subject: values.subject,
    message: values.message,
  }, { publicKey });
}

function initContactForm() {
  const form = $('#contactForm');
  const button = $('#sendButton');
  const status = $('#formStatus');
  const fields = $$('input, textarea', form);

  const setStatus = (text, type = '') => {
    status.textContent = text;
    status.dataset.type = type;
  };

  fields.forEach((field) => {
    field.addEventListener('blur', () => { if (field.value) validateField(field); });
    field.addEventListener('input', () => {
      if (field.classList.contains('is-invalid')) validateField(field);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');

    const invalid = fields.filter((field) => !validateField(field));
    if (invalid.length) {
      invalid[0].focus();
      setStatus('Fix the highlighted fields, then send your message again.', 'error');
      return;
    }

    const { publicKey, serviceId, templateId } = SITE.emailjs;
    if (!publicKey || !serviceId || !templateId) {
      setStatus('Your message was not sent because this form is not connected yet. Use the links on this page to reach me.', 'error');
      return;
    }

    const values = Object.fromEntries(fields.map((field) => [field.name, field.value.trim()]));
    button.disabled = true;
    button.textContent = 'Sending…';

    try {
      await sendMessage(values);
      form.reset();
      setStatus(`Message sent. I'll reply to ${values.email}.`, 'success');
    } catch (error) {
      console.error('EmailJS send failed', error);
      setStatus('Your message was not sent. Check your connection and try again.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Send Message';
    }
  });
}

/* --------------------------------------------------------------------------
   Start
   -------------------------------------------------------------------------- */
initLinks();
initNavigation();
initTyping();
initReveal();
initContactForm();
$('#year').textContent = new Date().getFullYear();
