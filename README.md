# Mermaid Anywhere

> **WARNING: This extension is experimental and under active development.**

## Why

Documentation lives in wikis, Confluence pages, or separate `.md` files — far from the code it describes. When a developer changes a function, the diagram explaining its flow is somewhere else, forgotten, outdated.

**Mermaid Anywhere** brings diagrams back where they belong: **next to the code**, inside any source file, as comments.

No context switching. No separate preview tab. No broken links to an external doc. The diagram is part of the code, versioned with it, reviewed with it.

## How it works

Write a Mermaid diagram inside any comment block using `@mermaid` / `@end-mermaid` markers:

```typescript
// @mermaid
// graph TD
//   A[Request] --> B{Auth?}
//   B -- Yes --> C[Process]
//   B -- No --> D[401]
// @end-mermaid

function handleRequest(req: Request) {
  // ...
}
```

A **CodeLens "Preview Diagram"** appears above the block. Click it — the diagram renders fullscreen in the same tab. Press **Escape** to go back to the code.

## Supported languages

Works in any file type. Comment prefixes are detected automatically:

| Prefix | Languages |
|---|---|
| `//` | JavaScript, TypeScript, Java, C, C++, Go, Rust, Swift, Kotlin, C#, Dart, Scala, PHP |
| `#` | Python, Ruby, Shell, YAML, Perl, R, Dockerfile, Makefile, TOML |
| `--` | SQL (all variants), Lua, Haskell, Elm |
| `/* */` | CSS, SCSS, Less, C-family (multi-line) |
| `<!-- -->` | HTML, XML, Vue, Svelte |
| `;;` | Clojure, Lisp |
| ` ```mermaid ` | Markdown (native fenced blocks) |

Unknown languages trigger a fallback that tries all prefixes automatically.

## Controls

| Action | Input |
|---|---|
| Open preview | Click CodeLens or `Ctrl+Shift+P` > "Mermaid Anywhere: Preview Diagram" |
| Close preview | `Escape` or Close button |
| Zoom in | Mouse wheel up, `+` key, or `+` button |
| Zoom out | Mouse wheel down, `-` key, or `-` button |
| Pan | Click and drag |
| Fit to view | `0` key or Fit button |
| Copy SVG | Copy SVG button |

## Settings

| Setting | Default | Description |
|---|---|---|
| `mermaid-anywhere.theme` | `auto` | Diagram theme: `auto` (follows VSCode), `light`, `dark` |
| `mermaid-anywhere.maxWidth` | `100%` | Maximum diagram width |

## Install

### From release (recommended)

1. Download the latest `.vsix` file from [Releases](https://github.com/IIK3D/Mermaid_Anywhere/releases)
2. In VSCode: `Ctrl+Shift+P` > **Extensions: Install from VSIX...**
3. Select the downloaded `.vsix` file
4. Reload VSCode

Or from the command line:

```sh
code --install-extension mermaid-anywhere-0.1.0.vsix
```

### From source (development)

```sh
git clone https://github.com/IIK3D/Mermaid_Anywhere.git
cd Mermaid_Anywhere
npm install
npm run build
```

Press `F5` in VSCode to launch the Extension Development Host.
