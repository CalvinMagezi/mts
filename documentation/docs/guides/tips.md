---
title: Quick mts Tips
sidebar_position: 30
sidebar_label: Quick Tips
description: Best practices for working with mts
---

### mts works on your behalf
mts is an AI agent, which means you can prompt mts to perform tasks for you like opening applications, running shell commands, automating workflows, writing code, browsing the web, and more.

### Prompt mts using natural language
You don't need fancy language or special syntax to prompt mts. Talk with mts like you would talk to a friend. You can even use slang or say please and thank you; mts will understand.

### Extend mts's capabilities to any application
mts's capabilities are extensible. As an [MCP](https://modelcontextprotocol.io/) client, mts can connect to your apps and services through [extensions](/extensions), allowing it to work across your entire workflow.

### Choose how much control mts has
You can customize how much [supervision](/docs/guides/mts-permissions) mts needs. Choose between full autonomy, requiring approval before actions, or simply chatting without any actions.

### Choose the right LLM
Your experience with mts is shaped by your [choice of LLM](/blog/2025/03/31/mts-benchmark), as it handles all the planning while mts manages the execution. When choosing an LLM, consider its tool support, specific capabilities, and associated costs.

### Keep sessions short
LLMs have context windows, which are limits on how much conversation history they can retain. Once exceeded, they may forget earlier parts of the conversation. Monitor your token usage and [start new sessions](/docs/guides/sessions/session-management) as needed.

### Use Quick Launcher for faster session starts
Press `Cmd+Option+Shift+G` (macOS) or `Ctrl+Alt+Shift+G` (Windows/Linux) and send a prompt to start a new session instantly.

### Turn off unnecessary extensions or tool
Turning on too many extensions can degrade performance. Enable only essential [extensions and tools](/docs/guides/managing-tools/tool-permissions) to improve tool selection accuracy, save context window space, and stay within provider tool limits.

### Teach mts your preferences
Help mts remember how you like to work by using [`.mtshints` or other context files](/docs/guides/using-mtshints/) for permanent project preferences and the [Memory extension](/docs/mcp/memory-mcp) for things you want mts to dynamically recall later. Both can help save valuable context window space while keeping your preferences available.

### Protect sensitive files
mts is often eager to make changes. You can stop it from changing specific files by creating a [.mtsignore](/docs/guides/using-mtsignore) file. In this file, you can list all the file paths you want it to avoid.

### Version Control
Commit your code changes early and often. This allows you to rollback any unexpected changes.

### Control which extensions mts can use
Administrators can use an [allowlist](/docs/guides/allowlist) to restrict mts to approved extensions only. This helps prevent risky installs from unknown MCP servers.

### Set up starter templates
You can turn a successful session into a reusable "[recipe](/docs/guides/recipes/session-recipes)" to share with others or use again later—no need to start from scratch.

### Embrace an experimental mindset
You don’t need to get it right the first time. Iterating on prompts and tools is part of the workflow.

### Keep mts updated
Regularly [update](/docs/guides/updating-mts) mts to benefit from the latest features, bug fixes, and performance improvements.

### Pair Two Models to Save Money 
Use [lead/worker model](/docs/tutorials/lead-worker/) to have mts use a "lead" model for early planning before handing the task to a lower-cost "worker" model for execution.  

### Make Recipes Safe to Re-run
Write [recipes](/docs/guides/recipes/session-recipes) that check your current state before acting, so they can be run multiple times without causing any errors or duplication. 

### Add Logging to Recipes
Include informative log messages in your recipes for each major step to make debugging and troubleshooting easier should something fail.
