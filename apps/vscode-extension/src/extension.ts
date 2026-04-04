import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('kairos.hello', () => {
    void vscode.window.showInformationMessage('Kairos extension scaffold is ready');
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // Scaffold phase: no runtime teardown yet.
}
