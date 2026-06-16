import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/ThemeContext';
import { AppShell } from './components/AppShell';
import { Home } from './screens/Home';
import { Journal } from './screens/Journal';
import { Wheel } from './screens/Wheel';
import { SabbatDetail } from './screens/SabbatDetail';
import { DailyCard } from './screens/DailyCard';
import { Archive } from './screens/Archive';
import { Wishes } from './screens/Wishes';
import { Recipes } from './screens/Recipes';
import { Treasures } from './screens/Treasures';
import { Reminders } from './screens/Reminders';
import { More } from './screens/More';
import { Settings } from './screens/Settings';
import { Memories } from './screens/Memories';
import { Bookshelf } from './screens/Bookshelf';
import { Aesthetic } from './screens/Aesthetic';
import { Ingredients } from './screens/Ingredients';
import { PersonalCalendar } from './screens/PersonalCalendar';
import { Onboarding } from './screens/Onboarding';
import { readStore } from './storage/useLocalStorage';

// HashRouter — устойчив к file:// origin внутри Capacitor WebView.
export default function App() {
  const [onboarded, setOnboarded] = useState(() => readStore('onboarded', false));

  if (!onboarded) {
    return <Onboarding onDone={() => setOnboarded(true)} />;
  }

  return (
    <ThemeProvider>
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="journal" element={<Journal />} />
          <Route path="wheel" element={<Wheel />} />
          <Route path="wheel/:id" element={<SabbatDetail />} />
          <Route path="card" element={<DailyCard />} />
          <Route path="archive" element={<Archive />} />
          <Route path="wishes" element={<Wishes />} />
          <Route path="recipes" element={<Recipes />} />
          <Route path="treasures" element={<Treasures />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="memories" element={<Memories />} />
          <Route path="bookshelf" element={<Bookshelf />} />
          <Route path="aesthetic" element={<Aesthetic />} />
          <Route path="ingredients" element={<Ingredients />} />
          <Route path="my-calendar" element={<PersonalCalendar />} />
          <Route path="more" element={<More />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
    </ThemeProvider>
  );
}
