'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, X, Save, Settings, ArrowLeft, Monitor, Search, Lock, Eye, EyeOff, Server, Play, Trash2, Edit, Download, Sun, Moon, CheckCircle, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from 'next-themes'
import { Toaster } from '@/components/ui/toaster'

interface UserSettings {
  prometheusAddress: string
  prometheusAuthMethod: string
  prometheusUsername: string
  prometheusPassword: string
  prometheusBearerToken: string
  prometheusRefreshInterval: string
  blackboxExporterAddress: string
  probeEndpoint: string
  probeEndpointEnabled: boolean
  prometheusProbeEndpoint: string
  prometheusProbeEndpointEnabled: boolean
  registrationEnabled: boolean
  autoLogoutMinutes: number
  autoLogoutEnabled: boolean
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

interface AppSettings {
  maxSuggestions: number
  hiddenLabels: string[]
}

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings>({
    prometheusAddress: 'localhost:9090',
    prometheusAuthMethod: 'none',
    prometheusUsername: '',
    prometheusPassword: '',
    prometheusBearerToken: '',
    prometheusRefreshInterval: '1m',
    blackboxExporterAddress: 'localhost:9115',
    probeEndpoint: '/json',
    probeEndpointEnabled: false,
    prometheusProbeEndpoint: '/prometheus',
    prometheusProbeEndpointEnabled: false,
    registrationEnabled: true,
    autoLogoutMinutes: 5,
    autoLogoutEnabled: false
  })
  const [probers, setProbers] = useState<ProberInstance[]>([])
  const [newProber, setNewProber] = useState({
    name: '',
    address: '',
    interval: 15,
    scrapeTimeout: 15,
    enabled: true,
    description: ''
  })
  const [editingProber, setEditingProber] = useState<ProberInstance | null>(null)
  const [checkingConnection, setCheckingConnection] = useState<string | null>(null)
  const [showAddProber, setShowAddProber] = useState(false)
  const [appSettings, setAppSettings] = useState<AppSettings>({
    maxSuggestions: 5,
    hiddenLabels: ['__tmp_enabled']
  })
  const [newLabel, setNewLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('prometheus')
  
  // Prometheus generation state
  const [generatingPrometheus, setGeneratingPrometheus] = useState(false)
  const [prometheusConfig, setPrometheusConfig] = useState('')
  const [showPrometheusDialog, setShowPrometheusDialog] = useState(false)
  
  // Targets generation state
  const [generatingTargets, setGeneratingTargets] = useState(false)
  const [targetsConfig, setTargetsConfig] = useState('')
  const [showTargetsDialog, setShowTargetsDialog] = useState(false)
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [changingPassword, setChangingPassword] = useState(false)

  // Username change state
  const [usernameData, setUsernameData] = useState({
    newUsername: '',
    currentPassword: ''
  })
  const [changingUsername, setChangingUsername] = useState(false)
  const [showUsernameForm, setShowUsernameForm] = useState(false)

  // Connection check state
  const [connectionStatus, setConnectionStatus] = useState<{
    prometheus: 'idle' | 'checking' | 'success' | 'error'
  }>({
    prometheus: 'idle'
  })
  const [connectionError, setConnectionError] = useState<{
    prometheus: string
  }>({
    prometheus: ''
  })

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      fetchSettings()
    } else {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Add keyboard shortcut for saving (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveSettings()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [saving, userSettings, appSettings])

  const fetchSettings = async () => {
    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/login')
        return
      }
      
      const user = JSON.parse(userStr)
      const token = Buffer.from(JSON.stringify(user)).toString('base64')
      
      // Fetch user settings
      const userResponse = await fetch('/api/user-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUserSettings(userData)
      }

      // Fetch app settings
      const appResponse = await fetch('/api/settings')
      if (appResponse.ok) {
        const appData = await appResponse.json()
        setAppSettings(appData)
      }

      // Fetch probers
      await fetchProbers()
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchProbers = async () => {
    try {
      const response = await fetch('/api/probers')
      if (response.ok) {
        const data = await response.json()
        setProbers(data.probers || [])
      }
    } catch (error) {
      console.error('Failed to fetch probers:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)

    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/login')
        return
      }
      
      const user = JSON.parse(userStr)
      const token = Buffer.from(JSON.stringify(user)).toString('base64')

      // Save user settings
      const userResponse = await fetch('/api/user-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userSettings),
      })

      if (!userResponse.ok) {
        throw new Error('Failed to save user settings')
      }

      // Save app settings
      const appResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appSettings),
      })

      if (!appResponse.ok) {
        throw new Error('Failed to save app settings')
      }

      toast({
        title: "Success",
        description: "All settings saved successfully!",
        variant: "success",
      })
      
      // Dispatch custom event to notify other components about settings change
      window.dispatchEvent(new CustomEvent('userSettingsUpdated'))
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  const addHiddenLabel = () => {
    if (newLabel.trim() && !appSettings.hiddenLabels.includes(newLabel.trim())) {
      setAppSettings(prev => ({
        ...prev,
        hiddenLabels: [...prev.hiddenLabels, newLabel.trim()]
      }))
      setNewLabel('')
    }
  }

  const removeHiddenLabel = (labelToRemove: string) => {
    // Prevent removal of core label __tmp_enabled
    if (labelToRemove === '__tmp_enabled') {
      return
    }
    setAppSettings(prev => ({
      ...prev,
      hiddenLabels: prev.hiddenLabels.filter(label => label !== labelToRemove)
    }))
  }

  const changePassword = async () => {
    // Validate passwords
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "All password fields are required",
        variant: "error",
      })
      return
    }

    if (!/^[a-zA-Z0-9-]+$/.test(newProber.name)) {
      toast({
        title: "Validation Error",
        description: "Name can only contain alphanumeric characters and hyphens.",
        variant: "error",
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Validation Error", 
        description: "New password must be at least 6 characters long",
        variant: "error",
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match",
        variant: "error",
      })
      return
    }

    setChangingPassword(true)

    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/login')
        return
      }
      
      const user = JSON.parse(userStr)
      const token = Buffer.from(JSON.stringify(user)).toString('base64')

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password changed successfully!",
          variant: "success",
        })
        // Clear password fields
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || 'Failed to change password',
          variant: "error",
        })
      }
    } catch (error) {
      console.error('Failed to change password:', error)
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "error",
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const changeUsername = async () => {
    // Validate username
    if (!usernameData.newUsername || !usernameData.currentPassword) {
      toast({
        title: "Validation Error",
        description: "New username and current password are required",
        variant: "error",
      })
      return
    }

    if (usernameData.newUsername.length < 3) {
      toast({
        title: "Validation Error",
        description: "Username must be at least 3 characters long",
        variant: "error",
      })
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(usernameData.newUsername)) {
      toast({
        title: "Validation Error",
        description: "Username can only contain letters, numbers, and underscores",
        variant: "error",
      })
      return
    }

    if (usernameData.newUsername === user?.username) {
      toast({
        title: "Validation Error",
        description: "New username must be different from current username",
        variant: "error",
      })
      return
    }

    setChangingUsername(true)

    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/login')
        return
      }
      
      const user = JSON.parse(userStr)
      const token = Buffer.from(JSON.stringify(user)).toString('base64')

      const response = await fetch('/api/auth/change-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newUsername: usernameData.newUsername,
          currentPassword: usernameData.currentPassword
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update localStorage with new user data
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
        
        toast({
          title: "Success",
          description: "Username changed successfully!",
          variant: "success",
        })
        
        // Clear form and hide it
        setUsernameData({
          newUsername: '',
          currentPassword: ''
        })
        setShowUsernameForm(false)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || 'Failed to change username',
          variant: "error",
        })
      }
    } catch (error) {
      console.error('Failed to change username:', error)
      toast({
        title: "Error",
        description: "Failed to change username",
        variant: "error",
      })
    } finally {
      setChangingUsername(false)
    }
  }

  const checkConnection = async (type: 'prometheus') => {
    setConnectionStatus(prev => ({ ...prev, [type]: 'checking' }))
    setConnectionError(prev => ({ ...prev, [type]: '' }))

    try {
      const baseUrl = userSettings.prometheusAddress

      // Add protocol if not present
      const fullUrl = baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
        ? baseUrl
        : `http://${baseUrl}`

      const endpoint = `${fullUrl}/api/v1/query?query=up`

      // Prepare headers based on authentication method
      const headers: HeadersInit = {}
      if (userSettings.prometheusAuthMethod === 'basic' && userSettings.prometheusUsername && userSettings.prometheusPassword) {
        const credentials = Buffer.from(`${userSettings.prometheusUsername}:${userSettings.prometheusPassword}`).toString('base64')
        headers['Authorization'] = `Basic ${credentials}`
      } else if (userSettings.prometheusAuthMethod === 'bearer' && userSettings.prometheusBearerToken) {
        headers['Authorization'] = `Bearer ${userSettings.prometheusBearerToken}`
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (response.ok) {
        setConnectionStatus(prev => ({ ...prev, [type]: 'success' }))
        toast({
          title: "Connection Successful",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} is reachable and responding correctly.`,
          variant: "success",
        })
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setConnectionStatus(prev => ({ ...prev, [type]: 'error' }))
      setConnectionError(prev => ({ ...prev, [type]: errorMessage }))
      
      toast({
        title: "Connection Failed",
        description: `Cannot connect to ${type}: ${errorMessage}`,
        variant: "error",
      })
    }
  }

  const checkProberConnection = async (address: string, proberId: string) => {
    setCheckingConnection(proberId)
    try {
      const response = await fetch('/api/probers/check-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: `Prober at ${address} is reachable.`,
          variant: "success",
        })
      } else {
        toast({
          title: "Connection Failed",
          description: `Cannot connect to prober: ${result.message}`,
          variant: "error",
        })
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to check prober connection",
        variant: "error",
      })
    } finally {
      setCheckingConnection(null)
    }
  }

  const generatePrometheusYml = async () => {
    setGeneratingPrometheus(true)
    
    try {
      const response = await fetch('/api/generate/prometheus')
      
      if (response.ok) {
        const data = await response.json()
        setPrometheusConfig(data.content)
        setShowPrometheusDialog(true)
        
        toast({
          title: "Success",
          description: "prometheus.yml generated successfully",
          variant: "success",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || 'Failed to generate prometheus.yml',
          variant: "error",
        })
      }
    } catch (error) {
      console.error('Failed to generate prometheus.yml:', error)
      toast({
        title: "Error",
        description: "Failed to generate prometheus.yml",
        variant: "error",
      })
    } finally {
      setGeneratingPrometheus(false)
    }
  }

  const generateTargetsJson = async () => {
    setGeneratingTargets(true)
    
    try {
      const response = await fetch('/api/generate/targets')
      
      if (response.ok) {
        const data = await response.json()
        setTargetsConfig(data.content)
        setShowTargetsDialog(true)
        
        toast({
          title: "Success",
          description: "targets.json generated successfully",
          variant: "success",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || 'Failed to generate targets.json',
          variant: "error",
        })
      }
    } catch (error) {
      console.error('Failed to generate targets.json:', error)
      toast({
        title: "Error",
        description: "Failed to generate targets.json",
        variant: "error",
      })
    } finally {
      setGeneratingTargets(false)
    }
  }

  const downloadPrometheusYml = () => {
    const blob = new Blob([prometheusConfig], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prometheus.yml'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Success",
      description: "prometheus.yml downloaded successfully",
      variant: "success",
    })
  }

  const downloadTargetsJson = () => {
    const blob = new Blob([targetsConfig], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'targets.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Success",
      description: "targets.json downloaded successfully",
      variant: "success",
    })
  }

  const addProber = async () => {
    if (!newProber.name || !newProber.address) {
      toast({
        title: "Validation Error",
        description: "Name and address are required",
        variant: "error",
      })
      return
    }

    try {
      const response = await fetch('/api/probers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProber),
      })

      if (response.ok) {
        const prober = await response.json()
        setProbers(prev => [...prev, prober])
        setNewProber({
          name: '',
          address: '',
          interval: 5,
          scrapeTimeout: 5,
          enabled: true,
          description: ''
        })
        toast({
          title: "Success",
          description: "Prober added successfully",
          variant: "success",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || 'Failed to add prober',
          variant: "error",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add prober",
        variant: "error",
      })
    }
  }

  const updateProber = async () => {
    if (!editingProber) return

    if (!/^[a-zA-Z0-9-]+$/.test(editingProber.name)) {
      toast({
        title: "Validation Error",
        description: "Name can only contain alphanumeric characters and hyphens.",
        variant: "error",
      })
      return
    }

    try {
      const response = await fetch(`/api/probers/${editingProber.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingProber),
      })

      if (response.ok) {
        const updatedProber = await response.json()
        setProbers(prev => prev.map(p => p.id === updatedProber.id ? updatedProber : p))
        setEditingProber(null)
        toast({
          title: "Success",
          description: "Prober updated successfully",
          variant: "success",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || 'Failed to update prober',
          variant: "error",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update prober",
        variant: "error",
      })
    }
  }

  const deleteProber = async (id: string) => {
    try {
      const response = await fetch(`/api/probers/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setProbers(prev => prev.filter(p => p.id !== id))
        toast({
          title: "Success",
          description: "Prober deleted successfully",
          variant: "success",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || 'Failed to delete prober',
          variant: "error",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete prober",
        variant: "error",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading settings...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground mb-6">
        Tip: Press Ctrl+S (or Cmd+S on Mac) to quickly save settings
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="prometheus" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Prometheus
          </TabsTrigger>
          <TabsTrigger value="prober" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Prober
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Prometheus Configuration Tab */}
        <TabsContent value="prometheus" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prometheus Configuration</CardTitle>
              <CardDescription>
                Configure Prometheus settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prometheusAddress">Prometheus Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="prometheusAddress"
                    value={userSettings.prometheusAddress}
                    onChange={(e) => setUserSettings(prev => ({
                      ...prev,
                      prometheusAddress: e.target.value
                    }))}
                    placeholder="localhost:9090"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => checkConnection('prometheus')}
                    disabled={connectionStatus.prometheus === 'checking'}
                    className="px-3"
                  >
                    {connectionStatus.prometheus === 'checking' ? (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    ) : connectionStatus.prometheus === 'success' ? (
                      <div className="w-4 h-4 bg-green-500 rounded-full" />
                    ) : connectionStatus.prometheus === 'error' ? (
                      <div className="w-4 h-4 bg-red-500 rounded-full" />
                    ) : (
                      "Check"
                    )}
                  </Button>
                </div>
                {connectionError.prometheus && (
                  <p className="text-xs text-red-600">{connectionError.prometheus}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prometheusRefreshInterval">File Discovery Refresh Interval</Label>
                <Input
                  id="prometheusRefreshInterval"
                  value={userSettings.prometheusRefreshInterval}
                  onChange={(e) => setUserSettings(prev => ({
                    ...prev,
                    prometheusRefreshInterval: e.target.value
                  }))}
                  placeholder="1m"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Prometheus file discovery refresh interval (e.g., 30s, 1m, 5m)
                </p>
              </div>

              {/* Prometheus Authentication */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prometheusAuthMethod">Authentication Method</Label>
                  <Select
                    value={userSettings.prometheusAuthMethod}
                    onValueChange={(value) => setUserSettings(prev => ({
                      ...prev,
                      prometheusAuthMethod: value,
                      prometheusUsername: value === 'basic' ? prev.prometheusUsername : '',
                      prometheusPassword: value === 'basic' ? prev.prometheusPassword : '',
                      prometheusBearerToken: value === 'bearer' ? prev.prometheusBearerToken : ''
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select authentication method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Authentication</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {userSettings.prometheusAuthMethod === 'basic' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                      <Label htmlFor="prometheusUsername">Username</Label>
                      <Input
                        id="prometheusUsername"
                        type="text"
                        value={userSettings.prometheusUsername}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          prometheusUsername: e.target.value
                        }))}
                        placeholder="Enter username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prometheusPassword">Password</Label>
                      <Input
                        id="prometheusPassword"
                        type="password"
                        value={userSettings.prometheusPassword}
                        onChange={(e) => setUserSettings(prev => ({
                          ...prev,
                          prometheusPassword: e.target.value
                        }))}
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
                )}

                {userSettings.prometheusAuthMethod === 'bearer' && (
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                    <Label htmlFor="prometheusBearerToken">Bearer Token</Label>
                    <Textarea
                      id="prometheusBearerToken"
                      value={userSettings.prometheusBearerToken}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        prometheusBearerToken: e.target.value
                      }))}
                      placeholder="Enter bearer token"
                      className="min-h-[80px] font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Prometheus Probe Endpoint */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="prometheusProbeEndpoint">Endpoint</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable to use endpoint for prometheus.yml configuration
                    </p>
                  </div>
                  <Switch
                    id="prometheusProbeEndpointEnabled"
                    checked={userSettings.prometheusProbeEndpointEnabled || false}
                    onCheckedChange={(checked) => setUserSettings(prev => ({
                      ...prev,
                      prometheusProbeEndpointEnabled: checked
                    }))}
                  />
                </div>
                
                {userSettings.prometheusProbeEndpointEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="prometheusProbeEndpoint">Endpoint URL</Label>
                    <Input
                      id="prometheusProbeEndpoint"
                      value={userSettings.prometheusProbeEndpoint || '/prometheus'}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        prometheusProbeEndpoint: e.target.value
                      }))}
                      placeholder="/prometheus"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-between">
            <Button
              onClick={generatePrometheusYml}
              disabled={generatingPrometheus}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {generatingPrometheus ? 'Generating...' : 'Generate prometheus.yml'}
            </Button>
            
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </TabsContent>

        {/* Prober Configuration Tab */}
        <TabsContent value="prober" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prober Instances</CardTitle>
              <CardDescription>
                Manage multiple blackbox exporter prober instances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Prober */}
              <div className="space-y-4">
                {!showAddProber ? (
                  <Button 
                    onClick={() => setShowAddProber(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Prober
                  </Button>
                ) : (
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Add New Prober</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddProber(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="proberName">Name</Label>
                        <Input
                          id="proberName"
                          value={newProber.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            if (/^[a-zA-Z0-9-]*$/.test(name)) {
                              setNewProber(prev => ({
                                ...prev,
                                name: name
                              }))
                            }
                          }}
                          placeholder="e.g., prober-A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proberAddress">IP:Port</Label>
                        <Input
                          id="proberAddress"
                          value={newProber.address}
                          onChange={(e) => setNewProber(prev => ({
                            ...prev,
                            address: e.target.value
                          }))}
                          placeholder="e.g., 192.168.1.100:9115"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proberInterval">Scrape Interval (seconds)</Label>
                        <Input
                          id="proberInterval"
                          type="number"
                          min="1"
                          value={newProber.interval}
                          onChange={(e) => {
                            const newInterval = parseInt(e.target.value) || 5
                            setNewProber(prev => ({
                              ...prev,
                              interval: newInterval,
                              scrapeTimeout: Math.min(prev.scrapeTimeout, newInterval)
                            }))
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proberScrapeTimeout">Scrape Timeout (seconds)</Label>
                        <Input
                          id="proberScrapeTimeout"
                          type="number"
                          min="1"
                          max={newProber.interval}
                          value={newProber.scrapeTimeout}
                          onChange={(e) => {
                            const newTimeout = parseInt(e.target.value) || 5
                            setNewProber(prev => ({
                              ...prev,
                              scrapeTimeout: Math.min(newTimeout, prev.interval)
                            }))
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          Must be less than or equal to scrape interval
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proberDescription">Description</Label>
                        <Input
                          id="proberDescription"
                          value={newProber.description}
                          onChange={(e) => setNewProber(prev => ({
                            ...prev,
                            description: e.target.value
                          }))}
                          placeholder="Optional description"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="proberEnabled"
                          checked={newProber.enabled}
                          onCheckedChange={(checked) => setNewProber(prev => ({
                            ...prev,
                            enabled: checked
                          }))}
                        />
                        <Label htmlFor="proberEnabled">Enabled</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowAddProber(false)
                            setNewProber({
                              name: '',
                              address: '',
                              interval: 5,
                              enabled: true,
                              description: ''
                            })
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={addProber}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Prober
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Prober List */}
              <div className="space-y-4">
                {probers.length === 0 ? (
                  <p className="text-muted-foreground">No prober instances configured</p>
                ) : (
                  <div className="space-y-3">
                    {probers.map((prober) => (
                      <div key={prober.id} className="border rounded-lg p-4">
                        {editingProber?.id === prober.id ? (
                          // Edit Mode
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                  value={editingProber.name}
                                  onChange={(e) => {
                                    const name = e.target.value;
                                    if (/^[a-zA-Z0-9-]*$/.test(name)) {
                                      setEditingProber(prev => prev ? {
                                        ...prev,
                                        name: name
                                      } : null)
                                    }
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>IP:Port</Label>
                                <Input
                                  value={editingProber.address}
                                  onChange={(e) => setEditingProber(prev => prev ? {
                                    ...prev,
                                    address: e.target.value
                                  } : null)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Scrape Interval (seconds)</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={editingProber.interval}
                                  onChange={(e) => {
                                    const newInterval = parseInt(e.target.value) || 5
                                    setEditingProber(prev => prev ? {
                                      ...prev,
                                      interval: newInterval,
                                      scrapeTimeout: Math.min(prev.scrapeTimeout, newInterval)
                                    } : null)
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Scrape Timeout (seconds)</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max={editingProber.interval}
                                  value={editingProber.scrapeTimeout}
                                  onChange={(e) => {
                                    const newTimeout = parseInt(e.target.value) || 5
                                    setEditingProber(prev => prev ? {
                                      ...prev,
                                      scrapeTimeout: Math.min(newTimeout, prev.interval)
                                    } : null)
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Must be less than or equal to scrape interval
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                  value={editingProber.description || ''}
                                  onChange={(e) => setEditingProber(prev => prev ? {
                                    ...prev,
                                    description: e.target.value
                                  } : null)}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={editingProber.enabled}
                                  onCheckedChange={(checked) => setEditingProber(prev => prev ? {
                                    ...prev,
                                    enabled: checked
                                  } : null)}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setEditingProber(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={updateProber}>
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{prober.name}</h4>
                                <Badge 
                                  variant={prober.enabled ? "default" : "secondary"}
                                  className={`text-xs px-2 py-1 ${
                                    prober.enabled 
                                      ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-700" 
                                      : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-700"
                                  }`}
                                >
                                  {prober.enabled ? (
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
                              <p className="text-sm text-muted-foreground">
                                {prober.address} • {prober.interval}s interval / {prober.scrapeTimeout}s timeout
                              </p>
                              {prober.description && (
                                <p className="text-sm text-muted-foreground">{prober.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => checkProberConnection(prober.address, prober.id)}
                                disabled={checkingConnection === prober.id}
                              >
                                {checkingConnection === prober.id ? (
                                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingProber(prober)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteProber(prober.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Probe Endpoint Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Probe Endpoint Configuration</CardTitle>
              <CardDescription>
                Configure probe endpoints for target configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Blackbox Exporter Probe Endpoint */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="probeEndpoint">Endpoint</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable to use probe endpoint for blackbox exporter configuration
                    </p>
                  </div>
                  <Switch
                    id="probeEndpointEnabled"
                    checked={userSettings.probeEndpointEnabled}
                    onCheckedChange={(checked) => setUserSettings(prev => ({
                      ...prev,
                      probeEndpointEnabled: checked
                    }))}
                  />
                </div>
                
                {userSettings.probeEndpointEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="probeEndpoint">Endpoint URL</Label>
                    <Input
                      id="probeEndpoint"
                      value={userSettings.probeEndpoint}
                      onChange={(e) => setUserSettings(prev => ({
                        ...prev,
                        probeEndpoint: e.target.value
                      }))}
                      placeholder="/json"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prober Actions */}
          <div className="flex justify-between">
            <Button
              onClick={generateTargetsJson}
              disabled={generatingTargets}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {generatingTargets ? 'Generating...' : 'Generate targets.json'}
            </Button>
            
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </TabsContent>

        {/* Search Configuration Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search Configuration</CardTitle>
              <CardDescription>
                Configure search suggestions and label filtering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxSuggestions">Max Search Suggestions</Label>
                <Input
                  id="maxSuggestions"
                  type="number"
                  min="1"
                  max="20"
                  value={appSettings.maxSuggestions}
                  onChange={(e) => setAppSettings(prev => ({
                    ...prev,
                    maxSuggestions: parseInt(e.target.value) || 5
                  }))}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of suggestions to show in search dropdown
                </p>
              </div>

              <div className="space-y-3">
                <Label>Hidden Labels</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter label name to hide"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addHiddenLabel()
                      }
                    }}
                  />
                  <Button onClick={addHiddenLabel} disabled={!newLabel.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {appSettings.hiddenLabels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hidden labels configured</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {appSettings.hiddenLabels.map((label) => (
                      <Badge
                        key={label}
                        variant={label === '__tmp_enabled' ? 'default' : 'secondary'}
                        className={`flex items-center gap-1 px-2 py-1 ${
                          label === '__tmp_enabled' ? 'bg-primary text-primary-foreground' : ''
                        }`}
                        title={label === '__tmp_enabled' ? 'Core label - cannot be deleted' : 'Click X to remove'}
                      >
                        {label === '__tmp_enabled' && <Shield className="h-3 w-3" />}
                        {label}
                        {label !== '__tmp_enabled' && (
                          <button
                            onClick={() => removeHiddenLabel(label)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                These labels will be hidden from search suggestions and label columns.
              </p>
            </CardContent>
          </Card>
        
        {/* Search Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        </TabsContent>

        {/* Theme Settings Tab */}
        <TabsContent value="theme" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Theme Selection
              </CardTitle>
              <CardDescription>
                Choose your preferred theme appearance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Theme Mode</Label>
                {!mounted ? (
                  <div className="grid grid-cols-3 gap-3">
                    <Button variant="outline" disabled className="flex items-center gap-2 justify-center">
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button variant="outline" disabled className="flex items-center gap-2 justify-center">
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                    <Button variant="outline" disabled className="flex items-center gap-2 justify-center">
                      <Monitor className="h-4 w-4" />
                      System
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      onClick={() => setTheme('light')}
                      className="flex items-center gap-2 justify-center"
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      onClick={() => setTheme('dark')}
                      className="flex items-center gap-2 justify-center"
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      onClick={() => setTheme('system')}
                      className="flex items-center gap-2 justify-center"
                    >
                      <Monitor className="h-4 w-4" />
                      System
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {mounted && theme === 'light' && 'Light theme is active with bright colors and clean interface.'}
                  {mounted && theme === 'dark' && 'Dark theme is active with reduced eye strain in low light.'}
                  {mounted && theme === 'system' && 'System theme will automatically match your device preference.'}
                  {!mounted && 'Loading theme preference...'}
                </p>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Monitor className="h-4 w-4" />
                  <span>
                    Current theme: <strong className="text-foreground">
                      {mounted ? (theme === 'system' ? 'System (auto)' : theme?.charAt(0).toUpperCase() + theme?.slice(1)) : 'Loading...'}
                    </strong>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Settings Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your account password for better security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords.current ? "text" : "password"}
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      currentPassword: e.target.value
                    }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPasswords(prev => ({
                      ...prev,
                      current: !prev.current
                    }))}
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    placeholder="Enter new password (min. 6 characters)"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      newPassword: e.target.value
                    }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPasswords(prev => ({
                      ...prev,
                      new: !prev.new
                    }))}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPasswords(prev => ({
                      ...prev,
                      confirm: !prev.confirm
                    }))}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={changePassword}
                  disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {changingPassword ? 'Changing Password...' : 'Change Password'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your current account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Username</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium">{user?.username}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUsernameForm(!showUsernameForm)}
                      className="h-6 px-2 text-xs"
                    >
                      {showUsernameForm ? 'Cancel' : 'Change'}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="mt-1">{user?.name || 'Not set'}</p>
                </div>
              </div>

              {showUsernameForm && (
                <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-username">New Username</Label>
                    <Input
                      id="new-username"
                      type="text"
                      placeholder="Enter new username"
                      value={usernameData.newUsername}
                      onChange={(e) => setUsernameData(prev => ({
                        ...prev,
                        newUsername: e.target.value
                      }))}
                      disabled={changingUsername}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be at least 3 characters long and contain only letters, numbers, and underscores
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username-current-password">Current Password</Label>
                    <Input
                      id="username-current-password"
                      type="password"
                      placeholder="Enter current password to confirm"
                      value={usernameData.currentPassword}
                      onChange={(e) => setUsernameData(prev => ({
                        ...prev,
                        currentPassword: e.target.value
                      }))}
                      disabled={changingUsername}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={changeUsername}
                      disabled={changingUsername || !usernameData.newUsername || !usernameData.currentPassword}
                      className="flex items-center gap-2"
                    >
                      {changingUsername ? 'Changing Username...' : 'Change Username'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowUsernameForm(false)
                        setUsernameData({
                          newUsername: '',
                          currentPassword: ''
                        })
                      }}
                      disabled={changingUsername}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lockdown Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Lockdown Configuration
              </CardTitle>
              <CardDescription>
                Configure automatic logout for better security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoLogoutEnabled">Auto Logout</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically logout after period of inactivity
                  </p>
                </div>
                <Switch
                  id="autoLogoutEnabled"
                  checked={userSettings.autoLogoutEnabled}
                  onCheckedChange={(checked) => setUserSettings(prev => ({
                    ...prev,
                    autoLogoutEnabled: checked
                  }))}
                />
              </div>
              
              {userSettings.autoLogoutEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="autoLogoutMinutes">Inactivity Timeout (minutes)</Label>
                  <Input
                    id="autoLogoutMinutes"
                    type="number"
                    min="1"
                    max="120"
                    value={userSettings.autoLogoutMinutes}
                    onChange={(e) => setUserSettings(prev => ({
                      ...prev,
                      autoLogoutMinutes: parseInt(e.target.value) || 5
                    }))}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">
                    You will be automatically logged out after {userSettings.autoLogoutMinutes} minute{userSettings.autoLogoutMinutes !== 1 ? 's' : ''} of inactivity
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button for Account Settings */}
          <div className="flex justify-end">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Prometheus Configuration Dialog */}
      <Dialog open={showPrometheusDialog} onOpenChange={setShowPrometheusDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Generated prometheus.yml</DialogTitle>
            <DialogDescription>
              Prometheus configuration for blackbox monitoring
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Textarea
              value={prometheusConfig}
              readOnly
              className="min-h-[400px] font-mono text-sm resize-none whitespace-pre-wrap break-words"
              style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadPrometheusYml}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={() => setShowPrometheusDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Targets Configuration Dialog */}
      <Dialog open={showTargetsDialog} onOpenChange={setShowTargetsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Generated targets.json</DialogTitle>
            <DialogDescription>
              Blackbox exporter targets configuration
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Textarea
              value={targetsConfig}
              readOnly
              className="min-h-[400px] font-mono text-sm resize-none whitespace-pre-wrap break-words"
              style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadTargetsJson}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={() => setShowTargetsDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>
  )
}