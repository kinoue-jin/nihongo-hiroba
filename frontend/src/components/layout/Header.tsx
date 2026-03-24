import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, fastapi } from '../../lib/apiClient';

export function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Helper to get auth state directly from localStorage
  const getAuthState = useCallback(() => {
    return {
      isAuthenticated: !!localStorage.getItem('access_token'),
      userRole: localStorage.getItem('user_role'),
      userId: localStorage.getItem('user_id'),
    };
  }, []);

  const [authState, setAuthState] = useState(getAuthState);

  useEffect(() => {
    // Re-read auth state when location changes (navigation)
    setAuthState(getAuthState());
  }, [location.pathname, getAuthState]);

  // Listen for storage changes (from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = () => {
      setAuthState(getAuthState());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [getAuthState]);

  // Fetch user name when authenticated
  const { data: memberData } = useQuery({
    queryKey: ['member', authState.userId],
    queryFn: async () => {
      if (!authState.userId) return null;
      const response = await fastapi.get(`/members/${authState.userId}`);
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!authState.userId && (authState.userRole === 'admin' || authState.userRole === 'staff'),
  });

  const handleLogout = async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const navItems = [
    { path: '/', label: t('nav.top') },
    { path: '/events', label: t('nav.events') },
    { path: '/calendar', label: t('nav.calendar') },
    { path: '/news', label: t('nav.news') },
    { path: '/about', label: t('nav.about') }
  ];

  const languages = [
    { code: 'ja', label: '日本語' },
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' }
  ];

  const isActive = (path: string) => location.pathname === path;

  const displayName = memberData?.name || '';

  return (
    <header data-testid="header" className="bg-gray-900 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-indigo-400">
              にほんごひろば
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.path === '/' ? 'top' : item.path.replace('/', '')}`}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'text-indigo-400'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Language Selector */}
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="text-sm border border-gray-600 rounded-md px-2 py-1 text-gray-200 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>

            {/* Auth Button - Show based on authentication and role */}
            {authState.isAuthenticated ? (
              <div className="flex items-center gap-3">
                {displayName && (
                  <span className="text-sm text-gray-300">{displayName}</span>
                )}
                {(authState.userRole === 'staff' || authState.userRole === 'admin') && (
                  location.pathname.startsWith('/admin') ? (
                    <Link
                      to="/"
                      className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      公開サイトへ
                    </Link>
                  ) : (
                    <Link
                      to="/admin"
                      className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      管理画面
                    </Link>
                  )
                )}
                {authState.userRole === 'learner' && (
                  <Link
                    to="/learner/mypage"
                    className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    マイページ
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  data-testid="logout-button"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                data-testid="login-button"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            data-testid="mobile-menu-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-300 hover:text-white focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div data-testid="mobile-menu" className="md:hidden py-4 border-t border-gray-700">
            <div className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.path === '/' ? 'top' : item.path.replace('/', '')}`}
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-base font-medium ${
                    isActive(item.path)
                      ? 'text-indigo-400'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="text-sm border border-gray-600 rounded-md px-2 py-1 text-gray-200 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-fit"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
              {authState.isAuthenticated ? (
                <div className="flex flex-col gap-2">
                  {displayName && (
                    <span className="text-sm text-gray-300">{displayName}</span>
                  )}
                  {(authState.userRole === 'staff' || authState.userRole === 'admin') && (
                    location.pathname.startsWith('/admin') ? (
                      <Link
                        to="/"
                        onClick={() => setIsMenuOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        公開サイトへ
                      </Link>
                    ) : (
                      <Link
                        to="/admin"
                        onClick={() => setIsMenuOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        管理画面
                      </Link>
                    )
                  )}
                  {authState.userRole === 'learner' && (
                    <Link
                      to="/learner/mypage"
                      onClick={() => setIsMenuOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      マイページ
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors w-fit"
                  >
                    ログアウト
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors w-fit"
                >
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
