import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "@/components/toast-provider";

describe("ToastProvider", () => {
  it("renders the Toaster component", () => {
    render(<ToastProvider />);
    const toaster = screen.getByRole("region", { name: /notifications/i });
    expect(toaster).toBeDefined();
  });
});
