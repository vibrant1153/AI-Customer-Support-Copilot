'use client';

import { useState, useCallback } from 'react';
import ReplyModeSettings from './ReplyModeSettings';
import PendingDraftsList from './PendingDraftsList';

type ReplyMode = 'hosted' | 'gmail_native';

export default function GmailNativeSettings({
  initialReplyMode,
  gmailConnected,
}: {
  initialReplyMode: ReplyMode;
  gmailConnected: boolean;
}) {
  const [replyMode, setReplyMode] = useState<ReplyMode>(initialReplyMode);
  // Bumping this forces PendingDraftsList to refetch — see its useEffect dependency.
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAutomationComplete = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  return (
    <>
      <ReplyModeSettings
        initialReplyMode={initialReplyMode}
        gmailConnected={gmailConnected}
        onReplyModeChange={setReplyMode}
        onAutomationComplete={handleAutomationComplete}
      />

      {replyMode === 'gmail_native' && gmailConnected && (
        <PendingDraftsList refreshTrigger={refreshTrigger} />
      )}
    </>
  );
}