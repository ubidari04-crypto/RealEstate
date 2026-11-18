import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

import { useAuth } from "./AuthContext";
import { io } from "socket.io-client";
import API_URL from "../config";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, token } = useAuth();

  const [socket, setSocket] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const activeChatRef = useRef(null);

  // Keep active chat reference updated
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Reset chat state when the logged-in user changes
  useEffect(() => {
    setActiveChat(null);
    setNotifications([]);
  }, [user?._id]);

  // Socket connection
  useEffect(() => {
    if (!token || !user?._id) {
      setSocket(null);
      return;
    }

    const newSocket = io(API_URL, {
      auth: {
        token,
      },
    });

    setSocket(newSocket);

    // Receive messages for notifications
    const handleReceiveMessage = (data) => {
      if (activeChatRef.current?._id?.toString() !== data.chatId?.toString()) {
        setNotifications((prev) => {
          const alreadyExists = prev.some(
            (notification) => notification._id === data._id
          );

          if (alreadyExists) return prev;

          return [...prev, data];
        });
      }
    };

    newSocket.on("receiveMessage", handleReceiveMessage);

    newSocket.on("connect_error", (error) => {
      console.error("Chat socket connection error:", error.message);
    });

    return () => {
      newSocket.off("receiveMessage", handleReceiveMessage);
      newSocket.disconnect();
      setSocket(null);
    };
  }, [token, user?._id]);

  // Join a chat room
  const joinChat = useCallback((chatId) => {
  if (socket?.connected && chatId) {
    socket.emit("joinChat", chatId);
  }
}, [socket]);

const sendMessage = useCallback((
  chatId,
  text,
  messageId = null,
  createdAt = new Date(),
  image = null
) => {
  if (!socket?.connected || !user) {
    console.error("Socket is not connected.");
    return null;
  }

  const messageData = {
    chatId,
    sender: user._id,
    text: text || "",
    image: image || "",
    createdAt,
    _id: messageId,
  };

  socket.emit("sendMessage", messageData);

  return messageData;
}, [socket, user]);
  return (
    <ChatContext.Provider
      value={{
        socket,
        activeChat,
        setActiveChat,
        joinChat,
        sendMessage,
        notifications,
        setNotifications,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
