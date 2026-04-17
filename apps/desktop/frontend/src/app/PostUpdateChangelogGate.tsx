import { useEffect, useRef, useState } from 'react';
import { GetSettingsData } from '../../wailsjs/go/main/App';
import { ChangelogViewer } from '@/components/ui/changelog-viewer';
import { checkDesktopUpdate } from '@/lib/backend/settings';
import {
  normalizeAppVersion,
  readLastSeenChangelogVersion,
  shouldAutoOpenChangelog,
  writeLastSeenChangelogVersion,
} from '@/lib/changelog-gate';

export function PostUpdateChangelogGate() {
  const [isOpen, setIsOpen] = useState(false);
  const [version, setVersion] = useState('—');
  const [markdown, setMarkdown] = useState('');
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    let active = true;
    void (async () => {
      const settings = await GetSettingsData();
      const installedVersion = normalizeAppVersion(settings?.about?.appVersion);
      if (!installedVersion) {
        return;
      }

      const lastSeenVersion = readLastSeenChangelogVersion();
      if (!shouldAutoOpenChangelog(installedVersion, lastSeenVersion)) {
        return;
      }

      let releaseNotes = '';
      const updateStatus = await checkDesktopUpdate().catch(() => null);
      if (updateStatus && !updateStatus.error) {
        releaseNotes = updateStatus.releaseNotes ?? '';
      }

      if (!active) {
        return;
      }

      setVersion(installedVersion);
      setMarkdown(releaseNotes);
      setIsOpen(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <ChangelogViewer
      version={version}
      markdown={markdown}
      isOpen={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          writeLastSeenChangelogVersion(version);
        }
      }}
    />
  );
}
