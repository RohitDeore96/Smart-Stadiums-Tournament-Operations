/**
 * @file apps/web/src/pages/ChatPage.tsx
 * @description Chat page — full-width chat panel with header.
 */

import { type FC } from 'react';
import { useI18n } from '../context/I18nContext.js';
import { ChatPanel } from '../components/ChatPanel.js';
import { getCurrentStadium } from '../services/crowdService.js';

export const ChatPage: FC = () => {
  const { t } = useI18n();
  const stadium = getCurrentStadium();

  return (
    <>
      <section className="page-header">
        <h2 className="page-title">{t('chat.title')}</h2>
        <p className="page-subtitle">{t('chat.subtitle')}</p>
      </section>

      <ChatPanel stadiumId={stadium.id} />
    </>
  );
};
