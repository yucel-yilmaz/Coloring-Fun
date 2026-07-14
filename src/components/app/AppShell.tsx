import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { MobileNavigation } from './MobileNavigation';

export function AppShell() {
  return (
    <div className="bg-[#f7f9ff] min-h-screen flex flex-col font-sans text-[#001e30] selection:bg-[#ffd700]">
      <AppHeader />
      <main className="flex-grow"><Outlet /></main>
      <MobileNavigation />
    </div>
  );
}
