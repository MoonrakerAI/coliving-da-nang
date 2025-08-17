'use client'

import { useState, useEffect, useRef } from 'react'
import { Task, TaskSearchResult, TaskSearchQuery } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface TaskSearchProps {
  onSearch: (query: TaskSearchQuery) => Promise<TaskSearchResult[]>
  onTaskSelect: (task: Task) => void
  placeholder?: string
  className?: string
}

export function TaskSearch({ 
  onSearch, 
  onTaskSelect, 
  placeholder = "Search tasks...",
  className = ""
}: TaskSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TaskSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('task-recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to parse recent searches:', error)
      }
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return
    
    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, 5) // Keep only 5 recent searches
    
    setRecentSearches(updated)
    localStorage.setItem('task-recent-searches', JSON.stringify(updated))
  }

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query)
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const searchResults = await onSearch({
        query: searchQuery,
        limit: 10
      })
      setResults(searchResults)
      setIsOpen(true)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleInputChange = (value: string) => {
    setQuery(value)
    if (value.trim()) {
      setIsOpen(true)
    }
  }

  const handleTaskSelect = (task: Task) => {
    saveRecentSearch(query)
    setIsOpen(false)
    setQuery('')
    onTaskSelect(task)
  }

  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery)
    performSearch(recentQuery)
    inputRef.current?.focus()
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('task-recent-searches')
  }

  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : part
    )
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800'
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery('')
              setResults([])
              setIsOpen(false)
            }}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        )}
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto shadow-lg">
          <CardContent className="p-0">
            {/* Search Results */}
            {results.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                  Search Results ({results.length})
                </div>
                {results.map((result) => (
                  <button
                    key={result.task.id}
                    onClick={() => handleTaskSelect(result.task)}
                    className="w-full text-left px-3 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {highlightMatch(result.task.title, query)}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {highlightMatch(result.task.description, query)}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {result.task.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {result.task.priority}
                          </Badge>
                          {result.task.dueDate && (
                            <span className="text-xs text-gray-500">
                              Due {format(result.task.dueDate, 'MMM d')}
                            </span>
                          )}
                        </div>
                        {result.matchedFields.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Matched: {result.matchedFields.join(', ')}
                          </div>
                        )}
                      </div>
                      <Badge className={`ml-2 text-xs ${getRelevanceColor(result.relevanceScore)}`}>
                        {Math.round(result.relevanceScore * 100)}%
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {query.trim().length >= 2 && results.length === 0 && !isSearching && (
              <div className="px-3 py-6 text-center text-gray-500 text-sm">
                No tasks found for &quot;{query}&quot;
              </div>
            )}

            {/* Recent Searches */}
            {!query.trim() && recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                  <span>Recent Searches</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="h-auto p-0 text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </Button>
                </div>
                {recentSearches.map((recentQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(recentQuery)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700">{recentQuery}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Search Tips */}
            {!query.trim() && recentSearches.length === 0 && (
              <div className="px-3 py-4 text-xs text-gray-500">
                <div className="font-medium mb-2">Search Tips:</div>
                <ul className="space-y-1">
                  <li>• Search by task title or description</li>
                  <li>• Use quotes for exact phrases</li>
                  <li>• Search by assignee name</li>
                  <li>• Include category or priority keywords</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
