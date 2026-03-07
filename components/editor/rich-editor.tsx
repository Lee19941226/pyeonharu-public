"use client"

import { useEditor, EditorContent, Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import Dropcursor from "@tiptap/extension-dropcursor"
import {
  useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle,
} from "react"
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Link as LinkIcon, Image as ImageIcon, Type, Heading1, Heading2,
  Quote, Code, Minus, X, Loader2,
} from "lucide-react"
import { toast } from "sonner"

// ??? Slash Command 硫붾돱 ?꾩씠?????
const SLASH_COMMANDS = [
  { label: "제목 1", description: "큰 제목", icon: Heading1, command: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "제목 2", description: "작은 제목", icon: Heading2, command: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "글머리 기호", description: "순서 없는 목록", icon: List, command: (editor: Editor) => editor.chain().focus().toggleBulletList().run() },
  { label: "번호 목록", description: "순서 있는 목록", icon: ListOrdered, command: (editor: Editor) => editor.chain().focus().toggleOrderedList().run() },
  { label: "인용", description: "인용문 블록", icon: Quote, command: (editor: Editor) => editor.chain().focus().toggleBlockquote().run() },
  { label: "코드", description: "코드 블록", icon: Code, command: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run() },
  { label: "구분선", description: "수평 구분선", icon: Minus, command: (editor: Editor) => editor.chain().focus().setHorizontalRule().run() },
  { label: "이미지", description: "이미지 업로드", icon: ImageIcon, command: () => {} },
]

// ??? Slash Command Menu 而댄룷?뚰듃 ???
function SlashCommandMenu({
  editor,
  query,
  position,
  onClose,
  onImageUpload,
}: {
  editor: Editor
  query: string
  position: { top: number; left: number }
  onClose: () => void
  onImageUpload: () => void
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const filtered = SLASH_COMMANDS.filter(
    cmd => cmd.label.includes(query) || cmd.description.includes(query)
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex(i => (i + 1) % filtered.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        selectItem(selectedIndex)
      } else if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [filtered, selectedIndex, onClose])

  function selectItem(index: number) {
    const item = filtered[index]
    if (!item) return

    // "/" ?띿뒪????젣
    const { state } = editor
    const { from } = state.selection
    const textBefore = state.doc.textBetween(Math.max(0, from - query.length - 1), from)
    const slashPos = from - query.length - 1
    editor.chain().focus().deleteRange({ from: slashPos, to: from }).run()

    if (item.label === "이미지") {
      onImageUpload()
    } else {
      item.command(editor)
    }
    onClose()
  }

  if (filtered.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-64 overflow-hidden rounded-lg border bg-background shadow-lg"
      style={{ top: position.top + 24, left: position.left }}
    >
      <div className="p-1">
        {filtered.map((item, i) => (
          <button
            key={item.label}
            onClick={() => selectItem(i)}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
              i === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background">
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ??? 留곹겕 ?낅젰 ?앹뾽 ???
function LinkInput({
  editor,
  onClose,
}: {
  editor: Editor
  onClose: () => void
}) {
  const [url, setUrl] = useState(editor.getAttributes("link").href || "")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (url.trim()) {
      const finalUrl = url.startsWith("http") ? url : `https://${url}`
      editor.chain().focus().extendMarkRange("link").setLink({ href: finalUrl }).run()
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
    }
    onClose()
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-lg">
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose() }}
        placeholder="URL ?낅젰..."
        className="h-7 w-48 rounded px-2 text-xs outline-none"
      />
      <button onClick={handleSubmit} className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-muted">
        ?뺤씤
      </button>
      <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ??? 硫붿씤 ?먮뵒??而댄룷?뚰듃 ???
export interface RichEditorRef {
  getHTML: () => string
  getJSON: () => any
  getImageUrls: () => string[]
  isEmpty: () => boolean
}

interface RichEditorProps {
  initialContent?: string
  placeholder?: string
  onImageUpload: (file: File) => Promise<string | null>
  onChange?: (html: string) => void
}

const RichEditor = forwardRef<RichEditorRef, RichEditorProps>(
  ({ initialContent, placeholder = "'/' 瑜??낅젰?섏뿬 紐낅졊?대? ?ъ슜?섏꽭??..", onImageUpload, onChange }, ref) => {

  const [slashMenu, setSlashMenu] = useState<{ query: string; position: { top: number; left: number } } | null>(null)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full my-2" },
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      Placeholder.configure({ placeholder }),
      Dropcursor.configure({ color: "#3b82f6", width: 2 }),
    ],
    content: initialContent || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[240px] px-4 py-3 outline-none focus:outline-none",
      },
      handleKeyDown: (view, event) => {
        // "/" ?낅젰 媛먯?
        if (event.key === "/" && !slashMenu) {
          setTimeout(() => {
            const { from } = view.state.selection
            const coords = view.coordsAtPos(from)
            setSlashMenu({
              query: "",
              position: { top: coords.top, left: coords.left },
            })
          }, 10)
        }
        return false
      },
      handleDrop: (view, event) => {
        if (!event.dataTransfer?.files?.length) return false
        const file = event.dataTransfer.files[0]
        if (file.type.startsWith("image/")) {
          event.preventDefault()
          handleImageFile(file)
          return true
        }
        return false
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) handleImageFile(file)
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor: e }) => {
      // Slash command 荑쇰━ ?낅뜲?댄듃
      if (slashMenu) {
        const { from } = e.state.selection
        const text = e.state.doc.textBetween(Math.max(0, from - 20), from)
        const slashIndex = text.lastIndexOf("/")
        if (slashIndex === -1) {
          setSlashMenu(null)
        } else {
          setSlashMenu(prev => prev ? { ...prev, query: text.slice(slashIndex + 1) } : null)
        }
      }
      onChange?.(e.getHTML())
    },
  })

  const handleImageFile = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("?대?吏 ?ш린??5MB ?댄븯留?媛?ν빀?덈떎")
      return
    }
    if (!file.type.startsWith("image/")) {
      toast.error("?대?吏 ?뚯씪留??낅줈??媛?ν빀?덈떎")
      return
    }

    setUploading(true)
    try {
      const url = await onImageUpload(file)
      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    } catch {
      toast.error("?대?吏 ?낅줈???ㅽ뙣")
    } finally {
      setUploading(false)
    }
  }, [editor, onImageUpload])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ref濡??몃? ?묎렐
  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() || "",
    getJSON: () => editor?.getJSON() || null,
    getImageUrls: () => {
      const urls: string[] = []
      editor?.state.doc.descendants(node => {
        if (node.type.name === "image" && node.attrs.src) {
          urls.push(node.attrs.src)
        }
      })
      return urls
    },
    isEmpty: () => {
      if (!editor) return true
      const html = editor.getHTML()
      // <p></p>留??덇굅???꾩쟾??鍮꾩뿀???뚮쭔 empty
      return !html || html === "<p></p>" || html.trim() === ""
    },
  }))

  if (!editor) return null

  return (
    <div className="rounded-lg border">
      {/* ?대컮 */}
      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="援듦쾶"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="기울임"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="諛묒쨪"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="?쒕ぉ 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="?쒕ぉ 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="湲癒몃━ 湲고샇"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="踰덊샇 紐⑸줉"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          active={editor.isActive("link")}
          onClick={() => setShowLinkInput(!showLinkInput)}
          title="留곹겕"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={false}
          onClick={() => fileInputRef.current?.click()}
          title="이미지"
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="?몄슜"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* 留곹겕 ?낅젰 */}
      {showLinkInput && (
        <div className="border-b px-2 py-1.5">
          <LinkInput editor={editor} onClose={() => setShowLinkInput(false)} />
        </div>
      )}

      {/* ?먮뵒??蹂몃Ц */}
      <div className="relative">
        <EditorContent editor={editor} />

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <div className="flex items-center gap-2 rounded-lg bg-background px-4 py-2 shadow-lg border">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm">?대?吏 ?낅줈??以?..</span>
            </div>
          </div>
        )}
      </div>

      {/* ?섎떒 ?뚰듃 */}
      <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium">/</span> 紐낅졊??쨌 ?대?吏瑜??쒕옒洹명븯嫄곕굹 遺숈뿬?ｊ린 媛??
      </div>

      {/* Slash Command Menu */}
      {slashMenu && (
        <SlashCommandMenu
          editor={editor}
          query={slashMenu.query}
          position={slashMenu.position}
          onClose={() => setSlashMenu(null)}
          onImageUpload={() => fileInputRef.current?.click()}
        />
      )}

      {/* ?④꺼吏?file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  )
})

RichEditor.displayName = "RichEditor"

// ??? ?대컮 踰꾪듉 ???
function ToolbarButton({
  children, active, onClick, title, disabled,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  title?: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`rounded p-1.5 transition-colors ${
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  )
}

export default RichEditor
