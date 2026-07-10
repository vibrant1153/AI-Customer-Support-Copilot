'use client';

import { useState, useCallback } from 'react';
import ReplyModeSettings from './ReplyModeSettings';
import PendingDraftsList from './PendingDraftsList';
import RejectedDraftsList from './RejectedDraftsList';

type ReplyMode = 'hosted' | 'gmail_native';

export default function GmailNativeSettings({
  initialReplyMode,
  gmailConnected,
}: {
  initialReplyMode: ReplyMode;
  gmailConnected: boolean;
}) {
  const [replyMode, setReplyMode] = useState<ReplyMode>(initialReplyMode);
  // Bumping either of these forces the matching list to refetch — see
  // each component's useEffect dependency.
  const [pendingRefreshTrigger, setPendingRefreshTrigger] = useState(0);
  const [rejectedRefreshTrigger, setRejectedRefreshTrigger] = useState(0);

  const handleAutomationComplete = useCallback(() => {
    setPendingRefreshTrigger((n) => n + 1);
  }, []);

  // A draft moving to 'rejected' (from PendingDraftsList) should refresh
  // the rejected list; a draft being regenerated (from RejectedDraftsList)
  // should refresh the pending list. They feed each other.
  const handlePendingChanged = useCallback(() => {
    setRejectedRefreshTrigger((n) => n + 1);
  }, []);

  const handleRegenerate = useCallback(() => {
    setPendingRefreshTrigger((n) => n + 1);
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
        <>
          <PendingDraftsList refreshTrigger={pendingRefreshTrigger} onDraftActioned={handlePendingChanged} />
          <RejectedDraftsList refreshTrigger={rejectedRefreshTrigger} onRegenerate={handleRegenerate} />
        </>
      )}
    </>
  );
}