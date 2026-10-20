import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Order matters: tokens first, component css next, page css last.
import '@puzzlebloom/theme-core/tokens.css';
import '@puzzlebloom/ui/button.css';
import '@puzzlebloom/ui/segmented.css';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Root element is missing');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
