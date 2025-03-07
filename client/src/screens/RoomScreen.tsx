import { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/SocketProvider";
import ReactPlayer from "react-player";
import peer from "../service/peer";

const RoomScreen = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState("");
  const [myStream, setMyStream] = useState<MediaStream | undefined>(undefined);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const sendStreams = useCallback(() => {
    const peerConnection = peer.getPeer();
    if (!peerConnection) return; // Prevent null errors

    if (myStream) {
      for (const track of myStream.getTracks()) {
        peerConnection.addTrack(track, myStream);
      }
    }
  }, [myStream]);

  const handleUserJoin = ({ email, id }: { email: string; id: string }) => {
    console.log(`User with ${email} id joined, ${id}`);
    setRemoteSocketId(id);
  };

  const handleCallUser = useCallback(async () => {
    try {
      console.log(navigator.mediaDevices?.getUserMedia);

      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

        const offer = await peer.getOffer();
        socket?.emit("user:call", { to: remoteSocketId, offer });
        setMyStream(stream);
      } else {
        throw new Error("Media devices API is not supported in this environment.");
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }: { from: string; offer: any }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      const ans = await peer.getAnswer(offer);
      socket?.emit("call:accepted", { to: from, ans });
    },
    []
  );

  const handleCallAccepted = useCallback(
    ({ ans }: { ans: RTCSessionDescriptionInit }) => {
      peer.setLocalDescription(ans);
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket?.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const ans = await peer.getAnswer(offer);
      socket?.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(
    async ({ ans }: { ans: RTCSessionDescriptionInit }) => {
      await peer.setLocalDescription(ans);
    },
    []
  );

  useEffect(() => {
    const peerConnection = peer.getPeer();
    if (!peerConnection) return;

    peerConnection.addEventListener("negotiationneeded", handleNegoNeeded);

    return () => {
      peerConnection.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  useEffect(() => {
    const peerConnection = peer.getPeer();
    if (!peerConnection) return;

    const handleTrackEvent = (ev: RTCTrackEvent) => {
      const remoteStream = ev.streams[0];
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream);
    };

    peerConnection.addEventListener("track", handleTrackEvent);

    return () => {
      peerConnection.removeEventListener("track", handleTrackEvent);
    };
  }, []);

  useEffect(() => {
    socket?.on("user:joined", handleUserJoin);
    socket?.on("incomming:call", handleIncommingCall);
    socket?.on("call:accepted", handleCallAccepted);
    socket?.on("peer:nego:needed", handleNegoNeedIncomming);
    socket?.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket?.off("user:joined", handleUserJoin);
      socket?.off("incomming:call", handleIncommingCall);
      socket?.off("call:accepted", handleCallAccepted);
      socket?.off("peer:nego:needed", handleNegoNeedIncomming);
      socket?.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoin,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  useEffect(() => {
    return () => {
      myStream?.getTracks().forEach((track) => track.stop());
    };
  }, [myStream]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h2 className="text-xl font-semibold mb-4">Room</h2>
      <h3 className="text-gray-700 mb-4">
        {remoteSocketId ? "Connected" : "No one in room"}
      </h3>

      {myStream && <button onClick={sendStreams}>Send Stream</button>}

      {remoteSocketId && (
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
          onClick={handleCallUser}
        >
          Call
        </button>
      )}

      {myStream && (
        <div className="mt-6">
          <h1>My Stream</h1>
          <ReactPlayer playing muted height="300px" width="500px" url={myStream} />
        </div>
      )}

      {remoteStream && (
        <div className="mt-6">
          <h1>Remote Stream</h1>
          <ReactPlayer playing muted height="300px" width="500px" url={remoteStream} />
        </div>
      )}
    </div>
  );
};

export default RoomScreen;
