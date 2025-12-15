import Electron from 'electron';
import fs from 'node:fs';
import { spawn, ChildProcess } from 'child_process';
import { createServer } from 'net';
import os from 'node:os';
import path from 'node:path';
import log from './utils/logger';
import { App } from 'electron';
import { Buffer } from 'node:buffer';

import { status } from './api';
import { Client } from './api/client';

export const findAvailablePort = (): Promise<number> => {
  return new Promise((resolve, _reject) => {
    const server = createServer();

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => {
        log.info(`Found available port: ${port}`);
        resolve(port);
      });
    });
  });
};

// Check if mtsd server is ready by polling the status endpoint
export const checkServerStatus = async (client: Client, errorLog: string[]): Promise<boolean> => {
  const interval = 100; // ms
  const maxAttempts = 100; // 10s

  const fatal = (line: string) => {
    const trimmed = line.trim().toLowerCase();
    return trimmed.startsWith("thread 'main' panicked at") || trimmed.startsWith('error:');
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (errorLog.some(fatal)) {
      log.error('Detected fatal error in server logs');
      return false;
    }
    try {
      await status({ client, throwOnError: true });
      return true;
    } catch {
      if (attempt === maxAttempts) {
        log.error(`Server failed to respond after ${(interval * maxAttempts) / 1000} seconds`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return false;
};

const connectToExternalBackend = async (
  workingDir: string,
  port: number = 3000
): Promise<[number, string, ChildProcess, string[]]> => {
  log.info(`Using external MTS backend on port ${port}`);

  const mockProcess = {
    pid: undefined,
    kill: () => {
      log.info(`Not killing external process that is managed externally`);
    },
  } as ChildProcess;

  return [port, workingDir, mockProcess, []];
};

interface MtsProcessEnv {
  [key: string]: string | undefined;

  HOME: string;
  USERPROFILE: string;
  APPDATA: string;
  LOCALAPPDATA: string;
  PATH: string;
  MTS_PORT: string;
  MTS_SERVER__SECRET_KEY?: string;
}

export const startMtsd = async (
  app: App,
  serverSecret: string,
  dir: string,
  env: Partial<MtsProcessEnv> = {}
): Promise<[number, string, ChildProcess, string[]]> => {
  const isWindows = process.platform === 'win32';
  const homeDir = os.homedir();
  dir = path.resolve(path.normalize(dir));

  if (process.env.MTS_EXTERNAL_BACKEND) {
    return connectToExternalBackend(dir, 3000);
  }

  let mtsdPath = getMtsdBinaryPath(app);

  const resolvedMtsdPath = path.resolve(mtsdPath);

  const port = await findAvailablePort();
  const stderrLines: string[] = [];

  log.info(`Starting mtsd from: ${resolvedMtsdPath} on port ${port} in dir ${dir}`);

  const additionalEnv: MtsProcessEnv = {
    // Set HOME for UNIX-like systems
    HOME: homeDir,
    // Set USERPROFILE for Windows
    USERPROFILE: homeDir,
    // Set APPDATA for Windows
    APPDATA: process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'),
    // Set LOCAL_APPDATA for Windows
    LOCALAPPDATA: process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'),
    // Set PATH to include the binary directory
    PATH: `${path.dirname(resolvedMtsdPath)}${path.delimiter}${process.env.PATH || ''}`,
    MTS_PORT: String(port),
    MTS_SERVER__SECRET_KEY: serverSecret,
    // Add any additional environment variables passed in
    ...env,
  } as MtsProcessEnv;

  const processEnv: MtsProcessEnv = { ...process.env, ...additionalEnv } as MtsProcessEnv;

  // Ensure proper executable path on Windows
  if (isWindows && !resolvedMtsdPath.toLowerCase().endsWith('.exe')) {
    mtsdPath = resolvedMtsdPath + '.exe';
  } else {
    mtsdPath = resolvedMtsdPath;
  }
  log.info(`Binary path resolved to: ${mtsdPath}`);

  const spawnOptions = {
    cwd: dir,
    env: processEnv,
    stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'],
    // Hide terminal window on Windows
    windowsHide: true,
    // Run detached on Windows only to avoid terminal windows
    detached: isWindows,
    // Never use shell to avoid command injection - this is critical for security
    shell: false,
  };

  // Log spawn options for debugging (excluding sensitive env vars)
  const safeSpawnOptions = {
    ...spawnOptions,
    env: Object.keys(spawnOptions.env || {}).reduce(
      (acc, key) => {
        if (key.includes('SECRET') || key.includes('PASSWORD') || key.includes('TOKEN')) {
          acc[key] = '[REDACTED]';
        } else {
          acc[key] = spawnOptions.env![key] || '';
        }
        return acc;
      },
      {} as Record<string, string>
    ),
  };
  log.info('Spawn options:', JSON.stringify(safeSpawnOptions, null, 2));

  // Security: Use only hardcoded, safe arguments
  const safeArgs = ['agent'];

  const mtsdProcess: ChildProcess = spawn(mtsdPath, safeArgs, spawnOptions);

  // Only unref on Windows to allow it to run independently of the parent
  if (isWindows && mtsdProcess.unref) {
    mtsdProcess.unref();
  }

  mtsdProcess.stdout?.on('data', (data: Buffer) => {
    log.info(`mtsd stdout for port ${port} and dir ${dir}: ${data.toString()}`);
  });

  mtsdProcess.stderr?.on('data', (data: Buffer) => {
    const lines = data
      .toString()
      .split('\n')
      .filter((l) => l.trim());
    lines.forEach((line) => {
      log.error(`mtsd stderr for port ${port} and dir ${dir}: ${line}`);
      stderrLines.push(line);
    });
  });

  mtsdProcess.on('close', (code: number | null) => {
    log.info(`mtsd process exited with code ${code} for port ${port} and dir ${dir}`);
  });

  mtsdProcess.on('error', (err: Error) => {
    log.error(`Failed to start mtsd on port ${port} and dir ${dir}`, err);
    throw err; // Propagate the error
  });

  const try_kill_mts = () => {
    try {
      if (isWindows) {
        const pid = mtsdProcess.pid?.toString() || '0';
        spawn('taskkill', ['/pid', pid, '/T', '/F'], { shell: false });
      } else {
        mtsdProcess.kill?.();
      }
    } catch (error) {
      log.error('Error while terminating mtsd process:', error);
    }
  };

  // Ensure mtsd is terminated when the app quits
  app.on('will-quit', () => {
    log.info('App quitting, terminating MTS server');
    try_kill_mts();
  });

  log.info(`MTS server successfully started on port ${port}`);
  return [port, dir, mtsdProcess, stderrLines];
};

const getMtsdBinaryPath = (app: Electron.App): string => {
  let executableName = process.platform === 'win32' ? 'mtsd.exe' : 'mtsd';

  let possiblePaths: string[];
  if (!app.isPackaged) {
    possiblePaths = [
      path.join(process.cwd(), 'src', 'bin', executableName),
      path.join(process.cwd(), 'bin', executableName),
      path.join(process.cwd(), '..', '..', 'target', 'debug', executableName),
      path.join(process.cwd(), '..', '..', 'target', 'release', executableName),
    ];
  } else {
    possiblePaths = [path.join(process.resourcesPath, 'bin', executableName)];
  }

  for (const binPath of possiblePaths) {
    try {
      const resolvedPath = path.resolve(binPath);

      if (fs.existsSync(resolvedPath)) {
        const stats = fs.statSync(resolvedPath);
        if (stats.isFile()) {
          return resolvedPath;
        } else {
          log.error(`Path exists but is not a regular file: ${resolvedPath}`);
        }
      }
    } catch (error) {
      log.error(`Error checking path ${binPath}:`, error);
    }
  }

  throw new Error(
    `Could not find ${executableName} binary in any of the expected locations: ${possiblePaths.join(
      ', '
    )}`
  );
};

// Backward compatibility exports
export const startMTSd = startMtsd;
