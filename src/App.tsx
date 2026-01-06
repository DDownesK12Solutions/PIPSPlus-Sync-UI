import { useState } from 'react';
import './App.css';
import { RulesPage } from './pages/RulesPage';
import { ProvisioningMappingsPage } from './pages/ProvisioningMappingsPage';
import { UserAttributeMappingsPage } from './pages/UserAttributeMappingsPage';
import { StaffPage } from './pages/StaffPage';
import { StudentsPage } from './pages/StudentsPage';
import { ClientsPage } from './pages/ClientsPage';
import { WebhookSubscriptionsPage } from './pages/WebhookSubscriptionsPage';
import { cn } from './lib/utils';
import { Workflow, GitMerge, Database, Users, type LucideIcon, LogIn, LogOut, Building, GraduationCap, Webhook } from 'lucide-react';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { loginRequest } from './lib/authConfig';
import { useClient } from './features/clients/ClientContext';
import { useEnvironment } from './contexts/EnvironmentContext';
import { EnvironmentSwitcher } from './features/shared/components/EnvironmentSwitcher';
import { Watermark } from './features/shared/components/Watermark';

type TabKey = 'rules' | 'staff' | 'students' | 'provisioning' | 'user-attributes' | 'clients' | 'webhooks';

const configTabs: { key: TabKey; label: string; description: string; icon: LucideIcon }[] = [
  { key: 'clients', label: 'Clients', description: 'Manage clients', icon: Building },
  { key: 'rules', label: 'Rules', description: 'Eligibility rule builder', icon: Workflow },
  { key: 'provisioning', label: 'Provisioning Mappings', description: 'SCIM attribute mappings', icon: GitMerge },
  { key: 'user-attributes', label: 'User Attribute Mappings', description: 'Source → Dataverse mappings', icon: Database },
  { key: 'webhooks', label: 'EntraID Webhooks', description: 'Manage Graph subscriptions', icon: Webhook },
];

const viewTabs: { key: TabKey; label: string; description: string; icon: LucideIcon }[] = [
  { key: 'staff', label: 'Staff', description: 'View staff members', icon: Users },
  { key: 'students', label: 'Students', description: 'View student members', icon: GraduationCap },
];



import { SyncRunnerPage } from './pages/SyncRunnerPage';

// ... (existing imports)

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('clients');
  const { instance } = useMsal();
  const { activeClient } = useClient();
  const { currentEnv } = useEnvironment();

  // Check for Runner Mode
  const query = new URLSearchParams(window.location.search);
  const isRunnerMode = query.get('mode') === 'runner';

  // If in Runner Mode, bypass the main app shell
  if (isRunnerMode) {
    return (
      <AuthenticatedTemplate>
        <SyncRunnerPage />
      </AuthenticatedTemplate>
    );
  }

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch(e => {
      console.error(e);
    });
  };

  const renderTabButton = (tab: typeof configTabs[0]) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.key;
    const isClientsTab = tab.key === 'clients';
    const isDisabled = !activeClient && !isClientsTab;

    return (
      <button
        key={tab.key}
        onClick={() => !isDisabled && setActiveTab(tab.key)}
        disabled={isDisabled}
        className={cn(
          'px-4 py-2 rounded-full border flex items-center gap-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
            : 'bg-white text-gray-700 border-gray-200',
          isDisabled
            ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400'
            : !isActive && 'hover:bg-gray-50'
        )}
      >
        <Icon size={16} />
        {tab.label}
      </button>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <header className={cn("flex-none border-b shadow-sm z-10 transition-colors",
        instance.getActiveAccount() ? `bg-${currentEnv.themeColor}-50 border-${currentEnv.themeColor}-200` : "bg-white border-gray-200"
      )}>
        <div className="app-shell px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <UnauthenticatedTemplate>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-blue-600 font-semibold">PIPSPlus</p>
                <h1 className="text-2xl font-semibold text-gray-900">Sync Admin Portal</h1>
                <p className="text-sm text-gray-500">Unified UI for rules, provisioning mappings, and user attribute mappings.</p>
              </div>
            </UnauthenticatedTemplate>

            <AuthenticatedTemplate>
              <div className="flex items-center justify-between w-full">
                {/* Simplified Info Panel */}
                <div className="flex flex-col gap-3">
                  <h1 className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight drop-shadow-sm leading-none pb-0.5">
                    PIPSPlus Admin Console
                  </h1>
                  <div className="flex items-center gap-4">
                    <EnvironmentSwitcher />

                    <div className="h-8 w-px bg-gray-300/50"></div>

                    {/* Active Client Group */}
                    <div className="flex flex-col">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-tight">Active Client</p>
                      <p className={cn("text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]", activeClient ? "text-blue-600" : "text-gray-400 italic")}>
                        {activeClient ? activeClient.name : "No Client Selected"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-2">
                    {configTabs.map(renderTabButton)}
                  </div>
                  <div className="flex items-center gap-2">
                    {viewTabs.map(renderTabButton)}
                    <button
                      onClick={() => instance.logoutPopup().catch(e => console.error(e))}
                      className="ml-2 px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-main-50 text-xs font-medium transition-colors flex items-center gap-1.5 bg-white/50"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </nav>
              </div>
            </AuthenticatedTemplate>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <main className="app-shell px-6 py-6 space-y-3">
          <UnauthenticatedTemplate>
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Please sign in to access the portal</h2>

              <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select your Environment</span>
                <EnvironmentSwitcher />
              </div>

              <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium"
              >
                <LogIn size={20} />
                Sign In with Microsoft
              </button>
            </div>
          </UnauthenticatedTemplate>

          <AuthenticatedTemplate>
            <Watermark />
            {/* Workspace Header moved to top */}

            {!activeClient && activeTab !== 'clients' ? (
              <div className="p-12 text-center bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-full inline-flex"><Building size={32} /></div>
                  <h2 className="text-lg font-semibold text-gray-900">Select a Client</h2>
                  <p className="text-gray-500">Please select an active client from the Clients tab to manage their configuration.</p>
                  <button
                    onClick={() => setActiveTab('clients')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Go to Clients
                  </button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'clients' && <ClientsPage />}
                {activeTab === 'rules' && <RulesPage />}
                {activeTab === 'staff' && <StaffPage />}
                {activeTab === 'students' && <StudentsPage />}
                {activeTab === 'provisioning' && <ProvisioningMappingsPage />}
                {activeTab === 'user-attributes' && <UserAttributeMappingsPage />}
                {activeTab === 'webhooks' && <WebhookSubscriptionsPage />}
              </>
            )}
          </AuthenticatedTemplate>
        </main>
      </div>
    </div>
  );
}

export default App;
