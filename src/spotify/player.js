import { getAccessToken } from "./auth";

let player = null;
let deviceID = null;
let sdkReadyPromise = null;

function loadSpotifySDK() {
    if(window.Spotify) {
        return Promise.resolve();
    }
    if (sdkReadyPromise) {
        return sdkReadyPromise;
    }

    sdkReadyPromise = new Promise((resolve, reject) => {
        window.onSpotifyWebPlaybackSDKReady = () => {
            console.log("spotify SDK there u are");
            resolve();
        };

        const script = document.createElement("script");
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        script.onerror = () => {
            reject(
                new Error(
                    "couldn't load sdk :/"
                )
            );
        };
        document.body.appendChild(script);
    });
    return sdkReadyPromise;
}

export async function createPlayer({
    onReady,
    onStateChange,
    onError,
}) {
    await loadSpotifySDK();
    const token = getAccessToken();
    if (!token) {
        throw new Error(
            "no access token"
        );
    }
    if (player) {
        return;
    }
    player = new window.Spotify.Player({
        name: "spotify player",
        getOAuthToken: (callback) => {
            const currentToken = getAccessToken();
            callback(currentToken);
        },
        volume: 0.5,
    });

    player.addListener(
        "ready",
        ({device_id}) => {
            console.log(
                "spotify player ready"
            );
            console.log(
                "device id:",
                device_id
            );
            deviceID = device_id;
            if (onReady) {
                onReady(device_id);
            }
        }
    );

    player.addListener(
        "not_ready",
        ({device_id}) => {
            console.log(
                "spotify player offline",
                device_id
            );
        }
    );

    player.addListener(
        "player_state_changed",
        (state) => {
            if (!state) {
                return;
            }
            console.log(
                "spotify state:", 
                state
            );
            if (onStateChange) {
                onStateChange(state);
            }
        }
    );

    player.addListener(
        "initialization_error",
        ({message}) => {
            console.error(
                "spotify initialization error:",
                message
            );
            if (onError) {
                onError(message);
            }
        }
    );

    player.addListener(
        "authentication_error",
        ({message}) => {
            console.error(
                "authentication error",
                message
            );
            if (onError) {
                onError(message);
            }
        }
    );

    player.addListener(
        "account_error",
        ({message}) => {
            console.error(
                "spotify account error",
                message
            );
            if (onError) {
                onError(message);
            }
        }
    );

    player.addListener(
        "playback_error",
        ({message}) => {
            console.error(
                "playback error",
                message
            );
        }
    );

    const connected = await player.connect();
    console.log("player connected:", connected);
    return player;
}

export function getPlayer() {
    return player;
}

export function getDeviceID() {
    return deviceID;
}

export async function playPause() {
    if (!player) {
        console.error("player not ready");
        return;
    }
    await player.togglePlay();
}
