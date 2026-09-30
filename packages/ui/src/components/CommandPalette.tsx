import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { AdminSchema } from '@sorvien/admingen-types'
import { Search, Database, Plus, LogOut, ArrowRight, CornerDownLeft } from 'lucide-react'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  schema?: AdminSchema
  onLogout?: () => void
}

interface PaletteAction {
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  category: 'Resources' | 'Actions' | 'Quick Create'
  onSelect: () => void
}

export function CommandPalette({ isOpen, onClose, schema, onLogout }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Build the list of available actions/items based on schema
  const actions = useMemo<PaletteAction[]>(() => {
    const items: PaletteAction[] = []

    if (schema?.resources) {
      // 1. Resource views
      schema.resources.forEach((res) => {
        items.push({
          id: `view-${res.name}`,
          title: res.label || res.name,
          subtitle: `Navigate to ${res.label || res.name} table`,
          category: 'Resources',
          icon: <Database className="w-4 h-4 text-cyan-400" />,
          onSelect: () => {
            navigate({ to: '/$resource', params: { resource: res.name } })
          },
        })
      })

      // 2. Resource Quick Create
      schema.resources.forEach((res) => {
        items.push({
          id: `create-${res.name}`,
          title: `Create new ${res.label?.replace(/s$/, '') || res.name}`,
          subtitle: `Open create form for ${res.label || res.name}`,
          category: 'Quick Create',
          icon: <Plus className="w-4 h-4 text-emerald-400" />,
          onSelect: () => {
            navigate({ to: '/$resource/create', params: { resource: res.name } })
          },
        })
      })
    }

    // 3. Quick Global Actions
    if (onLogout) {
      items.push({
        id: 'action-logout',
        title: 'Log out',
        subtitle: 'Sign out of admin session',
        category: 'Actions',
        icon: <LogOut className="w-4 h-4 text-red-400" />,
        onSelect: onLogout,
      })
    }

    return items
  }, [schema, navigate, onLogout])

  // Filter actions based on search query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions
    const q = query.toLowerCase()
    return actions.filter(
      (action) =>
        action.title.toLowerCase().includes(q) ||
        (action.subtitle && action.subtitle.toLowerCase().includes(q)) ||
        action.category.toLowerCase().includes(q)
    )
  }, [actions, query])

  // Reset index when query changes or dialog opens
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, isOpen])

  // Autofocus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Ensure selected item stays in view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector('[data-selected="true"]') as HTMLElement
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Keyboard navigation within the modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < filteredActions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredActions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filteredActions[selectedIndex]
      if (selected) {
        selected.onSelect()
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-[#0f1117] shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a resource or command... (e.g. Users, Create, Logout)"
            className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none text-base"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 bg-white/5 border border-white/10 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[340px] overflow-y-auto p-2 divide-y divide-transparent focus:outline-none"
        >
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              No matching resources or commands found for "{query}".
            </div>
          ) : (
            filteredActions.map((action, index) => {
              const isSelected = index === selectedIndex
              return (
                <div
                  key={action.id}
                  data-selected={isSelected}
                  onClick={() => {
                    action.onSelect()
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-300 font-medium'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="p-1 rounded bg-white/5 border border-white/10 shrink-0">
                      {action.icon}
                    </span>
                    <div className="flex flex-col truncate">
                      <span className="truncate">{action.title}</span>
                      {action.subtitle && (
                        <span className="text-xs text-gray-500 truncate">
                          {action.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      {action.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-black/30 text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">↵</kbd> Select
            </span>
          </div>
          <div>
            <span className="text-cyan-400 font-medium">AdminGen</span> Navigation
          </div>
        </div>
      </div>
    </div>
  )
}
