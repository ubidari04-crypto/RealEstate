
import React, { useEffect, useState, useRef } from "react";
import { chatMessagesStyles as s } from "../../assets/dummyStyles";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useLocation } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config";
import Navbar from "../../components/common/Navbar";

import {
  HiChevronLeft,
  HiOutlineChatAlt2,
  HiOutlineTrash,
  HiPaperAirplane,
} from "react-icons/hi";

const ChatMessages = () => {
  const { user, token } = useAuth();
  const location = useLocation();

  const {
    socket,
    activeChat,
    setActiveChat,
    joinChat,
    sendMessage,
  } = useChat();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  // Scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // Fetch conversations
  useEffect(() => {
    let cancelled = false;

    const fetchConversations = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chat/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (cancelled) return;

        const fetchedConversations = res.data || [];

        setConversations(fetchedConversations);

        if (location.state?.chat) {
          const existingChat = fetchedConversations.find(
            (chat) => chat._id === location.state.chat._id
          );

          setActiveChat(existingChat || location.state.chat);
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (token) {
      fetchConversations();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [token, user?._id, location.state, setActiveChat]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeChat?._id) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    setMessages([]);

    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/chat/${activeChat._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!cancelled) {
          setMessages(res.data.messages || []);
        }
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [activeChat?._id, token]);

  // Join the active chat after the socket connects
  useEffect(() => {
    if (!socket || !activeChat?._id) return;

    const handleConnect = () => {
      joinChat(activeChat._id);
    };

    socket.on("connect", handleConnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [socket, activeChat?._id, joinChat]);

  // Receive messages from the other participant
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      if (
        data.chatId?.toString() !== activeChat?._id?.toString()
      ) {
        return;
      }

      setMessages((prev) => {
        const alreadyExists = prev.some(
          (message) => message._id === data._id
        );

        if (alreadyExists) return prev;

        return [...prev, data];
      });

      // Update conversation preview
      setConversations((prev) =>
        prev.map((chat) =>
          chat._id === data.chatId
            ? {
                ...chat,
                messages: [...(chat.messages || []), data],
                updatedAt: new Date().toISOString(),
              }
            : chat
        )
      );
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [socket, activeChat?._id]);

  // Listen for chat errors
  useEffect(() => {
    if (!socket) return;

    const handleChatError = (error) => {
      console.error("Chat error:", error.message);
    };

    socket.on("chatError", handleChatError);

    return () => {
      socket.off("chatError", handleChatError);
    };
  }, [socket]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (activeChat) {
      const timer = setTimeout(scrollToBottom, 100);

      return () => clearTimeout(timer);
    }
  }, [activeChat]);

  // Send a message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    const textToSend = newMessage.trim();

    if (!textToSend || !activeChat || sending) return;

    setSending(true);

    try {
      const res = await axios.post(
        `${API_URL}/api/chat/send`,
        {
          chatId: activeChat._id,
          text: textToSend,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const savedMessage = res.data.newMessage;

      if (savedMessage) {
        // Add the saved message to the sender's own message list
        setMessages((prev) => {
          const alreadyExists = prev.some(
            (message) => message._id === savedMessage._id
          );

          if (alreadyExists) return prev;

          return [...prev, savedMessage];
        });

        // Update the conversation preview
        setConversations((prev) =>
          prev.map((chat) =>
            chat._id === activeChat._id
              ? {
                  ...chat,
                  messages: [
                    ...(chat.messages || []),
                    savedMessage,
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : chat
          )
        );

        // Notify the other participant through Socket.IO
        sendMessage(
          activeChat._id,
          savedMessage.text,
          savedMessage._id,
          savedMessage.createdAt,
          savedMessage.image
        );

        setNewMessage("");
      }
    } catch (err) {
      console.error("Error sending message:", err);

      alert(
        err.response?.data?.message ||
        "Unable to send message. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  // Delete an entire conversation
  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this conversation?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/chat/${chatId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setConversations((prev) =>
        prev.filter((chat) => chat._id !== chatId)
      );

      if (activeChat?._id === chatId) {
        setActiveChat(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error deleting chat:", err);

      alert(
        err.response?.data?.message ||
        "Unable to delete conversation."
      );
    }
  };

  // Delete a specific message
  const handleDeleteMessage = async (chatId, messageId) => {
    if (!window.confirm("Delete this message?")) return;

    try {
      const res = await axios.delete(
        `${API_URL}/api/chat/${chatId}/message/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessages(res.data.chat.messages || []);

      setConversations((prev) =>
        prev.map((chat) =>
          chat._id === chatId
            ? {
                ...chat,
                messages: (chat.messages || []).filter(
                  (message) => message._id !== messageId
                ),
              }
            : chat
        )
      );
    } catch (err) {
      console.error("Error deleting message:", err);

      alert(
        err.response?.data?.message ||
        "Unable to delete message."
      );
    }
  };

  // Get the other participant
  const getChatPartner = (chat) => {
    if (!user || !chat) return null;

    const buyerId = chat.buyer?._id || chat.buyer;

    return user._id === buyerId ? chat.seller : chat.buyer;
  };

  if (loading) {
    return (
      <div className={s.loaderFullPage}>
        <div className={s.loader}></div>
      </div>
    );
  }

  return (
    <div
      className={`${s.chatContainer} ${
        user?.role === "seller"
          ? s.chatContainerSeller
          : s.chatContainerNonSeller
      }`}
    >
      {user?.role !== "seller" && <Navbar />}

      <div className={s.chatWrapper}>
        {/* Conversation sidebar */}
        <div
          className={`${s.sidebar} ${
            activeChat ? s.sidebarHidden : ""
          }`}
        >
          <div className={s.sidebarHeader}>
            <h2 className={s.sidebarTitle}>Message</h2>
          </div>

          <div className={s.sidebarContent}>
            {conversations.length === 0 ? (
              <div className={s.emptyConversations}>
                <HiOutlineChatAlt2 className={s.emptyIcon} />
                <p>No conversation yet</p>
              </div>
            ) : (
              conversations.map((chat) => (
                <div
                  key={chat._id}
                  className={`${s.conversationItem} ${
                    activeChat?._id === chat._id
                      ? s.conversationItemActive
                      : ""
                  }`}
                  onClick={() => setActiveChat(chat)}
                >
                  <div className={s.avatar}>
                    {getChatPartner(chat)?.profilePic ? (
                      <img
                        src={getChatPartner(chat).profilePic}
                        className={s.avatarImg}
                        alt=""
                      />
                    ) : (
                      getChatPartner(chat)?.name?.charAt(0)
                    )}
                  </div>

                  <div className={s.conversationInfo}>
                    <div className={s.conversationName}>
                      {getChatPartner(chat)?.name}
                    </div>

                    <div className={s.conversationPreview}>
                      {(chat.messages || []).at(-1)?.text ||
                        "Started a conversation"}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteChat(e, chat._id)}
                    className={s.deleteChatButton}
                    title="Delete Conversation"
                  >
                    <HiOutlineTrash />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className={s.chatArea}>
          {activeChat ? (
            <>
              <div className={s.chatHeader}>
                <div className={s.chatHeaderLeft}>
                  <button
                    className={s.backButton}
                    onClick={() => setActiveChat(null)}
                  >
                    <HiChevronLeft size={24} />
                  </button>

                  <div className={s.avatar}>
                    {getChatPartner(activeChat)?.profilePic ? (
                      <img
                        className={s.avatarImg}
                        src={getChatPartner(activeChat).profilePic}
                        alt=""
                      />
                    ) : (
                      getChatPartner(activeChat)?.name?.charAt(0)
                    )}
                  </div>

                  <div className={s.chatPartnerName}>
                    {getChatPartner(activeChat)?.name}
                  </div>
                </div>
              </div>

              <div className={s.messagesArea}>
                {messages.map((msg, idx) => (
                  <div
                    key={msg._id || idx}
                    className={`${s.messageBubble} ${
                      (msg.sender?._id || msg.sender)?.toString() ===
                      user?._id?.toString()
                        ? s.messageOwn
                        : s.messageOther
                    }`}
                  >
                    <div className={s.messageContent}>
                      {msg.image && (
                        <div className={s.messageImageWrapper}>
                          <img
                            src={msg.image}
                            alt="Message attachment"
                            className={s.messageImage}
                          />
                        </div>
                      )}

                      {msg.text && (
                        <div className={s.messageText}>
                          {msg.text}
                        </div>
                      )}

                      {(msg.sender?._id || msg.sender)?.toString() ===
                        user?._id?.toString() && (
                        <button
                          className={s.deleteMessageButton}
                          onClick={() =>
                            handleDeleteMessage(
                              activeChat._id,
                              msg._id
                            )
                          }
                          title="Delete Message"
                        >
                          <HiOutlineTrash size={14} />
                        </button>
                      )}
                    </div>

                    <span className={s.messageTime}>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>

              <form
                className={s.messageForm}
                onSubmit={handleSendMessage}
              >
                <input
                  type="text"
                  className={s.messageInput}
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                />

                <button
                  type="submit"
                  className={s.sendButton}
                  disabled={sending || !newMessage.trim()}
                >
                  <HiPaperAirplane className={s.sendIcon} />
                </button>
              </form>
            </>
          ) : (
            <div className={s.noChatSelected}>
              <HiOutlineChatAlt2 className={s.noChatIcon} />
              <h3 className={s.noChatTitle}>Your Messages</h3>
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessages;
