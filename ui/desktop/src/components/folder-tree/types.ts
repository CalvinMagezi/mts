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
  isImage: boolean;
  imagePath: string | null;
}

export interface OpenFile {
  node: FileNode;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}
