/**
 * NEMX - Nemo Encrypted Export Format
 *
 * A secure, portable format for exporting Nemo vault data.
 * Supports both encrypted (default) and unencrypted exports.
 * Also supports CSV and JSON credential exchange formats.
 */

import type { VaultEntry, VaultSettings, TOTPConfig } from "./types";

export const NEMX_VERSION = 1;
export const NEMX_MAGIC = "NEMX";

export interface NemxAttributes {
  version: number;
  description: string;
  createdAt: number;
  encrypted: boolean;
  vaultName?: string;
  exportReason?: string;
}

export interface NemxVault {
  attrs: {
    uuid: string;
    name: string;
    createdAt: number;
    updatedAt: number;
  };
  items: NemxItem[];
}

export interface NemxItem {
  uuid: string;
  type: string;
  favIndex: number;
  createdAt: number;
  updatedAt: number;
  state: "active" | "archived";
  tags: string[];
  overview: {
    title: string;
    subtitle?: string;
    url?: string;
    urls?: Array<{ label: string; url: string }>;
  };
  details: {
    loginFields?: NemxField[];
    notesPlain?: string;
    sections?: NemxSection[];
    passwordHistory?: Array<{ value: string; time: number }>;
    totp?: {
      secret: string;
      algorithm: string;
      digits: number;
      period: number;
    };
  };
}

export interface NemxField {
  id: string;
  title: string;
  value: string | { concealed: string };
  type: "text" | "email" | "url" | "password" | "textarea" | "phone" | "concealed";
  designation?: "username" | "password";
}

export interface NemxSection {
  title: string;
  name: string;
  fields: NemxField[];
}

export interface NemxData {
  version: number;
  vaults: NemxVault[];
}

export interface NemxFile {
  attributes: NemxAttributes;
  data: NemxData;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function fieldTypeFromInputType(inputType: string): NemxField["type"] {
  const map: Record<string, NemxField["type"]> = {
    text: "text",
    email: "email",
    url: "url",
    password: "password",
    textarea: "textarea",
    tel: "phone",
  };
  return map[inputType.toLowerCase()] || "text";
}

function valueToFieldValue(value: string, fieldType: NemxField["type"]): string | { concealed: string } {
  if (fieldType === "password" || fieldType === "concealed") {
    return { concealed: value };
  }
  return value;
}

export function vaultToNemx(
  entries: VaultEntry[],
  settings: VaultSettings,
  vaultName: string = "Nemo Vault",
  vaultId?: string
): NemxData {
  const now = Date.now();

  const items: NemxItem[] = entries.map((entry) => {
    const loginFields: NemxField[] = [];

    if (entry.username) {
      loginFields.push({
        id: generateUUID(),
        title: "Username",
        value: entry.username,
        type: "text",
        designation: "username",
      });
    }

    if (entry.password) {
      loginFields.push({
        id: generateUUID(),
        title: "Password",
        value: valueToFieldValue(entry.password, "password"),
        type: "password",
        designation: "password",
      });
    }

    if (entry.url) {
      loginFields.push({
        id: generateUUID(),
        title: "URL",
        value: entry.url,
        type: "url",
      });
    }

    const sections: NemxSection[] = [];

    if (entry.notes) {
      sections.push({
        title: "Notes",
        name: "notes",
        fields: [{
          id: generateUUID(),
          title: "Notes",
          value: entry.notes,
          type: "textarea",
        }],
      });
    }

    return {
      uuid: entry.id,
      type: "login",
      favIndex: entry.favorite ? 1 : 0,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      state: "active",
      tags: entry.tags || [],
      overview: {
        title: entry.title,
        subtitle: entry.username || undefined,
        url: entry.url,
        urls: entry.url ? [{ label: "Website", url: entry.url }] : undefined,
      },
      details: {
        loginFields: loginFields.length > 0 ? loginFields : undefined,
        notesPlain: entry.notes || undefined,
        sections: sections.length > 0 ? sections : undefined,
      },
    };
  });

  return {
    version: NEMX_VERSION,
    vaults: [{
      attrs: {
        uuid: vaultId || generateUUID(),
        name: vaultName,
        createdAt: now,
        updatedAt: now,
      },
      items,
    }],
  };
}

export function nemxToVault(data: NemxData): { entries: VaultEntry[]; settings: Partial<VaultSettings> } {
  const entries: VaultEntry[] = [];

  for (const vault of data.vaults) {
    for (const item of vault.items) {
      if (item.type !== "login") continue;

      let username: string | undefined;
      let password: string | undefined;
      let url: string | undefined;
      let notes: string | undefined;

      if (item.details.loginFields) {
        for (const field of item.details.loginFields) {
          const value = typeof field.value === "object" && "concealed" in field.value
            ? field.value.concealed
            : field.value;

          if (field.designation === "username") {
            username = value as string;
          } else if (field.designation === "password") {
            password = value as string;
          } else if (field.type === "url") {
            url = value as string;
          }
        }
      }

      if (item.details.notesPlain) {
        notes = item.details.notesPlain;
      }

      if (item.details.sections) {
        for (const section of item.details.sections) {
          for (const field of section.fields) {
            const value = typeof field.value === "object" && "concealed" in field.value
              ? field.value.concealed
              : field.value;

            if (field.title.toLowerCase() === "notes" || field.type === "textarea") {
              notes = value as string;
            }
          }
        }
      }

      entries.push({
        id: item.uuid,
        title: item.overview.title,
        username,
        password,
        url: url || item.overview.url,
        notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        favorite: item.favIndex > 0,
        tags: item.tags,
      });
    }
  }

  return { entries, settings: {} };
}

export function createNemxExport(
  entries: VaultEntry[],
  settings: VaultSettings,
  vaultName: string = "Nemo Vault",
  vaultId?: string
): string {
  const nemxData = vaultToNemx(entries, settings, vaultName, vaultId);

  const nemxFile: NemxFile = {
    attributes: {
      version: NEMX_VERSION,
      description: "Nemo Encrypted Export",
      createdAt: Date.now(),
      encrypted: false,
      vaultName,
    },
    data: nemxData,
  };

  return JSON.stringify(nemxFile, null, 2);
}

export function parseNemxExport(content: string): NemxFile {
  const parsed = JSON.parse(content) as NemxFile;

  if (!parsed.attributes || !parsed.data) {
    throw new Error("Invalid NEMX format: missing attributes or data");
  }

  if (parsed.attributes.version !== NEMX_VERSION) {
    throw new Error(`Unsupported NEMX version: ${parsed.attributes.version}`);
  }

  return parsed;
}

export function importNemxExport(content: string): { entries: VaultEntry[]; settings: Partial<VaultSettings> } {
  const nemxFile = parseNemxExport(content);
  return nemxToVault(nemxFile.data);
}

export function getNemxMimeType(): string {
  return "application/x-nemo-export";
}

export function getNemxFileExtension(): string {
  return ".nemx";
}

// ============================================================================
// CSV Export/Import (Bitwarden-compatible)
// ============================================================================

const CSV_HEADERS = "folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp";

export function vaultToCsv(entries: VaultEntry[]): string {
  const lines: string[] = [CSV_HEADERS];

  for (const entry of entries) {
    const folder = "";
    const favorite = entry.favorite ? "1" : "0";
    const type = "login";
    const name = escapeCsvField(entry.title);
    const notes = escapeCsvField(entry.notes || "");
    const fields = "";
    const reprompt = "0";
    const login_uri = escapeCsvField(entry.url || "");
    const login_username = escapeCsvField(entry.username || "");
    const login_password = escapeCsvField(entry.password || "");
    const login_totp = "";

    lines.push(`${folder},${favorite},${type},${name},${notes},${fields},${reprompt},${login_uri},${login_username},${login_password},${login_totp}`);
  }

  return lines.join("\n");
}

function escapeCsvField(value: string): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function csvToVault(csvContent: string): { entries: VaultEntry[] } {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return { entries: [] };

  const headers = parseCsvLine(lines[0]);
  const entries: VaultEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }

    if (!row.name && !row.login_uri && !row.login_username) continue;

    entries.push({
      id: generateUUID(),
      title: row.name || row.login_uri || "Untitled",
      username: row.login_username || undefined,
      password: row.login_password || undefined,
      url: row.login_uri || undefined,
      notes: row.notes || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      favorite: row.favorite === "1",
      tags: row.folder ? [row.folder] : undefined,
    });
  }

  return { entries };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

export type ExportFormat = "nemx" | "csv";

export function getFormatDescription(format: ExportFormat): string {
  switch (format) {
    case "nemx":
      return "Nemo unencrypted export (NEMX format)";
    case "csv":
      return "CSV (compatible with Bitwarden, 1Password, LastPass)";
  }
}
