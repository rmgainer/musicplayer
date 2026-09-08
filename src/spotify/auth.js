const CLIENT_ID =
  import.meta.env.VITE_SPOTIFY_CLIENT_ID;

const REDIRECT_URI =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

function generateRandomString(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let result = "";

  const randomValues =
    new Uint8Array(length);

  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result +=
      characters[randomValues[i] %
        characters.length];
  }

  return result;
}

async function generateCodeChallenge(
  codeVerifier
) {
  const encoder = new TextEncoder();

  const data =
    encoder.encode(codeVerifier);

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return btoa(
    String.fromCharCode(
      ...new Uint8Array(digest)
    )
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function login() {
  const codeVerifier =
    generateRandomString(64);

  const codeChallenge =
    await generateCodeChallenge(
      codeVerifier
    );

  localStorage.setItem(
    "spotify_code_verifier",
    codeVerifier
  );

  const params =
    new URLSearchParams({
      client_id: CLIENT_ID,

      response_type: "code",

      redirect_uri: REDIRECT_URI,

      code_challenge_method: "S256",

      code_challenge: codeChallenge,

      scope: SCOPES,
    });

  window.location.href =
    `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code
) {
  const codeVerifier =
    localStorage.getItem(
      "spotify_code_verifier"
    );

  if (!codeVerifier) {
    throw new Error(
      "Missing Spotify code verifier. Please log in again."
    );
  }

  const body =
    new URLSearchParams({
      client_id: CLIENT_ID,

      grant_type:
        "authorization_code",

      code,

      redirect_uri: REDIRECT_URI,

      code_verifier: codeVerifier,
    });

  const response =
    await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body,
      }
    );

  if (!response.ok) {
    const error =
      await response.text();

    throw new Error(
      `Spotify token request failed (${response.status}): ${error}`
    );
  }

  const data =
    await response.json();

  localStorage.setItem(
    "spotify_access_token",
    data.access_token
  );

  if (data.refresh_token) {
    localStorage.setItem(
      "spotify_refresh_token",
      data.refresh_token
    );
  }

  localStorage.setItem(
    "spotify_expires_at",
    String(
      Date.now() +
        data.expires_in * 1000
    )
  );

  return data.access_token;
}

export function getAccessToken() {
  return localStorage.getItem(
    "spotify_access_token"
  );
}

export function logout() {
  localStorage.removeItem(
    "spotify_access_token"
  );

  localStorage.removeItem(
    "spotify_refresh_token"
  );

  localStorage.removeItem(
    "spotify_expires_at"
  );

  localStorage.removeItem(
    "spotify_code_verifier"
  );
}