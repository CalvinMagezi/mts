export const configLabels: Record<string, string> = {
  // goose settings
  MTS_PROVIDER: 'Provider',
  MTS_MODEL: 'Model',
  MTS_TEMPERATURE: 'Temperature',
  MTS_MODE: 'Mode',
  MTS_LEAD_PROVIDER: 'Lead Provider',
  MTS_LEAD_MODEL: 'Lead Model',
  MTS_PLANNER_PROVIDER: 'Planner Provider',
  MTS_PLANNER_MODEL: 'Planner Model',
  MTS_TOOLSHIM: 'Tool Shim',
  MTS_TOOLSHIM_OLLAMA_MODEL: 'Tool Shim Ollama Model',
  MTS_CLI_MIN_PRIORITY: 'CLI Min Priority',
  MTS_ALLOWLIST: 'Allow List',
  MTS_RECIPE_GITHUB_REPO: 'Recipe GitHub Repo',

  // security settings
  SECURITY_PROMPT_ENABLED: 'Prompt Injection Detection Enabled',
  SECURITY_PROMPT_THRESHOLD: 'Prompt Injection Detection Threshold',

  // openai
  OPENAI_API_KEY: 'OpenAI API Key',
  OPENAI_HOST: 'OpenAI Host',
  OPENAI_BASE_PATH: 'OpenAI Base Path',

  // groq
  GROQ_API_KEY: 'Groq API Key',

  // openrouter
  OPENROUTER_API_KEY: 'OpenRouter API Key',

  // anthropic
  ANTHROPIC_API_KEY: 'Anthropic API Key',
  ANTHROPIC_HOST: 'Anthropic Host',

  // google
  GOOGLE_API_KEY: 'Google API Key',

  // databricks
  DATABRICKS_HOST: 'Databricks Host',

  // ollama
  OLLAMA_HOST: 'Ollama Host',

  // azure openai
  AZURE_OPENAI_API_KEY: 'Azure OpenAI API Key',
  AZURE_OPENAI_ENDPOINT: 'Azure OpenAI Endpoint',
  AZURE_OPENAI_DEPLOYMENT_NAME: 'Azure OpenAI Deployment Name',
  AZURE_OPENAI_API_VERSION: 'Azure OpenAI API Version',

  // gcp vertex
  GCP_PROJECT_ID: 'GCP Project ID',
  GCP_LOCATION: 'GCP Location',

  // snowflake
  SNOWFLAKE_HOST: 'Snowflake Host',
  SNOWFLAKE_TOKEN: 'Snowflake Token',
};

export const providerPrefixes: Record<string, string[]> = {
  openai: ['OPENAI_'],
  anthropic: ['ANTHROPIC_'],
  google: ['GOOGLE_'],
  groq: ['GROQ_'],
  databricks: ['DATABRICKS_'],
  openrouter: ['OPENROUTER_'],
  ollama: ['OLLAMA_'],
  azure_openai: ['AZURE_'],
  gcp_vertex_ai: ['GCP_'],
  snowflake: ['SNOWFLAKE_'],
};

export const getUiNames = (key: string): string => {
  if (configLabels[key]) {
    return configLabels[key];
  }
  return key
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};
