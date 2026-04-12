import { SonosAlbumArt } from "@/components/sonos/sonos-album-art";
import { SonosControls } from "@/components/sonos/sonos-controls";
import { SonosSpeakerList } from "@/components/sonos/sonos-speaker-list";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
});

describe("SonosAlbumArt", () => {
  it("renders img when albumArtUrl provided", () => {
    render(<SonosAlbumArt albumArtUrl="http://example.com/art.jpg" />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders fallback div when no albumArtUrl", () => {
    const { container } = render(<SonosAlbumArt albumArtUrl={undefined} />);
    expect(container.querySelector("[data-testid='album-art-fallback']")).toBeInTheDocument();
  });
});

describe("SonosControls", () => {
  const sendCommand = vi.fn();

  it("renders shuffle, previous, play/pause, next, repeat buttons", () => {
    render(
      <SonosControls
        entityId="media_player.lr"
        isPlaying={false}
        shuffle={false}
        repeat="off"
        sendCommand={sendCommand}
      />,
    );
    expect(screen.getByRole("button", { name: /shuffle/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /repeat/i })).toBeInTheDocument();
  });

  it("calls sendCommand play when play clicked", () => {
    render(
      <SonosControls
        entityId="media_player.lr"
        isPlaying={false}
        shuffle={false}
        repeat="off"
        sendCommand={sendCommand}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(sendCommand).toHaveBeenCalledWith("media_player.lr", "play");
  });

  it("shows pause button when playing", () => {
    render(
      <SonosControls
        entityId="media_player.lr"
        isPlaying={true}
        shuffle={false}
        repeat="off"
        sendCommand={sendCommand}
      />,
    );
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
  });
});

describe("SonosSpeakerList", () => {
  it("renders one row per player", () => {
    const players = [
      {
        entityId: "media_player.a",
        friendlyName: "Alpha",
        state: "playing" as const,
        attributes: { volume: 60, shuffle: false, repeat: "off" as const },
      },
      {
        entityId: "media_player.b",
        friendlyName: "Beta",
        state: "paused" as const,
        attributes: { volume: 40, shuffle: false, repeat: "off" as const },
      },
    ];
    render(<SonosSpeakerList players={players} setVolume={vi.fn()} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("calls setVolume with entityId and value on slider change", async () => {
    vi.useFakeTimers();
    const setVolume = vi.fn();
    const players = [
      {
        entityId: "media_player.a",
        friendlyName: "Alpha",
        state: "playing" as const,
        attributes: { volume: 60, shuffle: false, repeat: "off" as const },
      },
    ];
    render(<SonosSpeakerList players={players} setVolume={setVolume} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "75" } });
    vi.advanceTimersByTime(300);
    expect(setVolume).toHaveBeenCalledWith("media_player.a", 75);
    vi.useRealTimers();
  });
});
