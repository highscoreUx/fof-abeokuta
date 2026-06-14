"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEventApi } from "@/hooks/useEventApi";
import { toastError, toastSuccess } from "@/lib/toast";

export function GallerySettings() {
  const { api } = useEventApi();
  const [officialGalleryUrl, setOfficialGalleryUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api<{ library: { officialGalleryUrl: string | null } }>(
          "/gallery/library",
        );
        setOfficialGalleryUrl(data.library.officialGalleryUrl ?? "");
      } catch (error) {
        toastError("Failed to load gallery settings", error instanceof Error ? error.message : undefined);
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const save = async () => {
    setSaving(true);
    try {
      await api("/gallery/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officialGalleryUrl: officialGalleryUrl.trim() || null,
        }),
      });
      toastSuccess("Gallery settings saved");
    } catch (error) {
      toastError("Failed to save gallery settings", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Gallery</CardTitle>
          <CardDescription>
            Each event gets a Google Photos album on creation (gallery storage). After sharing that
            album in Google Photos, paste the public link here so participants can open the full
            album outside FOF. Quiz and other media still use Cloudinary/R2.
          </CardDescription>
        </div>
        <div className="space-y-2">
          <Label htmlFor="official-gallery-url">Public album link (optional)</Label>
          <Input
            id="official-gallery-url"
            type="url"
            placeholder="https://photos.app.goo.gl/..."
            value={officialGalleryUrl}
            onChange={(event) => setOfficialGalleryUrl(event.target.value)}
            disabled={loading}
          />
        </div>
        <Button onClick={() => void save()} disabled={loading || saving}>
          {saving ? "Saving…" : "Save gallery settings"}
        </Button>
      </CardHeader>
    </Card>
  );
}
