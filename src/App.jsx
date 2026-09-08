import { useEffect, useState, useRef } from "react";
import "./App.css";
import {
  getCurrentUser,
  getPlaylistItems,
  getPlaylists,
  transferPlayback,
  playTrack,
} from "./spotify/api";
import {
  login,
  exchangeCodeForToken,
  getAccessToken,
  logout,
} from "./spotify/auth";
import {
  createPlayer,
  playPause,
  getDeviceID,
} from "./spotify/player";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const tracksRef = useRef([]);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const spotifyError = params.get("error");
        if (spotifyError) {
          throw new Error(`spotify login failed: ${spotifyError}`);
        }
        if (code) {
          console.log("exchanging auth code");
          await exchangeCodeForToken(code);
          window.history.replaceState({}, document.title, "/");
          console.log("authenticated");
        }

        const token = getAccessToken();

        if (!token) {
          setLoggedIn(false);
          setLoading(false);
          return;
        }
        setLoggedIn(true);

        const profile = await getCurrentUser();
        console.log("profile:", profile);
        setUser(profile);

        const playlistData = await getPlaylists();
        console.log("playlists:", playlistData);
        setPlaylists(playlistData.items ?? []);
 
      } catch (error) {
        console.error("Initialization error:", error);
        logout();
        setLoggedIn(false);
      } finally {
        setLoading(false);
      }
    }
    initialize();
  }, []);

  useEffect(() => {
    if (!loggedIn) {
      return;
    }
    let cancelled = false;
    async function initializePlayer() {
      try {
        await createPlayer({
          onReady: async (deviceID) => {
            if (cancelled) {
              return;
            }
            console.log("device id:", deviceID);
            try {
              await transferPlayback(deviceID);
              setPlayerReady(true);
            } catch (error) {
              console.error("playback transfer failed:", error);
            }
          },

          onStateChange: (state) => {
            if (!state) {
              setCurrentTrack(null);
              setIsPlaying(false);
              return;
            }
            const track = state.track_window?.current_track;
            if (!track) {
              return;
            }
            setIsPlaying(!state.paused);
            setCurrentTrack(track);
            const playlistTracks = tracksRef.current;
            const index = playlistTracks.findIndex((item) => item.item?.uri === track.uri);
            if (index !== -1) {
              setCurrentTrackIndex(index);
            }
          },

          onError: (message) => {
            console.error("spotify player error:", message);
          },
        });

      } catch (error) {
        console.error("couldn't initialize player:", error);
      }
    }

    initializePlayer();
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  async function openPlaylist(playlist) {
    setSelectedPlaylist(playlist);
    try {
      const data = await getPlaylistItems(playlist.id);
      setTracks(data.items ?? []);
    } catch (error) {
      console.error("Failed to load playlist:", error);
    }
  }

  async function handleNextTrack() {
    if (!tracks.length || currentTrackIndex === -1) {
      return;
    }
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex >= tracks.length) {
      return;
    }
    const nextItem = tracks[nextIndex];
    const nextTrack = nextItem?.item;
    if (!nextTrack) {
      return;
    }
    await handlePlayTrack(nextTrack);
  }

  async function handlePrevTrack() {
    if (!tracks.length || currentTrackIndex === -1) {
      return;
    }
    const prevIndex = currentTrackIndex - 1;
    if (prevIndex < 0) {
      return;
    }
    const prevItem = tracks[prevIndex];
    const prevTrack = prevItem?.item;
    if (!prevTrack) {
      return;
    }
    await handlePlayTrack(prevTrack);
  }

  async function handlePlayTrack(track) {
    try {
      const deviceID = getDeviceID();
      if (!deviceID) {
        console.error("spotify player not ready");
        return;
      }
      const index = tracksRef.current.findIndex((item) => item.item?.urii === track.uri);
      setCurrentTrack(track);
      if (index !== -1) {
        setCurrentTrackIndex(index);
      }
      setIsPlaying(true);
      await playTrack(track.uri, deviceID);
    } catch (error) {
      console.error("could not play track:", error);
      setisPlaying(false);
    }
  }

  function handleLogout() {
    logout();

    setLoggedIn(false);
    setUser(null);
    setPlaylists([]);
    setTracks([]);
    setSelectedPlaylist(null);
    setCurrentTrack(null);
    setPlayerReady(false);

    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="app">
        <h1>spotify player</h1>
        <p>gimme a sec...</p>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="app">
        <h1>spotify player</h1>
        <button onClick={login}>
          log in
        </button>
      </div>
    );
  }

  return (
    <div className="app">

      <h1>spotify player</h1>

      {user && (
        <h2>hi baby &lt;3</h2>
      )}

      {currentTrack && (
        <div className="now-playing">

          {currentTrack.album?.images?.[0]?.url && (
            <img
              src={currentTrack.album.images[0].url}
              alt=""
              width="100"
            />
          )}

          <h2>{currentTrack.name}</h2>
          <p>
            {currentTrack.artists.map((artist) => artist.name).join(", ")}
          </p>
        </div>
      )}

      <div className="controls">
        <button onClick={handlePrevTrack} disabled={!playerReady || currentTrackIndex <= 0}>
          ◀◀
        </button>
        <button onClick={playPause} disabled={!playerReady}>
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <button onClick={handleNextTrack} disabled={!playerReady || currentTrackIndex === -1 || currentTrackIndex >= tracks.length - 1}>
          ▶▶
        </button>
      </div>

      <h2>playlists:</h2>
      <div className="playlists">
        {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="playlist"
              onClick={() => openPlaylist(playlist)}
            >

              {playlist.images?.[0]?.url && (
                <img src={playlist.images[0].url}
                  alt=""
                  width="150"
                />
              )}

              <h3>{playlist.name}</h3>
            </div>
          )
        )}
      </div>

      {selectedPlaylist && (
        <div className="track-list">
          <h2>{selectedPlaylist.name}</h2>
          {tracks.map(
            (item, index) => {const track = item.item;

              return (
                <div key={`${track.id}-${index}`}
                  className="track"
                  onClick={() => handlePlayTrack(track)}
                >

                  {track.album?.images?.[0]?.url && (
                    <img src={track.album.images[0].url}
                      alt=""
                      width="60"
                    />
                  )}

                  <div>
                    <strong>{track.name}</strong>
                    <p>
                      {track.artists?.map((artist) => artist.name).join(", ")}
                    </p>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      <button onClick={handleLogout}>log out</button>
    </div>
  );
}

export default App;