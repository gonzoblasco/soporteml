import { useAuth } from '@/contexts/AuthContext';
import ProfileSection from '@/components/settings/ProfileSection';
import JoinCompanySection from '@/components/settings/JoinCompanySection';
import CompanySection from '@/components/settings/CompanySection';
import MeliConnectionSection from '@/components/settings/MeliConnectionSection';
import TeamSection from '@/components/settings/TeamSection';
import AiConfigSection from '@/components/settings/AiConfigSection';
import AutoReplySection from '@/components/settings/AutoReplySection';
import TrashSection from '@/components/settings/TrashSection';
import NotificationsSection from '@/components/settings/NotificationsSection';
import BillingSection from '@/components/settings/BillingSection';

const SettingsPage = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground mb-4 sm:mb-6">Configuración de la cuenta y preferencias</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <ProfileSection />
            <JoinCompanySection />
            <BillingSection />
            <NotificationsSection />
            {isAdmin && <CompanySection />}
            {isAdmin && <MeliConnectionSection />}
          </div>
          {isAdmin && (
            <div className="space-y-4">
              <TeamSection />
              <AiConfigSection />
              <AutoReplySection />
              <TrashSection />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
