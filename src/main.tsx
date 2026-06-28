import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initNative } from './lib/native';
import { migrateImagesOnce } from './lib/migrateImages';
import { applyPathApologyOnce } from './lib/migratePathApology';
import './styles/theme.css';
import './styles/screens.css';

// Переносим старые inline-фото в IndexedDB до рендера: иначе эффекты записи
// useLocalStorage вернут раздутое значение обратно в localStorage.
migrateImagesOnce().finally(() => {
  // Извинение за залипший рандом тропинки: вернуть день и подарить фамильяра.
  applyPathApologyOnce();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  initNative();
});
