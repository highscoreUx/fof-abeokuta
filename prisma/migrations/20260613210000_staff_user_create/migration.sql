-- Grant user.create (Add user) on the staff role bundle; user.import (Bulk add) stays off.
-- UI and API gate on those permissions — not role slugs.

UPDATE "PlatformRole"
SET
  "permissions" = '["user.list","user.create","user.check_in","user.password.reset","stage.view","participant.home","participant.chat","participant.staff_chat"]'::jsonb,
  "permissionsVersion" = "permissionsVersion" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'staff';

-- Sync existing staff-bundle accounts to the updated template (permission set, not slug lookup).
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
