---
title: Smart Context Management
sidebar_position: 3
sidebar_label: Smart Context Management
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import { ScrollText } from 'lucide-react';
import { PanelLeft } from 'lucide-react';

When working with [Large Language Models (LLMs)](/docs/getting-started/providers), there are limits to how much conversation history they can process at once. mts provides smart context management features to help handle context and conversation limits so you can maintain productive sessions. Here are some key concepts:

- **Context Length**: The amount of conversation history the LLM can consider, also referred to as the context window
- **Context Limit**: The maximum number of tokens the model can process
- **Context Management**: How mts handles conversations approaching these limits
- **Turn**: One complete prompt-response interaction between mts and the LLM

## How mts Manages Context
mts uses a two-tiered approach to context management:

1. **Auto-Compaction**: Proactively summarizes conversation when approaching token limits
2. **Context Strategies**: Backup strategy used if the context limit is still exceeded after auto-compaction

This layered approach lets mts handle token and context limits gracefully.

## Automatic Compaction
mts automatically compacts (summarizes) older parts of your conversation when approaching token limits, allowing you to maintain long-running sessions without manual intervention. 
Auto-compaction is triggered by default when you reach 80% of the token limit in mts Desktop and the mts CLI.

Control the auto-compaction behavior with the `MTS_AUTO_COMPACT_THRESHOLD` [environment variable](/docs/guides/environment-variables.md#session-management). 
Disable this feature by setting the value to `0.0`.

```
# Automatically compact sessions when 60% of available tokens are used
export MTS_AUTO_COMPACT_THRESHOLD=0.6
```

When you reach the auto-compaction threshold:
  1. mts will automatically start compacting the conversation to make room.
  2. Once complete, you'll see a confirmation message that the conversation was compacted and summarized.
  3. Continue the session. Your previous conversation remains visible, but only the compacted conversion is included in the active context for mts.

### Manual Compaction
You can also trigger compaction manually before reaching context or token limits:

<Tabs groupId="interface">
  <TabItem value="ui" label="mts Desktop" default>

  1. Point to the token usage indicator dot next to the model name at the bottom of the app
  2. Click <ScrollText className="inline" size={16} /> `Compact now` in the context window that appears
  3. Once complete, you'll see a confirmation message that the conversation was compacted and summarized.
  4. Continue the session. Your previous conversation remains visible, but only the compacted conversion is included in the active context for mts.

  :::info 
  You must send at least one message in the chat before the `Compact now` button is enabled. 
  :::

</TabItem>
<TabItem value="cli" label="mts CLI" default>

To proactively trigger summarization before reaching context limits, use the `/summarize` command:

```sh
( O)> /summarize
◇  Are you sure you want to summarize this conversation? This will condense the message history.
│  Yes 
│
Summarizing conversation...
Conversation has been summarized.
Key information has been preserved while reducing context length.
```

</TabItem>
</Tabs>

## Context Limit Strategies

When auto-compaction is disabled, or if a conversation still exceeds the context limit, mts offers different ways to handle it:

| Feature | Description | Best For | Availability | Impact |
|---------|-------------|-----------|-----------|---------|
| **Summarization** | Condenses conversation while preserving key points | Long, complex conversations | Desktop and CLI | Maintains most context |
| **Truncation** | Removes oldest messages to make room | Simple, linear conversations | CLI only | Loses old context |
| **Clear** | Starts fresh while keeping session active | New direction in conversation | CLI only | Loses all context |
| **Prompt** | Asks user to choose from the above options | Control over each decision in interactive sessions | CLI only | Depends on choice made |

<Tabs groupId="interface">
  <TabItem value="ui" label="mts Desktop" default>

mts Desktop exclusively uses summarization by compacting the conversation to manage context, preserving key information while reducing size.

  </TabItem>
  <TabItem value="cli" label="mts CLI">

The CLI supports all context limit strategies: `summarize`, `truncate`, `clear`, and `prompt`. 

The default behavior depends on the mode you're running in:
- **Interactive mode**: Prompts user to choose (equivalent to `prompt`)
- **Headless mode** (`mts run`): Automatically summarizes (equivalent to `summarize`)

You can configure how mts handles context limits by setting the `MTS_CONTEXT_STRATEGY` environment variable:

```bash
# Set automatic strategy (choose one)
export MTS_CONTEXT_STRATEGY=summarize  # Automatically summarize (recommended)
export MTS_CONTEXT_STRATEGY=truncate   # Automatically remove oldest messages
export MTS_CONTEXT_STRATEGY=clear      # Automatically clear session

# Set to prompt the user
export MTS_CONTEXT_STRATEGY=prompt
```

When you hit the context limit, the behavior depends on your configuration:

**With default settings (no `MTS_CONTEXT_STRATEGY` set)**, you'll see this prompt to choose a management option:

```sh
◇  The model's context length is maxed out. You will need to reduce the # msgs. Do you want to?
│  ○ Clear Session   
│  ○ Truncate Message
// highlight-start
│  ● Summarize Session
// highlight-end

final_summary: [A summary of your conversation will appear here]

Context maxed out
--------------------------------------------------
mts summarized messages for you.
```

**With `MTS_CONTEXT_STRATEGY` configured**, mts will automatically apply your chosen strategy:

```sh
# Example with MTS_CONTEXT_STRATEGY=summarize
Context maxed out - automatically summarized messages.
--------------------------------------------------
mts automatically summarized messages for you.

# Example with MTS_CONTEXT_STRATEGY=truncate
Context maxed out - automatically truncated messages.
--------------------------------------------------
mts tried its best to truncate messages for you.

# Example with MTS_CONTEXT_STRATEGY=clear
Context maxed out - automatically cleared session.
--------------------------------------------------
```
  </TabItem>
</Tabs>

## Maximum Turns
The `Max Turns` limit is the maximum number of consecutive turns that mts can take without user input (default: 1000). When the limit is reached, mts stops and prompts: "I've reached the maximum number of actions I can do without user input. Would you like me to continue?" If the user answers in the affirmative, mts continues until the limit is reached and then prompts again.

This feature gives you control over agent autonomy and prevents infinite loops and runaway behavior, which could have significant cost consequences or damaging impact in production environments. Use it for:

- Preventing infinite loops and excessive API calls or resource consumption in automated tasks
- Enabling human supervision or interaction during autonomous operations
- Controlling loops while testing and debugging agent behavior

This setting is stored as the `MTS_MAX_TURNS` environment variable in your [config.yaml file](/docs/guides/config-files). You can configure it using the Desktop app or CLI.

<Tabs groupId="interface">
    <TabItem value="ui" label="mts Desktop" default>

      1. Click the <PanelLeft className="inline" size={16} /> button in the top-left to open the sidebar
      2. Click the `Settings` button on the sidebar
      3. Click the `Chat` tab 
      4. Scroll to `Conversation Limits` and enter a value for `Max Turns`
        
    </TabItem>
    <TabItem value="cli" label="mts CLI">

      1. Run the `configuration` command:
      ```sh
      mts configure
      ```

      2. Select `mts settings`:
      ```sh
      ┌   mts-configure
      │
      ◆  What would you like to configure?
      │  ○ Configure Providers
      │  ○ Add Extension
      │  ○ Toggle Extensions
      │  ○ Remove Extension
      // highlight-start
      │  ● mts settings (Set the mts mode, Tool Output, Tool Permissions, Experiment, mts recipe github repo and more)
      // highlight-end
      └ 
      ```

      3. Select `Max Turns`:
      ```sh
      ┌   mts-configure
      │
      ◇  What would you like to configure?
      │  mts settings
      │
      ◆  What setting would you like to configure?
      │  ○ mts mode 
      │  ○ Router Tool Selection Strategy 
      │  ○ Tool Permission 
      │  ○ Tool Output 
      // highlight-start
      │  ● Max Turns (Set maximum number of turns without user input)
      // highlight-end
      │  ○ Toggle Experiment 
      │  ○ mts recipe github repo 
      │  ○ Scheduler Type 
      └ 
      ```

      4. Enter the maximum number of turns:
      ```sh
      ┌   mts-configure 
      │
      ◇  What would you like to configure?
      │  mts settings 
      │
      ◇  What setting would you like to configure?
      │  Max Turns 
      │
        // highlight-start
      ◆  Set maximum number of agent turns without user input:
      │  10
        // highlight-end
      │
      └  Set maximum turns to 10 - mts will ask for input after 10 consecutive actions
      ```

      :::tip
      In addition to the persistent `Max Turns` setting, you can provide a runtime override for a specific session or task via the `mts session --max-turns` and `mts run --max-turns` [CLI commands](/docs/guides/mts-cli-commands).
      :::

    </TabItem>
    
</Tabs>

**Choosing the Right Value**

The appropriate max turns value depends on your use case and comfort level with automation:

- **5-10 turns**: Good for exploratory tasks, debugging, or when you want frequent check-ins. For example, "analyze this codebase and suggest improvements" where you want to review each step
- **25-50 turns**: Effective for well-defined tasks with moderate complexity, such as "refactor this module to use the new API" or "set up a basic CI/CD pipeline"
- **100+ turns**: More suitable for complex, multi-step automation where you trust mts to work independently, like "migrate this entire project from React 16 to React 18" or "implement comprehensive test coverage for this service"

Remember that even simple-seeming tasks often require multiple turns. For example, asking mts to "fix the failing tests" might involve analyzing test output (1 turn), identifying the root cause (1 turn), making code changes (1 turn), and verifying the fix (1 turn).

## Token Usage
After sending your first message, mts Desktop and mts CLI display token usage.

<Tabs groupId="interface">
    <TabItem value="ui" label="mts Desktop" default>
    The Desktop displays a colored circle next to the model name at the bottom of the session window. The color provides a visual indicator of your token usage for the session. 
      - **Green**: Normal usage - Plenty of context space available
      - **Orange**: Warning state - Approaching limit (80% of capacity)
      - **Red**: Error state - Context limit reached
    
    Hover over this circle to display:
      - The number of tokens used
      - The percentage of available tokens used
      - The total available tokens
      - A progress bar showing your current token usage
        
    </TabItem>
    <TabItem value="cli" label="mts CLI">
    The CLI displays a context label above each command prompt, showing:
      - A visual indicator using dots (●○) and colors to represent your token usage:
        - **Green**: Below 50% usage
        - **Yellow**: Between 50-85% usage
        - **Red**: Above 85% usage
      - Usage percentage
      - Current token count and context limit

    </TabItem>
</Tabs>

## Model Context Limit Overrides

Context limits are automatically detected based on your model name, but mts provides settings to override the default limits:

| Model | Description | Best For | Setting |
|-------|-------------|----------|---------|
| **Main** | Set context limit for the main model (also serves as fallback for other models) | LiteLLM proxies, custom models with non-standard names | `MTS_CONTEXT_LIMIT` |
| **Lead** | Set larger context for planning in [lead/worker mode](/docs/tutorials/lead-worker) | Complex planning tasks requiring more context | `MTS_LEAD_CONTEXT_LIMIT` |
| **Worker** | Set smaller context for execution in lead/worker mode | Cost optimization during execution phase | `MTS_WORKER_CONTEXT_LIMIT` |
| **Planner** | Set context for [planner models](/docs/guides/creating-plans) | Large planning tasks requiring extensive context | `MTS_PLANNER_CONTEXT_LIMIT` |

:::info
This setting only affects the displayed token usage and progress indicators. Actual context management is handled by your LLM, so you may experience more or less usage than the limit you set, regardless of what the display shows.
:::

This feature is particularly useful with:

- **LiteLLM Proxy Models**: When using LiteLLM with custom model names that don't match mts's patterns
- **Enterprise Deployments**: Custom model deployments with non-standard naming  
- **Fine-tuned Models**: Custom models with different context limits than their base versions
- **Development/Testing**: Temporarily adjusting context limits for testing purposes

mts resolves context limits with the following precedence (highest to lowest):

1. Explicit context_limit in model configuration (if set programmatically)
2. Specific environment variable (e.g., `MTS_LEAD_CONTEXT_LIMIT`)
3. Global environment variable (`MTS_CONTEXT_LIMIT`)
4. Model-specific default based on name pattern matching
5. Global default (128,000 tokens)

**Configuration**

<Tabs groupId="interface">
  <TabItem value="ui" label="mts Desktop" default>

     Model context limit overrides are not yet available in the mts Desktop app.

  </TabItem>
  <TabItem value="cli" label="mts CLI">

    Context limit overrides only work as [environment variables](/docs/guides/environment-variables#model-context-limit-overrides), not in the config file.

    ```bash
    export MTS_CONTEXT_LIMIT=1000
    mts session
    ```

  </TabItem>
    
</Tabs>

**Scenarios**

1. LiteLLM proxy with custom model name

```bash
# LiteLLM proxy with custom model name
export MTS_PROVIDER="openai"
export MTS_MODEL="my-custom-gpt4-proxy"
export MTS_CONTEXT_LIMIT=200000  # Override the 32k default
```

2. Lead/worker setup with different context limits

```bash
# Different context limits for planning vs execution
export MTS_LEAD_MODEL="claude-opus-custom"
export MTS_LEAD_CONTEXT_LIMIT=500000    # Large context for planning
export MTS_WORKER_CONTEXT_LIMIT=128000  # Smaller context for execution
```

3. Planner with large context

```bash
# Large context for complex planning
export MTS_PLANNER_MODEL="gpt-4-custom"
export MTS_PLANNER_CONTEXT_LIMIT=1000000
```

## Cost Tracking
Display real-time estimated costs of your session.

<Tabs groupId="interface">
    <TabItem value="ui" label="mts Desktop" default>
To manage live cost tracking:
  1. Click the <PanelLeft className="inline" size={16} /> button in the top-left to open the sidebar
  2. Click the `Settings` button on the sidebar
  3. Click the `App` tab 
  4. Toggle `Cost Tracking` on/off

The session cost is shown at the bottom of the mts window and updates dynamically as tokens are consumed. Hover over the cost to see a detailed breakdown of token usage. If multiple models are used in the session, this includes a cost breakdown by model. Ollama and local deployments always show a cost of $0.00.

Pricing data is regularly fetched from the OpenRouter API and cached locally. The `Advanced settings` tab shows when the data was last updated and allows you to refresh. 

These costs are estimates only, and not connected to your actual provider bill. The cost shown is an approximation based on token counts and public pricing data.
</TabItem>
    <TabItem value="cli" label="mts CLI">
    Show estimated cost in the mts CLI by setting the `MTS_CLI_SHOW_COST` [environment variable](/docs/guides/environment-variables.md#session-management) or including it in the [configuration file](/docs/guides/config-files.md).

  ```
  # Set environment variable
  export MTS_CLI_SHOW_COST=true

  # config.yaml
  MTS_CLI_SHOW_COST: true
  ```
  </TabItem>
</Tabs>