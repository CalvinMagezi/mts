<div align="center">

# MTS

_Magezi Tech Solutions - a local, extensible, open source AI agent that automates engineering tasks_

<p align="center">
  <a href="https://opensource.org/licenses/Apache-2.0">
    <img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg">
  </a>
</p>
</div>

MTS is your on-machine AI agent, capable of automating complex development tasks from start to finish. More than just code suggestions, MTS can build entire projects from scratch, write and execute code, debug failures, orchestrate workflows, and interact with external APIs - _autonomously_.

Whether you're prototyping an idea, refining existing code, or managing intricate engineering pipelines, MTS adapts to your workflow and executes tasks with precision.

Designed for maximum flexibility, MTS works with any LLM and supports multi-model configuration to optimize performance and cost, seamlessly integrates with MCP servers, and is available as both a desktop app as well as CLI - making it the ultimate AI assistant for developers who want to move faster and focus on innovation.

# Quick Links
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/calvinmagezi/mts.git
cd mts

# Build
cargo build --release

# The binaries will be in target/release/
./target/release/mts --help
```

### Desktop App

```bash
# Build and run the desktop app
just run-ui
```

## Configuration

First-time setup:

```bash
./target/release/mts configure
```

This will guide you through configuring your LLM provider and API keys.

## Usage

### CLI

```bash
# Start a session
./target/release/mts session

# Run with specific provider
MTS_PROVIDER=anthropic ./target/release/mts session
```

### Desktop App

```bash
just run-ui
```

## Need Help?

Check the [documentation](./documentation/) for more details.

## License

Apache 2.0 - see [LICENSE](./LICENSE) for details.
