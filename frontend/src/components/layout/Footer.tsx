import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer data-testid="footer" className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold text-indigo-400 mb-4">
              にほんごひろば
            </h3>
            <p className="text-sm text-gray-300">
              {t('top.subtitle')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/events"
                  className="text-sm text-gray-300 hover:text-indigo-400 transition-colors"
                >
                  {t('nav.events')}
                </Link>
              </li>
              <li>
                <Link
                  to="/calendar"
                  className="text-sm text-gray-300 hover:text-indigo-400 transition-colors"
                >
                  {t('nav.calendar')}
                </Link>
              </li>
              <li>
                <Link
                  to="/news"
                  className="text-sm text-gray-300 hover:text-indigo-400 transition-colors"
                >
                  {t('nav.news')}
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-sm text-gray-300 hover:text-indigo-400 transition-colors"
                >
                  {t('nav.about')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">{t('nav.contact')}</h4>
            <Link
              to="/contact"
              className="inline-block px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
            >
              {t('contact.title')}
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-400">
            {t('footer.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
