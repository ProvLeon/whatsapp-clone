-- =====================================================
-- WhatsApp Annex - Supabase Database Schema
-- =====================================================
-- Run this in your Supabase SQL Editor to set up the database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS PROFILE TABLE (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  status TEXT DEFAULT 'Hey there! I am using WhatsApp Annex',
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for username search
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- =====================================================
-- ROOMS/GROUPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_name ON public.rooms(name);

-- =====================================================
-- ROOM MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);

-- =====================================================
-- DIRECT CONVERSATIONS TABLE (1:1 chats)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1 UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_2 UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1, participant_2),
  CHECK (participant_1 < participant_2)
);

CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations(participant_2);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file', 'audio', 'system')),
  media_url TEXT,
  media_type TEXT,
  media_name TEXT,
  media_size INTEGER,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (room_id IS NOT NULL AND conversation_id IS NULL) OR
    (room_id IS NULL AND conversation_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Rooms policies
CREATE POLICY "Public rooms are viewable by everyone" ON public.rooms
  FOR SELECT USING (NOT is_private OR id IN (
    SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can create rooms" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Room admins can update rooms" ON public.rooms
  FOR UPDATE USING (
    created_by = auth.uid() OR
    id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Room creators can delete rooms" ON public.rooms
  FOR DELETE USING (created_by = auth.uid());

-- Room members policies
CREATE POLICY "Room members viewable by participants" ON public.room_members
  FOR SELECT USING (
    room_id IN (SELECT room_id FROM public.room_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can join public rooms" ON public.room_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    room_id IN (SELECT id FROM public.rooms WHERE NOT is_private)
  );

CREATE POLICY "Users can leave rooms" ON public.room_members
  FOR DELETE USING (user_id = auth.uid());

-- Conversations policies
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "Users can delete conversations" ON public.conversations
  FOR DELETE USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their chats" ON public.messages
  FOR SELECT USING (
    (room_id IS NOT NULL AND room_id IN (
      SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
    )) OR
    (conversation_id IS NOT NULL AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
    ))
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      (room_id IS NOT NULL AND room_id IN (
        SELECT room_id FROM public.room_members WHERE user_id = auth.uid()
      )) OR
      (conversation_id IS NOT NULL AND conversation_id IN (
        SELECT id FROM public.conversations
        WHERE participant_1 = auth.uid() OR participant_2 = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON public.messages
  FOR DELETE USING (sender_id = auth.uid());

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Get or create conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  p1 UUID;
  p2 UUID;
BEGIN
  IF user1_id < user2_id THEN
    p1 := user1_id;
    p2 := user2_id;
  ELSE
    p1 := user2_id;
    p2 := user1_id;
  END IF;

  SELECT id INTO conv_id
  FROM public.conversations
  WHERE participant_1 = p1 AND participant_2 = p2;

  IF conv_id IS NULL THEN
    INSERT INTO public.conversations (participant_1, participant_2)
    VALUES (p1, p2)
    RETURNING id INTO conv_id;
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete user account
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clear user messages
CREATE OR REPLACE FUNCTION public.clear_user_messages()
RETURNS VOID AS $$
BEGIN
  UPDATE public.messages
  SET content = '[Message deleted]',
      is_deleted = true,
      media_url = NULL
  WHERE sender_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
