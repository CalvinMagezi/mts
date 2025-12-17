import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';

interface TerminalInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  webLinksAddon: WebLinksAddon;
  searchAddon: SearchAddon;
  isOpened: boolean;
}

class TerminalInstanceManager {
  private instances: Map<string, TerminalInstance> = new Map();

  create(terminalId: string): TerminalInstance {
    const existing = this.instances.get(terminalId);
    if (existing) {
      return existing;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#1a1a1a',
        selectionBackground: '#4a4a4a',
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#e5c07b',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#e5c07b',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);

    const instance: TerminalInstance = {
      terminal,
      fitAddon,
      webLinksAddon,
      searchAddon,
      isOpened: false,
    };

    this.instances.set(terminalId, instance);
    return instance;
  }

  get(terminalId: string): TerminalInstance | undefined {
    return this.instances.get(terminalId);
  }

  has(terminalId: string): boolean {
    return this.instances.has(terminalId);
  }

  attach(terminalId: string, container: HTMLDivElement): boolean {
    const instance = this.instances.get(terminalId);
    if (!instance) return false;

    const { terminal, fitAddon, isOpened } = instance;

    if (!isOpened) {
      // First time opening - attach to DOM
      terminal.open(container);
      instance.isOpened = true;
    } else if (terminal.element) {
      // Already opened before - move element to new container
      // Check if element is already in this container
      if (terminal.element.parentElement !== container) {
        container.appendChild(terminal.element);
      }
    }

    // Fit after attaching
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore fit errors
      }
    });

    return true;
  }

  detach(terminalId: string): void {
    const instance = this.instances.get(terminalId);
    if (instance && instance.terminal.element) {
      // Remove element from DOM but keep instance alive
      instance.terminal.element.remove();
    }
  }

  destroy(terminalId: string): void {
    const instance = this.instances.get(terminalId);
    if (instance) {
      instance.terminal.dispose();
      this.instances.delete(terminalId);
    }
  }

  fit(terminalId: string): void {
    const instance = this.instances.get(terminalId);
    if (instance) {
      try {
        instance.fitAddon.fit();
      } catch {
        // Ignore fit errors
      }
    }
  }

  focus(terminalId: string): void {
    const instance = this.instances.get(terminalId);
    instance?.terminal.focus();
  }

  scrollToBottom(terminalId: string): void {
    const instance = this.instances.get(terminalId);
    instance?.terminal.scrollToBottom();
  }

  isScrolledToBottom(terminalId: string): boolean {
    const instance = this.instances.get(terminalId);
    if (!instance) return true;
    const term = instance.terminal;
    // Check if viewport is at the bottom (buffer.active.baseY is the scrollback amount)
    return term.buffer.active.viewportY >= term.buffer.active.baseY;
  }

  write(terminalId: string, data: string): void {
    const instance = this.instances.get(terminalId);
    if (instance) {
      // Only auto-scroll if user was already at the bottom
      const wasAtBottom = this.isScrolledToBottom(terminalId);
      instance.terminal.write(data);
      if (wasAtBottom) {
        instance.terminal.scrollToBottom();
      }
    }
  }

  writeln(terminalId: string, data: string): void {
    const instance = this.instances.get(terminalId);
    if (instance) {
      // Only auto-scroll if user was already at the bottom
      const wasAtBottom = this.isScrolledToBottom(terminalId);
      instance.terminal.writeln(data);
      if (wasAtBottom) {
        instance.terminal.scrollToBottom();
      }
    }
  }

  getTerminal(terminalId: string): Terminal | undefined {
    return this.instances.get(terminalId)?.terminal;
  }

  proposeDimensions(terminalId: string): { cols: number; rows: number } | undefined {
    const instance = this.instances.get(terminalId);
    if (instance) {
      try {
        return instance.fitAddon.proposeDimensions();
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  // Search methods
  findNext(terminalId: string, term: string): boolean {
    const instance = this.instances.get(terminalId);
    if (instance && term) {
      return instance.searchAddon.findNext(term, { caseSensitive: false });
    }
    return false;
  }

  findPrevious(terminalId: string, term: string): boolean {
    const instance = this.instances.get(terminalId);
    if (instance && term) {
      return instance.searchAddon.findPrevious(term, { caseSensitive: false });
    }
    return false;
  }

  clearSearch(terminalId: string): void {
    const instance = this.instances.get(terminalId);
    instance?.searchAddon.clearDecorations();
  }

  // Clear terminal content
  clear(terminalId: string): void {
    const instance = this.instances.get(terminalId);
    instance?.terminal.clear();
  }

  // Get selected text
  getSelection(terminalId: string): string {
    const instance = this.instances.get(terminalId);
    return instance?.terminal.getSelection() || '';
  }
}

export const terminalInstanceManager = new TerminalInstanceManager();
