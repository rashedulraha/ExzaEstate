import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const featuresNodeModules = path.resolve(rootDir, 'packages/features/node_modules');

export default {
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['e2e/**/*.spec.{ts,tsx}'],
  },
  server: {
    fs: {
      allow: [rootDir],
    },
  },
  resolve: {
    alias: {
      '@testing-library/react': path.join(featuresNodeModules, '@testing-library/react'),
      'react/jsx-dev-runtime': path.join(featuresNodeModules, 'react/jsx-dev-runtime.js'),
      'react/jsx-runtime': path.join(featuresNodeModules, 'react/jsx-runtime.js'),
      react: path.join(featuresNodeModules, 'react'),
      'react-dom': path.join(featuresNodeModules, 'react-dom'),
      'react-router': path.join(featuresNodeModules, 'react-router'),
      '@tanstack/react-query': path.join(featuresNodeModules, '@tanstack/react-query'),
      'lucide-react': path.join(featuresNodeModules, 'lucide-react'),
      '@exzaestate/api-client': path.resolve(rootDir, 'packages/api-client/src'),
      '@exzaestate/app-core': path.resolve(rootDir, 'packages/app-core/src'),
      '@exzaestate/features': path.resolve(rootDir, 'packages/features/src'),
      '@exzaestate/shared': path.resolve(rootDir, 'packages/shared/src'),
      '@exzaestate/ui': path.resolve(rootDir, 'packages/ui/src'),
      '@exzaestate/web': path.resolve(rootDir, 'apps/web/src'),
      '@exzaestate/desktop': path.resolve(rootDir, 'apps/desktop/src'),
    },
  },
};
