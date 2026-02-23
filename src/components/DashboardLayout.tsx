import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
