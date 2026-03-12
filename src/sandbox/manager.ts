import { Daytona, type Sandbox } from '@daytonaio/sdk';
import type { SandboxConfig, GetSandbox } from '../types.js';

export interface SandboxManager {
  getSandbox: GetSandbox;
  cleanup: () => Promise<void>;
}

export function createSandboxManager(config: SandboxConfig): SandboxManager {
  let sandbox: Sandbox | null = config.instance ?? null;
  let daytona: Daytona | null = null;
  const isExternal = !!config.instance;

  const getSandbox: GetSandbox = async () => {
    if (sandbox) return sandbox;

    daytona = new Daytona({
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      target: config.target,
    });

    sandbox = await daytona.create({ language: 'typescript' });
    return sandbox;
  };

  const cleanup = async () => {
    if (sandbox && !isExternal && daytona) {
      await daytona.delete(sandbox);
    }
    sandbox = null;
    daytona = null;
  };

  return { getSandbox, cleanup };
}
