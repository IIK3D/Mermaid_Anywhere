import * as vscode from 'vscode';

export interface MermaidBlock {
  range: vscode.Range;
  content: string;
}

const COMMENT_PREFIXES: Record<string, string[]> = {
  // Single-line // comments
  javascript: ['//'],
  typescript: ['//'],
  typescriptreact: ['//'],
  javascriptreact: ['//'],
  java: ['//'],
  c: ['//'],
  cpp: ['//'],
  csharp: ['//'],
  go: ['//'],
  rust: ['//'],
  swift: ['//'],
  kotlin: ['//'],
  dart: ['//'],
  scala: ['//'],
  php: ['//', '#'],
  // Hash comments
  python: ['#'],
  ruby: ['#'],
  shellscript: ['#'],
  bash: ['#'],
  yaml: ['#'],
  perl: ['#'],
  r: ['#'],
  dockerfile: ['#'],
  makefile: ['#'],
  toml: ['#'],
  // Double-dash comments
  sql: ['--'],
  plsql: ['--'],
  mysql: ['--'],
  pgsql: ['--'],
  postgres: ['--'],
  postgresql: ['--'],
  mssql: ['--'],
  oraclesql: ['--'],
  sqlite: ['--'],
  hiveql: ['--'],
  lua: ['--'],
  haskell: ['--'],
  elm: ['--'],
  // Semicolon comments
  clojure: [';;'],
  lisp: [';;'],
};

const BLOCK_COMMENT_LANGS: Record<string, { start: string; end: string }> = {
  html: { start: '<!--', end: '-->' },
  xml: { start: '<!--', end: '-->' },
  vue: { start: '<!--', end: '-->' },
  svelte: { start: '<!--', end: '-->' },
  css: { start: '/*', end: '*/' },
  scss: { start: '/*', end: '*/' },
  less: { start: '/*', end: '*/' },
};

export function detectMermaidBlocks(document: vscode.TextDocument): MermaidBlock[] {
  const languageId = document.languageId;

  console.log('[MermaidAnywhere] languageId:', languageId, 'file:', document.fileName);

  if (languageId === 'markdown') {
    return detectMarkdownBlocks(document);
  }

  const blocks: MermaidBlock[] = [];

  // Try single-line comment detection
  const prefixes = COMMENT_PREFIXES[languageId];
  if (prefixes) {
    for (const prefix of prefixes) {
      blocks.push(...detectSingleLineCommentBlocks(document, prefix));
    }
  }

  // Try block comment detection
  const blockComment = BLOCK_COMMENT_LANGS[languageId];
  if (blockComment) {
    blocks.push(...detectBlockCommentBlocks(document, blockComment.start, blockComment.end));
  }

  // Also try /* */ for C-family languages that also have //
  if (prefixes && prefixes.includes('//')) {
    blocks.push(...detectBlockCommentBlocks(document, '/*', '*/'));
  }

  // Fallback: if languageId not mapped, try all known prefixes
  if (!prefixes && !blockComment) {
    console.log('[MermaidAnywhere] Unknown languageId "' + languageId + '", trying all prefixes');
    const allPrefixes = ['//', '#', '--', ';;'];
    for (const prefix of allPrefixes) {
      const found = detectSingleLineCommentBlocks(document, prefix);
      if (found.length > 0) {
        blocks.push(...found);
        break;
      }
    }
    // Also try block comments
    blocks.push(...detectBlockCommentBlocks(document, '/*', '*/'));
    blocks.push(...detectBlockCommentBlocks(document, '<!--', '-->'));
  }

  return blocks;
}

function detectMarkdownBlocks(document: vscode.TextDocument): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  const text = document.getText();
  const regex = /^```mermaid\s*\n([\s\S]*?)^```\s*$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);
    blocks.push({
      range: new vscode.Range(startPos, endPos),
      content: match[1].trim(),
    });
  }

  return blocks;
}

function detectSingleLineCommentBlocks(
  document: vscode.TextDocument,
  prefix: string
): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  const lineCount = document.lineCount;
  const escapedPrefix = escapeRegex(prefix);
  const startRegex = new RegExp(`^\\s*${escapedPrefix}\\s*@mermaid\\s*$`);
  const endRegex = new RegExp(`^\\s*${escapedPrefix}\\s*@end-mermaid\\s*$`);
  const contentRegex = new RegExp(`^\\s*${escapedPrefix}\\s?(.*)$`);

  let i = 0;
  while (i < lineCount) {
    const lineText = document.lineAt(i).text;

    if (startRegex.test(lineText)) {
      const startLine = i;
      const contentLines: string[] = [];
      i++;

      while (i < lineCount) {
        const currentText = document.lineAt(i).text;

        if (endRegex.test(currentText)) {
          const range = new vscode.Range(
            new vscode.Position(startLine, 0),
            new vscode.Position(i, document.lineAt(i).text.length)
          );
          const content = contentLines.join('\n').trim();
          if (content.length > 0) {
            blocks.push({ range, content });
          }
          break;
        }

        const contentMatch = currentText.match(contentRegex);
        if (contentMatch) {
          contentLines.push(contentMatch[1]);
        } else {
          break;
        }
        i++;
      }
    }
    i++;
  }

  return blocks;
}

function detectBlockCommentBlocks(
  document: vscode.TextDocument,
  commentStart: string,
  commentEnd: string
): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  const text = document.getText();
  const escapedStart = escapeRegex(commentStart);
  const escapedEnd = escapeRegex(commentEnd);

  const regex = new RegExp(
    `${escapedStart}\\s*@mermaid\\s*\\n([\\s\\S]*?)\\s*@end-mermaid\\s*${escapedEnd}`,
    'g'
  );

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match[0].length);
    // Strip leading * from each line (for /* */ style comments)
    const content = match[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\*?\s?/, ''))
      .join('\n')
      .trim();

    if (content.length > 0) {
      blocks.push({
        range: new vscode.Range(startPos, endPos),
        content,
      });
    }
  }

  return blocks;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
