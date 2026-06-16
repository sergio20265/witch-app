import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initNative } from './lib/native';
import './styles/theme.css';
import './styles/screens.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

initNative();
