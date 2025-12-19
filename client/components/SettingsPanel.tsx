'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { useNotifications } from '@/lib/notifications'
import { getSocket, updateProfile, generateAvatar, clearAllMessages, deleteAccount } from '@/lib/socket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ChevronLeft,
  Camera,
  Sparkles,
  Loader2,
  User,
  AtSign,
  FileText,
  Trash2,
  AlertTriangle,
  Check,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Smile,
} from 'lucide-react'
import {
  AnimatedAvatarPicker,
  AnimatedEmojiAvatar,
  parseAvatarUrl,
  ANIMATED_EMOJIS,
  getAnimationClass,
} from '@/components/AnimatedAvatarPicker'

// Inject animation styles for animated emoji avatars
const animationStyles = `
  @keyframes avatar-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes avatar-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }
  @keyframes avatar-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes avatar-shake {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    25% { transform: translateX(-3px) rotate(-5deg); }
    75% { transform: translateX(3px) rotate(5deg); }
  }
  @keyframes avatar-wiggle {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-10deg); }
    75% { transform: rotate(10deg); }
  }
  @keyframes avatar-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  @keyframes avatar-heartbeat {
    0%, 100% { transform: scale(1); }
    14% { transform: scale(1.2); }
    28% { transform: scale(1); }
    42% { transform: scale(1.2); }
    70% { transform: scale(1); }
  }
  @keyframes avatar-wave {
    0%, 100% { transform: rotate(0deg); }
    10% { transform: rotate(14deg); }
    20% { transform: rotate(-8deg); }
    30% { transform: rotate(14deg); }
    40% { transform: rotate(-4deg); }
    50% { transform: rotate(10deg); }
    60% { transform: rotate(0deg); }
  }

  .animate-avatar-bounce { animation: avatar-bounce 0.8s ease-in-out infinite; }
  .animate-avatar-pulse { animation: avatar-pulse 1.2s ease-in-out infinite; }
  .animate-avatar-spin { animation: avatar-spin 3s linear infinite; }
  .animate-avatar-shake { animation: avatar-shake 0.5s ease-in-out infinite; }
  .animate-avatar-wiggle { animation: avatar-wiggle 0.8s ease-in-out infinite; }
  .animate-avatar-float { animation: avatar-float 2s ease-in-out infinite; }
  .animate-avatar-heartbeat { animation: avatar-heartbeat 1.5s ease-in-out infinite; }
  .animate-avatar-wave { animation: avatar-wave 1.8s ease-in-out infinite; }
`

interface SettingsPanelProps {
  onBack: () => void
}

type AvatarStyle = 'cartoon' | 'realistic' | 'anime' | 'minimalist'

export const SettingsPanel = ({ onBack }: SettingsPanelProps) => {
  const { profile } = useAuth()
  const {
    soundEnabled,
    setSoundEnabled,
    notificationPermission,
    requestNotificationPermission
  } = useNotifications()

  // Profile editing
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [status, setStatus] = useState(profile?.status || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [generatingAvatar, setGeneratingAvatar] = useState(false)
  const [avatarPrompt, setAvatarPrompt] = useState('')
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('cartoon')
  const [showAvatarGenerator, setShowAvatarGenerator] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Animated emoji avatar
  const [showAnimatedPicker, setShowAnimatedPicker] = useState(false)

  // Parse current avatar to check if it's an animated emoji
  const parsedAvatar = parseAvatarUrl(avatarUrl)
  const currentAnimatedEmoji = parsedAvatar.type === 'animated-emoji' ? parsedAvatar.emoji : null

  // Inject animation styles on mount
  useEffect(() => {
    const styleId = 'settings-panel-avatar-styles'
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style')
      styleElement.id = styleId
      styleElement.textContent = animationStyles
      document.head.appendChild(styleElement)
    }
  }, [])

  // Notifications
  const [requestingPermission, setRequestingPermission] = useState(false)

  // Danger zone
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaved(false)

    const updated = await updateProfile({
      display_name: displayName || null,
      bio: bio || null,
      status: status || null,
      avatar_url: avatarUrl || null,
    })

    setSaving(false)
    if (updated) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)

    try {
      const socket = getSocket()
      socket?.emit('get_upload_url',
        { bucket: 'avatars', fileName: file.name },
        async (response: { signedUrl: string; path: string; publicUrl: string; error: string | null }) => {
          if (response.error) {
            console.error('Upload URL error:', response.error)
            setUploadingAvatar(false)
            return
          }

          const uploadResponse = await fetch(response.signedUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          })

          if (uploadResponse.ok) {
            setAvatarUrl(response.publicUrl)
          }
          setUploadingAvatar(false)
        }
      )
    } catch (error) {
      console.error('Avatar upload failed:', error)
      setUploadingAvatar(false)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleGenerateAvatar = async () => {
    setGeneratingAvatar(true)

    const result = await generateAvatar(avatarPrompt || undefined, avatarStyle)

    if (result.imageUrl) {
      setAvatarUrl(result.imageUrl)

      // Save the generated avatar to the user's profile
      const updatedProfile = await updateProfile({ avatar_url: result.imageUrl })
      if (updatedProfile) {
        console.log('Avatar saved to profile successfully')
      }

      setShowAvatarGenerator(false)
      setAvatarPrompt('')
    } else {
      console.error('Avatar generation failed:', result.error)
      // Show error to user - the error is already logged, but we could add a toast here
      alert(`Avatar generation failed: ${result.error || 'Unknown error'}`)
    }

    setGeneratingAvatar(false)
  }

  // Handle animated emoji selection
  const handleAnimatedEmojiSelect = async (avatar: {
    type: 'animated-emoji'
    emojiId: string
    emoji: string
    color: string
    animation: string
  }) => {
    // Store as a special URL format: animated-emoji:emojiId
    const animatedAvatarUrl = `animated-emoji:${avatar.emojiId}`
    setAvatarUrl(animatedAvatarUrl)

    // Save to profile
    const updatedProfile = await updateProfile({ avatar_url: animatedAvatarUrl })
    if (updatedProfile) {
      console.log('Animated emoji avatar saved successfully')
    }
  }

  const handleClearMessages = async () => {
    setClearing(true)
    await clearAllMessages()
    setClearing(false)
    setShowClearConfirm(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return

    setDeleting(true)
    await deleteAccount()
    // Socket will disconnect and redirect will happen via auth context
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-semibold">Settings</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Avatar Section */}
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Profile Picture</h3>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                {currentAnimatedEmoji ? (
                  // Animated emoji avatar
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: currentAnimatedEmoji.color + '30' }}
                  >
                    <span className={`text-4xl ${getAnimationClass(currentAnimatedEmoji.animation)}`}>
                      {currentAnimatedEmoji.emoji}
                    </span>
                  </div>
                ) : avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <Camera className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />

              {/* Animated Emoji Avatar Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnimatedPicker(true)}
                className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 hover:from-purple-100 hover:to-pink-100"
              >
                <Smile className="w-4 h-4 mr-2 text-purple-500" />
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-medium">
                  Animated Emoji
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAvatarGenerator(!showAvatarGenerator)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Avatar
              </Button>
            </div>
          </div>

          {/* Animated Avatar Picker Modal */}
          <AnimatedAvatarPicker
            isOpen={showAnimatedPicker}
            onClose={() => setShowAnimatedPicker(false)}
            onSelect={handleAnimatedEmojiSelect}
            currentAvatarId={parsedAvatar.emojiId}
          />

          {/* AI Avatar Generator */}
          {showAvatarGenerator && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <p className="text-sm text-gray-600">
                Generate a unique avatar using AI
              </p>

              <Input
                placeholder="Describe your avatar (optional)..."
                value={avatarPrompt}
                onChange={(e) => setAvatarPrompt(e.target.value)}
              />

              <div className="flex gap-2">
                {(['cartoon', 'realistic', 'anime', 'minimalist'] as AvatarStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setAvatarStyle(style)}
                    className={`px-3 py-1 text-xs rounded-full capitalize transition ${avatarStyle === style
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              <Button
                onClick={handleGenerateAvatar}
                disabled={generatingAvatar}
                className="w-full"
              >
                {generatingAvatar ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Avatar
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Profile Info Section */}
        <div className="p-4 border-b space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase">Profile Info</h3>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <AtSign className="w-4 h-4" />
              Username
            </label>
            <Input
              value={profile?.username || ''}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-400 mt-1">Username cannot be changed</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <User className="w-4 h-4" />
              Display Name
            </label>
            <Input
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <FileText className="w-4 h-4" />
              Bio
            </label>
            <Input
              placeholder="Tell something about yourself"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Status</label>
            <Input
              placeholder="What's on your mind?"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>

        {/* Notification Settings */}
        <div className="p-4 border-b space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </h3>

          {/* Browser Notifications */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {notificationPermission === 'granted' ? (
                <Bell className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900">Desktop Notifications</p>
                <p className="text-xs text-gray-500">
                  {notificationPermission === 'granted'
                    ? 'Enabled - you will receive notifications'
                    : notificationPermission === 'denied'
                      ? 'Blocked - enable in browser settings'
                      : 'Click to enable notifications'}
                </p>
              </div>
            </div>
            {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setRequestingPermission(true)
                  await requestNotificationPermission()
                  setRequestingPermission(false)
                }}
                disabled={requestingPermission}
              >
                {requestingPermission ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Enable'
                )}
              </Button>
            )}
            {notificationPermission === 'granted' && (
              <Check className="w-5 h-5 text-green-500" />
            )}
          </div>

          {/* Sound Notifications */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-primary" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900">Notification Sound</p>
                <p className="text-xs text-gray-500">
                  {soundEnabled ? 'Sound is on' : 'Sound is muted'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? 'Mute' : 'Unmute'}
            </Button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-red-500 uppercase flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </h3>

          {/* Clear Messages */}
          <div className="p-3 border border-red-200 rounded-lg bg-red-50/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">Clear All Messages</p>
                <p className="text-xs text-gray-500 mt-1">
                  Delete all your sent messages from all chats
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-100"
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {showClearConfirm && (
              <div className="mt-3 p-3 bg-white rounded border">
                <p className="text-sm text-gray-700 mb-3">
                  Are you sure? This action cannot be undone. All your messages will be permanently deleted.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleClearMessages}
                    disabled={clearing}
                  >
                    {clearing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Clear All'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Delete Account */}
          <div className="p-3 border border-red-200 rounded-lg bg-red-50/50">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">Delete Account</p>
                <p className="text-xs text-gray-500 mt-1">
                  Permanently delete your account and all data
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-100"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {showDeleteConfirm && (
              <div className="mt-3 p-3 bg-white rounded border">
                <p className="text-sm text-gray-700 mb-2">
                  This is permanent! Your account, profile, messages, and all data will be deleted forever.
                </p>
                <p className="text-sm text-gray-700 mb-3">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
                </p>
                <Input
                  placeholder="Type DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="mb-3"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || deleting}
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Delete Forever'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
