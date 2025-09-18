'use client';

import AuthWrapper from '../../components/auth/AuthWrapper';
import { CampaignProvider } from '../../contexts/CampaignContext';

export default function PreparationLayout({ children }) {
  return (
    <AuthWrapper>
      <CampaignProvider>
        {children}
      </CampaignProvider>
    </AuthWrapper>
  );
}
