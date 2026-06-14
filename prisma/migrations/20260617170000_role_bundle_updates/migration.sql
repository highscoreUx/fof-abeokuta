-- Staff user.create + gallery permissions (requires PlatformRole, Account.permissions, User.permissions).

UPDATE "PlatformRole"
SET
  "permissions" = '["user.list","user.create","user.check_in","user.password.reset","stage.view","participant.home","participant.chat","participant.staff_chat"]'::jsonb,
  "permissionsVersion" = "permissionsVersion" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'staff';

UPDATE "Account" AS a
SET
  "permissions" = r."permissions",
  "permissionsVersion" = a."permissionsVersion" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "PlatformRole" AS r
WHERE r."slug" = 'staff'
  AND NOT (a."permissions" @> '["user.create"]'::jsonb)
  AND a."permissions" @> '["user.list"]'::jsonb
  AND a."permissions" @> '["user.check_in"]'::jsonb
  AND NOT (a."permissions" @> '["user.import"]'::jsonb)
  AND NOT (a."permissions" @> '["dashboard.view"]'::jsonb)
  AND NOT (a."permissions" @> '["*"]'::jsonb);

UPDATE "User" AS u
SET
  "permissions" = r."permissions",
  "authVersion" = u."authVersion" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "PlatformRole" AS r
WHERE r."slug" = 'staff'
  AND u."permissions" IS NOT NULL
  AND NOT (u."permissions" @> '["user.create"]'::jsonb)
  AND u."permissions" @> '["user.list"]'::jsonb
  AND u."permissions" @> '["user.check_in"]'::jsonb
  AND NOT (u."permissions" @> '["user.import"]'::jsonb)
  AND NOT (u."permissions" @> '["dashboard.view"]'::jsonb)
  AND NOT (u."permissions" @> '["*"]'::jsonb);

UPDATE "PlatformRole"
SET
  "permissions" = "permissions" || '["gallery.view","gallery.upload"]'::jsonb,
  "permissionsVersion" = "permissionsVersion" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'participant'
  AND NOT ("permissions" @> '["gallery.view"]'::jsonb);

UPDATE "PlatformRole"
SET
  "permissions" = "permissions" || '["gallery.view","gallery.upload","gallery.media_upload","gallery.manage"]'::jsonb,
  "permissionsVersion" = "permissionsVersion" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'coordinator'
  AND NOT ("permissions" @> '["gallery.manage"]'::jsonb);
