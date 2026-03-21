import * as vscode from 'vscode';
import { MermaidCodeLensProvider } from './codeLensProvider';
import { showMermaidPreview, closePreview } from './webviewPanel';
import { detectMermaidBlocks } from './mermaidDetector';

export function activate(context: vscode.ExtensionContext): void {
  const codeLensProvider = new MermaidCodeLensProvider();

  // Register CodeLens for all file types
  const codeLensDisposable = vscode.languages.registerCodeLensProvider(
    { scheme: 'file' },
    codeLensProvider
  );

  // Register the preview command
  const previewCommand = vscode.commands.registerCommand(
    'mermaid-anywhere.preview',
    (mermaidContent?: string) => {
      // If called from CodeLens, content is passed as argument
      if (mermaidContent) {
        showMermaidPreview(context, mermaidContent);
        return;
      }

      // If called from command palette, detect block at cursor position
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor found.');
        return;
      }

      const blocks = detectMermaidBlocks(editor.document);
      const cursorPos = editor.selection.active;
      const block = blocks.find((b) => b.range.contains(cursorPos));

      if (block) {
        showMermaidPreview(context, block.content);
      } else if (blocks.length === 1) {
        showMermaidPreview(context, blocks[0].content);
      } else if (blocks.length > 1) {
        // Let user pick which diagram to preview
        const items = blocks.map((b, i) => ({
          label: `Diagram ${i + 1}`,
          description: `Line ${b.range.start.line + 1}`,
          detail: b.content.substring(0, 80) + (b.content.length > 80 ? '...' : ''),
          content: b.content,
        }));

        vscode.window.showQuickPick(items, { placeHolder: 'Select a diagram to preview' }).then((selected) => {
          if (selected) {
            showMermaidPreview(context, selected.content);
          }
        });
      } else {
        vscode.window.showWarningMessage('No @mermaid block found in this file.');
      }
    }
  );

  // Register close preview command (for Escape keybinding)
  const closeCommand = vscode.commands.registerCommand(
    'mermaid-anywhere.closePreview',
    () => {
      closePreview();
    }
  );

  // Refresh CodeLens on document changes
  const changeDisposable = vscode.workspace.onDidChangeTextDocument(() => {
    codeLensProvider.refresh();
  });

  context.subscriptions.push(codeLensDisposable, previewCommand, closeCommand, changeDisposable);
}

export function deactivate(): void {
  // Nothing to clean up
}
