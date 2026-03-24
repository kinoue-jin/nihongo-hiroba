import { Link, useLocation } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/apiClient';

interface AdminMenuItem {
  path: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    setUserRole(role);
  }, []);

  const adminMenuItems: AdminMenuItem[] = [
    { path: '/admin', label: 'ダッシュボード', icon: '📊' },
    { path: '/admin/news', label: 'お知らせ管理', icon: '📰' },
    { path: '/admin/events', label: 'イベント管理', icon: '📅' },
    { path: '/admin/schedule', label: 'スケジュール管理', icon: '🗓️' },
    { path: '/admin/learners', label: '学習者管理', icon: '👨‍🎓' },
    { path: '/admin/members', label: 'メンバー管理', icon: '👥' },
    { path: '/admin/media', label: 'メディア管理', icon: '🖼️' },
    { path: '/admin/pairing', label: 'ペアリング管理', icon: '🔗' },
    { path: '/admin/records', label: '学習記録', icon: '📝' },
    { path: '/admin/stats', label: '統計入力', icon: '📈' },
    { path: '/admin/master', label: 'マスターデータ', icon: '⚙️', adminOnly: true },
    { path: '/admin/permissions', label: 'ユーザー権限', icon: '🔐', adminOnly: true },
  ];

  const handleLogout = async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const filteredMenuItems = adminMenuItems.filter(item => {
    if (item.adminOnly && userRole !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex-shrink-0 hidden md:block">
        <nav className="mt-4 overflow-y-auto" style={{ height: 'calc(100vh - 64px)' }}>
          <ul>
            {filteredMenuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                    isActive(item.path)
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-700 space-y-2">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            公開サイトへ
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* Mobile menu */}
      <div className="md:hidden fixed inset-0 z-50">
        <div className="flex">
          <aside className="w-64 bg-gray-900 text-white h-full">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <span className="text-xl font-bold text-gray-400">管理画面</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-white"
              >
                ✕
              </button>
            </div>
            <nav className="mt-4 overflow-y-auto h-calc(100vh-120px)">
              <ul>
                {filteredMenuItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        isActive(item.path)
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="absolute bottom-0 w-64 p-4 border-t border-gray-700 space-y-2">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                公開サイトへ
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </aside>
          <div className="flex-1 bg-black opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center">
          <span className="text-lg font-bold text-gray-400">管理画面</span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 bg-gray-700 rounded"
            >
              ☰
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
