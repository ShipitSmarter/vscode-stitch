# Development Guide

This guide provides comprehensive information for developers contributing to the vscode-stitch extension.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Debugging](#debugging)
- [Testing](#testing)
- [Contributing Guidelines](#contributing-guidelines)

## Architecture Overview

The vscode-stitch extension follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                      VS Code Extension API                  │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    extension.ts (Entry Point)               │
│  - Command registration                                     │
│  - Extension activation                                     │
└────────┬───────────────────────────────┬────────────────────┘
         │                               │
┌────────▼──────────────┐    ┌───────────▼────────────────────┐
│   ContextHandler      │    │    StitchTreeProvider          │
│  - Context tracking   │    │  - Model tree view             │
│  - File watching      │    │  - Property insertion          │
│  - Scenario mgmt      │    │  - Scenario source links       │
└────────┬──────────────┘    └────────────────────────────────┘
         │
┌────────▼───────────────────────────────────────────────────┐
│                    StitchPreview                           │
│  - Webview management                                      │
│  - Preview rendering (HTML)                                │
│  - Command handling                                        │
└────────┬───────────────────────────┬───────────────────────┘
         │                           │
┌────────▼──────────────┐    ┌───────▼───────────────────────┐
│   PdfPreview          │    │  StitchPreviewHelper          │
│  - PDF.js integration │    │  - Template display           │
│  - PDF rendering      │    │  - HTTP request generation    │
└───────────────────────┘    └───────────────────────────────┘
         
┌────────────────────────────────────────────────────────────┐
│                    Utility Modules                         │
│  - IntegrationRequestBuilder: Build API requests           │
│  - FileScrambler: File content management                  │
│  - ScenarioHelper: Scenario file discovery                 │
│  - TreeBuilder: Generate tree from model                   │
│  - helpers: Common utility functions                       │
└────────────────────────────────────────────────────────────┘
         │
┌────────▼───────────────────────────────────────────────────┐
│              Stitch API (External Service)                 │
│  - /editor/simulate/integration endpoint                   │
│  - Processes integration files and returns results         │
└────────────────────────────────────────────────────────────┘
```

### Key Components

#### **ContextHandler** (`src/ContextHandler.ts`)
- Singleton class managing the extension's global state
- Tracks active integration file and scenario
- Handles configuration changes
- Debounces file changes to reduce API calls
- Communicates with Stitch API endpoint

#### **StitchPreview** (`src/StitchPreview.ts`)
- Manages webview panel for integration preview
- Renders simulation results as HTML
- Handles user interactions (view requests, responses, etc.)
- Coordinates with PdfPreview for PDF rendering

#### **StitchTreeProvider** (`src/StitchTreeProvider.ts`)
- Implements VS Code TreeDataProvider interface
- Displays model structure in Explorer sidebar
- Enables property insertion into editor
- Links to scenario source files

#### **Build System**
- Uses esbuild for fast bundling
- Single entry point: `src/extension.ts`
- Output: `dist/extension.js` (minified in production)
- Watch mode available for development


## Getting Started

### Prerequisites

- **Node.js**: Version 20.x or higher
- **npm**: Version 10.x or higher
- **VS Code**: Version 1.96.0 or higher

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ShipitSmarter/vscode-stitch.git
   cd vscode-stitch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run compile
   ```

4. **Open in VS Code**
   ```bash
   code .
   ```

### Environment Configuration

The extension requires a Stitch API endpoint for testing. Configure it in your VS Code settings:

```json
{
  "stitch.endpointUrl": "https://your-stitch-api.example.com"
}
```

For local development, you can use the demo-files folder which contains example integrations.

## Debugging

### Launch Configurations

The project includes two debug configurations in `.vscode/launch.json`:

#### 1. **Run Extension**
- Press `F5` or select "Run > Start Debugging"
- Opens new VS Code window with extension loaded
- Opens `demo-files/` folder by default
- Breakpoints work in TypeScript source files
- Console output in Debug Console

#### 2. **Extension Tests**
- Select "Extension Tests" from debug dropdown
- Runs all tests in `src/test/suite/`
- Test output in Debug Console

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Compile tests only
npm run compile-tests
```

## Contributing Guidelines

### Code Style

The project uses ESLint with TypeScript rules:

```bash
# Lint check
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

**Key conventions:**
- Use TypeScript strict mode
- Private members prefixed with `_`
- Public methods documented with JSDoc
- PascalCase for classes, camelCase for functions
- 4-space indentation (tabs)
- Single quotes for strings
- Always use curly braces for conditionals

### Pull Request Guidelines

**PR Description should include:**
- Summary of changes
- Motivation/context
- Related issues (closes #123)
- Testing performed
- Screenshots (for UI changes)

**Before submitting:**
- [ ] Code builds without errors
- [ ] All tests pass
- [ ] Lint checks pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No console.log statements in production code


### Getting Help

- **Issues**: https://github.com/ShipitSmarter/vscode-stitch/issues
- **Documentation**: [docs/readme.md](docs/readme.md)
- **VS Code API**: https://code.visualstudio.com/api
- **Stitch Schemas**: https://github.com/ShipitSmarter/stitch-schemas

### License

This project is licensed under the terms specified in [LICENSE.md](LICENSE.md)