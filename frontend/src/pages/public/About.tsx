import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/apiClient';
import type { PublicMemberResponse } from '../../types/api';

export function About() {
  const { t } = useTranslation();

  const { data: members } = useQuery({
    queryKey: ['public_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_members')
        .select('*');
      if (error) throw error;
      return data as PublicMemberResponse[];
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('about.title')}</h1>

      {/* Mission */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('about.mission')}</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-lg text-gray-700 leading-relaxed">
            にほんごひろばは、日本語学習者と日本人メンバーが相互に学び合い、
            文化交流を通じて友情を深める場です。異文化間の理解を促進し、
            地域社会における多文化共生の実現を目指します。
          </p>
        </div>
      </section>

      {/* Activities */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">活動内容</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-indigo-600 mb-2">学習セッション</h3>
            <p className="text-gray-600">
              週に2回（月曜日・土曜日）、日本語学習者との定期的な学習セッションを行っています。
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-indigo-600 mb-2">イベント</h3>
            <p className="text-gray-600">
              「ふるさとを語ろう」「海外文化講座」など、様々なイベントを通じて交流を深めています。
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-indigo-600 mb-2">情報共有</h3>
            <p className="text-gray-600">
              ウェブサイトやSNSを通じて、活動報告やお知らせを発信しています。
            </p>
          </div>
        </div>
      </section>

      {/* Staff */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('about.staff')}</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {members && members.length > 0 ? (
            members.map((member) => (
              <div key={member.id} className="bg-white rounded-lg shadow p-6 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl text-gray-400">👤</span>
                </div>
                <h3 className="font-semibold text-gray-900">{member.name}</h3>
              </div>
            ))
          ) : (
            <p className="text-gray-500 col-span-full text-center py-8">
              スタッフ情報は準備中です。
            </p>
          )}
        </div>
      </section>

      {/* History */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('about.history')}</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <ul className="space-y-4">
            <li className="flex gap-4">
              <span className="text-indigo-600 font-semibold min-w-[80px]">2015年</span>
              <span className="text-gray-700">にほんごひろば設立</span>
            </li>
            <li className="flex gap-4">
              <span className="text-indigo-600 font-semibold min-w-[80px]">2018年</span>
              <span className="text-gray-700">ウェブサイト開設</span>
            </li>
            <li className="flex gap-4">
              <span className="text-indigo-600 font-semibold min-w-[80px]">2020年</span>
              <span className="text-gray-700">オンライン活動開始</span>
            </li>
            <li className="flex gap-4">
              <span className="text-indigo-600 font-semibold min-w-[80px]">2023年</span>
              <span className="text-gray-700">子供学習塾スタート</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
