import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { createClient, SupabaseClient } from "@supabase/supabase-js"

// =====================================================
// CONFIGURATION
// =====================================================

const PORT = parseInt(Deno.env.get("PORT") || "3001")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") || "";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("SUPABASE_URL:", SUPABASE_URL);
  console.error("SUPABASE_SERVICE_KEY:", SUPABASE_SERVICE_KEY);
  throw new Error("Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_KEY");
}
// Initialize Supabase client with service role key (full access)
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// =====================================================
// TYPE DEFINITIONS
// =====================================================
interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string | null;
  status: string | null
  is_online: boolean;
  last_seen: string | null;
  created_at: string;
}

interface Room {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  room_id: string;
  conversation_id: string | null;
  content: string | null;
  message_type: "text" | "image" | "video" | "file" | "audio" | "system";
  media_url: string | null;
  media_type: string | null;
  media_name: string | null;
  media_size: number | null;
  reply_to: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  sender?: Profile;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  profile?: Profile;
}

interface TypingData {
  chatId: string;
  chatType: "room" | "conversation";
  isTyping: boolean;
}

interface SendMessageData {
  content: string;
  chatId: string;
  chatType: "room" | "conversation";
  messageType?: Message["message_type"];
  mediaUrl?: string;
  mediaType?: string;
  mediaName?: string;
  mediaSize?: number;
  replyTo?: string;
}

const connectedUsers: Map<string, {
  userId: string;
  username: string;
  rooms: Set<string>;
}> = new Map()


const userSocketMap: Map<string, string> = new Map()

const verifyToken = async (token: string): Promise<{ userId: string } | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error("Token verification failed:", error?.message);
      return null;
    }

    return { userId: user.id };
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}


const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error) {
    console.error("Get profile error:", error.message);
    return null;
  }

  return data as Profile
}

const updateProfile = async (userId: string, updates: Partial<Profile>): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Update profile error:", error.message);
    return null;
  }
  return data;
}


const searchUsers = async (query: string, excludeUserId?: string): Promise<Profile[]> => {
  let queryBuilder = supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);

  if (excludeUserId) {
    queryBuilder = queryBuilder.neq("id", excludeUserId)
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("Search users error:", error.message);
    return [];
  }

  return data || [];
}

const setUserOnlineStatus = async (userId: string, isOnline: boolean): Promise<void> => {
  await supabase
    .from("profiles")
    .update({
      is_online: isOnline,
      last_seen: isOnline ? null : new Date().toISOString()
    })
    .eq("id", userId);
}

const createRoom = async (userId: string, name: string, description?: string, isPrivate = false): Promise<Room | null> => {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      name,
      description,
      is_private: isPrivate,
      created_by: userId,
    })
    .select()
    .single();

  if (roomError) {
    console.error("Create room error:", roomError.message);
    return null;
  }

  // Add creator as member with "creator" role (highest privilege)
  await supabase.from("room_members").insert({
    room_id: room.id,
    user_id: userId,
    role: "creator",
  })

  return room

}


const searchRooms = async (query: string): Promise<Room[]> => {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .ilike("name", `%${query}%`)
    .eq("is_private", false)
    .limit(20)

  if (error) {
    console.error("Search rooms error:", error.message);
    return [];
  }

  return data || [];
}

async function updateRoom(
  userId: string,
  roomId: string,
  updates: { name?: string; description?: string; avatar_url?: string }
): Promise<{ success: boolean; room?: Room; error?: string }> {
  // Check if user is admin/creator
  const isAdmin = await isRoomAdminOrCreator(userId, roomId);
  if (!isAdmin) {
    return { success: false, error: "Only room admins can edit room details" };
  }

  // Build update object with only provided fields
  const updateData: Record<string, string> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.avatar_url !== undefined) updateData.avatar_url = updates.avatar_url;

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "No updates provided" };
  }

  const { data, error } = await supabase
    .from("rooms")
    .update(updateData)
    .eq("id", roomId)
    .select()
    .single();

  if (error) {
    console.error("Update room error:", error.message);
    return { success: false, error: "Failed to update room" };
  }

  return { success: true, room: data as Room };
}

const joinRoom = async (userId: string, roomId: string): Promise<boolean> => {
  const { error } = await supabase.from("room_members").insert({
    room_id: roomId,
    user_id: userId,
    role: "member",
  })

  if (error) {
    console.error("Join room error:", error.message);
    return false;
  }

  return true;
}

const leaveRoom = async (userId: string, roomId: string): Promise<boolean> => {
  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId)

  if (error) {
    console.error("Leave room error:", error.message);
    return false;
  }

  return true;
}

const getUserRooms = async (userId: string): Promise<Room[]> => {
  const { data, error } = await supabase
    .from("room_members")
    .select(`
      room_id,
      role,
      rooms (*)
      `)
    .eq("user_id", userId);

  if (error) {
    console.error("Get user rooms error:", error.message);
    return [];
  }

  return data?.map((rm: any) => ({
    ...rm.rooms,
    userRole: rm.role
  })) || []
}


async function getRoomMembers(roomId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId);

  if (error) {
    console.error("Get room members error:", error.message);
    return [];
  }

  return data?.map((rm: any) => rm.user_id) || [];
}

async function getUserRoleInRoom(userId: string, roomId: string): Promise<string | null> {
  // First check room_members table
  const { data, error } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .single();

  if (!error && data?.role) {
    return data.role;
  }

  // Fallback: check if user is the room creator (for legacy rooms)
  const { data: roomData } = await supabase
    .from("rooms")
    .select("created_by")
    .eq("id", roomId)
    .single();

  if (roomData?.created_by === userId) {
    // User is creator but role wasn't set correctly - fix it
    await supabase
      .from("room_members")
      .upsert({
        room_id: roomId,
        user_id: userId,
        role: "creator",
      }, { onConflict: "room_id,user_id" });

    return "creator";
  }

  return data?.role || null;
}

async function isRoomAdminOrCreator(userId: string, roomId: string): Promise<boolean> {
  const role = await getUserRoleInRoom(userId, roomId);
  return role === "admin" || role === "creator";
}

async function inviteUserToRoom(inviterId: string, inviteeId: string, roomId: string): Promise<{ success: boolean; error?: string }> {
  // Check if inviter is admin/creator
  const isAdmin = await isRoomAdminOrCreator(inviterId, roomId);
  if (!isAdmin) {
    return { success: false, error: "Only room admins can invite users" };
  }

  // Check if user is already a member
  const existingMembers = await getRoomMembers(roomId);
  if (existingMembers.includes(inviteeId)) {
    return { success: false, error: "User is already a member of this room" };
  }

  // Add user to room
  const { error } = await supabase.from("room_members").insert({
    room_id: roomId,
    user_id: inviteeId,
    role: "member",
  });

  if (error) {
    console.error("Invite to room error:", error.message);
    return { success: false, error: "Failed to invite user" };
  }

  return { success: true };
}

async function deleteRoom(userId: string, roomId: string): Promise<{ success: boolean; error?: string }> {
  // Check if user is admin/creator
  const isAdmin = await isRoomAdminOrCreator(userId, roomId);
  if (!isAdmin) {
    return { success: false, error: "Only room admins can delete the room" };
  }

  // Delete all messages in the room
  const { error: messagesError } = await supabase
    .from("messages")
    .delete()
    .eq("room_id", roomId);

  if (messagesError) {
    console.error("Delete room messages error:", messagesError.message);
    return { success: false, error: "Failed to delete room messages" };
  }

  // Delete all room members
  const { error: membersError } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId);

  if (membersError) {
    console.error("Delete room members error:", membersError.message);
    return { success: false, error: "Failed to delete room members" };
  }

  // Delete the room itself
  const { error: roomError } = await supabase
    .from("rooms")
    .delete()
    .eq("id", roomId);

  if (roomError) {
    console.error("Delete room error:", roomError.message);
    return { success: false, error: "Failed to delete room" };
  }

  return { success: true };
}

async function isUserInRoom(userId: string, roomId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("room_members")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .single();

  return !error && !!data;
}

// Conversation operations
async function getOrCreateConversation(userId1: string, userId2: string): Promise<string | null> {
  // Ensure consistent ordering
  const [p1, p2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  // Try to find existing
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_1", p1)
    .eq("participant_2", p2)
    .single();

  if (existing) return existing.id;

  // Create new
  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({ participant_1: p1, participant_2: p2 })
    .select("id")
    .single();

  if (error) {
    console.error("Create conversation error:", error.message);
    return null;
  }
  return newConv.id;
}

async function getUserConversations(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      *,
      participant_1_profile:profiles!conversations_participant_1_fkey(*),
      participant_2_profile:profiles!conversations_participant_2_fkey(*)
    `)
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

  if (error) {
    console.error("Get conversations error:", error.message);
    return [];
  }

  return data?.map((conv: any) => ({
    ...conv,
    other_user: conv.participant_1 === userId
      ? conv.participant_2_profile
      : conv.participant_1_profile,
  })) || [];
}

async function getConversationParticipant(
  userId: string,
  conversationId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("participant_1, participant_2")
    .eq("id", conversationId)
    .single();

  if (error || !data) return null;

  return data.participant_1 === userId ? data.participant_2 : data.participant_1;
}

async function isUserInConversation(userId: string, conversationId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .single();

  return !error && !!data;
}

async function deleteConversation(userId: string, conversationId: string): Promise<boolean> {
  // Verify user is participant
  const isParticipant = await isUserInConversation(userId, conversationId);
  if (!isParticipant) return false;

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  return !error;
}

// Message operations
async function sendMessage(
  senderId: string,
  content: string,
  options: {
    roomId?: string;
    conversationId?: string;
    messageType?: Message["message_type"];
    mediaUrl?: string;
    mediaType?: string;
    mediaName?: string;
    mediaSize?: number;
    replyTo?: string;
  }
): Promise<Message | null> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: senderId,
      content,
      room_id: options.roomId || null,
      conversation_id: options.conversationId || null,
      message_type: options.messageType || "text",
      media_url: options.mediaUrl || null,
      media_type: options.mediaType || null,
      media_name: options.mediaName || null,
      media_size: options.mediaSize || null,
      reply_to: options.replyTo || null,
    })
    .select(`
      *,
      sender:profiles(*)
    `)
    .single();

  if (error) {
    console.error("Send message error:", error.message);
    return null;
  }
  return data;
}

async function getMessages(
  type: "room" | "conversation",
  id: string,
  limit = 50,
  before?: string
): Promise<Message[]> {
  let query = supabase
    .from("messages")
    .select(`
      *,
      sender:profiles(*)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type === "room") {
    query = query.eq("room_id", id);
  } else {
    query = query.eq("conversation_id", id);
  }

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Get messages error:", error.message);
    return [];
  }

  return (data?.reverse() || []) as Message[];
}

// Account management
async function clearUserMessages(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("messages")
    .update({
      content: "[Message deleted]",
      is_deleted: true,
      media_url: null,
    })
    .eq("sender_id", userId);

  return !error;
}

async function deleteUserAccount(userId: string): Promise<boolean> {
  // Delete profile (cascades to related data)
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) {
    console.error("Delete profile error:", profileError.message);
    return false;
  }

  // Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    console.error("Delete auth user error:", authError.message);
    return false;
  }

  return true;
}

// =====================================================
// AI AVATAR GENERATION
// =====================================================

// DiceBear style mappings
const DICEBEAR_STYLES: Record<string, string> = {
  cartoon: "adventurer",
  realistic: "avataaars",
  anime: "lorelei",
  minimalist: "shapes",
};

function generateAvatarUrl(
  seed: string,
  style: "cartoon" | "realistic" | "anime" | "minimalist" = "cartoon"
): string {
  const dicebearStyle = DICEBEAR_STYLES[style] || "adventurer";
  // DiceBear API v7 - generates consistent avatars based on seed
  // Using PNG format instead of SVG for Next.js Image compatibility
  return `https://api.dicebear.com/7.x/${dicebearStyle}/png?seed=${encodeURIComponent(seed)}&size=256`;
}

async function generateAIAvatar(
  prompt: string,
  style: "cartoon" | "realistic" | "anime" | "minimalist" = "cartoon"
): Promise<{ imageUrl: string | null; error: string | null }> {
  try {
    // Use the prompt as a seed for DiceBear - this creates unique but consistent avatars
    const seed = prompt || `avatar_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const imageUrl = generateAvatarUrl(seed, style);

    // Verify the URL works by making a HEAD request
    const response = await fetch(imageUrl, { method: "HEAD" });

    if (!response.ok) {
      return { imageUrl: null, error: "Failed to generate avatar from DiceBear" };
    }

    return { imageUrl, error: null };
  } catch (error) {
    return {
      imageUrl: null,
      error: error instanceof Error ? error.message : "Failed to generate avatar",
    };
  }
}

// =====================================================
// STORAGE OPERATIONS
// =====================================================

async function getSignedUploadUrl(
  userId: string,
  bucket: "avatars" | "media",
  fileName: string
): Promise<{ signedUrl: string; path: string } | null> {
  const path = bucket === "avatars"
    ? `${userId}/avatar_${Date.now()}.${fileName.split('.').pop()}`
    : `${userId}/${Date.now()}_${fileName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) {
    console.error("Get signed URL error:", error.message);
    return null;
  }

  return { signedUrl: data.signedUrl, path };
}

async function getPublicUrl(bucket: string, path: string): Promise<string> {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// =====================================================
// SOCKET.IO SERVER
// =====================================================

const server = createServer();

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  }
})

io.use(async (socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  const verified = await verifyToken(token);

  if (!verified) {
    return next(new Error("Invalid token"));
  }

  const profile = await getProfile(verified.userId);

  if (!profile) {
    return next(new Error("Profile not found"));
  }

  socket.userId = verified.userId;
  socket.username = profile.username;
  socket.profile = profile;

  next();
});

io.on("connection", async (socket: AuthenticatedSocket) => {
  const userId = socket.userId!;
  const username = socket.username!;

  console.log(`User connected: ${username} (${userId})`);

  // Track connected user
  connectedUsers.set(socket.id, { userId, username, rooms: new Set() });
  userSocketMap.set(userId, socket.id);


  // Set user online
  await setUserOnlineStatus(userId, true);

  // Join user to their rooms
  const userRooms = await getUserRooms(userId);
  for (const room of userRooms) {
    socket.join(`room:${room.id}`);
    connectedUsers.get(socket.id)?.rooms.add(room.id);
  }

  // Emit user's data
  socket.emit("authenticated", {
    userId,
    profile: socket.profile,
    rooms: userRooms,
  });

  // ===================================================
  // PROFILE EVENTS
  // ===================================================

  socket.on("get_profile", async (targetUserId: string, callback) => {
    const profile = await getProfile(targetUserId);
    callback({ profile, error: profile ? null : "Profile not found" });
  });

  socket.on("update_profile", async (updates: Partial<Profile>, callback) => {
    const updated = await updateProfile(userId, updates);
    callback({ profile: updated, error: updated ? null : "Update failed" });
  });

  socket.on("search_users", async (query: string, callback) => {
    const users = await searchUsers(query, userId);
    callback({ users });
  });

  // ===================================================
  // ROOM EVENTS
  // ===================================================

  socket.on("create_room", async (data: { name: string; description?: string; isPrivate?: boolean }, callback) => {
    const room = await createRoom(userId, data.name, data.description, data.isPrivate);

    if (room) {
      socket.join(`room:${room.id}`);
      connectedUsers.get(socket.id)?.rooms.add(room.id);
    }

    callback({ room, error: room ? null : "Failed to create room" });
  });

  socket.on("search_rooms", async (query: string, callback) => {
    const rooms = await searchRooms(query);
    callback({ rooms });
  });

  socket.on("join_room", async (roomId: string, callback) => {
    const success = await joinRoom(userId, roomId);

    if (success) {
      socket.join(`room:${roomId}`);
      connectedUsers.get(socket.id)?.rooms.add(roomId);

      // Notify room members
      socket.to(`room:${roomId}`).emit("user_joined_room", {
        roomId,
        user: socket.profile,
      });
    }

    callback({ success, error: success ? null : "Failed to join room" });
  });

  socket.on("leave_room", async (roomId: string, callback) => {
    const success = await leaveRoom(userId, roomId);

    if (success) {
      socket.leave(`room:${roomId}`);
      connectedUsers.get(socket.id)?.rooms.delete(roomId);

      // Notify room members
      socket.to(`room:${roomId}`).emit("user_left_room", {
        roomId,
        user: socket.profile,
      });
    }

    callback({ success, error: success ? null : "Failed to leave room" });
  });

  socket.on("get_rooms", async (callback) => {
    const rooms = await getUserRooms(userId);
    callback({ rooms });
  });

  socket.on("delete_room", async (roomId: string, callback) => {
    const result = await deleteRoom(userId, roomId);

    if (result.success) {
      // Notify all members that the room is deleted
      io.to(`room:${roomId}`).emit("room_deleted", {
        roomId,
        deletedBy: socket.profile,
      });

      // Remove all sockets from the room
      const socketsInRoom = await io.in(`room:${roomId}`).fetchSockets();
      for (const s of socketsInRoom) {
        s.leave(`room:${roomId}`);
      }

      // Clean up local tracking
      connectedUsers.get(socket.id)?.rooms.delete(roomId);
    }

    callback({ success: result.success, error: result.error || null });
  });

  socket.on("get_user_role_in_room", async (roomId: string, callback) => {
    const role = await getUserRoleInRoom(userId, roomId);
    callback({ role });
  });

  socket.on("update_room", async (data: { roomId: string; name?: string; description?: string; avatar_url?: string }, callback) => {
    const result = await updateRoom(userId, data.roomId, {
      name: data.name,
      description: data.description,
      avatar_url: data.avatar_url,
    });

    if (result.success && result.room) {
      // Notify all room members about the update
      io.to(`room:${data.roomId}`).emit("room_updated", {
        room: result.room,
        updatedBy: socket.profile,
      });
    }

    callback({ success: result.success, room: result.room || null, error: result.error || null });
  });

  socket.on("get_room_members", async (roomId: string, callback) => {
    // Get members with their roles
    const { data: memberData, error } = await supabase
      .from("room_members")
      .select("user_id, role")
      .eq("room_id", roomId);

    if (error) {
      console.error("Get room members error:", error.message);
      callback({ members: [] });
      return;
    }

    const members: (Profile & { role?: string })[] = [];

    for (const member of memberData || []) {
      const profile = await getProfile(member.user_id);
      if (profile) {
        members.push({ ...profile, role: member.role });
      }
    }

    // Sort: creator first, then admins, then members
    members.sort((a, b) => {
      const roleOrder: Record<string, number> = { creator: 0, admin: 1, member: 2 };
      return (roleOrder[a.role || 'member'] || 2) - (roleOrder[b.role || 'member'] || 2);
    });

    callback({ members });
  });

  socket.on("invite_to_room", async (data: { roomId: string; userId: string }, callback) => {
    const result = await inviteUserToRoom(userId, data.userId, data.roomId);

    if (result.success) {
      // Get room info to send to invited user
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", data.roomId)
        .single();

      // Notify the invited user if they're online
      const invitedSocketId = userSocketMap.get(data.userId);
      if (invitedSocketId) {
        const invitedSocket = io.sockets.sockets.get(invitedSocketId);
        if (invitedSocket && roomData) {
          invitedSocket.join(`room:${data.roomId}`);
          invitedSocket.emit("room_invitation", {
            room: roomData,
            invitedBy: socket.profile,
          });
        }
      }

      // Notify room members about new member
      const invitedProfile = await getProfile(data.userId);
      socket.to(`room:${data.roomId}`).emit("user_joined_room", {
        roomId: data.roomId,
        user: invitedProfile,
      });
    }

    callback({ success: result.success, error: result.error || null });
  });

  // ===================================================
  // CONVERSATION EVENTS
  // ===================================================

  socket.on("start_conversation", async (otherUserId: string, callback) => {
    const conversationId = await getOrCreateConversation(userId, otherUserId);

    if (conversationId) {
      socket.join(`conversation:${conversationId}`);

      // Also join the other user if online and notify them of the new conversation
      const otherSocketId = userSocketMap.get(otherUserId);
      if (otherSocketId) {
        const otherSocket = io.sockets.sockets.get(otherSocketId);
        if (otherSocket) {
          otherSocket.join(`conversation:${conversationId}`);

          // Emit new_conversation event to the other user so they see it in their list
          otherSocket.emit("new_conversation", {
            conversationId,
            other_user: socket.profile,
          });
        }
      }
    }

    callback({ conversationId, error: conversationId ? null : "Failed to start conversation" });
  });

  socket.on("get_conversations", async (callback) => {
    const conversations = await getUserConversations(userId);

    // Join all conversation rooms
    for (const conv of conversations) {
      socket.join(`conversation:${conv.id}`);
    }

    callback({ conversations });
  });

  socket.on("delete_conversation", async (conversationId: string, callback) => {
    const success = await deleteConversation(userId, conversationId);
    callback({ success, error: success ? null : "Failed to delete conversation" });
  });

  // ===================================================
  // MESSAGE EVENTS
  // ===================================================

  socket.on("send_message", async (data: SendMessageData, callback) => {
    // Verify user has access
    if (data.chatType === "room") {
      const hasAccess = await isUserInRoom(userId, data.chatId);
      if (!hasAccess) {
        callback({ message: null, error: "Not a member of this room" });
        return;
      }
    } else {
      const hasAccess = await isUserInConversation(userId, data.chatId);
      if (!hasAccess) {
        callback({ message: null, error: "Not a participant in this conversation" });
        return;
      }
    }

    const message = await sendMessage(userId, data.content, {
      roomId: data.chatType === "room" ? data.chatId : undefined,
      conversationId: data.chatType === "conversation" ? data.chatId : undefined,
      messageType: data.messageType,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      mediaName: data.mediaName,
      mediaSize: data.mediaSize,
      replyTo: data.replyTo,
    });

    if (message) {
      // Broadcast to room/conversation
      const roomName = data.chatType === "room"
        ? `room:${data.chatId}`
        : `conversation:${data.chatId}`;

      io.to(roomName).emit("receive_message", message);
    }

    callback({ message, error: message ? null : "Failed to send message" });
  });

  socket.on("get_messages", async (data: { chatType: "room" | "conversation"; chatId: string; limit?: number; before?: string }, callback) => {
    // Verify access
    const hasAccess = data.chatType === "room"
      ? await isUserInRoom(userId, data.chatId)
      : await isUserInConversation(userId, data.chatId);

    if (!hasAccess) {
      callback({ messages: [], error: "Access denied" });
      return;
    }

    const messages = await getMessages(data.chatType, data.chatId, data.limit, data.before);
    callback({ messages });
  });

  socket.on("typing", (data: TypingData) => {
    const roomName = data.chatType === "room"
      ? `room:${data.chatId}`
      : `conversation:${data.chatId}`;

    socket.to(roomName).emit("user_typing", {
      username,
      userId,
      chatId: data.chatId,
      isTyping: data.isTyping,
    });
  });

  // ===================================================
  // MEDIA UPLOAD EVENTS
  // ===================================================

  socket.on("get_upload_url", async (data: { bucket: "avatars" | "media"; fileName: string }, callback) => {
    const result = await getSignedUploadUrl(userId, data.bucket, data.fileName);

    if (result) {
      const publicUrl = await getPublicUrl(data.bucket, result.path);
      callback({ ...result, publicUrl, error: null });
    } else {
      callback({ signedUrl: null, path: null, publicUrl: null, error: "Failed to get upload URL" });
    }
  });

  // ===================================================
  // AI AVATAR EVENTS
  // ===================================================

  socket.on("generate_avatar", async (data: { prompt?: string; style?: "cartoon" | "realistic" | "anime" | "minimalist" }, callback) => {
    const prompt = data.prompt || getRandomAvatarPrompt();
    const result = await generateAIAvatar(prompt, data.style || "cartoon");
    callback(result);
  });

  // ===================================================
  // ACCOUNT MANAGEMENT EVENTS
  // ===================================================

  socket.on("clear_all_messages", async (callback) => {
    const success = await clearUserMessages(userId);
    callback({ success, error: success ? null : "Failed to clear messages" });
  });

  socket.on("delete_account", async (callback) => {
    const success = await deleteUserAccount(userId);

    if (success) {
      socket.disconnect();
    }

    callback({ success, error: success ? null : "Failed to delete account" });
  });

  // ===================================================
  // DISCONNECT
  // ===================================================

  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${username} (${userId})`);

    // Update online status
    await setUserOnlineStatus(userId, false);

    // Notify rooms
    const userData = connectedUsers.get(socket.id);
    if (userData) {
      for (const roomId of userData.rooms) {
        socket.to(`room:${roomId}`).emit("user_offline", {
          userId,
          username,
        });
      }
    }

    // Clean up
    connectedUsers.delete(socket.id);
    userSocketMap.delete(userId);
  });
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getRandomAvatarPrompt(): string {
  const prompts = [
    "a friendly fox with glasses",
    "a cool astronaut cat",
    "a wise owl professor",
    "a cheerful robot with a smile",
    "a magical unicorn",
    "a hipster bear with a beanie",
    "a space explorer dog",
    "a ninja panda",
    "a dragon reading a book",
    "a penguin in a tuxedo",
  ];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

// =====================================================
// START SERVER
// =====================================================

server.listen(PORT, () => {
  console.log(`🚀 WhatsApp Annex Server running on port ${PORT}`);
  console.log(`📦 Supabase URL: ${SUPABASE_URL ? "Configured" : "NOT CONFIGURED"}`);
  console.log(`🔑 OpenRouter: ${OPENROUTER_API_KEY ? "Configured" : "NOT CONFIGURED"}`);
});
