export type ActivityEvent = {
  source: 'desktop' | 'vscode';
  action: string;
  timestamp: string;
};
