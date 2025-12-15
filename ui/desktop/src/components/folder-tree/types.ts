export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

export interface TreeState {
  expanded: Set<string>;
}

export interface FilePreviewState {
  content: string | null;
  loading: boolean;
  error: string | null;
  truncated: boolean;
  totalLines: number;
}
