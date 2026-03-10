import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { LayoutDashboard, FolderGit2, ListTodo, Tag, Settings, LogOut, Bell, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export const Layout: React.FC = () => {
  const { supabaseUser, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/repos', label: 'Repositories', icon: FolderGit2 },
    { path: '/tasks', label: 'Tasks', icon: ListTodo },
    { path: '/docs', label: 'Documentation', icon: BookOpen },
    { path: '/releases', label: 'Releases', icon: Tag },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const getPageTitle = () => {
    const item = navItems.find((i) => location.pathname.startsWith(i.path));
    return item ? item.label : 'ContriBot';
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shadow-lg shadow-green-500/20 overflow-hidden">
            <img src="/contribot-logo.png" alt="ContriBot Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold tracking-tight">ContriBot</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gray-800 text-green-400 font-medium'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-4 py-3">
            <img
              src={supabaseUser?.avatar_url || `https://ui-avatars.com/api/?name=${supabaseUser?.email || 'User'}&background=random`}
              alt="Avatar"
              className="w-10 h-10 rounded-full bg-gray-800"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{supabaseUser?.github_username || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{supabaseUser?.email}</p>
            </div>
            <button onClick={signOut} className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-800">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-gray-800 bg-gray-950/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-100 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
};
