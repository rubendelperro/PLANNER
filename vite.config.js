import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(async () => {
  const plugins = [];

  if (process.env.NODE_ENV !== 'production') {
    // Dynamically import the ESM-only plugin at runtime
    const istanbulModule = await import('vite-plugin-istanbul');
    const istanbul =
      istanbulModule && (istanbulModule.default || istanbulModule);

    plugins.push(
      istanbul({
        include: ['**/*.js'],
        exclude: ['node_modules', 'cypress/', 'coverage'],
        extension: ['.js'],
        requireEnv: false,
        // Ensure instrumentation happens even for served modules
        forceInstrument: true,
      })
    );
  }

  return {
    plugins,
  };
});
