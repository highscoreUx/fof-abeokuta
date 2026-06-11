import type { ReactNode } from "react";

declare module "react" {
  // Next.js 16 bundles a React canary build with ViewTransition when experimental.viewTransition is enabled.
  export const ViewTransition: React.ComponentType<{
    children?: ReactNode;
    name?: string;
    share?: string | Record<string, string>;
    enter?: string | Record<string, string>;
    exit?: string | Record<string, string>;
    default?: string;
    update?: string | Record<string, string>;
  }>;
}
