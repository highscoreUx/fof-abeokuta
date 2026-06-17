import rawManifest from "@/config/activities.manifest.json";
import type { Permission } from "@/lib/permissions/catalog";
import { z } from "zod";

const permissionSchema = z.custom<Permission>(
  (value) => typeof value === "string",
  "Expected a permission string",
);

const activityManifestEntrySchema = z.object({
  slug: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  name: z.string().min(1),
  socialDisplayName: z.string().min(1).nullable(),
  description: z.string(),
  engine: z.string().min(1),
  channels: z.array(z.enum(["official", "social"])).min(1),
  configurable: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  permissions: z.object({
    manage: permissionSchema,
    run: permissionSchema,
    participant: permissionSchema,
  }),
  defaultEventActivity: z.object({
    enabled: z.boolean(),
    allowGeneral: z.boolean(),
    allowGroup: z.boolean(),
    allowStaff: z.boolean(),
  }),
  createForm: z.object({
    scopeMode: z.enum(["general_only", "flexible"]),
  }),
  chatGame: z
    .object({
      maxPlayers: z.number().int().positive(),
      teamMaxPlayers: z.number().int().positive().optional(),
      dmMaxPlayers: z.number().int().positive().optional(),
      joinPolicy: z.enum(["invite_only", "open"]),
      channels: z.array(z.enum(["DM", "TEAM"])).default(["DM", "TEAM"]),
    })
    .optional(),
});

const activitiesManifestSchema = z.object({
  version: z.number().int().positive(),
  activities: z.array(activityManifestEntrySchema).min(1),
});

export type ActivityManifestEntry = z.infer<typeof activityManifestEntrySchema>;
export type ActivityChannel = ActivityManifestEntry["channels"][number];
export type ActivityCreateFormScopeMode = ActivityManifestEntry["createForm"]["scopeMode"];

export const ACTIVITIES_MANIFEST = activitiesManifestSchema.parse(rawManifest);

export type ActivitySlug = (typeof ACTIVITIES_MANIFEST.activities)[number]["slug"];

export type ChatGameKind = Extract<
  ActivitySlug,
  {
    [K in (typeof ACTIVITIES_MANIFEST.activities)[number] as K["channels"] extends Array<infer C>
      ? "social" extends C
        ? K["slug"]
        : never
      : never]: K["slug"];
  }[ActivitySlug]
>;

const entriesBySlug = new Map<string, ActivityManifestEntry>();
const canonicalSlugByAlias = new Map<string, string>();

for (const entry of ACTIVITIES_MANIFEST.activities) {
  entriesBySlug.set(entry.slug, entry);
  canonicalSlugByAlias.set(entry.slug, entry.slug);
  for (const alias of entry.aliases) {
    canonicalSlugByAlias.set(alias, entry.slug);
  }
}

export const ACTIVITY_MANIFEST_ENTRIES = [...ACTIVITIES_MANIFEST.activities].sort(
  (a, b) => a.sortOrder - b.sortOrder,
);

export const OFFICIAL_ACTIVITY_SLUGS = ACTIVITY_MANIFEST_ENTRIES.filter((entry) =>
  entry.channels.includes("official"),
).map((entry) => entry.slug) as ActivitySlug[];

export const CONFIGURABLE_ACTIVITY_SLUGS = [
  ...ACTIVITY_MANIFEST_ENTRIES.filter((entry) => entry.configurable).map((entry) => entry.slug),
  ...ACTIVITY_MANIFEST_ENTRIES.flatMap((entry) => entry.aliases),
] as const;

export const CHAT_GAME_MANIFEST_ENTRIES = ACTIVITY_MANIFEST_ENTRIES.filter((entry) =>
  entry.channels.includes("social"),
);

export const CHAT_GAME_KINDS = CHAT_GAME_MANIFEST_ENTRIES.map(
  (entry) => entry.slug,
) as ChatGameKind[];

const chatGameKindSet = new Set<string>(CHAT_GAME_KINDS);

export function resolveActivitySlug(slug: string): string {
  return canonicalSlugByAlias.get(slug) ?? slug;
}

export function getActivityManifestEntry(slug: string): ActivityManifestEntry | undefined {
  return entriesBySlug.get(resolveActivitySlug(slug));
}

export function getActivityEngine(slug: string): string | undefined {
  return getActivityManifestEntry(slug)?.engine;
}

export function slugCandidates(slug: string): string[] {
  const entry = getActivityManifestEntry(slug);
  if (!entry) return [slug];
  return [entry.slug, ...entry.aliases];
}

export function isChatGameKind(value: string): value is ChatGameKind {
  return chatGameKindSet.has(value);
}

export type ChatGameChannel = "DM" | "TEAM" | "GENERAL" | "STAFF";

export function getChatGameChannels(kind: ChatGameKind): ChatGameChannel[] {
  const channels = getActivityManifestEntry(kind)?.chatGame?.channels;
  return channels?.length ? [...channels] : ["DM", "TEAM"];
}

/** Group lobby channels reuse each game's TEAM manifest entry. */
function manifestChannelFor(channel: ChatGameChannel): "DM" | "TEAM" {
  if (channel === "DM") return "DM";
  return "TEAM";
}

export function isChatGameAllowedForChannel(kind: ChatGameKind, channel: ChatGameChannel): boolean {
  return getChatGameChannels(kind).includes(manifestChannelFor(channel));
}

export function chatGameTitle(kind: ChatGameKind): string {
  const entry = getActivityManifestEntry(kind);
  if (!entry) return kind;
  return entry.socialDisplayName ?? entry.name;
}

export function chatGameOptions(
  channel?: ChatGameChannel,
): Array<{ kind: ChatGameKind; label: string }> {
  return CHAT_GAME_MANIFEST_ENTRIES.filter(
    (entry) => !channel || isChatGameAllowedForChannel(entry.slug as ChatGameKind, channel),
  ).map((entry) => ({
    kind: entry.slug as ChatGameKind,
    label: entry.socialDisplayName ?? entry.name,
  }));
}

export function getChatGameDefaults(
  kind: ChatGameKind,
  options?: { channel?: ChatGameChannel; openLobby?: boolean },
): { joinPolicy: "invite_only" | "open"; maxPlayers: number } {
  const entry = getActivityManifestEntry(kind);
  const chat = entry?.chatGame;
  const channel = options?.channel ?? "DM";
  const manifestChannel = manifestChannelFor(channel);
  const maxPlayers =
    manifestChannel === "TEAM" && chat?.teamMaxPlayers != null
      ? chat.teamMaxPlayers
      : manifestChannel === "DM" && chat?.dmMaxPlayers != null
        ? chat.dmMaxPlayers
        : (chat?.maxPlayers ?? 2);

  if (options?.openLobby) {
    return { joinPolicy: "open", maxPlayers };
  }

  return {
    joinPolicy: chat?.joinPolicy ?? "invite_only",
    maxPlayers,
  };
}

export const ACTIVITIES_ADMIN_PERMISSIONS: Permission[] = [
  ...new Set(
    ACTIVITY_MANIFEST_ENTRIES.flatMap((entry) => [
      entry.permissions.manage,
      entry.permissions.run,
    ]),
  ),
];

/** Slug constants for backwards-compatible imports. */
export const ACTIVITY_KAHOOT = "kahoot" as const satisfies ActivitySlug;
export const ACTIVITY_SPINNER = "spinner" as const satisfies ActivitySlug;
/** @deprecated use ACTIVITY_SPINNER */
export const ACTIVITY_SPIN_TO_BUILD = ACTIVITY_SPINNER;
export const ACTIVITY_SURVEY = "survey" as const satisfies ActivitySlug;
export const ACTIVITY_TIC_TAC_TOE = "tic_tac_toe" as const satisfies ActivitySlug;
export const ACTIVITY_COUNTDOWN = "countdown" as const satisfies ActivitySlug;
export const ACTIVITY_HANGMAN = "hangman" as const satisfies ActivitySlug;

export interface ActivityTypeDefinition {
  slug: ActivitySlug;
  name: string;
  description: string;
  managePermission: Permission;
  runPermission: Permission;
  participantPermission: Permission;
  sortOrder: number;
  engine: string;
  channels: ActivityChannel[];
  configurable: boolean;
  createFormScopeMode: ActivityCreateFormScopeMode;
  defaultEventActivity: ActivityManifestEntry["defaultEventActivity"];
  aliases: string[];
  socialDisplayName: string | null;
}

export const ACTIVITY_CATALOG: ActivityTypeDefinition[] = ACTIVITY_MANIFEST_ENTRIES.map(
  (entry) => ({
    slug: entry.slug as ActivitySlug,
    name: entry.name,
    description: entry.description,
    managePermission: entry.permissions.manage,
    runPermission: entry.permissions.run,
    participantPermission: entry.permissions.participant,
    sortOrder: entry.sortOrder,
    engine: entry.engine,
    channels: entry.channels,
    configurable: entry.configurable,
    createFormScopeMode: entry.createForm.scopeMode,
    defaultEventActivity: entry.defaultEventActivity,
    aliases: entry.aliases,
    socialDisplayName: entry.socialDisplayName,
  }),
);

export function getActivityDefinition(slug: string): ActivityTypeDefinition | undefined {
  const entry = getActivityManifestEntry(slug);
  if (!entry) return undefined;
  return ACTIVITY_CATALOG.find((row) => row.slug === entry.slug);
}

export function defaultEventActivityConfig(slug: string) {
  const entry = getActivityManifestEntry(slug);
  if (!entry) {
    return { enabled: true, allowGeneral: true, allowGroup: true, allowStaff: false };
  }
  return { ...entry.defaultEventActivity };
}

export function isGeneralOnlyActivity(slug: ActivitySlug): boolean {
  return getActivityDefinition(slug)?.createFormScopeMode === "general_only";
}
