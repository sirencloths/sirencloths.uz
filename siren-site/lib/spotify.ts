const spotifyKinds = "track|album|playlist|episode|show|artist";

/** Turns a Spotify share URL or URI into the official embeddable player URL. */
export function spotifyEmbedUrl(value?: string | null) {
  if (!value) return "";
  const match = value.trim().match(new RegExp(`(?:open\\.spotify\\.com/|spotify:)(${spotifyKinds})[/:]([A-Za-z0-9]+)`, "i"));
  return match ? `https://open.spotify.com/embed/${match[1].toLowerCase()}/${match[2]}` : "";
}

export function isSpotifyUrl(value?: string | null) {
  return Boolean(spotifyEmbedUrl(value));
}
