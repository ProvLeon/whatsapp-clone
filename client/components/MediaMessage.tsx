'use client'

import Image from 'next/image'
import { FileText, Download, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MediaMessageProps {
  type: 'image' | 'video' | 'file' | 'audio' | 'text' | 'system'
  url: string
  name?: string | null
  size?: number | null
}

export const MediaMessage = ({ type, url, name, size }: MediaMessageProps) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (type === 'image') {
    return (
      <div className="relative">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Image
            src={url}
            alt={name || 'Image'}
            width={300}
            height={200}
            className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition"
            style={{ maxHeight: '300px', objectFit: 'cover' }}
            unoptimized
          />
        </a>
      </div>
    )
  }

  if (type === 'video') {
    return (
      <div className="relative max-w-[300px]">
        <video
          src={url}
          controls
          className="rounded-lg w-full"
          style={{ maxHeight: '300px' }}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    )
  }

  if (type === 'audio') {
    return (
      <div className="p-3">
        <audio src={url} controls className="w-full max-w-[250px]">
          Your browser does not support the audio tag.
        </audio>
        {name && <p className="text-xs mt-1 opacity-70 truncate">{name}</p>}
      </div>
    )
  }

  // File type
  return (
    <div className="p-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 hover:opacity-80 transition"
      >
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name || 'File'}</p>
          {size && <p className="text-xs opacity-70">{formatFileSize(size)}</p>}
        </div>
        <Download className="w-5 h-5 flex-shrink-0" />
      </a>
    </div>
  )
}

export default MediaMessage
