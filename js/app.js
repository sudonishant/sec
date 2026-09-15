/*
  ================================================================
  TECHNICAL CLUB SEC SUPAUL - MAIN APPLICATION CONTROLLER
  Navbar sticky scroll, Theme toggle, Stats counter, Filter logic
  ================================================================
*/

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Sticky Navbar Scroll
  const header = document.querySelector('.header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }

  // Dark / Light Theme Switcher
  const themeToggle = document.getElementById('theme-toggle');
  const storedTheme = localStorage.getItem('sec_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', storedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('sec_theme', newTheme);
    });
  }

  // Live Countdown Timer for Flagship Hackathon
  const countdownDays = document.getElementById('cd-days');
  const countdownHours = document.getElementById('cd-hours');
  const countdownMins = document.getElementById('cd-mins');
  const countdownSecs = document.getElementById('cd-secs');

  const eventDate = new Date();
  eventDate.setDate(eventDate.getDate() + 28);

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = eventDate.getTime() - now;

    if (distance < 0) return;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (countdownDays) countdownDays.textContent = String(days).padStart(2, '0');
    if (countdownHours) countdownHours.textContent = String(hours).padStart(2, '0');
    if (countdownMins) countdownMins.textContent = String(minutes).padStart(2, '0');
    if (countdownSecs) countdownSecs.textContent = String(seconds).padStart(2, '0');
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  // Animated Numbers Counter on Scroll
  const statNumbers = document.querySelectorAll('.stat-number');
  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        statNumbers.forEach(stat => {
          const target = parseInt(stat.getAttribute('data-target'));
          let count = 0;
          const speed = target / 50;

          const updateCount = () => {
            count += speed;
            if (count < target) {
              stat.textContent = Math.ceil(count) + '+';
              setTimeout(updateCount, 30);
            } else {
              stat.textContent = target + '+';
            }
          };
          updateCount();
        });
      }
    });
  }, { threshold: 0.5 });

  const statsSection = document.querySelector('.stats-grid');
  if (statsSection) observer.observe(statsSection);

  // Filter Projects Showcase
  const filterBtns = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      projectCards.forEach(card => {
        if (filter === 'all' || card.getAttribute('data-category') === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Modal Open/Close Controls
  const modalOverlays = document.querySelectorAll('.modal-overlay');
  const modalTriggers = document.querySelectorAll('[data-modal-target]');
  const modalCloses = document.querySelectorAll('.modal-close');

  modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = trigger.getAttribute('data-modal-target');
      const targetModal = document.getElementById(targetId);
      if (targetModal) targetModal.classList.add('active');
    });
  });

  modalCloses.forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      modalOverlays.forEach(modal => modal.classList.remove('active'));
    });
  });

  modalOverlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
});
