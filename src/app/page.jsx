'use client';

import AuthWrapper from '../components/auth/AuthWrapper';
import { CampaignProvider } from '../contexts/CampaignContext';
import ToolboxInterface from '../components/ToolboxInterface';

function DndPageContent() {
  return <ToolboxInterface />;
}

export default function DndPage() {
  return (
    <AuthWrapper>
      <CampaignProvider>
        <DndPageContent />
      </CampaignProvider>
    </AuthWrapper>
  );
}