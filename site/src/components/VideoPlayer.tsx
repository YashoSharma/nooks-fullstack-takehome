import { Box, Button } from "@mui/material";
import React, { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ReactPlayer from "react-player";
import { v4 as uuidv4 } from "uuid";

interface VideoPlayerProps {
  url: string;
  sessionId: string;
  hideControls?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, hideControls }) => {
  const { sessionId } = useParams();
  const [hasJoined, setHasJoined] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const player = useRef<ReactPlayer>(null);
  const ws = new WebSocket('ws://localhost:3002/')
  const clientId = uuidv4();

  ws.onmessage = (event) => {
    if (player.current) {
      const msg = JSON.parse(event.data);
      if(msg.type === 'seek') {
        // There is an interesting interaction where updates from one client
        // Will cause another client to trigger updates because handleplay is called
        // when you change the current video time, not just when the video resumes from 
        // an unpaused state. 
        // To avoid the connections echoing updates into each other we check to see if the
        // Update is meaningful enough to use
        setPlaying(msg.playing);
        if(Math.abs(player.current?.getCurrentTime() - msg.seekIdx) >= 0.3) { 
          player.current.seekTo(msg.seekIdx);
        }
      }
    }
  };

  const initWatchSession = () => {
    ws.send(JSON.stringify({
      'type': 'init',
      'clientId': clientId,
      'sessionId': sessionId,
      'syncTime': Date.now()
    }));

    setHasJoined(true);
  }

  const handleReady = () => {
    setIsReady(true);
  };

  const handleEnd = () => {
    console.log("Video ended");
  };

  const handleSeek = (seconds: number) => {
    console.log(
      "This never prints because seek decetion doesn't work: ",
      seconds
    );
  };

  const handlePlay = () => {
    console.log(
      "User played video at time: ",
      player.current?.getCurrentTime()
    );

    ws.send(JSON.stringify({
      'type': 'seek',
      'clientId': clientId,
      'sessionId': sessionId,
      'seekIdx': player.current?.getCurrentTime(),
      'playing': true,
      'syncTime': Date.now()
    }));
    setPlaying(true);
  };

  const handlePause = () => {
    console.log(
      "User paused video at time: ",
      player.current?.getCurrentTime()
    );

    ws.send(JSON.stringify({
      'type': 'seek',
      'clientId': clientId,
      'sessionId': sessionId,
      'seekIdx': player.current?.getCurrentTime(),
      'playing': false,
      'syncTime': Date.now()
    }));
    setPlaying(false);
  };

  const handleBuffer = () => {
    ws.send(JSON.stringify({
      'type': 'seek',
      'clientId': clientId,
      'sessionId': sessionId,
      'seekIdx': player.current?.getCurrentTime(),
      'playing': playing,
      'syncTime': Date.now()
    }));
    console.log("Video buffered");
  };

  const handleProgress = (state: {
    played: number;
    playedSeconds: number;
    loaded: number;
    loadedSeconds: number;
  }) => {
    console.log("Video progress: ", state);
  };

  return (
    <Box
      width="100%"
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <Box
        width="100%"
        height="100%"
        display={hasJoined ? "flex" : "none"}
        flexDirection="column"
      >
        <ReactPlayer
          ref={player}
          url={url}
          playing={hasJoined && playing}
          controls={!hideControls}
          onReady={handleReady}
          onEnded={handleEnd}
          onSeek={handleSeek}
          onPlay={handlePlay}
          onPause={handlePause}
          onBuffer={handleBuffer}
          onProgress={handleProgress}
          width="100%"
          height="100%"
          style={{ pointerEvents: hideControls ? "none" : "auto" }}
        />
      </Box>
      {!hasJoined && isReady && (
        // Youtube doesn't allow autoplay unless you've interacted with the page already
        // So we make the user click "Join Session" button and then start playing the video immediately after
        // This is necessary so that when people join a session, they can seek to the same timestamp and start watching the video with everyone else
        <Button
          variant="contained"
          size="large"
          onClick={initWatchSession}
        >
          Watch Session
        </Button>
      )}
    </Box>
  );
};

export default VideoPlayer;
