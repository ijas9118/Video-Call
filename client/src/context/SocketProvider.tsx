import { createContext, useContext, useMemo } from "react";
import { Socket, io } from "socket.io-client";
import { ReactNode } from "react";

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};

export const SocketProvider = (props: { children: ReactNode }) => {
  const socket = useMemo(() => io("172.16.3.250:3000"), []);

  return <SocketContext.Provider value={socket}>{props.children}</SocketContext.Provider>;
};
