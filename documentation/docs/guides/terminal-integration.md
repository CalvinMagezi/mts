# Terminal Integration

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Talk to mts directly from your shell prompt. Instead of switching to a separate REPL session, stay in your terminal and call mts when you need it.

## Setup

<Tabs groupId="shells">
<TabItem value="zsh" label="zsh" default>

Add to `~/.zshrc`:
```bash
eval "$(mts term init zsh)"
```

</TabItem>
<TabItem value="bash" label="bash">

Add to `~/.bashrc`:
```bash
eval "$(mts term init bash)"
```

</TabItem>
<TabItem value="fish" label="fish">

Add to `~/.config/fish/config.fish`:
```fish
mts term init fish | source
```

</TabItem>
<TabItem value="powershell" label="PowerShell">

Add to `$PROFILE`:
```powershell
Invoke-Expression (mts term init powershell)
```

</TabItem>
</Tabs>

Restart your terminal or source the config, and that's it!

## Usage

Just type `@mts` (or `@g` for short) followed by your question:

```bash
npm install express
    npm ERR! code EACCES
    npm ERR! permission denied

@mts "how do I fix this error?"
```

mts automatically sees the commands you've run since your last question, so you don't need to explain what you've been doing. Use quotes around your prompt if it contains special characters like `?`, `*`, or `'`:

```bash
@mts "what's in this directory?"
@g "analyze the error: 'permission denied'"
```

## Named Sessions
By default, each terminal gets its own mts session that lasts until you close it. Named sessions let you continue conversations across terminal restarts and share context between windows.

<Tabs groupId="shells">
<TabItem value="zsh" label="zsh" default>

```bash
eval "$(mts term init zsh --name my-project)"
```

</TabItem>
<TabItem value="bash" label="bash">

```bash
eval "$(mts term init bash --name my-project)"
```

</TabItem>
<TabItem value="fish" label="fish">

```fish
mts term init fish --name my-project | source
```

</TabItem>
<TabItem value="powershell" label="PowerShell">

```powershell
Invoke-Expression (mts term init powershell --name my-project)
```

</TabItem>
</Tabs>

Named sessions persist in mts's database, so they're available anytime, even after restarting your computer. Reopen later and run the same command to continue:

```bash
# Start debugging
eval "$(mts term init zsh --name auth-bug)"
@mts help me debug this login timeout

# Close terminal, come back later
eval "$(mts term init zsh --name auth-bug)"
@mts "what was the solution we discussed?"
# Continues the same conversation with context
```

## Show Context Status in Your Prompt

Add `mts term info` to your prompt to see how much context you've used and which model is active during a terminal mts session. 

<Tabs groupId="shells">
<TabItem value="zsh" label="zsh" default>

```bash
PROMPT='$(mts term info) %~ $ '
```

</TabItem>
<TabItem value="bash" label="bash">

```bash
PS1='$(mts term info) \w $ '
```

</TabItem>
<TabItem value="fish" label="fish">

```fish
function fish_prompt
    mts term info
    echo -n ' '(prompt_pwd)' $ '
end
```

</TabItem>
<TabItem value="powershell" label="PowerShell">

```powershell
function prompt {
    $mtsInfo = & mts term info
    "$mtsInfo $(Get-Location) PS> "
}
```

</TabItem>
</Tabs>

Your terminal prompt now shows the context usage and model name (shortened for readability) for the active mts session. For example:

```bash
●●○○○ sonnet ~/projects $
```
## Troubleshooting

**mts doesn't see recent commands:**
If you run commands but mts says it doesn't see any recent activity, check if terminal integration is properly [set up in your shell config](#setup).
You can also check the id of the mts session in your current terminal:
```bash
# Check if session ID exists
echo $MTS_SESSION_ID
# Should show something like: 20251209_151730
```
To share context across terminal windows, use a [named session](#named-sessions) instead.

**Session getting too full** (prompt shows `●●●●●`):
If mts's responses are getting slow or hitting context limits, start a fresh mts session in the terminal. The new mts session sees your command history, but not the conversation history from the previous session. 
```bash
# Start a new mts session in the same shell
eval "$(mts term init zsh)"
```
