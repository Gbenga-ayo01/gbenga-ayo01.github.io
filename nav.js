/* nav.js - mobile menu toggle.
 * Closes on link tap and Escape key.
 * Depends on: .site-header__menu-toggle and #site-nav in header partial.
 */
(function () {
  'use strict';

  var toggle = document.querySelector('.site-header__menu-toggle');
  var nav = document.getElementById('site-nav');

  if (!toggle || !nav) return;

  function closeMenu() {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('site-nav--open');
  }

  function openMenu() {
    toggle.setAttribute('aria-expanded', 'true');
    nav.classList.add('site-nav--open');
  }

  toggle.addEventListener('click', function () {
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  });
})();
