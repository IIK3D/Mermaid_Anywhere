import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

let currentPanel: vscode.WebviewPanel | undefined;
let previousEditor: { uri: vscode.Uri; selection: vscode.Selection } | undefined;

export function closePreview(): void {
  if (currentPanel) {
    currentPanel.dispose();
  }
}

export function isPreviewVisible(): boolean {
  return currentPanel !== undefined && currentPanel.visible;
}

export function showMermaidPreview(
  context: vscode.ExtensionContext,
  mermaidContent: string
): void {
  // Save current editor state for restoration
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    previousEditor = {
      uri: activeEditor.document.uri,
      selection: activeEditor.selection,
    };
  }

  // Set context for keybinding (Escape)
  vscode.commands.executeCommand('setContext', 'mermaidAnywherePreviewVisible', true);

  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Active);
    updateContent(currentPanel, mermaidContent, context);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'mermaidPreview',
    'Mermaid Preview',
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: false,
    }
  );

  currentPanel.onDidDispose(
    () => {
      currentPanel = undefined;
      vscode.commands.executeCommand('setContext', 'mermaidAnywherePreviewVisible', false);
      restorePreviousEditor();
    },
    null,
    context.subscriptions
  );

  currentPanel.webview.onDidReceiveMessage(
    (message) => {
      if (message.command === 'close') {
        currentPanel?.dispose();
      }
    },
    null,
    context.subscriptions
  );

  updateContent(currentPanel, mermaidContent, context);
}

function updateContent(
  panel: vscode.WebviewPanel,
  mermaidContent: string,
  context: vscode.ExtensionContext
): void {
  const config = vscode.workspace.getConfiguration('mermaid-anywhere');
  const themeConfig = config.get<string>('theme', 'auto');
  const maxWidth = config.get<string>('maxWidth', '100%');

  const mermaidTheme = resolveTheme(themeConfig);

  panel.webview.html = getWebviewContent(context, mermaidContent, mermaidTheme, maxWidth);
}

function resolveTheme(themeConfig: string): string {
  if (themeConfig !== 'auto') {
    return themeConfig === 'dark' ? 'dark' : 'default';
  }
  const vscodeTheme = vscode.window.activeColorTheme.kind;
  if (
    vscodeTheme === vscode.ColorThemeKind.Dark ||
    vscodeTheme === vscode.ColorThemeKind.HighContrastDark
  ) {
    return 'dark';
  }
  return 'default';
}

async function restorePreviousEditor(): Promise<void> {
  if (!previousEditor) {
    return;
  }
  const { uri, selection } = previousEditor;
  previousEditor = undefined;

  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Active);
    editor.selection = selection;
    editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
  } catch {
    // File may have been closed/deleted, ignore
  }
}

function getWebviewContent(
  context: vscode.ExtensionContext,
  mermaidContent: string,
  theme: string,
  maxWidth: string
): string {
  const nonce = crypto.randomBytes(16).toString('hex');

  // Load mermaid.min.js from node_modules and inline it
  const mermaidJsPath = path.join(context.extensionPath, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
  const mermaidJsContent = fs.readFileSync(mermaidJsPath, 'utf-8');

  // Encode mermaid diagram content as base64 to avoid escaping issues
  const contentBase64 = Buffer.from(mermaidContent, 'utf-8').toString('base64');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data:;">
  <title>Mermaid Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      background-color: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #cccccc);
    }

    .toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background-color: var(--vscode-titleBar-activeBackground, #333333);
      border-bottom: 1px solid var(--vscode-panel-border, #444444);
      z-index: 100;
    }

    .toolbar-title { font-size: 12px; opacity: 0.8; }

    .toolbar-actions { display: flex; gap: 8px; }

    .toolbar button {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border: none;
      padding: 4px 12px;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
    }

    .toolbar button:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }

    .toolbar button.secondary {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #cccccc);
    }

    .toolbar button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    #viewport {
      position: fixed;
      top: 40px; left: 0; right: 0; bottom: 30px;
      overflow: hidden;
      cursor: grab;
    }

    #viewport.dragging { cursor: grabbing; }

    #diagram-container {
      transform-origin: 0 0;
      display: inline-block;
      position: absolute;
    }

    #diagram-container svg { display: block; }

    .error-message {
      color: var(--vscode-errorForeground, #f48771);
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
      padding: 12px 16px;
      border-radius: 4px;
      font-family: var(--vscode-editor-fontFamily, monospace);
      font-size: 13px;
      white-space: pre-wrap;
      max-width: 600px;
    }

    .shortcut-hint {
      position: fixed;
      bottom: 12px; right: 16px;
      font-size: 11px;
      opacity: 0.5;
    }

    kbd {
      background: var(--vscode-keybindingLabel-background, #333);
      border: 1px solid var(--vscode-keybindingLabel-border, #555);
      border-radius: 3px;
      padding: 1px 5px;
      font-size: 11px;
      font-family: inherit;
    }

    .loading { font-size: 14px; opacity: 0.6; }

    .zoom-controls {
      position: fixed;
      bottom: 40px; right: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 100;
    }

    .zoom-controls button {
      width: 32px; height: 32px;
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: 1px solid var(--vscode-panel-border, #444444);
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: inherit;
    }

    .zoom-controls button:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }

    .zoom-level {
      text-align: center;
      font-size: 10px;
      opacity: 0.6;
      padding: 2px 0;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="toolbar-title">Mermaid Anywhere</span>
    <div class="toolbar-actions">
      <button class="secondary" id="btn-copy-svg" title="Copy SVG to clipboard">Copy SVG</button>
      <button id="btn-close" title="Close preview (Escape)">Close</button>
    </div>
  </div>

  <div id="viewport">
    <div id="diagram-container">
      <div class="loading">Rendering diagram...</div>
    </div>
  </div>

  <div class="zoom-controls">
    <button id="btn-zoom-in" title="Zoom in (+)">+</button>
    <div class="zoom-level" id="zoom-level">100%</div>
    <button id="btn-zoom-out" title="Zoom out (-)">-</button>
    <button id="btn-zoom-fit" title="Fit to view (0)">Fit</button>
  </div>

  <div class="shortcut-hint">
    <kbd>Scroll</kbd> zoom &nbsp; <kbd>Drag</kbd> pan &nbsp; <kbd>0</kbd> fit &nbsp; <kbd>Esc</kbd> close
  </div>

  <script nonce="${nonce}">
    ${mermaidJsContent}
  </script>
  <script nonce="${nonce}">
    (function() {
      var vscodeApi = acquireVsCodeApi();
      var container = document.getElementById('diagram-container');

      // Decode mermaid content from base64
      var mermaidCode = atob('${contentBase64}');

      window.mermaid.initialize({
        startOnLoad: false,
        theme: '${theme}',
        securityLevel: 'loose',
        fontFamily: 'var(--vscode-editor-fontFamily, monospace)'
      });

      // Zoom & Pan state
      var viewport = document.getElementById('viewport');
      var scale = 1;
      var panX = 0;
      var panY = 0;
      var isDragging = false;
      var dragStartX = 0;
      var dragStartY = 0;
      var panStartX = 0;
      var panStartY = 0;
      var MIN_SCALE = 0.1;
      var MAX_SCALE = 5;

      function applyTransform() {
        container.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + scale + ')';
        document.getElementById('zoom-level').textContent = Math.round(scale * 100) + '%';
      }

      function fitToView() {
        var svgEl = container.querySelector('svg');
        if (!svgEl) return;
        var vw = viewport.clientWidth;
        var vh = viewport.clientHeight;
        var sw = svgEl.getBoundingClientRect().width / scale;
        var sh = svgEl.getBoundingClientRect().height / scale;
        if (sw === 0 || sh === 0) return;
        var fitScale = Math.min(vw / sw, vh / sh, 1) * 0.9;
        scale = fitScale;
        panX = (vw - sw * scale) / 2;
        panY = (vh - sh * scale) / 2;
        applyTransform();
      }

      window.mermaid.render('mermaid-diagram', mermaidCode).then(function(result) {
        container.innerHTML = result.svg;
        // Center and fit after render
        setTimeout(fitToView, 50);
      }).catch(function(err) {
        var errMsg = (err && err.message) ? err.message : String(err);
        container.innerHTML = '<div class="error-message">Mermaid syntax error:<br><br>' + errMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
      });

      // Mouse wheel zoom (zoom towards cursor)
      viewport.addEventListener('wheel', function(e) {
        e.preventDefault();
        var rect = viewport.getBoundingClientRect();
        var mouseX = e.clientX - rect.left;
        var mouseY = e.clientY - rect.top;
        var delta = e.deltaY > 0 ? 0.9 : 1.1;
        var newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta));
        var ratio = newScale / scale;
        panX = mouseX - ratio * (mouseX - panX);
        panY = mouseY - ratio * (mouseY - panY);
        scale = newScale;
        applyTransform();
      }, { passive: false });

      // Pan with mouse drag
      viewport.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        panStartX = panX;
        panStartY = panY;
        viewport.classList.add('dragging');
      });

      document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        panX = panStartX + (e.clientX - dragStartX);
        panY = panStartY + (e.clientY - dragStartY);
        applyTransform();
      });

      document.addEventListener('mouseup', function() {
        isDragging = false;
        viewport.classList.remove('dragging');
      });

      // Zoom buttons
      document.getElementById('btn-zoom-in').addEventListener('click', function() {
        var cx = viewport.clientWidth / 2;
        var cy = viewport.clientHeight / 2;
        var newScale = Math.min(MAX_SCALE, scale * 1.25);
        var ratio = newScale / scale;
        panX = cx - ratio * (cx - panX);
        panY = cy - ratio * (cy - panY);
        scale = newScale;
        applyTransform();
      });

      document.getElementById('btn-zoom-out').addEventListener('click', function() {
        var cx = viewport.clientWidth / 2;
        var cy = viewport.clientHeight / 2;
        var newScale = Math.max(MIN_SCALE, scale * 0.8);
        var ratio = newScale / scale;
        panX = cx - ratio * (cx - panX);
        panY = cy - ratio * (cy - panY);
        scale = newScale;
        applyTransform();
      });

      document.getElementById('btn-zoom-fit').addEventListener('click', fitToView);

      // Keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          vscodeApi.postMessage({ command: 'close' });
        } else if (e.key === '0') {
          fitToView();
        } else if (e.key === '+' || e.key === '=') {
          document.getElementById('btn-zoom-in').click();
        } else if (e.key === '-') {
          document.getElementById('btn-zoom-out').click();
        }
      });

      // Close button
      document.getElementById('btn-close').addEventListener('click', function() {
        vscodeApi.postMessage({ command: 'close' });
      });

      // Copy SVG
      document.getElementById('btn-copy-svg').addEventListener('click', function() {
        var svgEl = container.querySelector('svg');
        if (svgEl) {
          navigator.clipboard.writeText(svgEl.outerHTML).then(function() {
            var btn = document.getElementById('btn-copy-svg');
            btn.textContent = 'Copied!';
            setTimeout(function() { btn.textContent = 'Copy SVG'; }, 1500);
          });
        }
      });
    })();
  </script>
</body>
</html>`;
}
