import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const DashboardLayout = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className={`flex-1 overflow-hidden ${isMobile ? 'pt-14' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
