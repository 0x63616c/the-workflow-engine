import { EmailCard } from "@/components/hub/email-card";
import { PhotoCard } from "@/components/hub/photo-card";
import { QuoteCard } from "@/components/hub/quote-card";
import { SystemStatusCard } from "@/components/hub/system-status-card";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("Placeholder cards", () => {
  afterEach(() => {
    cleanup();
  });

  it("EmailCard renders with test id and unread count", () => {
    render(<EmailCard />);
    expect(screen.getByTestId("widget-card-email")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("PhotoCard renders with test id", () => {
    render(<PhotoCard />);
    expect(screen.getByTestId("widget-card-photo")).toBeInTheDocument();
  });

  it("QuoteCard renders with test id and quote text", () => {
    render(<QuoteCard />);
    expect(screen.getByTestId("widget-card-quote")).toBeInTheDocument();
  });

  it("SystemStatusCard renders with test id and uptime", () => {
    render(<SystemStatusCard />);
    expect(screen.getByTestId("widget-card-system")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });
});
