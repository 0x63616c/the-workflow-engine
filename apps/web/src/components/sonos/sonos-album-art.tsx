interface SonosAlbumArtProps {
  albumArtUrl?: string;
}

export function SonosAlbumArt({ albumArtUrl }: SonosAlbumArtProps) {
  if (!albumArtUrl) {
    return (
      <div
        data-testid="album-art-fallback"
        className="w-48 h-48 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900"
      />
    );
  }
  return (
    <img
      src={albumArtUrl}
      alt="Album art"
      className="w-48 h-48 rounded-2xl object-cover"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
