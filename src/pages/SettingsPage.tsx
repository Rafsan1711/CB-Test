import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiService } from '../lib/api';
import toast from 'react-hot-toast';
import { 
  User, Github, Settings, Bell, GitBranch, AlertTriangle, 
  Save, Trash2, Download, RefreshCw, CheckCircle, XCircle,
  Cpu, Sliders, FileText
} from 'lucide-react';

type Tab = 'profile' | 'github' | 'ai' | 'notifications' | 'repo' | 'danger';

export const SettingsPage: React.FC = () => {
  const { user, supabaseUser, authState, linkGitHub, linkGoogle, updateSettings } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState('');
  const [githubSettings, setGithubSettings] = useState({
    defaultBranch: 'main',
    autoCloseStale: true,
    staleDays: 30,
    requireCiPass: true
  });
  const [aiSettings, setAiSettings] = useState({
    consensusThreshold: 2,
    temperature: 0.3,
    enableExternalApi: true
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    browserNotifications: false,
    webhookLogRetention: 30,
    activityLogRetention: 30
  });
  const [repoDefaults, setRepoDefaults] = useState({
    defaultAssignee: 'none',
    autoInstallTemplates: true
  });

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
    if (supabaseUser && supabaseUser.settings) {
      const settings = supabaseUser.settings;
      if (settings.display_name) setDisplayName(settings.display_name);
      if (settings.github_settings) setGithubSettings(settings.github_settings);
      if (settings.ai_settings) setAiSettings(settings.ai_settings);
      if (settings.notification_settings) setNotificationSettings(settings.notification_settings);
      if (settings.repo_defaults) setRepoDefaults(settings.repo_defaults);
    }
  }, [user, supabaseUser]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        display_name: displayName,
        github_settings: githubSettings,
        ai_settings: aiSettings,
        notification_settings: notificationSettings,
        repo_defaults: repoDefaults
      });
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion is disabled in this demo.');
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Profile Information</h3>
        <div className="flex items-center gap-6 mb-6">
          <img 
            src={supabaseUser?.avatar_url || user?.photoURL || 'https://via.placeholder.com/100'} 
            alt="Avatar" 
            className="w-20 h-20 rounded-full border-2 border-gray-700"
          />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-1">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
          <input 
            type="email" 
            value={supabaseUser?.email || user?.email || ''}
            disabled
            className="w-full bg-gray-900 border border-gray-800 rounded-md px-4 py-2 text-gray-500 cursor-not-allowed"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-1">GitHub Username</label>
          <input 
            type="text" 
            value={supabaseUser?.github_username || 'Not connected'}
            disabled
            className="w-full bg-gray-900 border border-gray-800 rounded-md px-4 py-2 text-gray-500 cursor-not-allowed"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-800">
        <h3 className="text-lg font-medium text-white mb-4">Connected Accounts</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-md">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Google</p>
                <p className="text-sm text-gray-400">
                  {authState === 'google_only' || authState === 'fully_authenticated' 
                    ? `Connected as ${user?.email}` 
                    : 'Not connected'}
                </p>
              </div>
            </div>
            {authState === 'github_only' ? (
              <button onClick={linkGoogle} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors">
                Connect
              </button>
            ) : (
              <span className="flex items-center gap-1 text-sm text-green-400 font-medium">
                <CheckCircle className="w-4 h-4" /> Connected
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-900 rounded-md">
                <Github className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-white">GitHub</p>
                <p className="text-sm text-gray-400">
                  {authState === 'github_only' || authState === 'fully_authenticated' 
                    ? `Connected as @${supabaseUser?.github_username}` 
                    : 'Not connected'}
                </p>
              </div>
            </div>
            {authState === 'google_only' ? (
              <button onClick={linkGitHub} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors">
                Connect
              </button>
            ) : (
              <span className="flex items-center gap-1 text-sm text-green-400 font-medium">
                <CheckCircle className="w-4 h-4" /> Connected
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderGithubTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">GitHub Connection Status</h3>
        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg mb-6">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${supabaseUser?.github_token_scopes ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {supabaseUser?.github_token_scopes ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            </div>
            <div>
              <h4 className="font-medium text-white">Token Status</h4>
              <p className="text-sm text-gray-400 mt-1">
                {supabaseUser?.github_token_scopes 
                  ? 'Valid token with required permissions.' 
                  : 'Missing or expired token. Please reconnect GitHub.'}
              </p>
              {supabaseUser?.github_token_scopes && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {supabaseUser.github_token_scopes.map(scope => (
                    <span key={scope} className="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-300 rounded">
                      {scope}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-800">
        <h3 className="text-lg font-medium text-white mb-4">Repository Preferences</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Default Branch</label>
            <select 
              value={githubSettings.defaultBranch}
              onChange={(e) => setGithubSettings({...githubSettings, defaultBranch: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:border-green-500"
            >
              <option value="main">main</option>
              <option value="master">master</option>
              <option value="develop">develop</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <div>
              <p className="font-medium text-white">Auto-close stale PRs</p>
              <p className="text-sm text-gray-400">Close PRs generated by ContriBot that have no activity.</p>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="number" 
                value={githubSettings.staleDays}
                onChange={(e) => setGithubSettings({...githubSettings, staleDays: parseInt(e.target.value)})}
                className="w-16 bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-white text-center"
                disabled={!githubSettings.autoCloseStale}
              />
              <span className="text-sm text-gray-400">days</span>
              <label className="relative inline-flex items-center cursor-pointer ml-2">
                <input type="checkbox" className="sr-only peer" checked={githubSettings.autoCloseStale} onChange={(e) => setGithubSettings({...githubSettings, autoCloseStale: e.target.checked})} />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <div>
              <p className="font-medium text-white">Require CI pass for PR verification</p>
              <p className="text-sm text-gray-400">Wait for GitHub Actions to pass before AI verification.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={githubSettings.requireCiPass} onChange={(e) => setGithubSettings({...githubSettings, requireCiPass: e.target.checked})} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAiTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Models & Consensus</h3>
        
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h4 className="font-medium text-purple-100">Primary Engine: DeepSeek-R1</h4>
          </div>
          <p className="text-sm text-purple-200/70">
            Used for complex code generation and deep issue analysis with superior reasoning. Gemini models serve as high-performance fallbacks.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-gray-300">PR Verification Consensus Threshold</label>
              <span className="text-sm text-green-400 font-medium">{aiSettings.consensusThreshold} / 2 Models</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">How many models must approve a PR before it's marked safe to merge.</p>
            <input 
              type="range" min="1" max="2" step="1" 
              value={aiSettings.consensusThreshold}
              onChange={(e) => setAiSettings({...aiSettings, consensusThreshold: parseInt(e.target.value)})}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Lenient (1/2)</span>
              <span>Strict (2/2)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="block text-sm font-medium text-gray-300">Code Writing Creativity (Temperature)</label>
              <span className="text-sm text-green-400 font-medium">{aiSettings.temperature.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Higher values make code more creative but potentially less stable.</p>
            <input 
              type="range" min="0.1" max="0.9" step="0.1" 
              value={aiSettings.temperature}
              onChange={(e) => setAiSettings({...aiSettings, temperature: parseFloat(e.target.value)})}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Conservative</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-800">
        <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div>
            <p className="font-medium text-white">Enable External API Calls</p>
            <p className="text-sm text-gray-400">Allow ContriBot to fetch data from npm, PyPI, etc.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={aiSettings.enableExternalApi} onChange={(e) => setAiSettings({...aiSettings, enableExternalApi: e.target.checked})} />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Alert Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <div>
              <p className="font-medium text-white">Email Notifications</p>
              <p className="text-sm text-gray-400">Receive emails for analyzed issues, verified PRs, and releases.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={notificationSettings.emailNotifications} onChange={(e) => setNotificationSettings({...notificationSettings, emailNotifications: e.target.checked})} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <div>
              <p className="font-medium text-white">Browser Notifications</p>
              <p className="text-sm text-gray-400">Show desktop notifications when active.</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-xs font-medium text-blue-400 hover:text-blue-300">Request Permission</button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={notificationSettings.browserNotifications} onChange={(e) => setNotificationSettings({...notificationSettings, browserNotifications: e.target.checked})} />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-800">
        <h3 className="text-lg font-medium text-white mb-4">Data Retention</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Webhook Log Retention</label>
            <select 
              value={notificationSettings.webhookLogRetention}
              onChange={(e) => setNotificationSettings({...notificationSettings, webhookLogRetention: parseInt(e.target.value)})}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:border-green-500"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Activity Log Retention</label>
            <select 
              value={notificationSettings.activityLogRetention}
              onChange={(e) => setNotificationSettings({...notificationSettings, activityLogRetention: parseInt(e.target.value)})}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:border-green-500"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRepoTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">Activation Defaults</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <div>
              <p className="font-medium text-white">Auto-install GitHub Templates</p>
              <p className="text-sm text-gray-400">Push ContriBot issue/PR templates when activating a repo.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={repoDefaults.autoInstallTemplates} onChange={(e) => setRepoDefaults({...repoDefaults, autoInstallTemplates: e.target.checked})} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Default Issue Assignee</label>
            <select 
              value={repoDefaults.defaultAssignee}
              onChange={(e) => setRepoDefaults({...repoDefaults, defaultAssignee: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:border-green-500"
            >
              <option value="none">None</option>
              <option value="me">Me (@{supabaseUser?.github_username || 'user'})</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDangerTab = () => (
    <div className="space-y-6">
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl">
        <h3 className="text-lg font-medium text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Danger Zone
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Export Data</p>
              <p className="text-sm text-gray-400">Download a JSON copy of all your repos, issues, and PRs.</p>
            </div>
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-red-500/10">
            <div>
              <p className="font-medium text-white">Disconnect All Repositories</p>
              <p className="text-sm text-gray-400">Deactivate ContriBot on all your GitHub repositories.</p>
            </div>
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors">
              Disconnect All
            </button>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-red-500/10">
            <div>
              <p className="font-medium text-white">Delete Account</p>
              <p className="text-sm text-gray-400">Permanently delete your account and all associated data.</p>
            </div>
            <button 
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-gray-400 mt-1">Manage your account, GitHub connection, and AI preferences.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-lg shadow-green-500/20"
        >
          {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'profile' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <User className="w-5 h-5" /> Profile
            </button>
            <button
              onClick={() => setActiveTab('github')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'github' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <Github className="w-5 h-5" /> GitHub Config
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'ai' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <Cpu className="w-5 h-5" /> AI Engine
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'notifications' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <Bell className="w-5 h-5" /> Notifications
            </button>
            <button
              onClick={() => setActiveTab('repo')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'repo' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <GitBranch className="w-5 h-5" /> Repo Defaults
            </button>
            <button
              onClick={() => setActiveTab('danger')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors mt-4 ${
                activeTab === 'danger' ? 'bg-red-500/10 text-red-400' : 'text-red-400/70 hover:bg-red-500/10 hover:text-red-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" /> Danger Zone
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8 shadow-xl">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'github' && renderGithubTab()}
            {activeTab === 'ai' && renderAiTab()}
            {activeTab === 'notifications' && renderNotificationsTab()}
            {activeTab === 'repo' && renderRepoTab()}
            {activeTab === 'danger' && renderDangerTab()}
          </div>
        </div>
      </div>
    </div>
  );
};
