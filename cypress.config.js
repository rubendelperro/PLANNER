import { defineConfig } from 'cypress';
// Dynamically require the vite dev server adapter to handle CJS/ESM export differences
let startDevServer;
try {
  // prefer require so this works when Cypress loads config in CommonJS
  const adapter = require('@cypress/vite-dev-server');
  // adapter may export the function as default or as startDevServer
  startDevServer =
    adapter && (adapter.startDevServer || adapter.default || adapter);
} catch (e) {
  // Could not require the adapter. We'll let the later check throw a clear error.
  startDevServer = null;
}

if (!startDevServer) {
  throw new Error(
    "@cypress/vite-dev-server could not be loaded. Ensure it's installed and compatible with this Cypress version."
  );
}

export default defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
  },
  component: {
    // Use a minimal HTML host for component tests so the full app bundle
    // (main.js) doesn't run automatically and the test environment stays isolated.
    indexHtmlFile: 'cypress/component-index.html',
    // Use Vite as the bundler for component testing. Using a static devServer
    // config (bundler + framework) avoids mismatches with adapter exports.
    devServer: {
      bundler: 'vite',
      framework: 'none',
      // Ensure plugin knows which index HTML to load
      indexHtmlFile: 'cypress/component-index.html',
      viteConfig: {
        configFile: 'vite.config.js',
        // Ensure Vite resolves index.html from the project root
        root: process.cwd(),
        // publicDir can be left default or pointed explicitly if you use a public folder
        publicDir: process.cwd(),
      },
    },
    specPattern: 'src/**/*.cy.js',
  },
});
