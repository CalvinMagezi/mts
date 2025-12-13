# How to Use AI with MTS
_A practical guide for contributing to MTS using AI coding assistants_

MTS benefits from thoughtful AI-assisted development, but contributors must maintain high standards for code quality, security, and collaboration. Whether you use MTS itself, GitHub Copilot, Cursor, Claude, or other AI tools, this guide will help you contribute effectively.

---

## Core Principles

- **Human Oversight**: You are accountable for all code you submit. Never commit code you don't understand or can't maintain.
- **Quality Standards**: AI code must meet the same standards as human written code—tests, docs, and patterns included.
- **Transparency**: Be open about significant AI usage in PRs and explain how you validated it.

---

## Best Practices

**✅ Recommended Uses**

- Generating boilerplate code and common patterns
- Creating comprehensive test suites
- Writing documentation and comments
- Refactoring existing code for clarity
- Generating utility functions and helpers
- Explaining existing code patterns

**❌ Avoid AI For**

- Complex business logic without thorough review
- Security critical authentication/authorization code
- Code you don't fully understand
- Large architectural changes
- Database migrations or schema changes

**Workflow Tips**

- Start small and validate often. Build, lint, and test incrementally
- Study existing patterns before generating new code
- Always ask: "Is this secure? Does it follow project patterns? What edge cases need testing?"

**Security Considerations**

- Extra review required for MCP servers, network code, file system ops, user input, and credential handling
- Never expose secrets in prompts
- Sanitize inputs/outputs and follow MTS's security patterns

---

## Testing & Review

Before submitting AI assisted code, confirm that:
- You understand every line
- All tests pass locally (happy path + error cases)
- Docs are updated and accurate
- Code follows existing patterns

**Always get human review** for:

- Security sensitive code
- Core architecture changes
- Async/concurrency logic
- MCP protocol implementations
- Large refactors or anything you're unsure about

---

## Using MTS for MTS development

- Protect sensitive files with `.mtsignore` (e.g., `.env*`, `*.key`, `target/`, `.git/`)
- Guide MTS with `.mtshints` (patterns, error handling, formatting, tests, docs)
- Use `/plan` to structure work, and choose modes wisely:
  - **Chat** for understanding
  - **Smart Approval** for most dev work
  - **Approval** for critical areas
  - **Autonomous** only with safety nets

---

## Community & Collaboration

- In PRs, note significant AI use and how you validated results
- Share prompting tips, patterns, and pitfalls
- Be responsive to feedback and help improve this guide

---

## Remember

AI is a powerful assistant, not a replacement for your judgment. Use it to speed up development; while keeping your brain engaged, your standards high, and MTS secure.

Questions? Open an issue at https://github.com/calvinmagezi/mts/issues

---

## Getting Started with AI Tools

### Quick Setup

**Using MTS (meta!):**
```bash
# Build MTS
cargo build --release

# Navigate to your MTS clone
cd /path/to/mts

# Start MTS in the repo
./target/release/mts
```

**Using GitHub Copilot:**
- Install the [GitHub Copilot extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) for VS Code
- Enable Copilot for Rust files in your settings
- Recommended: Also install [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) for better code intelligence

**Using Cursor:**
- Download [Cursor](https://cursor.sh/) (VS Code fork with built-in AI)
- Open the MTS repository
- Use Cmd/Ctrl+K for inline AI editing, Cmd/Ctrl+L for chat

**Using Claude or ChatGPT:**
- Copy relevant code sections into the chat interface
- Provide context about the MTS architecture (see below)
- Always test generated code locally before committing

### Rust-Specific Configuration

If you're new to Rust, configure your AI tool to help you learn:

**VS Code settings.json:**
```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "github.copilot.enable": {
    "rust": true
  }
}
```

**Cursor Rules (.cursorrules in repo root):**
```
This is a Rust project using cargo workspaces.
- Follow existing error handling patterns using anyhow::Result
- Use async/await for I/O operations
- Follow the project's clippy lints (see clippy-baselines/)
- Run cargo fmt before committing
```

---

## Understanding MTS's Architecture

New to AI agents? Here are key questions to ask your AI tool:

### Essential Concepts

**"Explain the MTS crate structure"**
```
Ask: "I'm looking at the MTS repository. Can you explain the purpose of each crate
in the crates/ directory and how they relate to each other?"

Key insight: MTS uses a workspace with specialized crates:
- mts: Core agent logic
- mts-cli: Command-line interface
- mts-server: Backend for desktop app (mtsd)
- mts-mcp: MCP server implementations
```

**"How does the MCP protocol work in MTS?"**
```
Ask: "What is the Model Context Protocol (MCP) and how does MTS implement it?
Show me an example from crates/mts-mcp/"

Key insight: MCP allows MTS to connect to external tools and data sources.
Each MCP server provides specific capabilities (developer tools, file access, etc.)
```

**"What's the agent execution flow?"**
```
Ask: "Walk me through what happens when a user sends a message to MTS.
Start from crates/mts-cli/src/main.rs"

Key insight: Message → Agent → Provider (LLM) → Tool execution → Response
```

### Navigating the Codebase with AI

**Finding the right file:**
```
# Use ripgrep with AI assistance
Ask: "I want to add a new shell command tool. Where should I look?"
AI might suggest: rg "shell" crates/mts-mcp/ -l

Then ask: "Explain the structure of crates/mts-mcp/src/developer/tools/shell.rs"
```

**Understanding patterns:**
```
Ask: "Show me the pattern for implementing a new Provider in MTS"
Then: "What's the difference between streaming and non-streaming providers?"
```

---

## Practical Examples

### Example 1: Understanding How to Add a New MCP Tool

**Scenario:** You want to add a new tool to the developer MCP server.

**Step 1 - Explore existing tools:**
```bash
# Ask AI: "Show me the structure of an existing MCP tool"
ls crates/mts-mcp/src/developer/tools/

# Pick a simple one to study
# Ask AI: "Explain this tool implementation line by line"
cat crates/mts-mcp/src/developer/tools/shell.rs
```

**Step 2 - Ask AI to draft your new tool:**
```
Prompt: "I want to add a new MCP tool called 'git_status' that runs git status
and returns the output. Based on the pattern in shell.rs, draft the implementation."
```

**Step 3 - Validate with AI:**
```
Ask: "Review this code for:
1. Proper error handling using anyhow::Result
2. Security concerns (command injection, etc.)
3. Async/await patterns matching the codebase
4. Test coverage needs"
```

**Step 4 - Test locally:**
```bash
# Build and test
cargo build -p mts-mcp
cargo test -p mts-mcp

# Run clippy
./scripts/clippy-lint.sh
```

### Example 2: Fixing a Rust Compiler Error

**Scenario:** You're getting a lifetime error you don't understand.

**Step 1 - Copy the full error:**
```bash
cargo build 2>&1 | pbcopy  # macOS
cargo build 2>&1 | xclip    # Linux
```

**Step 2 - Ask AI with context:**
```
Prompt: "I'm getting this Rust compiler error in the MTS project:

[paste error]

Here's the relevant code:
[paste code section]

Explain what's wrong and how to fix it following Rust best practices."
```

**Step 3 - Understand the fix:**
```
Ask: "Explain why this fix works and what I should learn about Rust lifetimes"
```

**Step 4 - Apply and verify:**
```bash
# Apply the fix
# Then verify it compiles and tests pass
cargo build
cargo test
```

### Example 3: Adding a Feature to the CLI

**Scenario:** You want to add a new command-line flag to mts-cli.

**Step 1 - Find the CLI argument parsing:**
```bash
# Ask AI: "Where does mts-cli parse command line arguments?"
rg "clap" crates/mts-cli/src/ -l
```

**Step 2 - Study the pattern:**
```
Ask: "Explain how mts-cli uses clap for argument parsing.
Show me how existing flags are defined."
```

**Step 3 - Draft your addition:**
```
Prompt: "I want to add a --verbose flag that enables debug logging.
Based on the existing patterns in mts-cli, show me:
1. How to add the flag to the CLI args struct
2. How to pass it to the mts core
3. How to use it to control log levels"
```

**Step 4 - Implement with validation:**
```bash
# Make changes
# Build both crates
cargo build -p mts-cli -p mts

# Test the new flag
./target/debug/mts --verbose session

# Run tests
cargo test -p mts-cli
```
