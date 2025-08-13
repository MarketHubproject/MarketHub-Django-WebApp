/**
 * Chat Context Provider
 * Provides Stream Chat context and state management for the entire app
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Alert } from "react-native";
import { StreamChat, Channel, Event } from "stream-chat";
import { streamChatService, ChatUser } from "../services/streamChatService";
import { useIsAuthenticated } from "../shared/stores/authStore";

interface ChatContextType {
  // Stream Chat client
  client: StreamChat | null;

  // Current user and connection state
  currentUser: ChatUser | null;
  isConnected: boolean;
  isConnecting: boolean;

  // Support channel management
  supportChannel: Channel | null;
  unreadCount: number;

  // Methods
  initializeChat: (user: ChatUser, token: string) => Promise<boolean>;
  disconnectChat: () => Promise<void>;
  createSupportChannel: () => Promise<Channel | null>;
  markChannelAsRead: () => Promise<void>;

  // Error state
  error: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // State management
  const [client, setClient] = useState<StreamChat | null>(null);
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [supportChannel, setSupportChannel] = useState<Channel | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Get authentication state
  const isAuthenticated = useIsAuthenticated();

  // Initialize chat when user is authenticated
  const initializeChat = useCallback(
    async (user: ChatUser, token: string): Promise<boolean> => {
      try {
        setIsConnecting(true);
        setError(null);

        // Initialize Stream Chat service
        const chatClient = streamChatService.initialize();

        // Connect user
        await streamChatService.connectUser(user, token);

        setClient(chatClient);
        setCurrentUser(user);
        setIsConnected(true);

        console.log("Chat initialized successfully for user:", user.id);
        return true;
      } catch (err) {
        console.error("Failed to initialize chat:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize chat"
        );
        return false;
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  // Disconnect chat
  const disconnectChat = useCallback(async (): Promise<void> => {
    try {
      await streamChatService.disconnectUser();
      setClient(null);
      setCurrentUser(null);
      setIsConnected(false);
      setSupportChannel(null);
      setUnreadCount(0);
      setError(null);

      console.log("Chat disconnected successfully");
    } catch (err) {
      console.error("Failed to disconnect chat:", err);
    }
  }, []);

  // Create or get support channel
  const createSupportChannel =
    useCallback(async (): Promise<Channel | null> => {
      try {
        if (!client || !currentUser) {
          throw new Error("Chat not initialized");
        }

        setError(null);

        // Generate unique channel ID for this user's support request
        const channelId = streamChatService.generateSupportChannelId(
          currentUser.id
        );

        // Create support channel with current user
        const channel = await streamChatService.createSupportChannel(
          channelId,
          [currentUser.id]
        );

        // Set up event listeners for the channel
        channel.on("message.new", (event: Event) => {
          // Update unread count if message is from someone else
          if (event.user?.id !== currentUser.id) {
            setUnreadCount((prev) => prev + 1);
          }
        });

        channel.on("member.added", (event: Event) => {
          console.log(
            "Member added to support channel:",
            event.member?.user?.name
          );
        });

        channel.on("member.removed", (event: Event) => {
          console.log(
            "Member removed from support channel:",
            event.member?.user?.name
          );
        });

        setSupportChannel(channel);

        // Send initial bot message
        await channel.sendMessage({
          text: "Hello! How can I help you today? You can browse our FAQ articles or chat with one of our support agents.",
          user: {
            id: "markethub-bot",
            name: "MarketHub Assistant",
            image: undefined,
          },
        });

        console.log("Support channel created:", channelId);
        return channel;
      } catch (err) {
        console.error("Failed to create support channel:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create support channel"
        );
        return null;
      }
    }, [client, currentUser]);

  // Mark channel as read
  const markChannelAsRead = useCallback(async (): Promise<void> => {
    try {
      if (supportChannel) {
        await supportChannel.markRead();
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark channel as read:", err);
    }
  }, [supportChannel]);

  // Auto-disconnect when user logs out
  useEffect(() => {
    if (!isAuthenticated && isConnected) {
      disconnectChat();
    }
  }, [isAuthenticated, isConnected, disconnectChat]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnectChat();
      }
    };
  }, [isConnected, disconnectChat]);

  // Handle connection errors
  useEffect(() => {
    if (client) {
      const handleConnectionChanged = (event: Event) => {
        if (event.online === false) {
          setError("Connection lost. Please check your internet connection.");
        } else if (event.online === true && error) {
          setError(null);
        }
      };

      client.on("connection.changed", handleConnectionChanged);

      return () => {
        client.off("connection.changed", handleConnectionChanged);
      };
    }
  }, [client, error]);

  // Auto-retry connection on network recovery
  useEffect(() => {
    if (error && error.includes("Connection lost") && currentUser) {
      const retryTimer = setTimeout(() => {
        console.log("Attempting to reconnect...");
        // In a real app, you would get a fresh token from your backend
        // initializeChat(currentUser, 'fresh-token');
      }, 5000);

      return () => clearTimeout(retryTimer);
    }
  }, [error, currentUser, initializeChat]);

  const contextValue: ChatContextType = {
    client,
    currentUser,
    isConnected,
    isConnecting,
    supportChannel,
    unreadCount,
    initializeChat,
    disconnectChat,
    createSupportChannel,
    markChannelAsRead,
    error,
  };

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};

// Custom hook to use chat context
export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

// Hook for checking if chat is available
export const useChatAvailable = (): boolean => {
  const { isConnected, client } = useChat();
  return isConnected && client !== null;
};

// Hook for getting unread count
export const useChatUnreadCount = (): number => {
  const { unreadCount } = useChat();
  return unreadCount;
};

export default ChatProvider;
