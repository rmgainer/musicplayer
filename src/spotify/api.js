import { getAccessToken } from "./auth";

const API_BASE =
  "https://api.spotify.com/v1";

async function spotifyFetch(endpoint) {
  const token = getAccessToken();

  if (!token) {
    throw new Error(
      "No Spotify access token."
    );
  }

  const response = await fetch(
    `${API_BASE}${endpoint}`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error =
      await response.text();

    throw new Error(
      `Spotify API error (${response.status}): ${error}`
    );
  }

  return response.json();
}

export async function getCurrentUser() {
  return spotifyFetch("/me");
}

export async function getPlaylists() {
  return spotifyFetch(
    "/me/playlists?limit=50"
  );
}

export async function getPlaylistItems(
  playlistId
) {
  return spotifyFetch(
    `/playlists/${playlistId}/items?limit=100`
  );
}

export async function transferPlayback(
  deviceId
) {
  const token =
    getAccessToken();

  const response = await fetch(
    `${API_BASE}/me/player`,
    {
      method: "PUT",

      headers: {
        Authorization:
          `Bearer ${token}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        device_ids: [deviceId],

        play: false,
      }),
    }
  );

  if (!response.ok) {
    const error =
      await response.text();

    throw new Error(
      `Playback transfer failed (${response.status}): ${error}`
    );
  }
}

export async function playTrack(
  trackUri,
  deviceId
) {
  const token =
    getAccessToken();

  if (!deviceId) {
    throw new Error(
      "Spotify player device ID is missing."
    );
  }

  const response = await fetch(
    `${API_BASE}/me/player/play?device_id=${encodeURIComponent(
      deviceId
    )}`,
    {
      method: "PUT",

      headers: {
        Authorization:
          `Bearer ${token}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        uris: [trackUri],
      }),
    }
  );

  if (!response.ok) {
    const error =
      await response.text();

    throw new Error(
      `Failed to play track (${response.status}): ${error}`
    );
  }
}