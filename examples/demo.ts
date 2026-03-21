// Example: Mermaid diagram in a TypeScript file

// @mermaid
// graph TD
//   A[Start] --> B{Is it working?}
//   B -- Yes --> C[Great!]
//   B -- No --> D[Debug]
//   D --> B
// @end-mermaid

function hello(): string {
  return 'Mermaid Anywhere works!';
}

// Another diagram in the same file

// @mermaid
// sequenceDiagram
//   participant U as User
//   participant E as Extension
//   participant W as Webview
//   U->>E: Click CodeLens
//   E->>W: Open preview
//   W->>W: Render diagram
//   U->>W: Press Escape
//   W->>E: Close message
//   E->>U: Restore editor
// @end-mermaid

export { hello };
