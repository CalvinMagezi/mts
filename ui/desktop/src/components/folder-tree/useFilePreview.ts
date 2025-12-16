import { useState, useEffect } from 'react';
import { FilePreviewState } from './types';

const MAX_PREVIEW_LINES = 1000;
const MAX_PREVIEW_SIZE = 100000; // 100KB

// Image extensions that can be previewed
const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'svg',
]);

// Binary files that cannot be previewed at all
const BINARY_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'tar', 'gz', 'rar', '7z',
  'exe', 'dll', 'so', 'dylib',
  'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
]);

function getFileExtension(filePath: string): string {
  return filePath.split('.').pop()?.toLowerCase() || '';
}

function isImageFile(filePath: string): boolean {
  return IMAGE_EXTENSIONS.has(getFileExtension(filePath));
}

function isBinaryFile(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(getFileExtension(filePath));
}

export function useFilePreview(filePath: string | null): FilePreviewState {
  const [state, setState] = useState<FilePreviewState>({
    content: null,
    loading: false,
    error: null,
    truncated: false,
    totalLines: 0,
    isImage: false,
    imagePath: null,
  });

  useEffect(() => {
    if (!filePath) {
      setState({
        content: null,
        loading: false,
        error: null,
        truncated: false,
        totalLines: 0,
        isImage: false,
        imagePath: null,
      });
      return;
    }

    // Handle image files - just set the path, no need to read content
    if (isImageFile(filePath)) {
      setState({
        content: null,
        loading: false,
        error: null,
        truncated: false,
        totalLines: 0,
        isImage: true,
        imagePath: filePath,
      });
      return;
    }

    if (isBinaryFile(filePath)) {
      setState({
        content: null,
        loading: false,
        error: 'Cannot preview binary file',
        truncated: false,
        totalLines: 0,
        isImage: false,
        imagePath: null,
      });
      return;
    }

    const loadFile = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await window.electron.readFile(filePath);
        if (!result.found || result.error) {
          throw new Error(result.error || 'File not found');
        }

        let content = result.file;
        let truncated = false;
        const lines = content.split('\n');
        const totalLines = lines.length;

        // Truncate large files
        if (lines.length > MAX_PREVIEW_LINES || content.length > MAX_PREVIEW_SIZE) {
          content = lines.slice(0, MAX_PREVIEW_LINES).join('\n');
          truncated = true;
        }

        setState({
          content,
          loading: false,
          error: null,
          truncated,
          totalLines,
          isImage: false,
          imagePath: null,
        });
      } catch (err) {
        setState({
          content: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load file',
          truncated: false,
          totalLines: 0,
          isImage: false,
          imagePath: null,
        });
      }
    };

    loadFile();
  }, [filePath]);

  return state;
}

export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    mjs: 'javascript',
    cjs: 'javascript',
    // Web
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    // Backend
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    rb: 'ruby',
    php: 'php',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    swift: 'swift',
    kt: 'kotlin',
    // Config
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    xml: 'xml',
    ini: 'ini',
    // Shell
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    // Data
    sql: 'sql',
    graphql: 'graphql',
    gql: 'graphql',
    // Markup
    md: 'markdown',
    mdx: 'markdown',
    // Other
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    gitignore: 'text',
    env: 'text',
  };
  return languageMap[ext] || 'text';
}
