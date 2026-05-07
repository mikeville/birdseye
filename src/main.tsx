import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode disabled: MapLibre's lifecycle doesn't survive double-mount cleanly.
createRoot(document.getElementById('root')!).render(<App />);
