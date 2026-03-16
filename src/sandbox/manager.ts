import { Daytona, type Sandbox } from '@daytonaio/sdk';
import type { SandboxConfig, GetSandbox } from '../types.js';

export interface SandboxManager {
  getSandbox: GetSandbox;
  cleanup: () => Promise<void>;
}

export function createSandboxManager(config: SandboxConfig): SandboxManager {
  // Validate config eagerly — fail fast instead of on first getSandbox() call
  if (!config.instance && !config.apiKey) {
    throw new Error('SandboxConfig requires either an "apiKey" or an existing "instance". Provide config.apiKey or config.instance.');
  }

  let sandbox: Sandbox | null = config.instance ?? null;
  let sandboxPromise: Promise<Sandbox> | null = null;
  let daytona: Daytona | null = null;
  const isExternal = !!config.instance;

  const getSandbox: GetSandbox = async () => {
    if (sandbox) return sandbox;
    if (sandboxPromise) return sandboxPromise;

    daytona = new Daytona({
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      target: config.target,
    });

    sandboxPromise = daytona
      .create({ language: config.language ?? 'typescript' })
      .then((createdSandbox) => {
        sandbox = createdSandbox;
        return createdSandbox;
      })
      .catch((error) => {
        sandboxPromise = null;
        daytona = null;
        throw error;
      });

    return sandboxPromise;
  };

  const cleanup = async () => {
    const pendingSandbox = sandboxPromise;
    sandboxPromise = null;

    if (!sandbox && pendingSandbox) {
      try {
        sandbox = await pendingSandbox;
      } catch {
        daytona = null;
        return;
      }
    }

    if (sandbox && !isExternal && daytona) {
      await daytona.delete(sandbox);
    }
    sandbox = null;
    daytona = null;
  };

  return { getSandbox, cleanup };
}
