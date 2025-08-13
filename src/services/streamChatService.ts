/**
 * Stream Chat Service
 * Handles Stream Chat client configuration, user authentication, and channel management
 */

import {
  StreamChat,
  Channel,
  ChannelData,
  ChannelMemberResponse,
  User,
} from "stream-chat";
import Config from "react-native-config";

export interface ChatUser {
  id: string;
  name: string;
  email?: string;
  image?: string;
  role?: "user" | "admin" | "agent";
}

export interface ChatChannel {
  id: string;
  type: "messaging" | "support";
  name?: string;
  members: string[];
  data?: ChannelData;
}

class StreamChatService {
  private client: StreamChat | null = null;
  private currentUser: ChatUser | null = null;
  private channels: Map<string, Channel> = new Map();

  // Stream Chat API key - From environment variables
  private readonly API_KEY =
    Config.STREAM_CHAT_API_KEY || "your-stream-chat-api-key";

  /**
   * Initialize Stream Chat client
   */
  initialize(): StreamChat {
    if (!this.client) {
      this.client = StreamChat.getInstance(this.API_KEY);
    }
    return this.client;
  }

  /**
   * Connect user to Stream Chat
   * @param user - User information
   * @param token - User token from your backend
   */
  async connectUser(user: ChatUser, token: string): Promise<void> {
    try {
      if (!this.client) {
        this.initialize();
      }

      const streamUser: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role || "user",
      };

      await this.client!.connectUser(streamUser, token);
      this.currentUser = user;

      console.log("User connected to Stream Chat:", user.id);
    } catch (error) {
      console.error("Failed to connect user to Stream Chat:", error);
      throw error;
    }
  }

  /**
   * Disconnect current user from Stream Chat
   */
  async disconnectUser(): Promise<void> {
    try {
      if (this.client && this.currentUser) {
        await this.client.disconnectUser();
        this.currentUser = null;
        this.channels.clear();
        console.log("User disconnected from Stream Chat");
      }
    } catch (error) {
      console.error("Failed to disconnect user from Stream Chat:", error);
    }
  }

  /**
   * Create or get a support channel
   * @param channelId - Unique channel identifier
   * @param members - Array of user IDs to add to the channel
   */
  async createSupportChannel(
    channelId: string,
    members: string[]
  ): Promise<Channel> {
    try {
      if (!this.client) {
        throw new Error("Stream Chat client not initialized");
      }

      // Check if channel already exists in cache
      if (this.channels.has(channelId)) {
        return this.channels.get(channelId)!;
      }

      const channel = this.client.channel("messaging", channelId, {
        name: `Support Chat - ${channelId}`,
        members: members,
        created_by_id: this.currentUser?.id || "system",
      });

      await channel.create();
      this.channels.set(channelId, channel);

      console.log("Support channel created:", channelId);
      return channel;
    } catch (error) {
      console.error("Failed to create support channel:", error);
      throw error;
    }
  }

  /**
   * Get user's chat history (channels)
   */
  async getUserChannels(): Promise<Channel[]> {
    try {
      if (!this.client || !this.currentUser) {
        return [];
      }

      const filter = { members: { $in: [this.currentUser.id] } };
      const sort = { last_message_at: -1 };
      const options = { limit: 20, state: true, watch: false };

      const channels = await this.client.queryChannels(filter, sort, options);
      return channels;
    } catch (error) {
      console.error("Failed to get user channels:", error);
      return [];
    }
  }

  /**
   * Add agent to support channel
   * @param channelId - Channel ID
   * @param agentId - Agent user ID
   */
  async addAgentToChannel(channelId: string, agentId: string): Promise<void> {
    try {
      const channel = this.channels.get(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      await channel.addMembers([agentId]);
      console.log("Agent added to channel:", channelId, agentId);
    } catch (error) {
      console.error("Failed to add agent to channel:", error);
      throw error;
    }
  }

  /**
   * Send a message to a channel
   * @param channelId - Channel ID
   * @param message - Message text
   * @param attachments - Optional attachments
   */
  async sendMessage(
    channelId: string,
    message: string,
    attachments?: any[]
  ): Promise<void> {
    try {
      const channel = this.channels.get(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }

      await channel.sendMessage({
        text: message,
        attachments: attachments || [],
      });

      console.log("Message sent to channel:", channelId);
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    }
  }

  /**
   * Watch a channel for real-time updates
   * @param channelId - Channel ID
   */
  async watchChannel(channelId: string): Promise<Channel> {
    try {
      let channel = this.channels.get(channelId);

      if (!channel) {
        if (!this.client) {
          throw new Error("Stream Chat client not initialized");
        }

        channel = this.client.channel("messaging", channelId);
        this.channels.set(channelId, channel);
      }

      await channel.watch();
      console.log("Watching channel:", channelId);
      return channel;
    } catch (error) {
      console.error("Failed to watch channel:", error);
      throw error;
    }
  }

  /**
   * Stop watching a channel
   * @param channelId - Channel ID
   */
  async stopWatchingChannel(channelId: string): Promise<void> {
    try {
      const channel = this.channels.get(channelId);
      if (channel) {
        await channel.stopWatching();
        console.log("Stopped watching channel:", channelId);
      }
    } catch (error) {
      console.error("Failed to stop watching channel:", error);
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): ChatUser | null {
    return this.currentUser;
  }

  /**
   * Get Stream Chat client instance
   */
  getClient(): StreamChat | null {
    return this.client;
  }

  /**
   * Get channel by ID
   */
  getChannel(channelId: string): Channel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Generate a unique channel ID for support
   */
  generateSupportChannelId(userId: string): string {
    const timestamp = Date.now();
    return `support-${userId}-${timestamp}`;
  }

  /**
   * Check if user is connected
   */
  isConnected(): boolean {
    return this.client?.user != null;
  }
}

// Export singleton instance
export const streamChatService = new StreamChatService();
export default streamChatService;
