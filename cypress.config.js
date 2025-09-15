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
    setupNodeEvents(on, config) {
      const { spawn } = require('child_process');
      const waitOn = require('wait-on');

      // Start a vite dev server as a subprocess so vite-plugin-istanbul runs
      const viteProcess = spawn('npx', ['vite', '--port', '5173'], {
        cwd: process.cwd(),
        shell: true,
        stdio: 'inherit',
      });

      // Wait until the dev server is serving
      waitOn(
        { resources: ['http://localhost:5173'], timeout: 30000 },
        (err) => {
          if (err) {
            console.error('Vite dev server failed to start', err);
          } else {
            console.log('Vite dev server started for Cypress e2e tests');
          }
        }
      );

      // Ensure the vite subprocess is killed when Cypress exits
      process.on('exit', () => {
        try {
          viteProcess.kill();
        } catch (e) {}
      });

      // Register code-coverage task
      // Small helper task to write JSON files from tests (used to capture
      // window state when debugging failing E2E specs). Register this
      // early so tests can rely on the task being available even if other
      // plugins register later.
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      on('task', {
        writeFile({ filePath, contents }) {
          // To avoid triggering Vite file-watch reloads during a test run,
          // write debugging artifacts to the OS temp directory instead of
          // the project workspace. Use the basename so multiple runs don't
          // collide on directories.
          const base = path.basename(filePath);
          const full = path.resolve(os.tmpdir(), base);
          fs.mkdirSync(path.dirname(full), { recursive: true });
          fs.writeFileSync(
            full,
            typeof contents === 'string'
              ? contents
              : JSON.stringify(contents, null, 2),
            'utf8'
          );
          // Return where we wrote the file so the test can log/inspect if needed.
          return full;
        },
      });

      // Register code-coverage task
      require('@cypress/code-coverage/task')(on, config);

      // Set baseUrl so Cypress hits the Vite dev server
      config.baseUrl = 'http://localhost:5173';
      return config;
    },
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
