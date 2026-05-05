import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// React StrictMode is intentionally disabled. MapLibre's lifecycle (creating
// a WebGL context, attaching a PMTiles protocol, applying a style) doesn't
// survive the dev-only mount → unmount → remount cycle gracefully — the
// second mount can land with an empty style. Re-enable once we either:
//   - move map setup outside React's lifecycle, or
//   - find a react-maplibre version where the remount is idempotent.
createRoot(document.getElementById('root')!).render(<App />);
