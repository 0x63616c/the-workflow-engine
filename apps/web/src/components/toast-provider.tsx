import { Toaster } from "sonner";

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
