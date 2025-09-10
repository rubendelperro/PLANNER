import { init } from './state.js';

// Main entry point
(function () {
  'use strict';

  // Initialize Immer library (loaded globally via script tag)
  if (window.immer) {
    // Enable support for Map and Set structures within the state
    immer.enableMapSet();
  } else {
    console.error('[Atom-Canvas] ERROR: Immer library not loaded.');
    return;
  }

  // Start the application when the DOM is fully loaded
  window.addEventListener('DOMContentLoaded', () => {
    init();
  });
})();
