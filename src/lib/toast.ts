import { toast } from "sonner";

export function toastError(title: string, description?: string) {
  toast(title, { description });
}

export function toastSuccess(title: string, description?: string) {
  toast(title, { description });
}
