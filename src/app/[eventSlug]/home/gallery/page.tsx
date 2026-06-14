import { Suspense } from "react";
import { GalleryView } from "@/_views/participant/gallery/GalleryView";

export default function GalleryPage() {
  return (
    <Suspense fallback={null}>
      <GalleryView />
    </Suspense>
  );
}
