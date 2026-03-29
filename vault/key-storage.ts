

export interface WrappedKeyData {
  wrappedKey: string;
  iv: string;
}

export interface KeyStorage {
  loadWrappedKey(): Promise<WrappedKeyData | null>;
  saveWrappedKey(data: WrappedKeyData): Promise<void>;
  saveCredentialKey(credentialId: string, data: WrappedKeyData): Promise<void>;
}

const VAULT_DIR = "nemo-vault";
const KEY_FILE = "key.enc";

export class OPFSKeyStorage implements KeyStorage {
  async loadWrappedKey(): Promise<WrappedKeyData | null> {
    try {
      const dir = await navigator.storage.getDirectory();
      const vaultDir = await dir.getDirectoryHandle(VAULT_DIR);
      const file = await vaultDir.getFileHandle(KEY_FILE);
      const blob = await file.getFile();
      const text = await blob.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async saveWrappedKey(data: WrappedKeyData): Promise<void> {
    const dir = await navigator.storage.getDirectory();
    const vaultDir = await dir.getDirectoryHandle(VAULT_DIR, { create: true });
    const file = await vaultDir.getFileHandle(KEY_FILE, { create: true });
    const writer = await file.createWritable();
    await writer.write(JSON.stringify(data));
    await writer.close();
  }

  async saveCredentialKey(credentialId: string, data: WrappedKeyData): Promise<void> {
    const dir = await navigator.storage.getDirectory();
    const vaultDir = await dir.getDirectoryHandle(VAULT_DIR, { create: true });
    const file = await vaultDir.getFileHandle(`key-${credentialId}.enc`, { create: true });
    const writer = await file.createWritable();
    await writer.write(JSON.stringify({ ...data, credentialId }));
    await writer.close();
  }
}
