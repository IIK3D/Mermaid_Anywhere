import * as vscode from 'vscode';
import { detectMermaidBlocks } from './mermaidDetector';

export class MermaidCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const blocks = detectMermaidBlocks(document);

    return blocks.map((block, index) => {
      return new vscode.CodeLens(block.range, {
        title: '$(preview) Preview Diagram',
        command: 'mermaid-anywhere.preview',
        arguments: [block.content, index],
        tooltip: 'Open Mermaid diagram preview',
      });
    });
  }
}
