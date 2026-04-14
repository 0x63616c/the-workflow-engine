import { Toaster, toast } from "sonner";

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__toast = toast;
}

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-center"
      theme="dark"
      richColors
      closeButton
      duration={5000}
      visibleToasts={3}
      toastOptions={{
        style: {
          fontSize: "14px",
        },
      }}
    />
  );
}
