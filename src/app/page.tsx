'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Trash2, Plus, Minus, LogOut, Edit, Download, Settings, Upload, FileDown, Search, Table, MoreHorizontal, CheckSquare, Square, GripVertical, Check, List, CheckCircle, AlertCircle, Power, PowerOff, X, Globe, Server, Tag, Link, Info, Activity, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { DateTimeDisplay } from '@/components/date-time-display'

interface BlackboxTarget {
  id: string
  name: string
  url: string
  module: string
  labels?: string
  enabled: boolean
  createdAt: string
  updatedAt: string
  probeAssignments?: string
}

interface User {
  id: string
  email: string
  username: string
  name?: string
}

interface ProberInstance {
  id: string
  name: string
  address: string
  interval: number
  scrapeTimeout: number
  enabled: boolean
  description?: string
  createdAt: string
  updatedAt: string
}

export default function Home() {
  const { toast } = useToast()
  const [targets, setTargets] = useState<BlackboxTarget[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<BlackboxTarget | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [viewingTarget, setViewingTarget] = useState<BlackboxTarget | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [targetToDelete, setTargetToDelete] = useState<string | null>(null)
  const [deleteMetrics, setDeleteMetrics] = useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importData, setImportData] = useState('')
  const [importing, setImporting] = useState(false)
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [showEmptyStateAddDropdown, setShowEmptyStateAddDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [searchSuggestionIndex, setSearchSuggestionIndex] = useState(0)
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set())
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [viewMode, setViewMode] = useState<'table'>('table')
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set())
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [isReorderMode, setIsReorderMode] = useState(false)
  const [isCompactView, setIsCompactView] = useState(false)
  const [columnOrder, setColumnOrder] = useState([
    'target',
    'labels',
    'module', 
    'prober',
    'status',
    'actions'
  ])
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null)
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null)
  const [dropTargetRowId, setDropTargetRowId] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<'before' | 'after' | null>(null)
  const [columnPositions, setColumnPositions] = useState<{[key: string]: number}>({})
  const [isColumnAnimating, setIsColumnAnimating] = useState(false)
  
  // Load saved preferences from localStorage
  useEffect(() => {
    const savedColumnOrder = localStorage.getItem('pbxrColumnOrder');
    if (savedColumnOrder) {
      try {
        const parsed = JSON.parse(savedColumnOrder);
        const requiredColumns = ['target', 'labels', 'module', 'prober', 'status', 'actions'];
        if (Array.isArray(parsed) && requiredColumns.every(col => parsed.includes(col))) {
          setColumnOrder(parsed);
        }
      } catch (error) {
        console.error('Failed to parse saved column order:', error);
      }
    }

    const savedViewMode = localStorage.getItem('pbxrViewMode');
    if (savedViewMode) {
      setIsCompactView(savedViewMode === 'compact');
    }

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      fetchTargets();
      fetchHiddenLabels();
      fetchProbers();
    } else {
      router.push('/login');
    }
  }, []);
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null)
  const [labelsList, setLabelsList] = useState<{key: string, value: string}[]>([])
  const [availableLabelKeys, setAvailableLabelKeys] = useState<string[]>([])
  const [availableLabelValues, setAvailableLabelValues] = useState<string[]>([])
  const [showKeySuggestions, setShowKeySuggestions] = useState(false)
  const [showValueSuggestions, setShowValueSuggestions] = useState(false)
  const [activeKeyIndex, setActiveKeyIndex] = useState(0)
  const [activeValueIndex, setActiveValueIndex] = useState(0)
  const [currentEditingIndex, setCurrentEditingIndex] = useState<number | null>(null)
  const [currentEditingField, setCurrentEditingField] = useState<'key' | 'value' | null>(null)
  const [suggestionPosition, setSuggestionPosition] = useState<{top: number, left: number, width: number} | null>(null)
  const [hiddenLabels, setHiddenLabels] = useState<string[]>(['__tmp_enabled'])
  const keyInputRef = useRef<HTMLInputElement>(null)
  
  // Prober management state
  const [probers, setProbers] = useState<ProberInstance[]>([])
  const [selectedProbers, setSelectedProbers] = useState<string[]>([])
  const [loadingProbers, setLoadingProbers] = useState(true)

  // Fetch hidden labels from settings
  const fetchHiddenLabels = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const settings = await response.json()
        setHiddenLabels(settings.hiddenLabels || [])
      }
    } catch (error) {
      console.error('Failed to fetch hidden labels:', error)
    }
  }

  // Fetch probers
  const fetchProbers = async () => {
    try {
      setLoadingProbers(true)
      const response = await fetch('/api/probers')
      if (response.ok) {
        const data = await response.json()
        setProbers(data.probers || [])
      } else {
        console.error('Failed to fetch probers')
      }
    } catch (error) {
      console.error('Failed to fetch probers:', error)
    } finally {
      setLoadingProbers(false)
    }
  }

  // Calculate target counts
  const getTargetCounts = () => {
    const enabledCount = targets.filter(target => getEnabledStatus(target)).length
    const disabledCount = targets.filter(target => !getEnabledStatus(target)).length
    const unassignedCount = targets.filter(target => {
      if (!target.probeAssignments) return true
      try {
        const assignedProbeIds = JSON.parse(target.probeAssignments)
        return !Array.isArray(assignedProbeIds) || assignedProbeIds.length === 0
      } catch (e) {
        return true
      }
    }).length
    
    return { enabledCount, disabledCount, unassignedCount }
  }

  // Label management functions
  const extractAvailableLabelKeys = (targets: BlackboxTarget[]) => {
    const keyFrequency = new Map<string, number>()
    targets.forEach(target => {
      if (target.labels) {
        try {
          const labels = JSON.parse(target.labels)
          Object.keys(labels).forEach(key => {
            // Filter out hidden labels
            if (!hiddenLabels.includes(key)) {
              keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1)
            }
          })
        } catch (e) {
          // Skip invalid JSON
        }
      }
    })
    // Sort by frequency (descending) then alphabetically
    return Array.from(keyFrequency.entries())
      .sort((a, b) => {
        if (a[1] !== b[1]) {
          return b[1] - a[1] // By frequency (descending)
        }
        return a[0].localeCompare(b[0]) // Then alphabetically
      })
      .map(([key]) => key)
  }

  const extractAvailableLabelValues = (targets: BlackboxTarget[]) => {
    const valueFrequency = new Map<string, number>()
    targets.forEach(target => {
      if (target.labels) {
        try {
          const labels = JSON.parse(target.labels)
          Object.entries(labels).forEach(([key, value]) => {
            // Only include values from non-hidden labels
            if (!hiddenLabels.includes(key)) {
              valueFrequency.set(value.toString(), (valueFrequency.get(value.toString()) || 0) + 1)
            }
          })
        } catch (e) {
          // Skip invalid JSON
        }
      }
    })
    // Sort by frequency (descending) then alphabetically
    return Array.from(valueFrequency.entries())
      .sort((a, b) => {
        if (a[1] !== b[1]) {
          return b[1] - a[1] // By frequency (descending)
        }
        return a[0].localeCompare(b[0]) // Then alphabetically
      })
      .map(([value]) => value)
  }

  const extractValuesForKey = (targets: BlackboxTarget[], key: string) => {
    const valueFrequency = new Map<string, number>()
    targets.forEach(target => {
      if (target.labels) {
        try {
          const labels = JSON.parse(target.labels)
          Object.entries(labels).forEach(([labelKey, value]) => {
            // Only include values for the specified key and if the key is not hidden
            if (labelKey === key && !hiddenLabels.includes(key)) {
              valueFrequency.set(value.toString(), (valueFrequency.get(value.toString()) || 0) + 1)
            }
          })
        } catch (e) {
          // Skip invalid JSON
        }
      }
    })
    // Sort by frequency (descending) then alphabetically
    return Array.from(valueFrequency.entries())
      .sort((a, b) => {
        if (a[1] !== b[1]) {
          return b[1] - a[1] // By frequency (descending)
        }
        return a[0].localeCompare(b[0]) // Then alphabetically
      })
      .map(([value]) => value)
  }

  const addLabel = () => {
    setLabelsList([...labelsList, { key: '', value: '' }])
  }

  const removeLabel = (index: number) => {
    setLabelsList(labelsList.filter((_, i) => i !== index))
  }

  const updateLabel = (index: number, field: 'key' | 'value', value: string, event?: React.FocusEvent<HTMLInputElement>) => {
    const newLabels = [...labelsList]
    newLabels[index][field] = value
    setLabelsList(newLabels)
    
    // Handle autocomplete for both key and value fields
    if (field === 'key') {
      setCurrentEditingIndex(index)
      setCurrentEditingField('key')
      
      if (event && event.target) {
        // Get the input element
        const inputElement = event.target
        // Get the parent container (relative positioned div)
        const containerElement = inputElement.closest('.relative') as HTMLElement
        
        if (containerElement) {
          // Position relative to the container
          const inputRect = inputElement.getBoundingClientRect()
          const containerRect = containerElement.getBoundingClientRect()
          
          setSuggestionPosition({
            top: inputRect.bottom - containerRect.top,
            left: inputRect.left - containerRect.left,
            width: inputRect.width
          })
        } else {
          // Fallback to modal positioning
          const modalElement = inputElement.closest('[role="dialog"]')
          const modalRect = modalElement?.getBoundingClientRect()
          const inputRect = inputElement.getBoundingClientRect()
          
          if (modalRect) {
            setSuggestionPosition({
              top: inputRect.bottom - modalRect.top,
              left: inputRect.left - modalRect.left,
              width: inputRect.width
            })
          }
        }
      }
      
      // Filter available label keys based on input value (max 3 results)
      let filteredKeys: string[]
      if (value.trim() === '') {
        // When empty, show top 3 most used label keys (first 3 from sorted list)
        filteredKeys = availableLabelKeys.slice(0, 3)
      } else {
        // When typing, filter based on input value
        filteredKeys = availableLabelKeys.filter(key => 
          key.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 3)
      }
      
      if (filteredKeys.length > 0) {
        setShowKeySuggestions(true)
        setActiveKeyIndex(0)
      } else {
        setShowKeySuggestions(false)
        setSuggestionPosition(null)
      }
    } else if (field === 'value') {
      setCurrentEditingIndex(index)
      setCurrentEditingField('value')
      
      if (event && event.target) {
        // Get the input element
        const inputElement = event.target
        // Get the parent container (relative positioned div)
        const containerElement = inputElement.closest('.relative') as HTMLElement
        
        if (containerElement) {
          // Position relative to the container
          const inputRect = inputElement.getBoundingClientRect()
          const containerRect = containerElement.getBoundingClientRect()
          
          setSuggestionPosition({
            top: inputRect.bottom - containerRect.top,
            left: inputRect.left - containerRect.left,
            width: inputRect.width
          })
        } else {
          // Fallback to modal positioning
          const modalElement = inputElement.closest('[role="dialog"]')
          const modalRect = modalElement?.getBoundingClientRect()
          const inputRect = inputElement.getBoundingClientRect()
          
          if (modalRect) {
            setSuggestionPosition({
              top: inputRect.bottom - modalRect.top,
              left: inputRect.left - modalRect.left,
              width: inputRect.width
            })
          }
        }
      }
      
      // Get the current key for this label row
      const currentKey = labelsList[index].key
      
      // Filter available label values based on input value and current key
      let filteredValues: string[]
      if (value.trim() === '') {
        // When empty, show top 3 most used values for the current key
        if (currentKey.trim()) {
          filteredValues = extractValuesForKey(targets, currentKey).slice(0, 3)
        } else {
          // If no key is set yet, show general top values
          filteredValues = availableLabelValues.slice(0, 3)
        }
      } else {
        // When typing, filter based on input value within the context of the current key
        if (currentKey.trim()) {
          const keySpecificValues = extractValuesForKey(targets, currentKey)
          filteredValues = keySpecificValues.filter(val => 
            val.toLowerCase().includes(value.toLowerCase())
          ).slice(0, 3)
        } else {
          // If no key is set, filter from all values
          filteredValues = availableLabelValues.filter(val => 
            val.toLowerCase().includes(value.toLowerCase())
          ).slice(0, 3)
        }
      }
      
      if (filteredValues.length > 0) {
        setShowValueSuggestions(true)
        setActiveValueIndex(0)
      } else {
        setShowValueSuggestions(false)
        setSuggestionPosition(null)
      }
    }
  }

  const selectKeySuggestion = (key: string, index: number) => {
    const newLabels = [...labelsList]
    newLabels[index].key = key
    setLabelsList(newLabels)
    setShowKeySuggestions(false)
    
    // Set up to show value suggestions for this row
    setCurrentEditingIndex(index)
    setCurrentEditingField('value')
    
    // Trigger value suggestions by calling updateLabel
    const currentValue = newLabels[index].value
    // We'll trigger this in a useEffect to ensure state is updated
  }

  const selectValueSuggestion = (value: string, index: number) => {
    const newLabels = [...labelsList]
    newLabels[index].value = value
    setLabelsList(newLabels)
    setShowValueSuggestions(false)
    setCurrentEditingIndex(null)
    setCurrentEditingField(null)
  }

  const showSuggestionsForKeyInput = (index: number, inputElement?: HTMLInputElement) => {
    const value = labelsList[index].key
    let filteredKeys: string[]
    if (value.trim() === '') {
      // When empty, show top 3 most used label keys (first 3 from sorted list)
      filteredKeys = availableLabelKeys.slice(0, 3)
    } else {
      // When typing, filter based on input value
      filteredKeys = availableLabelKeys.filter(key => 
        key.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 3)
    }
    
    if (filteredKeys.length > 0) {
      if (inputElement) {
        // Get the parent container (relative positioned div)
        const containerElement = inputElement.closest('.relative') as HTMLElement
        
        if (containerElement) {
          // Position relative to the container
          const inputRect = inputElement.getBoundingClientRect()
          const containerRect = containerElement.getBoundingClientRect()
          
          setSuggestionPosition({
            top: inputRect.bottom - containerRect.top,
            left: inputRect.left - containerRect.left,
            width: inputRect.width
          })
        }
      }
      setShowKeySuggestions(true)
      setActiveKeyIndex(0)
    } else {
      setShowKeySuggestions(false)
      setSuggestionPosition(null)
    }
  }

  const showSuggestionsForValueInput = (index: number, inputElement?: HTMLInputElement) => {
    const value = labelsList[index].value
    const currentKey = labelsList[index].key
    
    let filteredValues: string[]
    if (value.trim() === '') {
      // When empty, show top 3 most used values for the current key
      if (currentKey.trim()) {
        filteredValues = extractValuesForKey(targets, currentKey).slice(0, 3)
      } else {
        // If no key is set yet, show general top values
        filteredValues = availableLabelValues.slice(0, 3)
      }
    } else {
      // When typing, filter based on input value within the context of the current key
      if (currentKey.trim()) {
        const keySpecificValues = extractValuesForKey(targets, currentKey)
        filteredValues = keySpecificValues.filter(val => 
          val.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 3)
      } else {
        // If no key is set, filter from all values
        filteredValues = availableLabelValues.filter(val => 
          val.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 3)
      }
    }
    
    if (filteredValues.length > 0) {
      if (inputElement) {
        // Get the parent container (relative positioned div)
        const containerElement = inputElement.closest('.relative') as HTMLElement
        
        if (containerElement) {
          // Position relative to the container
          const inputRect = inputElement.getBoundingClientRect()
          const containerRect = containerElement.getBoundingClientRect()
          
          setSuggestionPosition({
            top: inputRect.bottom - containerRect.top,
            left: inputRect.left - containerRect.left,
            width: inputRect.width
          })
        }
      }
      setShowValueSuggestions(true)
      setActiveValueIndex(0)
    } else {
      setShowValueSuggestions(false)
      setSuggestionPosition(null)
    }
  }

  const handleKeyKeyDown = (e: React.KeyboardEvent, index: number) => {
    // Always allow arrow keys, enter, escape to work even if suggestions aren't showing yet
    const value = labelsList[index].key
    let filteredKeys: string[]
    if (value.trim() === '') {
      filteredKeys = availableLabelKeys.slice(0, 3)
    } else {
      filteredKeys = availableLabelKeys.filter(key => 
        key.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 3)
    }
    
    // Show suggestions if user presses arrow keys and there are suggestions available
    if (!showKeySuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && filteredKeys.length > 0) {
      const inputElement = e.target as HTMLInputElement
      showSuggestionsForKeyInput(index, inputElement)
      return
    }
    
    if (!showKeySuggestions) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveKeyIndex(prev => (prev + 1) % filteredKeys.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveKeyIndex(prev => (prev - 1 + filteredKeys.length) % filteredKeys.length)
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (filteredKeys[activeKeyIndex]) {
          selectKeySuggestion(filteredKeys[activeKeyIndex], index)
        }
        break
      case 'Escape':
        setShowKeySuggestions(false)
        break
    }
  }

  const handleValueKeyDown = (e: React.KeyboardEvent, index: number) => {
    // Always allow arrow keys, enter, escape to work even if suggestions aren't showing yet
    const value = labelsList[index].value
    const currentKey = labelsList[index].key
    
    let filteredValues: string[]
    if (value.trim() === '') {
      // When empty, show top 3 most used values for the current key
      if (currentKey.trim()) {
        filteredValues = extractValuesForKey(targets, currentKey).slice(0, 3)
      } else {
        // If no key is set yet, show general top values
        filteredValues = availableLabelValues.slice(0, 3)
      }
    } else {
      // When typing, filter based on input value within the context of the current key
      if (currentKey.trim()) {
        const keySpecificValues = extractValuesForKey(targets, currentKey)
        filteredValues = keySpecificValues.filter(val => 
          val.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 3)
      } else {
        // If no key is set, filter from all values
        filteredValues = availableLabelValues.filter(val => 
          val.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 3)
      }
    }
    
    // Show suggestions if user presses arrow keys and there are suggestions available
    if (!showValueSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && filteredValues.length > 0) {
      const inputElement = e.target as HTMLInputElement
      showSuggestionsForValueInput(index, inputElement)
      return
    }
    
    if (!showValueSuggestions) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveValueIndex(prev => (prev + 1) % filteredValues.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveValueIndex(prev => (prev - 1 + filteredValues.length) % filteredValues.length)
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (filteredValues[activeValueIndex]) {
          selectValueSuggestion(filteredValues[activeValueIndex], index)
        }
        break
      case 'Escape':
        setShowValueSuggestions(false)
        break
    }
  }

  const syncLabelsToFormData = () => {
    const validLabels = labelsList.filter(label => label.key.trim() && label.value.trim())
    const labelsObj: any = {}
    validLabels.forEach(label => {
      labelsObj[label.key.trim()] = label.value.trim()
    })
    const labelsString = Object.keys(labelsObj).length > 0 ? JSON.stringify(labelsObj) : ''
    console.log('syncLabelsToFormData - labelsList:', labelsList)
    console.log('syncLabelsToFormData - validLabels:', validLabels)
    console.log('syncLabelsToFormData - labelsObj:', labelsObj)
    console.log('syncLabelsToFormData - labelsString:', labelsString)
    setFormData({ ...formData, labels: labelsString })
  }
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    module: 'http_2xx',
    labels: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // Prevent text selection when using Shift+click globally
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.shiftKey) {
        // Prevent text selection when Shift is held down
        document.body.style.userSelect = 'none'
        document.body.style.webkitUserSelect = 'none'
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      // Restore text selection when mouse is released
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        // Prevent text selection when Shift key is pressed
        document.body.style.userSelect = 'none'
        document.body.style.webkitUserSelect = 'none'
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) {
        // Restore text selection when Shift key is released
        document.body.style.userSelect = ''
        document.body.style.webkitUserSelect = ''
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      // Clean up user select styles
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
    }
  }, [])

  // Helper function to get enabled status from __tmp_enabled label
  const getEnabledStatus = (target: BlackboxTarget): boolean => {
    if (!target.labels) return true // Default to enabled if no labels
    
    try {
      const labelsObj = JSON.parse(target.labels)
      // If __tmp_enabled is not set, default to true
      if (labelsObj.__tmp_enabled === undefined) return true
      return labelsObj.__tmp_enabled === 'true'
    } catch (e) {
      // If labels are not valid JSON, treat as key=value pairs
      const labelPairs = target.labels.split(',').map((pair: string) => pair.trim())
      const tmpEnabledLabel = labelPairs.find((pair: string) => pair.startsWith('__tmp_enabled='))
      if (tmpEnabledLabel) {
        const value = tmpEnabledLabel.split('=')[1]?.trim()
        return value === 'true'
      }
      return true // Default to enabled if __tmp_enabled is not found
    }
  }

  // Bulk action handlers
  const handleSelectTarget = (targetId: string, checked: boolean, isCtrlClick: boolean = false) => {
    const newSelected = new Set(selectedTargets)
    
    if (isCtrlClick) {
      // Toggle selection for Ctrl+click
      if (newSelected.has(targetId)) {
        newSelected.delete(targetId)
      } else {
        newSelected.add(targetId)
      }
    } else {
      // Regular checkbox behavior
      if (checked) {
        newSelected.add(targetId)
      } else {
        newSelected.delete(targetId)
      }
    }
    
    setSelectedTargets(newSelected)
    setIsMultiSelectMode(newSelected.size > 1)
  }

  // Handle right-click on table rows
  const handleRowContextMenu = (targetId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (isReorderMode) return // Don't show context menu when in reorder mode
    
    // Find the index of the clicked target in the paginated list
    const targetIndex = paginatedTargets.findIndex(target => target.id === targetId)
    if (targetIndex === -1) return // Target not found in current page
    
    // If multiple targets are selected, stay in multi-select mode
    // Otherwise, select just this target
    if (selectedTargets.size > 1) {
      // If clicking on a target that's not selected, clear selection and select this one
      if (!selectedTargets.has(targetId)) {
        setSelectedTargets(new Set([targetId]))
        setIsMultiSelectMode(false)
        setLastClickedIndex(targetIndex)
      }
    } else {
      // Single or no selection - select this target
      setSelectedTargets(new Set([targetId]))
      setIsMultiSelectMode(false)
      setLastClickedIndex(targetIndex)
    }
    
    // Calculate position, keeping menu within viewport
    const menuWidth = 160
    const menuHeight = 200 // Approximate height
    let x = event.clientX
    let y = event.clientY
    
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth
    }
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight
    }
    
    setContextMenuPosition({ x, y })
    setShowContextMenu(true)
  }
  
  // Close context menu
  const closeContextMenu = () => {
    setShowContextMenu(false)
    setContextMenuPosition(null)
  }
  
  // Handle Ctrl+click on table rows for multi-selection
  const handleRowClick = (targetId: string, event: React.MouseEvent) => {
    if (isReorderMode) return // Don't select when in reorder mode
    
    // Find the index of the clicked target in the paginated list
    const targetIndex = paginatedTargets.findIndex(target => target.id === targetId)
    if (targetIndex === -1) return // Target not found in current page
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+click always toggles selection and enters multi-select mode
      event.preventDefault()
      event.stopPropagation()
      
      // Prevent text selection
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges()
      }
      
      const newSelected = new Set(selectedTargets)
      if (newSelected.has(targetId)) {
        newSelected.delete(targetId)
      } else {
        newSelected.add(targetId)
      }
      
      setSelectedTargets(newSelected)
      setLastClickedIndex(targetIndex)
      // Always enter multi-select mode when using Ctrl+click, even for single selection
      setIsMultiSelectMode(newSelected.size > 0)
    } else if (event.shiftKey && isMultiSelectMode && lastClickedIndex !== null) {
      // Shift+click for range selection in multi-select mode
      event.preventDefault()
      event.stopPropagation()
      
      // Prevent text selection
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges()
      }
      
      const newSelected = new Set(selectedTargets)
      const startIndex = Math.min(lastClickedIndex, targetIndex)
      const endIndex = Math.max(lastClickedIndex, targetIndex)
      
      // Select all targets in the range
      for (let i = startIndex; i <= endIndex; i++) {
        const target = paginatedTargets[i]
        if (target) {
          newSelected.add(target.id)
        }
      }
      
      setSelectedTargets(newSelected)
      setLastClickedIndex(targetIndex)
      setIsMultiSelectMode(true)
    } else if (isMultiSelectMode) {
      // In multi-select mode, regular clicking toggles the checkbox
      event.preventDefault()
      handleSelectTarget(targetId, false, true)
      setLastClickedIndex(targetIndex)
    } else {
      // If not in multi-select mode and no Ctrl key, open the details modal
      const target = targets.find(t => t.id === targetId)
      if (target) {
        openDetailsDialog(target)
      }
      setLastClickedIndex(targetIndex)
    }
  }

  // Clear selection function
  const clearSelection = () => {
    setSelectedTargets(new Set())
    setIsMultiSelectMode(false)
    setLastClickedIndex(null)
  }

  const handleLabelClick = (key: string, value: string) => {
    const searchFilter = `labels:${key}=${value}`
    setSearchQuery(searchFilter)
    setShowSearchSuggestions(false)
  }

  const handleStatusClick = (isEnabled: boolean) => {
    const statusFilter = `status:${isEnabled ? 'enabled' : 'disabled'}`
    setSearchQuery(statusFilter)
    setShowSearchSuggestions(false)
  }

  const handleModuleClick = (module: string) => {
    const moduleFilter = `module:${module}`
    setSearchQuery(moduleFilter)
    setShowSearchSuggestions(false)
  }

  const toggleExpandedLabels = (targetId: string) => {
    const newExpanded = new Set(expandedLabels)
    if (newExpanded.has(targetId)) {
      newExpanded.delete(targetId)
    } else {
      newExpanded.add(targetId)
    }
    setExpandedLabels(newExpanded)
  }

  const detectTargetType = (address: string): { type: 'ipv4' | 'ipv6' | 'domain' | 'url'; modules: string[] } => {
    if (!address || address.trim() === '') {
      return { type: 'domain', modules: ['icmp'] } // Default fallback
    }

    const trimmedAddress = address.trim()

    // IPv4 address validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (ipv4Regex.test(trimmedAddress)) {
      return { type: 'ipv4', modules: ['icmp', 'dns'] }
    }

    // IPv6 address validation (simplified)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/
    if (ipv6Regex.test(trimmedAddress)) {
      return { type: 'ipv6', modules: ['icmp', 'dns'] }
    }

    // URL validation - check if it starts with http:// or https://
    const urlRegex = /^https?:\/\//i
    if (urlRegex.test(trimmedAddress)) {
      return { type: 'url', modules: ['icmp', 'http_2xx'] }
    }

    // Domain name validation (if not a URL and not an IP)
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/
    if (domainRegex.test(trimmedAddress)) {
      return { type: 'domain', modules: ['icmp'] }
    }

    // Default fallback for invalid addresses
    return { type: 'domain', modules: ['icmp'] }
  }

  const validateTargetAddress = (address: string): { isValid: boolean; error?: string } => {
    if (!address || address.trim() === '') {
      return { isValid: false, error: 'Target address is required' }
    }

    const trimmedAddress = address.trim()

    // Check for spaces (invalid format)
    if (trimmedAddress.includes(' ')) {
      return { 
        isValid: false, 
        error: 'Invalid target address. Addresses cannot contain spaces. Please enter a valid IP address, domain name, or URL (e.g., 192.168.1.1, example.com, or https://example.com)' 
      }
    }

    // Check for multiple dots in sequence (invalid format)
    if (trimmedAddress.includes('..')) {
      return { 
        isValid: false, 
        error: 'Invalid target address. Please enter a valid IP address, domain name, or URL (e.g., 192.168.1.1, example.com, or https://example.com)' 
      }
    }

    // IPv4 address validation (strict)
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    if (ipv4Regex.test(trimmedAddress)) {
      return { isValid: true }
    }

    // IPv6 address validation (strict)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:){1,7}:|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})$|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)$/
    if (ipv6Regex.test(trimmedAddress)) {
      return { isValid: true }
    }

    // Domain name validation (strict - no spaces, no consecutive dots, proper format)
    const domainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
    if (domainRegex.test(trimmedAddress)) {
      return { isValid: true }
    }

    // Single word domain (like localhost) validation
    const singleWordDomainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
    if (singleWordDomainRegex.test(trimmedAddress) && trimmedAddress.length <= 63) {
      return { isValid: true }
    }

    // URL validation (strict)
    try {
      const url = new URL(trimmedAddress)
      // Check if URL has valid protocol and hostname
      if (url.protocol && url.hostname && !url.hostname.includes(' ') && !url.hostname.includes('..')) {
        return { isValid: true }
      }
    } catch (e) {
      // If URL parsing fails, try adding http:// prefix for domain validation
      try {
        const url = new URL(`http://${trimmedAddress}`)
        if (url.hostname && !url.hostname.includes(' ') && !url.hostname.includes('..')) {
          return { isValid: true }
        }
      } catch (e2) {
        // Invalid URL format
      }
    }

    return { 
      isValid: false, 
      error: 'Invalid target address. Please enter a valid IP address (e.g., 192.168.1.1), domain name (e.g., example.com), or URL (e.g., https://example.com)' 
    }
  }

  const validateLabels = (labels: {key: string, value: string}[]): { isValid: boolean; errors: { [key: string]: string } } => {
    const errors: { [key: string]: string } = {}
    const labelRegex = /^[a-zA-Z0-9._-]+$/
    
    labels.forEach((label, index) => {
      // Validate key
      if (label.key.trim()) {
        if (!labelRegex.test(label.key)) {
          errors[`label_key_${index}`] = 'Label keys can only contain letters, numbers, hyphens (-), underscores (_), and dots (.)'
        }
      }
      
      // Validate value
      if (label.value.trim()) {
        if (!labelRegex.test(label.value)) {
          errors[`label_value_${index}`] = 'Label values can only contain letters, numbers, hyphens (-), underscores (_), and dots (.)'
        }
      }
    })
    
    return { isValid: Object.keys(errors).length === 0, errors }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedTargets.map(target => target.id))
      setSelectedTargets(allIds)
      setIsMultiSelectMode(true)
      setLastClickedIndex(paginatedTargets.length - 1) // Set to last index
    } else {
      setSelectedTargets(new Set())
      setIsMultiSelectMode(false)
      setLastClickedIndex(null)
    }
  }

  // Direct bulk toggle function for enabling/disabling multiple targets
  const handleBulkToggle = async (targetIds: string[], enable: boolean) => {
    try {
      const promises = targetIds.map(async (targetId) => {
        const target = targets.find(t => t.id === targetId)
        if (!target) return Promise.resolve()
        
        const currentStatus = getEnabledStatus(target)
        // Skip if already in desired state
        if (currentStatus === enable) return Promise.resolve()
        
        // Create the new labels object
        let newLabels = { __tmp_enabled: enable.toString() }
        
        // If target has existing labels, parse and merge them (excluding __tmp_enabled)
        if (target.labels) {
          try {
            const existingLabels = JSON.parse(target.labels)
            // Copy all existing labels except __tmp_enabled
            Object.keys(existingLabels).forEach(key => {
              if (key !== '__tmp_enabled') {
                newLabels[key] = existingLabels[key]
              }
            })
          } catch (e) {
            // If labels are not valid JSON, ignore and start fresh
          }
        }
        
        const updatedLabels = JSON.stringify(newLabels)
        
        // Update the target via API
        const response = await fetch(`/api/targets/${targetId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ labels: updatedLabels }),
        })
        
        if (response.ok) {
          return await response.json()
        } else {
          throw new Error(`Failed to update target ${targetId}`)
        }
      })
      
      const results = await Promise.all(promises)
      
      // Update local state with all successful results
      setTargets(prevTargets => 
        prevTargets.map(target => {
          const updatedTarget = results.find(r => r && r.id === target.id)
          return updatedTarget || target
        })
      )
      
    } catch (error) {
      console.error('Bulk toggle failed:', error)
      throw error
    }
  }

  const handleBulkEnable = async () => {
    try {
      await handleBulkToggle(Array.from(selectedTargets), true)
      toast({
        title: "Success",
        description: `Successfully enabled ${selectedTargets.size} target(s)`,
        variant: "success",
      })
      clearSelection()
    } catch (error) {
      console.error('Bulk enable failed:', error)
      toast({
        title: "Error",
        description: "Failed to enable some targets",
        variant: "error",
      })
    }
  }

  const handleBulkDisable = async () => {
    try {
      await handleBulkToggle(Array.from(selectedTargets), false)
      toast({
        title: "Success",
        description: `Successfully disabled ${selectedTargets.size} target(s)`,
        variant: "success",
      })
      clearSelection()
    } catch (error) {
      console.error('Bulk disable failed:', error)
      toast({
        title: "Error",
        description: "Failed to disable some targets",
        variant: "error",
      })
    }
  }

  const handleBulkDelete = async () => {
    setShowBulkDeleteDialog(true)
  }

  const confirmBulkDelete = async () => {
    setShowBulkDeleteDialog(false)
    
    try {
      const targetIds = Array.from(selectedTargets)
      
      // Delete metrics for all targets if needed (this would require additional UI for the deleteMetrics option)
      // For now, just delete the targets
      
      const promises = targetIds.map(async (targetId) => {
        const response = await fetch(`/api/targets/${targetId}`, { 
          method: 'DELETE' 
        })
        
        if (!response.ok) {
          throw new Error(`Failed to delete target ${targetId}`)
        }
        
        return targetId
      })
      
      await Promise.all(promises)
      
      // Update local state by removing deleted targets
      const remainingTargets = targets.filter(target => !selectedTargets.has(target.id))
      setTargets(remainingTargets)
      setAvailableLabelKeys(extractAvailableLabelKeys(remainingTargets))
      setAvailableLabelValues(extractAvailableLabelValues(remainingTargets))
      
      // Update saved target order after bulk deletion
      const targetOrder = remainingTargets.map(t => t.id)
      localStorage.setItem('pbxrTargetOrder', JSON.stringify(targetOrder))
      
      // Check if current page becomes empty and go back to previous page if needed
      const totalPagesAfterDelete = Math.ceil(remainingTargets.length / itemsPerPage)
      if (currentPage > totalPagesAfterDelete && totalPagesAfterDelete > 0) {
        setCurrentPage(totalPagesAfterDelete)
      }
      
      toast({
        title: "Success",
        description: `Successfully deleted ${selectedTargets.size} target(s)`,
        variant: "success",
      })
      clearSelection()
    } catch (error) {
      console.error('Bulk delete failed:', error)
      toast({
        title: "Error",
        description: "Failed to delete some targets",
        variant: "error",
      })
    }
  }

  const handleReorder = async (draggedId: string, targetId: string, position: 'before' | 'after' = 'after') => {
    try {
      const draggedIndex = targets.findIndex(t => t.id === draggedId)
      const targetIndex = targets.findIndex(t => t.id === targetId)
      
      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return
      
      const newTargets = [...targets]
      const [draggedTarget] = newTargets.splice(draggedIndex, 1)
      
      // Calculate new index based on position
      let newIndex = targetIndex
      if (draggedIndex < targetIndex && position === 'after') {
        newIndex = targetIndex - 1
      } else if (draggedIndex > targetIndex && position === 'before') {
        newIndex = targetIndex
      } else if (position === 'after') {
        newIndex = targetIndex + 1
      }
      
      newTargets.splice(newIndex, 0, draggedTarget)
      
      // Add animation class
      const animatedTargets = newTargets.map((target, index) => ({
        ...target,
        _animating: true,
        _newIndex: index
      }))
      
      setTargets(animatedTargets)
      
      // Remove animation class after transition
      setTimeout(() => {
        setTargets(prev => prev.map(t => ({ ...t, _animating: false, _newIndex: undefined })))
      }, 300)
      
      // Save target order to localStorage
      const targetOrder = newTargets.map(t => t.id)
      localStorage.setItem('pbxrTargetOrder', JSON.stringify(targetOrder))
    } catch (error) {
      console.error('Reorder failed:', error)
      setError('Failed to reorder targets')
    }
  }

  const handleColumnReorder = (draggedColumn: string, targetColumn: string, position: 'before' | 'after' = 'after') => {
    const draggedIndex = columnOrder.indexOf(draggedColumn)
    const targetIndex = columnOrder.indexOf(targetColumn)
    
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return
    
    const newColumnOrder = [...columnOrder]
    const [removed] = newColumnOrder.splice(draggedIndex, 1)
    
    // Calculate new index based on position
    let newIndex = targetIndex
    if (draggedIndex < targetIndex && position === 'after') {
      newIndex = targetIndex - 1
    } else if (draggedIndex > targetIndex && position === 'before') {
      newIndex = targetIndex
    } else if (position === 'after') {
      newIndex = targetIndex + 1
    }
    
    newColumnOrder.splice(newIndex, 0, removed)
    
    // Calculate positions for smooth animation
    const newPositions: {[key: string]: number} = {}
    newColumnOrder.forEach((column, index) => {
      newPositions[column] = index
    })
    
    setIsColumnAnimating(true)
    setColumnPositions(newPositions)
    
    // Update column order after a brief delay to allow animation to start
    setTimeout(() => {
      setColumnOrder(newColumnOrder)
      
      // Save to localStorage
      localStorage.setItem('pbxrColumnOrder', JSON.stringify(newColumnOrder))
      
      // Reset animation state
      setTimeout(() => {
        setIsColumnAnimating(false)
        setColumnPositions({})
      }, 300)
    }, 50)
  }

  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    if (!isReorderMode) return
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.classList.add('dragging', 'opacity-50', 'scale-95')
    e.dataTransfer.setData('text/plain', columnId)
    
    // Create a custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    dragImage.classList.add('drag-preview')
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 50, 20)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleColumnDragEnd = (e: React.DragEvent) => {
    if (!isReorderMode) return
    setDraggedColumn(null)
    setDropTargetColumn(null)
    setDragOverPosition(null)
    e.currentTarget.classList.remove('dragging', 'opacity-50', 'scale-95')
    
    // Clean up all indicators
    document.querySelectorAll('th[data-column-id]').forEach(th => {
      th.classList.remove('drop-target', 'bg-blue-100', 'dark:bg-blue-900/30', 'column-drop-indicator-left', 'column-drop-indicator-right')
    })
  }

  const handleColumnDragOver = (e: React.DragEvent) => {
    if (!isReorderMode) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleColumnDrop = (e: React.DragEvent, targetColumn: string) => {
    if (!isReorderMode || !draggedColumn || draggedColumn === targetColumn) return
    e.preventDefault()
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    const position = x < width / 2 ? 'before' : 'after'
    
    handleColumnReorder(draggedColumn, targetColumn, position)
    
    // Clean up all indicators
    document.querySelectorAll('th[data-column-id]').forEach(th => {
      th.classList.remove('drop-target', 'bg-blue-100', 'dark:bg-blue-900/30', 'column-drop-indicator-left', 'column-drop-indicator-right')
    })
  }

  const handleColumnDragEnter = (e: React.DragEvent) => {
    if (!isReorderMode || !draggedColumn) return
    e.preventDefault()
    const columnId = e.currentTarget.getAttribute('data-column-id') || ''
    if (columnId === draggedColumn) return // Don't show indicator on the dragged column itself
    
    setDropTargetColumn(columnId)
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    const position = x < width / 2 ? 'before' : 'after'
    setDragOverPosition(position)
    
    // Clear previous indicators from all columns
    document.querySelectorAll('th[data-column-id]').forEach(th => {
      th.classList.remove('drop-target', 'bg-blue-100', 'dark:bg-blue-900/30', 'column-drop-indicator-left', 'column-drop-indicator-right')
    })
    
    // Add indicators to current column
    e.currentTarget.classList.add('drop-target', 'bg-blue-100', 'dark:bg-blue-900/30')
    if (position === 'before') {
      e.currentTarget.classList.add('column-drop-indicator-left')
    } else {
      e.currentTarget.classList.add('column-drop-indicator-right')
    }
  }

  const handleColumnDragLeave = (e: React.DragEvent) => {
    if (!isReorderMode) return
    // Only remove if we're actually leaving the column (not entering a child element)
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      e.currentTarget.classList.remove('drop-target', 'bg-blue-100', 'dark:bg-blue-900/30', 'column-drop-indicator-left', 'column-drop-indicator-right')
      setDropTargetColumn(null)
      setDragOverPosition(null)
    }
  }

  // Helper function to get cell padding based on view mode
  const getCellPadding = () => {
    return isCompactView ? 'px-3 py-2' : 'px-4 py-4'
  }

  // Helper function to get header padding based on view mode
  const getHeaderPadding = () => {
    return isCompactView ? 'px-3 py-2' : 'px-4 py-3'
  }

  // Helper function to render columns based on order
  const renderColumn = (columnId: string, target: BlackboxTarget) => {
    const currentIndex = columnOrder.indexOf(columnId)
    const targetIndex = columnPositions[columnId] !== undefined ? columnPositions[columnId] : currentIndex
    const isAnimating = isColumnAnimating && columnPositions[columnId] !== undefined
    const translateX = isAnimating ? (targetIndex - currentIndex) * 100 : 0

    const getAnimatedCellStyle = (content: React.ReactNode) => (
      <td
        key={columnId}
        className={getCellPadding()}
        style={{
          transform: isAnimating ? `translateX(${translateX}px)` : 'none',
          transition: isAnimating ? 'transform 0.3s ease-in-out' : 'none',
          zIndex: isAnimating ? 10 : 1,
          position: isAnimating ? 'relative' : 'static'
        }}
      >
        {content}
      </td>
    )

    switch (columnId) {
      case 'target':
        return getAnimatedCellStyle(
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
              {target.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs" title={target.url}>
              {target.url}
            </div>
          </div>
        )
      
      case 'module':
        return getAnimatedCellStyle(
          <Badge 
            variant="secondary" 
            className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              handleModuleClick(target.module)
            }}
            title="Click to search for this module"
          >
            {target.module}
          </Badge>
        )
      
      case 'labels':
        return getAnimatedCellStyle(
          target.labels ? (
            <div className="flex flex-wrap gap-1 max-w-md">
              {(() => {
                try {
                  const parsedLabels = JSON.parse(target.labels)
                  const filteredLabels = Object.entries(parsedLabels).filter(([key]) => key !== '__tmp_enabled')
                  const isExpanded = expandedLabels.has(target.id)
                  const labelsToShow = isExpanded ? filteredLabels : filteredLabels.slice(0, 5)
                  
                  return labelsToShow.map(([key, value]) => (
                    <Badge 
                      key={key} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLabelClick(key, value)
                      }}
                      title="Click to search for this label"
                    >
                      {key}={value}
                    </Badge>
                  ))
                } catch (e) {
                  const labelPairs = target.labels.split(',').map((pair: string) => pair.trim())
                  const filteredPairs = labelPairs
                    .map((pair: string, index: number) => {
                      const [key, value] = pair.split('=').map((s: string) => s.trim())
                      return { key, value, index }
                    })
                    .filter(({ key }) => key !== '__tmp_enabled')
                  
                  const isExpanded = expandedLabels.has(target.id)
                  const pairsToShow = isExpanded ? filteredPairs : filteredPairs.slice(0, 5)
                  
                  return pairsToShow.map(({ key, value, index }) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLabelClick(key, value)
                      }}
                      title="Click to search for this label"
                    >
                      {key}={value}
                    </Badge>
                  ))
                }
              })()}
              {(() => {
                try {
                  const parsedLabels = JSON.parse(target.labels)
                  const filteredLabels = Object.entries(parsedLabels).filter(([key]) => key !== '__tmp_enabled')
                  if (filteredLabels.length > 5) {
                    const isExpanded = expandedLabels.has(target.id)
                    return (
                      <Badge 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpandedLabels(target.id)
                        }}
                        title={`Click to ${isExpanded ? 'show less' : 'show all'} labels`}
                      >
                        {isExpanded ? '−' : `+${filteredLabels.length - 5}`}
                      </Badge>
                    )
                  }
                } catch (e) {
                  const labelPairs = target.labels.split(',').map((pair: string) => pair.trim())
                  const filteredPairs = labelPairs
                    .map((pair: string) => {
                      const [key, value] = pair.split('=').map((s: string) => s.trim())
                      return { key, value }
                    })
                    .filter(({ key }) => key !== '__tmp_enabled')
                  if (filteredPairs.length > 5) {
                    const isExpanded = expandedLabels.has(target.id)
                    return (
                      <Badge 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpandedLabels(target.id)
                        }}
                        title={`Click to ${isExpanded ? 'show less' : 'show all'} labels`}
                      >
                        {isExpanded ? '−' : `+${filteredPairs.length - 5}`}
                      </Badge>
                    )
                  }
                }
                return null
              })()}
            </div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )
        )
      
      case 'prober':
        return getAnimatedCellStyle(
          target.probeAssignments ? (
            <div className="flex flex-wrap gap-1">
                {(() => {
                  try {
                    const probeIds = JSON.parse(target.probeAssignments)
                    return probeIds.map((probeId: string) => {
                      const prober = probers.find(p => p.id === probeId)
                      return (
                        <Badge 
                          key={probeId} 
                          variant={prober?.enabled ? "secondary" : "destructive"}
                          className={`text-xs cursor-pointer transition-colors ${
                            prober?.enabled 
                              ? "hover:bg-gray-200 dark:hover:bg-gray-600" 
                              : "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                          }`}
                          title={prober ? `${prober.name} - ${prober.address}${prober.enabled ? '' : ' (Disabled)'}` : `Unknown prober: ${probeId}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleProberFilter(prober?.name || probeId)
                          }}
                        >
                          {prober?.name || probeId}
                        </Badge>
                      )
                    })
                  } catch (e) {
                    return <span className="text-sm text-gray-400">-</span>
                  }
                })()}
              </div>
            ) : (
              <Badge 
                variant="outline" 
                className="text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  handleProberFilter('unassigned')
                }}
                title="Click to filter by unassigned targets"
              >
                unassigned
              </Badge>
            )
          )
      
      case 'status':
        return getAnimatedCellStyle(
          (() => {
              const isEnabled = getEnabledStatus(target)
              return (
                <Badge 
                  variant={isEnabled ? 'default' : 'secondary'} 
                  className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${isEnabled ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-700' : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-700'}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStatusClick(isEnabled)
                  }}
                  title="Click to search for this status"
                >
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              )
            })()
          )
      
      case 'actions':
        return getAnimatedCellStyle(
          <div className="flex justify-end gap-2 items-center">
              <Switch
                checked={getEnabledStatus(target)}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={() => {
                  const currentStatus = getEnabledStatus(target)
                  console.log('Switch clicked for target:', target.id, 'current status:', currentStatus)
                  handleToggle(target.id, currentStatus)
                }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openEditDialog(target)
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openDuplicateDialog(target)
                  }}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openDeleteDialog(target.id)
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
      
      default:
        return null
    }
  }

  // Helper function to render column headers
  const renderColumnHeader = (columnId: string) => {
    const columnTitles: { [key: string]: string } = {
      'target': 'Target',
      'module': 'Module',
      'labels': 'Labels',
      'prober': 'Prober',
      'status': 'Status',
      'actions': 'Actions'
    }

    const currentIndex = columnOrder.indexOf(columnId)
    const targetIndex = columnPositions[columnId] !== undefined ? columnPositions[columnId] : currentIndex
    const isAnimating = isColumnAnimating && columnPositions[columnId] !== undefined
    const translateX = isAnimating ? (targetIndex - currentIndex) * 100 : 0

    return (
      <th
        key={columnId}
        data-column-id={columnId}
        style={{
          transform: isAnimating ? `translateX(${translateX}px)` : 'none',
          transition: isAnimating ? 'transform 0.3s ease-in-out' : 'none',
          zIndex: isAnimating ? 10 : 1,
          position: isAnimating ? 'relative' : 'static'
        }}
        className={`${getHeaderPadding()} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
          columnId === 'actions' ? 'text-right' : ''
        } ${
          isReorderMode ? 'cursor-move hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 ease-in-out' : ''
        } ${
          draggedColumn === columnId ? 'opacity-50 scale-95' : ''
        } ${
          dropTargetColumn === columnId ? 'bg-blue-100 dark:bg-blue-900/30' : ''
        } ${
          isColumnAnimating ? 'transition-all duration-300 ease-in-out' : ''
        }`}
        draggable={isReorderMode}
        onDragStart={(e) => handleColumnDragStart(e, columnId)}
        onDragEnd={handleColumnDragEnd}
        onDragOver={handleColumnDragOver}
        onDrop={(e) => handleColumnDrop(e, columnId)}
        onDragEnter={handleColumnDragEnter}
        onDragLeave={handleColumnDragLeave}
      >
        <div className="flex items-center gap-2">
          {isReorderMode && <GripVertical className="w-4 h-4 text-gray-400" />}
          {columnTitles[columnId]}
        </div>
      </th>
    )
  }

  // Search suggestions
  const staticSearchSuggestions = [
    { label: 'name:', placeholder: 'name:', description: 'Search by target name' },
    { label: 'address:', placeholder: 'address:', description: 'Search by target URL' },
    { label: 'labels:', placeholder: 'labels:', description: 'Search by labels' },
    { label: 'module:', placeholder: 'module:', description: 'Search by module type' },
    { label: 'status:', placeholder: 'status:', description: 'Search by enabled/disabled status' },
    { label: 'prober:', placeholder: 'prober:', description: 'Search by assigned prober' },
  ]

  // Fetch search suggestions from API
  const fetchSearchSuggestions = async (prefix: string, query: string) => {
    try {
      const response = await fetch(`/api/targets/search-suggestions?prefix=${encodeURIComponent(prefix)}&query=${encodeURIComponent(query)}`)
      
      if (response.ok) {
        const suggestions = await response.json()
        setSearchSuggestions(suggestions)
        setShowSearchSuggestions(true)
      } else {
        setSearchSuggestions(staticSearchSuggestions)
        setShowSearchSuggestions(true)
      }
    } catch (error) {
      console.error('Failed to fetch search suggestions:', error)
      setSearchSuggestions(staticSearchSuggestions)
      setShowSearchSuggestions(true)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setSearchSuggestionIndex(0)
    
    // Check if user is typing a prefix with colon but no content after (e.g., "name:")
    const colonMatch = value.match(/^(name|address|labels|module|status|prober):$/i)
    if (colonMatch) {
      const prefix = colonMatch[1].toLowerCase()
      fetchSearchSuggestions(prefix, '')
      return
    }
    
    // Check if user is typing a structured search with content (e.g., "name:exam" or "name: example")
    const match = value.match(/^(name|address|labels|module|status|prober):\s*(.+)?$/i)
    if (match) {
      const prefix = match[1].toLowerCase()
      const query = match[2] || ''
      fetchSearchSuggestions(prefix, query)
    } else if (value.trim() === '') {
      setSearchSuggestions(staticSearchSuggestions)
      setShowSearchSuggestions(true)
    } else {
      // Check for partial prefix matches
      const partialMatches = staticSearchSuggestions.filter(suggestion =>
        suggestion.label.startsWith(value.toLowerCase())
      )
      
      if (partialMatches.length > 0) {
        setSearchSuggestions(partialMatches)
        setShowSearchSuggestions(true)
      } else {
        setShowSearchSuggestions(false)
      }
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearchSuggestions) {
      // Handle Tab key even when suggestions are not shown
      if (e.key === 'Tab') {
        const currentQuery = searchQuery.trim()
        if (currentQuery && !currentQuery.includes(':')) {
          // Check for partial prefix matches
          const matches = staticSearchSuggestions.filter(suggestion =>
            suggestion.label.startsWith(currentQuery.toLowerCase())
          )
          
          if (matches.length === 1) {
            e.preventDefault()
            const completedPrefix = matches[0].placeholder // e.g., "labels:"
            setSearchQuery(completedPrefix)
            setShowSearchSuggestions(true)
            setSearchSuggestionIndex(0)
            // Fetch suggestions for this prefix
            const prefix = matches[0].label.replace(':', '') // e.g., "labels"
            setTimeout(() => {
              fetchSearchSuggestions(prefix, '')
              setSearchSuggestionIndex(0) // Reset to first suggestion but don't auto-apply
            }, 100)
            return
          }
        }
      }
      return
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSearchSuggestionIndex(prev => (prev + 1) % searchSuggestions.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSearchSuggestionIndex(prev => (prev - 1 + searchSuggestions.length) % searchSuggestions.length)
        break
      case 'Tab':
        e.preventDefault()
        const selectedSuggestion = searchSuggestions[searchSuggestionIndex]
        if (selectedSuggestion) {
          const currentQuery = searchQuery.trim()
          
          // Check if user is typing a partial prefix (like "label" -> "labels:")
          if (!currentQuery.includes(':') && selectedSuggestion.label.startsWith(currentQuery.toLowerCase())) {
            // Autocomplete to prefix only, not the full suggestion
            const completedPrefix = selectedSuggestion.placeholder // e.g., "labels:"
            setSearchQuery(completedPrefix)
            // Trigger suggestions for the completed prefix, but don't auto-select the first one
            const prefix = selectedSuggestion.label.replace(':', '') // e.g., "labels"
            setTimeout(() => {
              fetchSearchSuggestions(prefix, '')
              setSearchSuggestionIndex(0) // Reset to first suggestion but don't auto-apply
            }, 100)
            return // Exit early to prevent applying the full suggestion
          } else if (!currentQuery.includes(':') && staticSearchSuggestions.some(s => s.label === selectedSuggestion.label)) {
            // User is selecting a static prefix suggestion (like clicking on "labels:" from the list)
            const completedPrefix = selectedSuggestion.placeholder // e.g., "labels:"
            setSearchQuery(completedPrefix)
            // Trigger suggestions for the completed prefix, but don't auto-select the first one
            const prefix = selectedSuggestion.label.replace(':', '') // e.g., "labels"
            setTimeout(() => {
              fetchSearchSuggestions(prefix, '')
              setSearchSuggestionIndex(0) // Reset to first suggestion but don't auto-apply
            }, 100)
            return // Exit early to prevent applying the full suggestion
          } else {
            // For value suggestions (after prefix), apply the full suggestion
            setSearchQuery(selectedSuggestion.placeholder)
            setShowSearchSuggestions(false)
          }
        }
        break
      case 'Enter':
        e.preventDefault()
        const enterSuggestion = searchSuggestions[searchSuggestionIndex]
        setSearchQuery(enterSuggestion.placeholder)
        setShowSearchSuggestions(false)
        break
      case 'Escape':
        setShowSearchSuggestions(false)
        break
    }
  }

  const applySuggestion = (suggestion: typeof searchSuggestions[0]) => {
  const currentQuery = searchQuery.trim()
  
  // Check if this is a prefix suggestion (from static suggestions) or value suggestion
  if (!currentQuery.includes(':') && staticSearchSuggestions.some(s => s.label === suggestion.label)) {
    // This is a prefix suggestion, autocomplete to prefix only
    setSearchQuery(suggestion.placeholder) // e.g., "labels:"
    // Trigger value suggestions for this prefix
    const prefix = suggestion.label.replace(':', '') // e.g., "labels"
    setTimeout(() => {
      fetchSearchSuggestions(prefix, '')
      setSearchSuggestionIndex(0) // Reset to first suggestion but don't auto-apply
    }, 100)
  } else {
    // This is a value suggestion, apply the full suggestion
    setSearchQuery(suggestion.placeholder)
    setShowSearchSuggestions(false)
  }
}

  const handleSearchFocus = () => {
    if (searchQuery.trim() === '') {
      setSearchSuggestions(staticSearchSuggestions)
      setShowSearchSuggestions(true)
    }
  }

  const handleSearchBlur = () => {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => setShowSearchSuggestions(false), 200)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setShowSearchSuggestions(false)
    setSearchSuggestionIndex(0)
  }
  // Filter and paginate targets
  // Filter and paginate targets
  const filteredTargets = targets.filter(target => {
    if (searchQuery === '') return true
    
    const searchLower = searchQuery.toLowerCase()
    
    // Handle structured search queries
    if (searchQuery.includes(':')) {
      const [prefix, ...valueParts] = searchLower.split(':')
      const value = valueParts.join(':').trim()
      
      switch (prefix) {
        case 'name':
          return target.name.toLowerCase().includes(value)
        case 'address':
          return target.url.toLowerCase().includes(value)
        case 'labels':
          if (!target.labels) return false
          
          try {
            // Try to parse as JSON first
            const labelsObj = typeof target.labels === 'string' ? JSON.parse(target.labels) : target.labels
            
            // Check if the value matches any label in the format "key=value" or partial matches
            for (const [key, val] of Object.entries(labelsObj)) {
              const labelString = `${key}=${val}`
              if (labelString.toLowerCase().includes(value.toLowerCase()) ||
                  key.toLowerCase().includes(value.toLowerCase()) ||
                  String(val).toLowerCase().includes(value.toLowerCase())) {
                return true
              }
            }
            
            return false
          } catch (e) {
            console.log('Failed to parse labels for target:', target.name, 'labels:', target.labels)
            // Fallback to key=value parsing for non-JSON labels
            const labelPairs = target.labels.split(',').map((pair: string) => pair.trim())
            return labelPairs.some((pair: string) => {
              return pair.toLowerCase().includes(value.toLowerCase())
            })
          }
        case 'module':
          return target.module.toLowerCase().includes(value)
        case 'status':
          const isEnabled = getEnabledStatus(target)
          if (value === 'enabled') return isEnabled
          if (value === 'disabled') return !isEnabled
          return false
        case 'prober':
        case 'probe':
          if (value === 'unassigned') {
            return !target.probeAssignments
          }
          
          if (!target.probeAssignments) return false
          
          try {
            const probeIds = JSON.parse(target.probeAssignments)
            return probeIds.some((probeId: string) => {
              const prober = probers.find(p => p.id === probeId)
              return prober && (
                prober.name.toLowerCase().includes(value.toLowerCase()) ||
                prober.address.toLowerCase().includes(value.toLowerCase())
              )
            })
          } catch (e) {
            return false
          }
        default:
          // Fallback to general search if prefix not recognized
          return target.name.toLowerCase().includes(searchLower) ||
                 target.url.toLowerCase().includes(searchLower) ||
                 target.module.toLowerCase().includes(searchLower) ||
                 (target.labels && target.labels.toLowerCase().includes(searchLower))
      }
    }
    
    // Default search behavior (search all fields)
    return target.name.toLowerCase().includes(searchLower) ||
           target.url.toLowerCase().includes(searchLower) ||
           target.module.toLowerCase().includes(searchLower) ||
           (target.labels && target.labels.toLowerCase().includes(searchLower))
  })

  const totalPages = Math.ceil(filteredTargets.length / itemsPerPage)
  const paginatedTargets = filteredTargets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, itemsPerPage])

  // Close context menu when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showContextMenu) {
        closeContextMenu()
      }
      
      // Exit multi-select mode when clicking outside the table
      if (isMultiSelectMode && event.target instanceof Element) {
        const tableElement = event.target.closest('table')
        const contextMenuElement = event.target.closest('[role="menu"]')
        const isDropdownTrigger = event.target.closest('[data-dropdown-trigger]')
        
        if (!tableElement && !contextMenuElement && !isDropdownTrigger) {
          clearSelection()
        }
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showContextMenu) {
        closeContextMenu()
      }
      if (e.key === 'Escape' && isMultiSelectMode) {
        clearSelection()
      }
      // Handle Ctrl+A to select all targets on current page
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Only if not in an input field
        const activeElement = document.activeElement
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' || 
          activeElement.getAttribute('contenteditable') === 'true'
        )) {
          return // Let default behavior work in input fields
        }
        
        e.preventDefault() // Prevent default select all behavior
        if (paginatedTargets.length > 0) {
          const allIds = new Set(paginatedTargets.map(target => target.id))
          setSelectedTargets(allIds)
          setIsMultiSelectMode(true)
        }
      }
    }

    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showContextMenu, isMultiSelectMode, paginatedTargets])

  useEffect(() => {
    // Update available labels when hiddenLabels changes
    if (targets.length > 0) {
      setAvailableLabelKeys(extractAvailableLabelKeys(targets))
      setAvailableLabelValues(extractAvailableLabelValues(targets))
    }
  }, [hiddenLabels, targets])

  // Update value suggestions when key changes
  useEffect(() => {
    // If value suggestions are currently showing, refresh them based on the new key
    if (showValueSuggestions && currentEditingIndex !== null && currentEditingField === 'value') {
      const index = currentEditingIndex
      const currentKey = labelsList[index]?.key || ''
      const currentValue = labelsList[index]?.value || ''
      
      // Recalculate filtered values based on new key
      let filteredValues: string[]
      if (currentValue.trim() === '') {
        if (currentKey.trim()) {
          filteredValues = extractValuesForKey(targets, currentKey).slice(0, 3)
        } else {
          filteredValues = availableLabelValues.slice(0, 3)
        }
      } else {
        if (currentKey.trim()) {
          const keySpecificValues = extractValuesForKey(targets, currentKey)
          filteredValues = keySpecificValues.filter(val => 
            val.toLowerCase().includes(currentValue.toLowerCase())
          ).slice(0, 3)
        } else {
          filteredValues = availableLabelValues.filter(val => 
            val.toLowerCase().includes(currentValue.toLowerCase())
          ).slice(0, 3)
        }
      }
      
      // Hide suggestions if no values available
      if (filteredValues.length === 0) {
        setShowValueSuggestions(false)
        setSuggestionPosition(null)
      }
    }
    
    // Show value suggestions when a key is selected and we're in value field
    if (currentEditingField === 'value' && currentEditingIndex !== null) {
      const index = currentEditingIndex
      const currentKey = labelsList[index]?.key || ''
      const currentValue = labelsList[index]?.value || ''
      
      let filteredValues: string[]
      if (currentValue.trim() === '') {
        if (currentKey.trim()) {
          filteredValues = extractValuesForKey(targets, currentKey).slice(0, 3)
        } else {
          filteredValues = availableLabelValues.slice(0, 3)
        }
      } else {
        if (currentKey.trim()) {
          const keySpecificValues = extractValuesForKey(targets, currentKey)
          filteredValues = keySpecificValues.filter(val => 
            val.toLowerCase().includes(currentValue.toLowerCase())
          ).slice(0, 3)
        } else {
          filteredValues = availableLabelValues.filter(val => 
            val.toLowerCase().includes(currentValue.toLowerCase())
          ).slice(0, 3)
        }
      }
      
      if (filteredValues.length > 0) {
        setShowValueSuggestions(true)
        setActiveValueIndex(0)
        
        // Set position - we need to find the value input element
        const valueInput = document.querySelector(`input[data-value-row="${index}"]`) as HTMLInputElement
        if (valueInput) {
          const containerElement = valueInput.closest('.relative') as HTMLElement
          if (containerElement) {
            const inputRect = valueInput.getBoundingClientRect()
            const containerRect = containerElement.getBoundingClientRect()
            
            setSuggestionPosition({
              top: inputRect.bottom - containerRect.top,
              left: inputRect.left - containerRect.left,
              width: inputRect.width
            })
          }
        }
      }
    }
  }, [labelsList, showValueSuggestions, currentEditingIndex, currentEditingField, targets, availableLabelValues])

  const fetchTargets = async () => {
    try {
      const response = await fetch('/api/targets')
      if (response.ok) {
        const data = await response.json()
        
        // Apply saved target order if exists
        const savedTargetOrder = localStorage.getItem('pbxrTargetOrder')
        if (savedTargetOrder) {
          try {
            const savedOrder = JSON.parse(savedTargetOrder)
            if (Array.isArray(savedOrder) && savedOrder.length > 0) {
              // Create a map of target ID to target object for quick lookup
              const targetMap = new Map(data.map((target: BlackboxTarget) => [target.id, target]))
              
              // Reorder targets according to saved order, placing any new targets at the end
              const orderedTargets: BlackboxTarget[] = []
              const seenIds = new Set<string>()
              
              // Add targets in saved order
              savedOrder.forEach((id: string) => {
                const target = targetMap.get(id)
                if (target) {
                  orderedTargets.push(target)
                  seenIds.add(id)
                }
              })
              
              // Add any new targets that weren't in the saved order
              data.forEach((target: BlackboxTarget) => {
                if (!seenIds.has(target.id)) {
                  orderedTargets.push(target)
                }
              })
              
              setTargets(orderedTargets)
              setAvailableLabelKeys(extractAvailableLabelKeys(orderedTargets))
              setAvailableLabelValues(extractAvailableLabelValues(orderedTargets))
              return
            }
          } catch (error) {
            console.error('Failed to parse saved target order:', error)
          }
        }
        
        // If no saved order or parsing failed, use original order
        setTargets(data)
        setAvailableLabelKeys(extractAvailableLabelKeys(data))
        setAvailableLabelValues(extractAvailableLabelValues(data))
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch targets",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      module: 'http_2xx',
      labels: ''
    })
    setLabelsList([])
    setSelectedProbers([])
    setShowKeySuggestions(false)
    setSuggestionPosition(null)
    setCurrentEditingIndex(null)
    setActiveKeyIndex(0)
    setEditingTarget(null)
    setValidationErrors({})
  }

  const openDetailsDialog = (target: BlackboxTarget) => {
    setViewingTarget(target)
    setShowDetailsDialog(true)
  }

  const handleProberFilter = (proberName: string) => {
    setSearchQuery(`prober:${proberName}`)
    setShowAddDropdown(false)
  }

  const handleTargetStatusFilter = (status: 'enabled' | 'disabled' | 'unassigned') => {
    setSearchQuery(`status:${status}`)
    setShowAddDropdown(false)
  }

  const openEditDialog = (target: BlackboxTarget) => {
    fetchProbers() // Refresh probers list
    setEditingTarget(target)
    
    // Parse existing labels into the labels list
    let parsedLabels: {key: string, value: string}[] = []
    if (target.labels) {
      try {
        const labelsObj = JSON.parse(target.labels)
        const { __tmp_enabled, ...otherLabels } = labelsObj
        parsedLabels = Object.entries(otherLabels).map(([key, value]) => ({ key, value: String(value) }))
        console.log('Parsed labels from JSON:', parsedLabels)
      } catch (e) {
        // If labels are not valid JSON, treat as key=value pairs
        const labelPairs = target.labels.split(',').map((pair: string) => pair.trim())
        const filteredPairs = labelPairs.filter(pair => !pair.startsWith('__tmp_enabled='))
        parsedLabels = filteredPairs.map(pair => {
          const [key, value] = pair.split('=').map((s: string) => s.trim())
          return { key: key || '', value: value || '' }
        }).filter(label => label.key)
        console.log('Parsed labels from key=value pairs:', parsedLabels)
      }
    }
    
    // Parse probe assignments
    let assignedProbers: string[] = []
    if (target.probeAssignments) {
      try {
        assignedProbers = JSON.parse(target.probeAssignments)
      } catch (e) {
        console.error('Failed to parse probe assignments:', e)
      }
    }
    
    // Set the form data first
    setFormData({
      name: target.name,
      url: target.url,
      module: target.module,
      labels: '' // Will be synced when needed
    })
    
    // Set labels and probers immediately without timeout
    setLabelsList(parsedLabels)
    setSelectedProbers(assignedProbers)
    console.log('Set labelsList to:', parsedLabels)
    
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous validation errors
    setValidationErrors({})
    
    // Validate target address
    const addressValidation = validateTargetAddress(formData.url)
    if (!addressValidation.isValid) {
      setValidationErrors({ url: addressValidation.error || 'Invalid target address' })
      setSubmitting(false)
      return
    }
    
    // Validate labels
    const labelValidation = validateLabels(labelsList)
    if (!labelValidation.isValid) {
      setValidationErrors(labelValidation.errors)
      setSubmitting(false)
      return
    }
    
    setSubmitting(true)

    try {
      const url = editingTarget ? `/api/targets/${editingTarget.id}` : '/api/targets'
      const method = 'POST' // Always use POST to avoid potential issues with PATCH
      
      // Prepare form data with __tmp_enabled label
      let submitData = { ...formData }
      
      // For updates, add the ID to the body
      if (editingTarget) {
        submitData.id = editingTarget.id
      }
      
      // Handle labels directly from labelsList to avoid state timing issues
      let labelsObj: any = {}
      const validLabels = labelsList.filter(label => label.key.trim() && label.value.trim())
      validLabels.forEach(label => {
        labelsObj[label.key.trim()] = label.value.trim()
      })
      console.log('handleSubmit - labelsList:', labelsList)
      console.log('handleSubmit - validLabels:', validLabels)
      console.log('handleSubmit - labelsObj:', labelsObj)
      
      if (editingTarget) {
        // For existing targets, preserve existing __tmp_enabled status
        const currentStatus = getEnabledStatus(editingTarget)
        labelsObj.__tmp_enabled = currentStatus.toString()
      } else {
        // For new targets, set __tmp_enabled to true
        labelsObj.__tmp_enabled = 'true'
      }
      
      submitData.labels = JSON.stringify(labelsObj)
      console.log('handleSubmit - final submitData.labels:', submitData.labels)
      
      // Add probe assignments
      submitData.probeAssignments = selectedProbers.length > 0 ? JSON.stringify(selectedProbers) : null
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        const updatedTarget = await response.json()
        let newTargets
        if (editingTarget) {
          newTargets = targets.map(t => t.id === editingTarget.id ? updatedTarget : t)
          setTargets(newTargets)
          toast({
            title: "Success",
            description: "Target updated successfully",
            variant: "success",
          })
        } else {
          newTargets = [...targets, updatedTarget]
          setTargets(newTargets)
          
          // Save updated target order (new target added at the end)
          const targetOrder = newTargets.map(t => t.id)
          localStorage.setItem('pbxrTargetOrder', JSON.stringify(targetOrder))
          
          toast({
            title: "Success",
            description: "Target created successfully",
            variant: "success",
          })
        }
        // Update available label keys with the new data
        setAvailableLabelKeys(extractAvailableLabelKeys(newTargets))
        setAvailableLabelValues(extractAvailableLabelValues(newTargets))
        resetForm()
        setIsDialogOpen(false)
      } else {
        const errorData = await response.json()
        console.error('Update failed:', errorData)
        toast({
          title: "Error",
          description: errorData.error || 'Failed to save target',
          variant: "error",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "error",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    console.log('=== TOGGLE START ===')
    console.log('Toggle function called:', { id, currentEnabled })
    
    try {
      const target = targets.find(t => t.id === id)
      if (!target) {
        console.error('Target not found in local state:', id)
        toast({
          title: "Error",
          description: "Target not found",
          variant: "error",
        })
        return
      }

      console.log('Found target:', target)

      // Create the new labels object - simple approach
      let newLabels = { __tmp_enabled: (!currentEnabled).toString() }
      
      // If target has existing labels, parse and merge them (excluding __tmp_enabled)
      if (target.labels) {
        try {
          const existingLabels = JSON.parse(target.labels)
          // Copy all existing labels except __tmp_enabled
          Object.keys(existingLabels).forEach(key => {
            if (key !== '__tmp_enabled') {
              newLabels[key] = existingLabels[key]
            }
          })
        } catch (e) {
          console.log('Could not parse existing labels, starting fresh:', e)
        }
      }
      
      const updatedLabels = JSON.stringify(newLabels)
      
      console.log('Sending request:', {
        id,
        newLabels,
        updatedLabels
      })

      // Use POST instead of PATCH to avoid potential blocking
      console.log('Making request to:', `/api/targets/${id}`)
      console.log('Request method:', 'POST')
      console.log('Request body:', JSON.stringify({ labels: updatedLabels }))
      
      const response = await fetch(`/api/targets/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ labels: updatedLabels }),
      })

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      })

      if (response.ok) {
        const updatedTarget = await response.json()
        console.log('Toggle successful:', updatedTarget)
        setTargets(targets.map(t => t.id === id ? updatedTarget : t))
        toast({
          title: "Success",
          description: `Target ${!currentEnabled ? 'enabled' : 'disabled'} successfully`,
          variant: "success",
        })
      } else {
        const errorText = await response.text()
        console.error('Toggle failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        })
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { error: errorText, rawResponse: errorText }
        }
        
        const errorMessage = errorData.error || errorData.rawResponse || 'Unknown error'
        console.error('Error details:', errorData)
        toast({
          title: "Error",
          description: `Failed to update target: ${errorMessage}`,
          variant: "error",
        })
      }
    } catch (err) {
      console.error('Toggle error:', err)
      toast({
        title: "Error",
        description: "Failed to update target: Network error",
        variant: "error",
      })
    }
    
    console.log('=== TOGGLE END ===')
  }

  const openDeleteDialog = (id: string) => {
    setTargetToDelete(id)
    setShowDeleteDialog(true)
    setDeleteMetrics(false)
  }

  const openDuplicateDialog = (target: BlackboxTarget) => {
    fetchProbers() // Refresh probers list
    
    // Parse existing labels into the labels list
    let parsedLabels: {key: string, value: string}[] = []
    if (target.labels) {
      try {
        const labelsObj = JSON.parse(target.labels)
        const { __tmp_enabled, ...otherLabels } = labelsObj
        parsedLabels = Object.entries(otherLabels).map(([key, value]) => ({ key, value: String(value) }))
      } catch (e) {
        // Fallback for comma-separated labels
        const labelPairs = target.labels.split(',').map((pair: string) => pair.trim())
        parsedLabels = labelPairs
          .map((pair: string) => {
            const [key, value] = pair.split('=').map((s: string) => s.trim())
            return { key, value }
          })
          .filter(({ key }) => key && key !== '__tmp_enabled')
      }
    }
    
    // Parse probe assignments
    let assignedProbers: string[] = []
    if (target.probeAssignments) {
      try {
        assignedProbers = JSON.parse(target.probeAssignments)
      } catch (e) {
        console.error('Failed to parse probe assignments:', e)
      }
    }
    
    // Set form data with duplicated target info, but with a new name
    setFormData({
      name: `${target.name} (Copy)`,
      url: target.url,
      module: target.module,
      labels: target.labels || '',
    })
    
    // Set labels list
    setLabelsList(parsedLabels)
    
    // Set selected probers
    setSelectedProbers(assignedProbers)
    
    // Clear editing target to create a new one
    setEditingTarget(null)
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!targetToDelete) return

    try {
      // If delete metrics is checked, call Prometheus API
      if (deleteMetrics) {
        const target = targets.find(t => t.id === targetToDelete)
        if (target) {
          try {
            await fetch('/api/targets/delete-metrics', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                targetName: target.name
              }),
            })
          } catch (err) {
            console.error('Failed to delete metrics:', err)
          }
        }
      }

      const response = await fetch(`/api/targets/${targetToDelete}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const remainingTargets = targets.filter(t => t.id !== targetToDelete)
        setTargets(remainingTargets)
        setAvailableLabelKeys(extractAvailableLabelKeys(remainingTargets))
        setAvailableLabelValues(extractAvailableLabelValues(remainingTargets))
        
        // Update saved target order after deletion
        const targetOrder = remainingTargets.map(t => t.id)
        localStorage.setItem('pbxrTargetOrder', JSON.stringify(targetOrder))
        
        // Check if current page becomes empty and go back to previous page if needed
        const totalPagesAfterDelete = Math.ceil(remainingTargets.length / itemsPerPage)
        if (currentPage > totalPagesAfterDelete && totalPagesAfterDelete > 0) {
          setCurrentPage(totalPagesAfterDelete)
        }
        
        setShowDeleteDialog(false)
        setTargetToDelete(null)
        toast({
          title: "Success",
          description: "Target deleted successfully",
          variant: "success",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete target",
          variant: "error",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete target",
        variant: "error",
      })
    }
  }

  const exportTargets = () => {
    const exportData = targets.map(target => {
      // Parse probe assignments to get prober details
      let assignedProbers: any[] = []
      if (target.probeAssignments) {
        try {
          const probeIds = JSON.parse(target.probeAssignments)
          assignedProbers = probeIds.map((probeId: string) => {
            const prober = probers.find(p => p.id === probeId)
            return prober ? {
              id: prober.id,
              name: prober.name,
              address: prober.address,
              interval: prober.interval,
              enabled: prober.enabled,
              description: prober.description
            } : { id: probeId, name: 'Unknown Prober' }
          })
        } catch (e) {
          console.error('Failed to parse probe assignments for export:', e)
        }
      }

      return {
        id: target.id,
        name: target.name,
        url: target.url,
        module: target.module,
        labels: target.labels ? JSON.parse(target.labels) : {},
        enabled: getEnabledStatus(target),
        probeAssignments: assignedProbers,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt
      }
    })

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'targets-export.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Success",
      description: "Targets exported successfully",
      variant: "success",
    })
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide import data",
        variant: "warning",
      })
      return
    }

    setImporting(true)

    try {
      const parsedData = JSON.parse(importData)
      if (!Array.isArray(parsedData)) {
        throw new Error('Import data must be an array')
      }

      let importedCount = 0
      const errors: string[] = []

      for (let i = 0; i < parsedData.length; i++) {
        const targetData = parsedData[i]
        
        // Validate required fields
        const missingFields = []
        if (!targetData.name) missingFields.push('name')
        if (!targetData.url && !targetData.target_address) missingFields.push('url/target_address')
        if (!targetData.module) missingFields.push('module')
        
        // Check for __tmp_enabled in labels
        let hasTmpEnabled = false
        if (targetData.labels) {
          try {
            const labels = typeof targetData.labels === 'string' 
              ? JSON.parse(targetData.labels) 
              : targetData.labels
            hasTmpEnabled = labels.__tmp_enabled !== undefined
          } catch (e) {
            // Invalid JSON format, continue
          }
        }
        
        if (!hasTmpEnabled) {
          missingFields.push('__tmp_enabled in labels')
        }

        if (missingFields.length > 0) {
          errors.push(`Item ${i + 1}: Missing required fields - ${missingFields.join(', ')}`)
          continue
        }

        // Prepare data for API
        const processedData = {
          name: targetData.name,
          url: targetData.target_address || targetData.url, // Use target_address if available, otherwise url
          module: targetData.module,
          labels: targetData.labels
        }

        try {
          const response = await fetch('/api/targets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(processedData),
          })

          if (response.ok) {
            const newTarget = await response.json()
            setTargets(prev => [...prev, newTarget])
            importedCount++
          } else {
            const errorData = await response.json().catch(() => ({}))
            errors.push(`Item ${i + 1}: ${errorData.message || 'Failed to import'}`)
          }
        } catch (err) {
          console.error('Failed to import target:', targetData.name, err)
          errors.push(`Item ${i + 1}: ${targetData.name || 'Unknown'} - Import failed`)
        }
      }

      setImportData('')
      setShowImportDialog(false)
      
      if (errors.length > 0) {
        toast({
          title: "Import Completed with Errors",
          description: `Successfully imported ${importedCount} target(s). ${errors.length} item(s) failed to import.`,
          variant: "warning",
        })
      } else {
        toast({
          title: "Success",
          description: `Successfully imported ${importedCount} target(s)`,
          variant: "success",
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to parse import data. Please check the format.",
        variant: "error",
      })
    } finally {
      setImporting(false)
    }
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportData(content)
      setShowImportDialog(true)
    }
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "error",
      })
    }
    reader.readAsText(file)
    
    // Reset the file input
    event.target.value = ''
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .drag-preview {
          animation: slideIn 0.2s ease-out;
        }
        
        .drop-indicator-before {
          border-top: 3px solid #3b82f6;
          background: linear-gradient(to bottom, rgba(59, 130, 246, 0.1), transparent);
        }
        
        .drop-indicator-after {
          border-bottom: 3px solid #3b82f6;
          background: linear-gradient(to top, rgba(59, 130, 246, 0.1), transparent);
        }
        
        .column-drop-indicator-left {
          border-left: 4px solid #3b82f6;
          background: linear-gradient(to right, rgba(59, 130, 246, 0.15), transparent);
          box-shadow: -2px 0 8px rgba(59, 130, 246, 0.3);
        }
        
        .column-drop-indicator-right {
          border-right: 4px solid #3b82f6;
          background: linear-gradient(to left, rgba(59, 130, 246, 0.15), transparent);
          box-shadow: 2px 0 8px rgba(59, 130, 246, 0.3);
        }
        
        .dragging {
          cursor: grabbing !important;
          transform: rotate(2deg) scale(0.95);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease-out;
        }
        
        .dragging:hover {
          transform: rotate(1deg) scale(0.95);
        }
        
        .drop-target {
          transition: all 0.2s ease-out;
        }
      `}</style>
      <div className="min-h-screen bg-background">
      <header className="bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-foreground" />
              <div>
                <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-sf-pro)' }}>PBXR</h1>
                <p className="text-sm text-muted-foreground">Manage your monitoring targets</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.push('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        {/* Content will go here */}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Targets</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportTargets}>
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (!open) {
                // Only reset when closing, not when opening
                resetForm()
              }
              setIsDialogOpen(open)
            }}>
              <DropdownMenu open={showAddDropdown} onOpenChange={setShowAddDropdown}>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Target
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => {
                    resetForm()
                    fetchProbers()
                    setIsDialogOpen(true)
                    setShowAddDropdown(false)
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manually
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setShowImportDialog(true)
                    setShowAddDropdown(false)
                  }}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import from JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.preventDefault()
                    const fileInput = document.getElementById('file-import') as HTMLInputElement
                    fileInput?.click()
                    setShowAddDropdown(false)
                  }}>
                    <FileDown className="w-4 h-4 mr-2" />
                    Load from File
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DialogContent className="max-w-2xl max-h-[95vh] overflow-visible">
                <DialogHeader>
                  <DialogTitle>{editingTarget ? 'Edit Target' : 'Add New Target'}</DialogTitle>
                  <DialogDescription>
                    {editingTarget ? 'Update the monitoring target' : 'Create a new monitoring target'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="max-h-[80vh] overflow-y-auto pr-2">
                  <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="url">Target Address</Label>
                      <Input
                        id="url"
                        type="text"
                        placeholder="Enter IP, domain, or URL (module will be auto-detected)"
                        value={formData.url}
                        onChange={(e) => {
                          const newUrl = e.target.value
                          setFormData({ ...formData, url: newUrl })
                          
                          // Clear validation error when user starts typing
                          if (validationErrors.url) {
                            setValidationErrors({ ...validationErrors, url: '' })
                          }
                          
                          // Auto-detect target type and set appropriate module
                          if (newUrl.trim()) {
                            const detection = detectTargetType(newUrl)
                            // Set the first recommended module as default
                            if (detection.modules.length > 0 && !detection.modules.includes(formData.module)) {
                              setFormData(prev => ({ ...prev, module: detection.modules[0] }))
                            }
                          }
                        }}
                        className={validationErrors.url ? 'border-red-500 focus:border-red-500' : ''}
                        required
                      />
                      {validationErrors.url && (
                        <p className="text-sm text-red-600 dark:text-red-400">{validationErrors.url}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="module">Module</Label>
                      <Select value={formData.module} onValueChange={(value) => setFormData({ ...formData, module: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a module" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="http_2xx">http_2xx</SelectItem>
                          <SelectItem value="icmp">icmp</SelectItem>
                          <SelectItem value="dns">dns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Assigned Probers</Label>
                    </div>
                    
                    {loadingProbers ? (
                      <div className="text-sm text-muted-foreground">Loading probers...</div>
                    ) : probers.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        No probers configured. 
                        <Button 
                          variant="link" 
                          className="p-0 h-auto ml-1"
                          onClick={() => router.push('/settings')}
                        >
                          Add probers in settings
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                        {probers.filter(prober => prober.enabled).map((prober) => (
                          <div key={prober.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`prober-${prober.id}`}
                              checked={selectedProbers.includes(prober.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProbers([...selectedProbers, prober.id])
                                } else {
                                  setSelectedProbers(selectedProbers.filter(id => id !== prober.id))
                                }
                              }}
                            />
                            <Label 
                              htmlFor={`prober-${prober.id}`} 
                              className="text-sm font-normal cursor-pointer flex-1"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <span>{prober.name}</span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{prober.address}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {prober.interval}s
                                  </Badge>
                                </div>
                              </div>
                              {prober.description && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {prober.description}
                                </div>
                              )}
                            </Label>
                          </div>
                        ))}
                        {selectedProbers.length === 0 && (
                          <div className="text-xs text-muted-foreground italic">
                            No probers selected. Target will be monitored by selected probers.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Labels</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addLabel}
                        className="h-8 px-3"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Label
                      </Button>
                    </div>
                    
                    {labelsList.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                        <p className="text-muted-foreground text-sm">No labels added yet</p>
                        <p className="text-muted-foreground/70 text-xs mt-1">Click "Add Label" to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-2 relative">
                        {labelsList.map((label, index) => (
                          <div key={index} className="flex gap-2 items-start">
                            <div className="relative flex-1">
                              <Input
                                ref={index === 0 ? keyInputRef : undefined}
                                placeholder="Key (e.g., zone)"
                                value={label.key}
                                onChange={(e) => {
                                  updateLabel(index, 'key', e.target.value)
                                  // Clear validation error when user starts typing
                                  if (validationErrors[`label_key_${index}`]) {
                                    setValidationErrors(prev => {
                                      const newErrors = { ...prev }
                                      delete newErrors[`label_key_${index}`]
                                      return newErrors
                                    })
                                  }
                                }}
                                onKeyDown={(e) => handleKeyKeyDown(e, index)}
                                onFocus={(e) => {
                                  setCurrentEditingIndex(index)
                                  setCurrentEditingField('key')
                                  updateLabel(index, 'key', label.key, e)
                                }}
                                onBlur={() => {
                                  // Delay hiding suggestions to allow click on suggestion
                                  setTimeout(() => {
                                    if (currentEditingIndex === index && currentEditingField === 'key') {
                                      setShowKeySuggestions(false)
                                      setSuggestionPosition(null)
                                    }
                                  }, 200)
                                }}
                                className={`flex-1 ${validationErrors[`label_key_${index}`] ? 'border-red-500 focus:border-red-500' : ''}`}
                              />
                              
                              {/* Label suggestions dropdown - positioned to overlay above scrollable content */}
                              {showKeySuggestions && currentEditingIndex === index && suggestionPosition && (
                                <div 
                                  className="absolute bg-popover border border-border rounded-lg shadow-lg z-50"
                                  style={{
                                    top: `${suggestionPosition.top}px`,
                                    left: `${suggestionPosition.left}px`,
                                    width: `${suggestionPosition.width}px`
                                  }}
                                >
                                  <div className="p-2">
                                    <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                                      Label suggestions:
                                    </div>
                                    {availableLabelKeys
                                      .filter(key => 
                                        key.toLowerCase().includes(label.key.toLowerCase())
                                      )
                                      .slice(0, 3)
                                      .map((key, suggestionIndex) => (
                                        <button
                                          key={key}
                                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                            suggestionIndex === activeKeyIndex
                                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                              : 'hover:bg-muted text-foreground'
                                          }`}
                                          onClick={() => selectKeySuggestion(key, index)}
                                          onMouseEnter={() => setActiveKeyIndex(suggestionIndex)}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <Tag className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                              <span className="font-medium text-blue-600 dark:text-blue-400 truncate">
                                                {key}
                                              </span>
                                            </div>
                                          </div>
                                        </button>
                                      ))}
                                    {availableLabelKeys.filter(key => 
                                      key.toLowerCase().includes(label.key.toLowerCase())
                                    ).length === 0 && (
                                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                        No matching keys found
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {validationErrors[`label_key_${index}`] && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                  {validationErrors[`label_key_${index}`]}
                                </p>
                              )}
                            </div>
                            <div className="relative flex-1">
                              <Input
                                data-value-row={index}
                                placeholder="Value (e.g., INT)"
                                value={label.value}
                                onChange={(e) => {
                                  updateLabel(index, 'value', e.target.value)
                                  // Clear validation error when user starts typing
                                  if (validationErrors[`label_value_${index}`]) {
                                    setValidationErrors(prev => {
                                      const newErrors = { ...prev }
                                      delete newErrors[`label_value_${index}`]
                                      return newErrors
                                    })
                                  }
                                }}
                                onKeyDown={(e) => handleValueKeyDown(e, index)}
                                onFocus={(e) => {
                                  setCurrentEditingIndex(index)
                                  setCurrentEditingField('value')
                                  updateLabel(index, 'value', label.value, e)
                                }}
                                onBlur={() => {
                                  // Delay hiding suggestions to allow click on suggestion
                                  setTimeout(() => {
                                    if (currentEditingIndex === index && currentEditingField === 'value') {
                                      setShowValueSuggestions(false)
                                      setSuggestionPosition(null)
                                    }
                                  }, 200)
                                }}
                                className={`flex-1 ${validationErrors[`label_value_${index}`] ? 'border-red-500 focus:border-red-500' : ''}`}
                              />
                              
                              {/* Value suggestions dropdown - positioned to overlay above scrollable content */}
                              {showValueSuggestions && currentEditingIndex === index && suggestionPosition && (
                                <div 
                                  className="absolute bg-popover border border-border rounded-lg shadow-lg z-50"
                                  style={{
                                    top: `${suggestionPosition.top}px`,
                                    left: `${suggestionPosition.left}px`,
                                    width: `${suggestionPosition.width}px`
                                  }}
                                >
                                  <div className="p-2">
                                    <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                                      Value suggestions:
                                    </div>
                                    {(() => {
                                      const currentKey = labelsList[index]?.key || ''
                                      let filteredValues = []
                                      
                                      if (currentKey.trim()) {
                                        // Use key-specific values when a key is selected
                                        const keySpecificValues = extractValuesForKey(targets, currentKey)
                                        filteredValues = keySpecificValues.filter(value => 
                                          value.toLowerCase().includes(label.value.toLowerCase())
                                        ).slice(0, 3)
                                      } else {
                                        // Use general values when no key is selected
                                        filteredValues = availableLabelValues.filter(value => 
                                          value.toLowerCase().includes(label.value.toLowerCase())
                                        ).slice(0, 3)
                                      }
                                      
                                      return filteredValues.map((value, suggestionIndex) => (
                                        <button
                                          key={value}
                                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                            suggestionIndex === activeValueIndex
                                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                              : 'hover:bg-muted text-foreground'
                                          }`}
                                          onClick={() => selectValueSuggestion(value, index)}
                                          onMouseEnter={() => setActiveValueIndex(suggestionIndex)}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-blue-600 dark:text-blue-400 truncate">
                                                {value}
                                              </span>
                                            </div>
                                          </div>
                                        </button>
                                      ))
                                    })()}
                                    {(() => {
                                      const currentKey = labelsList[index]?.key || ''
                                      let hasMatchingValues = false
                                      
                                      if (currentKey.trim()) {
                                        const keySpecificValues = extractValuesForKey(targets, currentKey)
                                        hasMatchingValues = keySpecificValues.some(value => 
                                          value.toLowerCase().includes(label.value.toLowerCase())
                                        )
                                      } else {
                                        hasMatchingValues = availableLabelValues.some(value => 
                                          value.toLowerCase().includes(label.value.toLowerCase())
                                        )
                                      }
                                      
                                      return !hasMatchingValues && (
                                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                                          No matching values found
                                        </div>
                                      )
                                    })()}
                                  </div>
                                </div>
                              )}
                              {validationErrors[`label_value_${index}`] && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                  {validationErrors[`label_value_${index}`]}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLabel(index)}
                              className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {labelsList.length > 0 && (
                      <div className="text-xs text-gray-500">
                        <p>💡 Tip: Start typing to see existing label keys and values, or enter new ones to organize targets</p>
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (editingTarget ? 'Updating...' : 'Creating...') : (editingTarget ? 'Update Target' : 'Create Target')}
                  </Button>
                </form>
                </div>
              </DialogContent>
            </Dialog>

            {/* Target Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={(open) => {
              setShowDetailsDialog(open)
              if (!open) setViewingTarget(null)
            }}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Target Details
                  </DialogTitle>
                  <DialogDescription>
                    View detailed information about this monitoring target
                  </DialogDescription>
                </DialogHeader>
                
                {viewingTarget && (
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        Basic Information
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Name</label>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs px-2 py-1 max-w-full truncate">
                              {viewingTarget.name}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Status</label>
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant={getEnabledStatus(viewingTarget) ? "default" : "secondary"}
                              className={`text-xs px-2 py-1 ${
                                getEnabledStatus(viewingTarget) 
                                  ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                  : "bg-red-100 text-red-800 hover:bg-red-200"
                              }`}
                            >
                              {getEnabledStatus(viewingTarget) ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Enabled
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3 mr-1" />
                                  Disabled
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Module</label>
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              onClick={() => handleModuleClick(viewingTarget.module)}
                            >
                              {viewingTarget.module}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Type</label>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs px-2 py-1">
                              {detectTargetType(viewingTarget.url).type.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Date Created</label>
                          <div className="flex items-center gap-1">
                            <div className="text-xs text-muted-foreground">
                              {new Date(viewingTarget.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Last Modified</label>
                          <div className="flex items-center gap-1">
                            <div className="text-xs text-muted-foreground">
                              {new Date(viewingTarget.updatedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* URL Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Target Address
                      </h3>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <Link className="w-4 h-4 text-muted-foreground" />
                          <code className="text-sm font-mono flex-1">{viewingTarget.url}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(viewingTarget.url)}
                            className="h-8 w-8 p-0"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Prober Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Assigned Probers
                      </h3>
                      
                      {viewingTarget.probeAssignments ? (
                        <div className={`${(() => {
                          try {
                            const probeIds = JSON.parse(viewingTarget.probeAssignments)
                            return probeIds.length > 1 ? "grid grid-cols-1 md:grid-cols-2 gap-2" : "space-y-2"
                          } catch (e) {
                            return "space-y-2"
                          }
                        })()}`}>
                          {(() => {
                            try {
                              const probeIds = JSON.parse(viewingTarget.probeAssignments)
                              return probeIds.map((probeId: string) => {
                                const prober = probers.find(p => p.id === probeId)
                                return (
                                  <div key={probeId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div className="text-sm">
                                      <div 
                                        className={`font-medium cursor-pointer px-2 py-1 rounded transition-colors ${
                                          prober?.enabled 
                                            ? "hover:bg-gray-200 dark:hover:bg-gray-600" 
                                            : "text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                        }`}
                                        onClick={() => handleProberFilter(prober?.name || probeId)}
                                        title={`Click to filter by ${prober?.name || probeId}${prober?.enabled ? '' : ' (Disabled)'}`}
                                      >
                                        {prober?.name || 'Unknown Prober'}
                                        {!prober?.enabled && (
                                          <span className="ml-2 text-xs">(Disabled)</span>
                                        )}
                                      </div>
                                      <div className="text-muted-foreground">{prober?.address || 'Address not found'}</div>
                                    </div>
                                    <div className="text-right text-sm">
                                      <div className="text-muted-foreground">Interval / Timeout</div>
                                      <div className="font-medium">{prober?.interval || 'N/A'}s / {prober?.scrapeTimeout || 'N/A'}s</div>
                                    </div>
                                  </div>
                                )
                              })
                            } catch (e) {
                              return (
                                <div className="p-3 bg-muted rounded-lg">
                                  <span className="text-sm text-gray-400">Invalid prober assignment data</span>
                                </div>
                              )
                            }
                          })()}
                        </div>
                      ) : (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className="text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                              onClick={() => handleProberFilter('unassigned')}
                              title="Click to filter by unassigned targets"
                            >
                              unassigned
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              No probers assigned to this target
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Labels */}
                    {viewingTarget.labels && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          Labels
                        </h3>
                        
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              try {
                                const labelsObj = JSON.parse(viewingTarget.labels!)
                                return Object.entries(labelsObj)
                                  .filter(([key]) => !hiddenLabels.includes(key)) // Filter out hidden labels
                                  .map(([key, value]) => (
                                  <Badge 
                                    key={key}
                                    variant="secondary" 
                                    className="text-xs px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    onClick={() => handleLabelClick(key, String(value))}
                                  >
                                    {key}={String(value)}
                                  </Badge>
                                ))
                              } catch (e) {
                                // If labels are not valid JSON, treat as key=value pairs
                                const labelPairs = viewingTarget.labels!.split(',').map((pair: string) => pair.trim())
                                return labelPairs
                                  .map((pair: string) => {
                                    const [key, value] = pair.split('=')
                                    return { key: key?.trim(), value: value?.trim(), pair }
                                  })
                                  .filter(({ key }) => key && !hiddenLabels.includes(key)) // Filter out hidden labels
                                  .map(({ key, value, pair }, index: number) => (
                                  <Badge 
                                    key={index}
                                    variant="secondary" 
                                    className="text-xs px-2 py-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    onClick={() => {
                                      if (key && value) handleLabelClick(key, value)
                                    }}
                                  >
                                    {pair}
                                  </Badge>
                                ))
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowDetailsDialog(false)
                          // Small delay to ensure details dialog is fully closed
                          setTimeout(() => {
                            openEditDialog(viewingTarget)
                          }, 100)
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Target
                      </Button>
                      <Button
                        variant="default"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowDetailsDialog(false)
                        }}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
                <Input
                  placeholder="Search targets..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  className={`pl-10 ${searchQuery ? 'pr-10' : ''}`}
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                    type="button"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Search Suggestions Dropdown */}
              {showSearchSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                      Search suggestions:
                    </div>
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.label}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          index === searchSuggestionIndex
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                        onClick={() => applySuggestion(suggestion)}
                        onMouseEnter={() => setSearchSuggestionIndex(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {suggestion.label}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {suggestion.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Items per page */}
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={isReorderMode ? "default" : "outline"} 
                  data-dropdown-trigger="true"
                  className={isReorderMode ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsReorderMode(!isReorderMode)}>
                  <List className="mr-2 h-4 w-4" />
                  {isReorderMode ? 'Exit Reorder Mode' : 'Reorder'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setIsCompactView(!isCompactView)
                  localStorage.setItem('pbxrViewMode', isCompactView ? 'comfortable' : 'compact')
                  
                  toast({
                    title: "View Mode Changed",
                    description: `Switched to ${isCompactView ? 'comfortable' : 'compact'} view`,
                    variant: "success",
                  })
                }}>
                  {isCompactView ? <Plus className="mr-2 h-4 w-4" /> : <Minus className="mr-2 h-4 w-4" />}
                  {isCompactView ? 'Comfortable View' : 'Compact View'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  // Reset column order to default
                  const defaultColumnOrder = ['target', 'labels', 'module', 'prober', 'status', 'actions']
                  setColumnOrder(defaultColumnOrder)
                  localStorage.setItem('pbxrColumnOrder', JSON.stringify(defaultColumnOrder))
                  
                  // Reset target order (fetch fresh data)
                  fetchTargets()
                  localStorage.removeItem('pbxrTargetOrder')
                  
                  toast({
                    title: "Reset Complete",
                    description: "Table layout has been reset to default",
                    variant: "success",
                  })
                }}>
                  <Settings className="mr-2 h-4 w-4" />
                  Reset Table Layout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Reorder Mode Indicator */}
            {isReorderMode && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <List className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Drag and drop to reorder rows and columns
                </span>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="text-sm text-muted-foreground">
            Showing {paginatedTargets.length} of {filteredTargets.length} targets
            {filteredTargets.length !== targets.length && ` (from ${targets.length} total)`}
          </div>
        </div>

        {/* Context Menu */}
        {showContextMenu && contextMenuPosition && (
          <div
            className="fixed bg-popover border border-border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
            style={{
              left: `${contextMenuPosition.x}px`,
              top: `${contextMenuPosition.y}px`,
            }}
            onContextMenu={(e) => e.preventDefault()}
            onMouseLeave={closeContextMenu}
          >
            {selectedTargets.size > 1 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                  {selectedTargets.size} selected
                </div>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-green-600 dark:text-green-400"
                  onClick={() => {
                    handleBulkEnable()
                    closeContextMenu()
                  }}
                >
                  <CheckSquare className="w-4 h-4" />
                  Enable Selected
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-orange-600 dark:text-orange-400"
                  onClick={() => {
                    handleBulkDisable()
                    closeContextMenu()
                  }}
                >
                  <Square className="w-4 h-4" />
                  Disable Selected
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-600 dark:text-red-400"
                  onClick={() => {
                    handleBulkDelete()
                    closeContextMenu()
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              </>
            )}
            {selectedTargets.size === 1 && !isMultiSelectMode && (
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => {
                  setIsMultiSelectMode(true)
                  closeContextMenu()
                }}
              >
                <Check className="w-4 h-4" />
                Multi Select
              </button>
            )}
            {selectedTargets.size === 1 && !isMultiSelectMode && (
              <>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    const target = targets.find(t => t.id === Array.from(selectedTargets)[0])
                    if (target) {
                      openEditDialog(target)
                      closeContextMenu()
                    }
                  }}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    const target = targets.find(t => t.id === Array.from(selectedTargets)[0])
                    if (target) {
                      openDuplicateDialog(target)
                      closeContextMenu()
                    }
                  }}
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-600 dark:text-red-400"
                  onClick={() => {
                    const targetId = Array.from(selectedTargets)[0]
                    if (targetId) {
                      openDeleteDialog(targetId)
                      closeContextMenu()
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
            {selectedTargets.size > 0 && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    clearSelection()
                    closeContextMenu()
                  }}
                >
                  Clear Selection
                </button>
              </>
            )}
          </div>
        )}



        {paginatedTargets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'No targets found matching your criteria' 
                  : 'No targets configured yet'}
              </p>
              {!searchQuery && (
                <DropdownMenu open={showEmptyStateAddDropdown} onOpenChange={setShowEmptyStateAddDropdown}>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Target
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => {
                      resetForm()
                      fetchProbers()
                      setIsDialogOpen(true)
                      setShowEmptyStateAddDropdown(false)
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Manually
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setShowImportDialog(true)
                      setShowEmptyStateAddDropdown(false)
                    }}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import from JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.preventDefault()
                      const fileInput = document.getElementById('file-import') as HTMLInputElement
                      fileInput?.click()
                      setShowEmptyStateAddDropdown(false)
                    }}>
                      <FileDown className="w-4 h-4 mr-2" />
                      Load from File
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      {isReorderMode && (
                        <th className={`${getHeaderPadding()} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12`}>
                        </th>
                      )}
                      {isMultiSelectMode && (
                        <th className={`${getHeaderPadding()} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12`}>
                          <Checkbox
                            checked={selectedTargets.size === paginatedTargets.length && paginatedTargets.length > 0}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                          />
                        </th>
                      )}
                      {columnOrder.map(renderColumnHeader)}
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {paginatedTargets.map((target) => (
                      <tr 
                        key={target.id} 
                        className={`hover:bg-muted/50 transition-all duration-300 ease-in-out cursor-pointer ${!getEnabledStatus(target) ? 'opacity-60' : ''} ${selectedTargets.has(target.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''} select-none ${
                          draggedRowId === target.id ? 'opacity-50 scale-95 shadow-lg' : ''
                        } ${
                          dropTargetRowId === target.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        } ${
                          (target as any)._animating ? 'transition-all duration-300 ease-in-out' : ''
                        }`}
                        draggable={isReorderMode}
                        onContextMenu={(e) => handleRowContextMenu(target.id, e)}
                        onClick={(e) => handleRowClick(target.id, e)}
                        onDragStart={(e) => {
                          if (isReorderMode) {
                            setDraggedRowId(target.id)
                            e.dataTransfer.setData('text/plain', target.id)
                            e.currentTarget.classList.add('dragging', 'opacity-50', 'scale-95', 'shadow-lg')
                            
                            // Create a custom drag image
                            const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
                            dragImage.classList.add('drag-preview')
                            dragImage.style.position = 'absolute'
                            dragImage.style.top = '-1000px'
                            dragImage.style.width = '800px'
                            document.body.appendChild(dragImage)
                            e.dataTransfer.setDragImage(dragImage, 100, 20)
                            setTimeout(() => document.body.removeChild(dragImage), 0)
                          }
                        }}
                        onDragEnd={(e) => {
                          if (isReorderMode) {
                            setDraggedRowId(null)
                            setDropTargetRowId(null)
                            setDragOverPosition(null)
                            e.currentTarget.classList.remove('dragging', 'opacity-50', 'scale-95', 'shadow-lg', 'drop-target', 'drop-indicator-before', 'drop-indicator-after')
                          }
                        }}
                        onDragOver={(e) => {
                          if (isReorderMode) {
                            e.preventDefault()
                            e.dataTransfer.dropEffect = 'move'
                          }
                        }}
                        onDragEnter={(e) => {
                          if (isReorderMode && draggedRowId && draggedRowId !== target.id) {
                            e.preventDefault()
                            setDropTargetRowId(target.id)
                            
                            const rect = e.currentTarget.getBoundingClientRect()
                            const y = e.clientY - rect.top
                            const height = rect.height
                            const position = y < height / 2 ? 'before' : 'after'
                            setDragOverPosition(position)
                            
                            e.currentTarget.classList.add('drop-target', 'bg-blue-50', 'dark:bg-blue-900/20')
                            if (position === 'before') {
                              e.currentTarget.classList.add('drop-indicator-before')
                            } else {
                              e.currentTarget.classList.add('drop-indicator-after')
                            }
                          }
                        }}
                        onDragLeave={(e) => {
                          if (isReorderMode) {
                            e.currentTarget.classList.remove('drop-target', 'bg-blue-50', 'dark:bg-blue-900/20', 'drop-indicator-before', 'drop-indicator-after')
                            setDropTargetRowId(null)
                            setDragOverPosition(null)
                          }
                        }}
                        onDrop={(e) => {
                          if (isReorderMode && draggedRowId && draggedRowId !== target.id) {
                            e.preventDefault()
                            e.currentTarget.classList.remove('drop-target', 'bg-blue-50', 'dark:bg-blue-900/20', 'drop-indicator-before', 'drop-indicator-after')
                            
                            const rect = e.currentTarget.getBoundingClientRect()
                            const y = e.clientY - rect.top
                            const height = rect.height
                            const position = y < height / 2 ? 'before' : 'after'
                            
                            const draggedId = e.dataTransfer.getData('text/plain')
                            handleReorder(draggedId, target.id, position)
                          }
                        }}
                      >
                        {isReorderMode && (
                          <td className={getCellPadding()}>
                            <div className="cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                            </div>
                          </td>
                        )}
                        {isMultiSelectMode && (
                          <td className={getCellPadding()}>
                            <Checkbox
                              checked={selectedTargets.has(target.id)}
                              onCheckedChange={(checked) => handleSelectTarget(target.id, checked as boolean)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Select target"
                            />
                          </td>
                        )}
                        {columnOrder.map(columnId => renderColumn(columnId, target))}
                      </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Target</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this target?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="deleteMetrics"
                  checked={deleteMetrics}
                  onChange={(e) => setDeleteMetrics(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="deleteMetrics">
                  Also delete metrics from Prometheus
                </Label>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleDelete}>
                  Delete Target
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation Dialog */}
        <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Multiple Targets</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedTargets.size} target(s)?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bulkDeleteMetrics"
                  checked={deleteMetrics}
                  onChange={(e) => setDeleteMetrics(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="bulkDeleteMetrics">
                  Also delete metrics from Prometheus
                </Label>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={confirmBulkDelete}>
                  Delete {selectedTargets.size} Target(s)
                </Button>
                <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Standalone Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Targets</DialogTitle>
              <DialogDescription>
                Paste JSON data to import targets in bulk
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Paste JSON array with required fields: name, url (or target_address), module, labels with __tmp_enabled. Other labels are optional."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="min-h-[200px] max-h-[400px] font-mono text-sm whitespace-pre-wrap break-all overflow-x-hidden overflow-y-auto resize-none field-sizing-fixed"
                style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
              />
              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? 'Importing...' : 'Import Targets'}
                </Button>
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hidden File Input */}
        <input
          id="file-import"
          type="file"
          accept=".json"
          onChange={handleFileImport}
          className="hidden"
        />
      </main>
      
      {/* Footer with target counts */}
      <footer className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              {getTargetCounts().enabledCount > 0 && (
                <button
                  onClick={() => handleTargetStatusFilter('enabled')}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors"
                  title="Click to filter enabled targets"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-medium">{getTargetCounts().enabledCount}</span>
                  <span>Enabled</span>
                </button>
              )}
              {getTargetCounts().disabledCount > 0 && (
                <button
                  onClick={() => handleTargetStatusFilter('disabled')}
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
                  title="Click to filter disabled targets"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="font-medium">{getTargetCounts().disabledCount}</span>
                  <span>Disabled</span>
                </button>
              )}
              {getTargetCounts().unassignedCount > 0 && (
          <div className="relative inline-flex">
            {/* Pulsing beacon effect - outer ring */}
            <div className="absolute inset-0 rounded-md bg-blue-400 animate-ping opacity-75"></div>
            
            {/* Inner glow effect */}
            <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-400 to-blue-600 animate-pulse opacity-90"></div>
            
            {/* Badge with content */}
            <span 
              data-slot="badge" 
              className="relative inline-flex items-center justify-center rounded-md border px-2 py-0.5 font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden [a]:hover:bg-accent [a]:hover:text-accent-foreground text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              onClick={() => {
                setSearchQuery('prober:unassigned')
                setCurrentPage(1)
              }}
              title="Click to filter by unassigned targets"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              {getTargetCounts().unassignedCount} Unassigned
            </span>
          </div>
        )}
            </div>
          </div>
        </div>
      </footer>
      
      <DateTimeDisplay />
      <Toaster />
    </div>
    </>
  )
}