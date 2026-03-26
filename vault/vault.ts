declare(strict_types=1);

import type {
  VaultData,
  VaultVersion,
  VaultEntry,
  VaultDevice,
  VaultSettings,
  Migration
} from "./types";
import { generateUUID } from "../utils/crypto";

const CURRENT_VERSION: VaultVersion = 1;

interface MigrationMap {
  [key: number]: Migration<unknown, VaultData>;
}

const migrations: MigrationMap = {};

function registerMigration<T extends Record<string, unknown>>(
  fromVersion: number,
  toVersion: number,
  migrateFn: (data: T) => VaultData
): void {
  migrations[fromVersion] = {
    version: toVersion,
    migrate: migrateFn
  };
}

export function getCurrentVersion(): VaultVersion {
  return CURRENT_VERSION;
}

function applyMigrations(data: Record<string, unknown>, fromVersion: number): VaultData {
  let current = data;

  while (fromVersion < CURRENT_VERSION) {
    const migration = migrations[fromVersion];
    if (!migration) {
      throw new Error(`No migration found for version ${fromVersion}`);
    }

    current = migration.migrate(current);
    fromVersion = migration.version;
  }

  return current as VaultData;
}

export function migrateVault(data: Record<string, unknown>, fromVersion: number): VaultData {
  if (fromVersion === CURRENT_VERSION) {
    return data as VaultData;
  }

  if (fromVersion > CURRENT_VERSION) {
    throw new Error(`Vault version ${fromVersion} is not supported (current: ${CURRENT_VERSION})`);
  }

  return applyMigrations(data, fromVersion);
}

export interface ConflictInfo {
  type: "entry" | "metadata" | "settings";
  itemId?: string;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  deviceId: string;
}

export interface ConflictResolution {
  keep: "local" | "remote" | "merge";
  entryId?: string;
}

export class Vault {
  private data: VaultData;
  private deviceId: string;

  constructor(data: VaultData, deviceId?: string) {
    this.data = data;
    this.deviceId = deviceId ?? this.data.deviceId ?? this.generateDeviceId();
  }

  static createEmpty(deviceId?: string): Vault {
    const now = Date.now();
    const device: VaultDevice = {
      id: deviceId ?? generateUUID(),
      name: "Current Device",
      createdAt: now,
      lastSeen: now
    };

    return new Vault({
      version: CURRENT_VERSION,
      vaultId: generateUUID(),
      createdAt: now,
      updatedAt: now,
      deviceId: device.id,
      entries: [],
      settings: {
        autoLockMinutes: 5,
        theme: "dark"
      },
      devices: [device]
    }, device.id);
  }

  private generateDeviceId(): string {
    const id = generateUUID();
    this.data.deviceId = id;
    return id;
  }

  get vaultId(): string {
    return this.data.vaultId;
  }

  get version(): VaultVersion {
    return this.data.version;
  }

  get entries(): readonly VaultEntry[] {
    return this.data.entries;
  }

  get settings(): VaultSettings {
    return this.data.settings;
  }

  get devices(): readonly VaultDevice[] {
    return this.data.devices ?? [];
  }

  get updatedAt(): number {
    return this.data.updatedAt;
  }

  get deviceId(): string {
    return this.deviceId;
  }

  toJSON(): VaultData {
    return { ...this.data };
  }

  addEntry(entry: Omit<VaultEntry, "id" | "createdAt" | "updatedAt" | "deviceId">): Vault {
    const now = Date.now();
    const newEntry: VaultEntry = {
      ...entry,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
      deviceId: this.deviceId
    };

    this.data.entries.push(newEntry);
    this.data.updatedAt = now;
    this.updateDevice();

    return this;
  }

  updateEntry(id: string, updates: Partial<Omit<VaultEntry, "id" | "createdAt" | "updatedAt">>): Vault {
    const entry = this.data.entries.find(e => e.id === id);
    if (!entry) {
      throw new Error(`Entry with id ${id} not found`);
    }

    const now = Date.now();
    Object.assign(entry, updates, { updatedAt: now, deviceId: this.deviceId });
    this.data.updatedAt = now;
    this.updateDevice();

    return this;
  }

  deleteEntry(id: string): Vault {
    const index = this.data.entries.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error(`Entry with id ${id} not found`);
    }

    this.data.entries.splice(index, 1);
    this.data.updatedAt = Date.now();
    this.updateDevice();

    return this;
  }

  getEntry(id: string): VaultEntry | undefined {
    return this.data.entries.find(e => e.id === id);
  }

  getEntriesByUrl(url: string): VaultEntry[] {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, "");

      return this.data.entries.filter(entry => {
        if (!entry.url) return false;
        try {
          const entryUrl = new URL(entry.url);
          const entryHostname = entryUrl.hostname.replace(/^www\./, "");
          return hostname === entryHostname || hostname.endsWith(entryHostname);
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  }

  searchEntries(query: string): VaultEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.data.entries.filter(entry =>
      entry.title.toLowerCase().includes(lowerQuery) ||
      entry.username?.toLowerCase().includes(lowerQuery) ||
      entry.url?.toLowerCase().includes(lowerQuery) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  updateSettings(settings: Partial<VaultSettings>): Vault {
    Object.assign(this.data.settings, settings);
    this.data.updatedAt = Date.now();
    this.updateDevice();

    return this;
  }

  registerDevice(name: string, deviceId?: string): void {
    const now = Date.now();
    const existingDevice = this.data.devices?.find(d => d.id === deviceId);

    if (existingDevice) {
      existingDevice.name = name;
      existingDevice.lastSeen = now;
    } else {
      if (!this.data.devices) {
        this.data.devices = [];
      }
      this.data.devices.push({
        id: deviceId ?? generateUUID(),
        name,
        createdAt: now,
        lastSeen: now
      });
    }

    this.data.updatedAt = now;
  }

  removeDevice(deviceId: string): void {
    if (!this.data.devices) return;

    const index = this.data.devices.findIndex(d => d.id === deviceId);
    if (index !== -1) {
      this.data.devices.splice(index, 1);
      this.data.updatedAt = Date.now();
    }
  }

  updateDevice(): void {
    const now = Date.now();
    const device = this.data.devices?.find(d => d.id === this.deviceId);

    if (device) {
      device.lastSeen = now;
    } else if (this.data.devices) {
      this.data.devices.push({
        id: this.deviceId,
        name: "Current Device",
        createdAt: now,
        lastSeen: now
      });
    }
  }

  detectConflicts(remote: Vault): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    for (const remoteEntry of remote.data.entries) {
      const localEntry = this.data.entries.find(e => e.id === remoteEntry.id);

      if (!localEntry) {
        continue;
      }

      if (localEntry.updatedAt !== remoteEntry.updatedAt) {
        conflicts.push({
          type: "entry",
          itemId: remoteEntry.id,
          localUpdatedAt: localEntry.updatedAt,
          remoteUpdatedAt: remoteEntry.updatedAt,
          deviceId: remoteEntry.deviceId
        });
      }
    }

    if (this.data.updatedAt !== remote.data.updatedAt && this.data.updatedAt > 0) {
      const newerDeviceId =
        this.data.updatedAt > remote.data.updatedAt ? this.deviceId : remote.data.deviceId;
      conflicts.push({
        type: "metadata",
        localUpdatedAt: this.data.updatedAt,
        remoteUpdatedAt: remote.data.updatedAt,
        deviceId: newerDeviceId
      });
    }

    return conflicts;
  }

  merge(remote: Vault, resolutions: ConflictResolution[]): Vault {
    const merged = Vault.createEmpty(this.deviceId);
    merged.data = { ...this.data };

    const resolvedIds = new Set<string>();

    for (const resolution of resolutions) {
      if (resolution.entryId) {
        resolvedIds.add(resolution.entryId);

        if (resolution.keep === "remote") {
          const remoteEntry = remote.getEntry(resolution.entryId);
          if (remoteEntry) {
            const localIndex = merged.data.entries.findIndex(e => e.id === resolution.entryId);
            if (localIndex !== -1) {
              merged.data.entries[localIndex] = { ...remoteEntry };
            }
          }
        }
      }
    }

    for (const remoteEntry of remote.data.entries) {
      const localExists = this.data.entries.some(e => e.id === remoteEntry.id);

      if (!localExists) {
        merged.data.entries.push({ ...remoteEntry });
      }
    }

    merged.data.updatedAt = Date.now();
    merged.updateDevice();

    return merged;
  }

  hasConflictsWith(remote: Vault): boolean {
    return this.detectConflicts(remote).length > 0;
  }
}

export class VaultBuilder {
  private data: Partial<VaultData> = {
    version: CURRENT_VERSION,
    entries: [],
    devices: []
  };

  withVaultId(vaultId: string): this {
    this.data.vaultId = vaultId;
    return this;
  }

  withDeviceId(deviceId: string): this {
    this.data.deviceId = deviceId;
    return this;
  }

  withSettings(settings: VaultSettings): this {
    this.data.settings = settings;
    return this;
  }

  withEntries(entries: VaultEntry[]): this {
    this.data.entries = entries;
    return this;
  }

  withDevices(devices: VaultDevice[]): this {
    this.data.devices = devices;
    return this;
  }

  withTimestamps(createdAt: number, updatedAt: number): this {
    this.data.createdAt = createdAt;
    this.data.updatedAt = updatedAt;
    return this;
  }

  build(): Vault {
    const now = Date.now();
    const finalData: VaultData = {
      version: CURRENT_VERSION,
      vaultId: this.data.vaultId ?? generateUUID(),
      createdAt: this.data.createdAt ?? now,
      updatedAt: this.data.updatedAt ?? now,
      deviceId: this.data.deviceId ?? generateUUID(),
      entries: this.data.entries ?? [],
      settings: this.data.settings ?? {
        autoLockMinutes: 5,
        theme: "dark"
      },
      devices: this.data.devices ?? []
    };

    return new Vault(finalData, finalData.deviceId);
  }
}
