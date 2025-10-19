// ==========================================
// APTL Documentation - Interactive Features
// ==========================================

(function () {
  'use strict';

  // ==========================================
  // Mobile Menu Toggle
  // ==========================================
  function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.querySelector('.navbar-menu');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      menu.classList.toggle('active');
      toggle.setAttribute(
        'aria-expanded',
        menu.classList.contains('active') ? 'true' : 'false',
      );
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Close menu on navigation
    const navLinks = menu.querySelectorAll('.nav-link, .dropdown-item');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        menu.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ==========================================
  // Dropdown Menu Interactions
  // ==========================================
  function initDropdowns() {
    const dropdowns = document.querySelectorAll('.nav-dropdown');

    dropdowns.forEach((dropdown) => {
      const toggle = dropdown.querySelector('.dropdown-toggle');
      const menu = dropdown.querySelector('.dropdown-menu');

      if (!toggle || !menu) return;

      // Toggle on click for mobile/touch devices
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close other dropdowns
        dropdowns.forEach((other) => {
          if (other !== dropdown) {
            other.classList.remove('active');
            const otherToggle = other.querySelector('.dropdown-toggle');
            if (otherToggle) {
              otherToggle.setAttribute('aria-expanded', 'false');
            }
          }
        });

        // Toggle current dropdown
        const isActive = dropdown.classList.toggle('active');
        toggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
          dropdown.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });

      // Keyboard navigation
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle.click();
        } else if (e.key === 'Escape') {
          dropdown.classList.remove('active');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      });
    });
  }

  // ==========================================
  // Table of Contents Generator
  // ==========================================
  function generateTableOfContents() {
    const tocContent = document.getElementById('toc-content');
    const contentWrapper = document.querySelector('.content-wrapper');

    if (!tocContent || !contentWrapper) return;

    // Get all headings (h2-h4)
    const headings = contentWrapper.querySelectorAll('h2, h3, h4');

    if (headings.length === 0) {
      tocContent.innerHTML =
        '<p style="color: var(--color-text-tertiary); font-size: 0.875rem;">No headings found</p>';
      return;
    }

    // Build TOC structure
    const toc = document.createElement('ul');
    let currentLevel = 2;
    let currentList = toc;
    const stack = [{ level: 2, list: toc }];

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1));
      const text = heading.textContent;

      // Create ID if it doesn't exist
      if (!heading.id) {
        heading.id = 'heading-' + index;
      }

      // Navigate to correct nesting level
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (level > currentLevel && stack.length > 0) {
        const nestedList = document.createElement('ul');
        const lastItem = stack[stack.length - 1].list.lastElementChild;
        if (lastItem) {
          lastItem.appendChild(nestedList);
        }
        currentList = nestedList;
        stack.push({ level, list: nestedList });
      } else if (stack.length > 0) {
        currentList = stack[stack.length - 1].list;
      }

      // Create TOC item
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + heading.id;
      a.textContent = text;
      a.className = 'toc-link';

      li.appendChild(a);
      currentList.appendChild(li);

      currentLevel = level;
      stack.push({ level, list: currentList });
    });

    tocContent.appendChild(toc);
  }

  // ==========================================
  // Active TOC Link on Scroll
  // ==========================================
  function initTOCActiveState() {
    const tocLinks = document.querySelectorAll('.toc-link');
    const headings = document.querySelectorAll(
      '.content-wrapper h2, .content-wrapper h3, .content-wrapper h4',
    );

    if (tocLinks.length === 0 || headings.length === 0) return;

    const observerOptions = {
      rootMargin: '-80px 0px -80% 0px',
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        const tocLink = document.querySelector(`.toc-link[href="#${id}"]`);

        if (entry.isIntersecting) {
          // Remove active from all
          tocLinks.forEach((link) => link.classList.remove('active'));
          // Add active to current
          if (tocLink) {
            tocLink.classList.add('active');
          }
        }
      });
    }, observerOptions);

    headings.forEach((heading) => {
      observer.observe(heading);
    });
  }

  // ==========================================
  // Smooth Scroll for Anchor Links
  // ==========================================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const navbarHeight = document.querySelector('.navbar').offsetHeight;
          const targetPosition = target.offsetTop - navbarHeight - 20;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth',
          });

          // Update URL without jumping
          history.pushState(null, null, href);
        }
      });
    });
  }

  // ==========================================
  // Syntax Highlighting
  // ==========================================
  function initSyntaxHighlighting() {
    if (typeof hljs !== 'undefined') {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }

  // ==========================================
  // Copy Code Button
  // ==========================================
  function initCopyCodeButtons() {
    const codeBlocks = document.querySelectorAll('pre');

    codeBlocks.forEach((pre) => {
      const button = document.createElement('button');
      button.className = 'copy-code-button';
      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy code to clipboard');

      button.addEventListener('click', async () => {
        const code = pre.querySelector('code');
        const text = code.textContent;

        try {
          await navigator.clipboard.writeText(text);
          button.textContent = 'Copied!';
          button.style.backgroundColor = '#10b981';

          setTimeout(() => {
            button.textContent = 'Copy';
            button.style.backgroundColor = '';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
          button.textContent = 'Failed';
          setTimeout(() => {
            button.textContent = 'Copy';
          }, 2000);
        }
      });

      pre.style.position = 'relative';
      pre.appendChild(button);
    });

    // Add styles for copy button
    const style = document.createElement('style');
    style.textContent = `
      .copy-code-button {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        padding: 0.375rem 0.75rem;
        background-color: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 0.375rem;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 150ms;
        font-family: var(--font-sans);
      }

      .copy-code-button:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }

      .copy-code-button:active {
        transform: scale(0.95);
      }
    `;
    document.head.appendChild(style);
  }

  // ==========================================
  // External Links
  // ==========================================
  function initExternalLinks() {
    const links = document.querySelectorAll('.content-wrapper a[href^="http"]');
    links.forEach((link) => {
      if (!link.hostname.includes(window.location.hostname)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  // ==========================================
  // Initialize on DOM Ready
  // ==========================================
  function init() {
    initMobileMenu();
    initDropdowns();
    generateTableOfContents();
    initTOCActiveState();
    initSmoothScroll();
    initSyntaxHighlighting();
    initCopyCodeButtons();
    initExternalLinks();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
