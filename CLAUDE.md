# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MTS (Magezi Tech Solutions) is an open-source AI agent that automates engineering tasks. It's built with Rust for core logic and Electron/TypeScript for the desktop app.

## Build & Development Commands

```bash
# Setup (first time)
source bin/activate-hermit
cargo build

# Build
cargo build                      # debug build
cargo build --release            # release build
just release-binary              # release + OpenAPI schema generation

# Test
cargo test                       # all tests
cargo test -p mts                # specific crate
cargo test -p mts --test mcp_integration_test  # integration tests

# Lint & Format (run before committing)
cargo fmt
./scripts/clippy-lint.sh

# UI Development
just run-ui                      # build rust + start electron app
just run-ui-only                 # start electron without rebuilding rust
just debug-ui                    # connect UI to external server (run-server first)
just run-server                  # start backend server only
just generate-openapi            # regenerate API types after server changes
cd ui/desktop && npm run lint:check  # lint UI code
cd ui/desktop && npm test        # test UI
```

## Architecture

### Crate Structure
```
crates/
├── mts             # Core agent logic - main library
├── mts-cli         # CLI entry point (binary: mts)
├── mts-server      # Backend for desktop app (binary: mtsd)
├── mts-mcp         # MCP server implementations
├── mts-bench       # Benchmarking tools
└── mts-test        # Test utilities
```

### Key Entry Points
- CLI: `crates/mts-cli/src/main.rs`
- Server: `crates/mts-server/src/main.rs`
- Agent core: `crates/mts/src/agents/agent.rs`
- UI: `ui/desktop/src/main.ts`

### Feature Implementation Flow
1. Core features go in `crates/mts/`
2. CLI wrappers in `crates/mts-cli/`
3. Desktop features: add routes in `crates/mts-server/src/routes/`
4. Run `just generate-openapi` to update TypeScript API client
5. Call from TypeScript via generated `ui/desktop/src/api/` files

## Code Standards

### Error Handling
- Use `anyhow::Result` for error propagation
- Don't add redundant error context (avoid `.context("Failed to X")` when error already says it failed)

### Code Style
- Run `cargo fmt` before every commit
- Run `./scripts/clippy-lint.sh` before submitting PRs
- Write self-documenting code - avoid comments that restate what code does
- Only comment complex algorithms or non-obvious "why" decisions
- Avoid optional types when not needed - let the compiler enforce
- Booleans should default to false, not be optional

### What NOT to Do
- Never edit `ui/desktop/openapi.json` manually - it's auto-generated
- Never edit `Cargo.toml` directly - use `cargo add`
- Never skip `cargo fmt` or clippy checks
- Avoid adding logging unless for errors or security events

## MCP (Model Context Protocol)

MCP extensions live in `crates/mts-mcp/`. The `developer` subsystem contains tools like shell execution. When adding new MCP tools, follow patterns in existing tools.

## Environment Variables

- `MTS_PROVIDER` - Override the LLM provider
- `MTS_PATH_ROOT` - Isolate config/data directories for testing
- `MTS_SERVER__SECRET_KEY` - Required when running server standalone
- `MTS_PORT` - Change server port (default: 3000)

## Commit Standards

- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- Use `--signoff` flag for DCO compliance
