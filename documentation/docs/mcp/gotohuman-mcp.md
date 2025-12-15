---
title: gotoHuman Extension
description: Add gotoHuman MCP Server as a mts Extension
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import YouTubeShortEmbed from '@site/src/components/YouTubeShortEmbed';
import CLIExtensionInstructions from '@site/src/components/CLIExtensionInstructions';
import MTSDesktopInstaller from '@site/src/components/MTSDesktopInstaller';


<!-- <YouTubeShortEmbed videoUrl="https://www.youtube.com/embed/6aV8pinnUS8" />  -->

This tutorial covers how to add the [gotoHuman MCP Server](https://github.com/gotohuman/gotohuman-mcp-server) as a mts extension to bring **human-in-the-loop approvals** into your AI workflows. With gotoHuman, mts can pause and request a review before continuing, perfect for blog drafts, code reviews,compliance checks, etc.  


:::tip TLDR
<Tabs groupId="interface">
  <TabItem value="ui" label="mts Desktop" default>
  [Launch the installer](mts://extension?cmd=npx&arg=-y&arg=%40gotohuman%2Fmcp-server&id=gotoHuman&name=gotoHuman&description=gotoHuman%20MCP%20server%20for%20human-in-the-loop%20approvals&env=GOTOHUMAN_API_KEY%3DgotoHuman%20API%20Key)
  </TabItem>
  <TabItem value="cli" label="mts CLI">
  **Command**
  ```sh
   npx -y @gotohuman/mcp-server
  ```
  **Environment Variable**
  ```sh
  GOTOHUMAN_API_KEY: <YOUR_API_KEY>
  ```
  </TabItem>
</Tabs>
:::

## Configuration

<Tabs groupId="interface">
  <TabItem value="ui" label="mts Desktop" default>
  <MTSDesktopInstaller
    extensionId="gotoHuman"
    extensionName="gotoHuman"
    description="gotoHuman MCP server for human-in-the-loop approvals"
    command="npx"
    args={["-y", "@gotohuman/mcp-server"]}
    envVars={[
      { name: "GOTOHUMAN_API_KEY", label: "gotoHuman API Key" }
    ]}
    apiKeyLink="https://app.gotohuman.com/accounts/3kiXJvmf4UDBPKPi9ZNY/api-keys"
    apiKeyLinkText="GOTOHUMAN_API_KEY"
  />
  </TabItem>
  <TabItem value="cli" label="mts CLI">
      <CLIExtensionInstructions
        name="gotoHuman MCP"
        description="gotoHuman MCP server for human-in-the-loop approvals"
        command="npx -y @gotohuman/mcp-server"
        timeout={300}
        envVars={[
            { key: "GOTOHUMAN_API_KEY", value: "<YOUR_API_KEY>" }
        ]}
        infoNote={
            <>
            Obtain your <a href="https://app.gotohuman.com/accounts/3kiXJvmf4UDBPKPi9ZNY/api-keys" target="_blank" rel="noopener noreferrer">gotoHuman API KEY</a> and paste it in
            </>
        }
      />
  </TabItem>
</Tabs>

## Example Usage

:::tip Before You Start
Log in to [app.gotohuman.com](https://app.gotohuman.com) and go to **Review Templates → Create Template**.  
Follow the steps to create a template and ensure you set a **Webhook Endpoint** (you can use [webhook.site](https://webhook.site) for testing).  
:::


In this example, mts sends a LinkedIn post draft to gotoHuman for approval using the `n8n news to post` template that was created.

<Tabs groupId="interface">
  <TabItem value="ui" label="mts Desktop" default>
   1. Open a new session in mts Desktop
  </TabItem>
  <TabItem value="cli" label="mts CLI">

  1. Open a terminal and start a new mts session:

  ```sh
  mts session
  ```

  </TabItem>
</Tabs>

### mts Prompt
```
Send this blog draft about mts to gotoHuman for review using my `n8n news to post` form. 

Include today’s date as the timestamp, these links: 
[mts Docs: https://block.github.io/mts/, gotoHuman: https://gotohuman.com/], 
summarize it as ‘Introducing mts’s integration with gotoHuman for human approvals,’ 
and here’s the draft:

mts is an open-source AI agent that runs locally on your machine, right in your terminal or IDE. 
It connects to MCP servers like gotoHuman to extend its abilities. While mts can automate tasks, 
sometimes you need a human in the loop. With gotoHuman MCP, you can add approval steps into any workflow;
from reviewing a LinkedIn post draft to signing off on a code change. 
Once approved, mts can continue where it left off. 
This makes agent workflows safer, more collaborative, and better suited for real-world teams.
```
### mts Output

:::note Desktop


`─── list-forms ──────────────────────────`

Now let me search for some specific setup and usage information:

`─── Get-Form-Schema`

Let me search for more technical details and examples:

`─── Request-human-review-with-form ────────────`

Perfect! I've successfully sent your mts blog draft to gotoHuman for review using your "n8n news to post" form. Here's what was submitted:
Review Request Details

- Form Used: n8n news to post
- Review ID: 6Tp7Z0lqH7lu52MfuHZq
- Review Link: https://app.gotohuman.com/accounts/3kiXJvmf4UDBPKPi9ZNY/reviews/6Tp7Z0lqH7lu52MfuHZq

Submitted Content

- Timestamp: 2025-09-23
- Summary: Introducing mts's integration with gotoHuman for human approvals
- Links:
    - mts Docs
    - gotoHuman
- Draft: Your complete blog post about mts's integration with gotoHuman

The review request has been created and is now ready for human approval. You can access it through the review link provided above. Once the review is completed, you'll be able to proceed with publishing or making any requested changes to the blog post.
:::

## Review in gotoHuman

Now if you open the **Review Link** from mts’s output, you’ll see the request waiting in your gotoHuman dashboard:  

![](/img/gotohuman.png)
