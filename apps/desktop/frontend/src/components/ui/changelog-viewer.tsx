import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ChangelogViewerProps {
  version: string;
  markdown: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangelogViewer({ version, markdown, isOpen, onOpenChange }: ChangelogViewerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col rounded-xl">
        <DialogHeader>
          <DialogTitle>What's New in Kairos {version}</DialogTitle>
          <DialogDescription>
            Release Notes
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 mt-2 mb-2 custom-scrollbar">
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-blue-500 hover:prose-a:text-blue-600 prose-img:rounded-lg">
            {markdown ? (
              <ReactMarkdown>{markdown}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">No release notes provided for this version.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
