'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Bell, Lock, Palette } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'theme'>('profile')
  const [isDarkMode, setIsDarkMode] = useState(false)

  const tabs: Array<{ id: typeof activeTab; label: string; icon: React.ReactNode }> = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'theme', label: 'Theme', icon: <Palette className="w-4 h-4" /> },
  ]

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="md:col-span-1">
          <div className="space-y-2 bg-card p-4 rounded-lg border border-border/50 sticky top-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <motion.div
          className="md:col-span-3 space-y-6"
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <Card className="p-6 border border-border/50">
                <h2 className="text-xl font-semibold mb-6">Profile Information</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user?.name || ''} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue={user?.email || ''} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" defaultValue={user?.role || ''} disabled />
                  </div>

                  <Button disabled className="mt-4">
                    Update Profile
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <Card className="p-6 border border-border/50">
                <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>

                <div className="space-y-4">
                  {[
                    { label: 'Analysis Completed', desc: 'Notify when an analysis finishes processing' },
                    { label: 'High Risk Cases', desc: 'Alert for high-risk consultation results' },
                    { label: 'Weekly Summary', desc: 'Receive weekly digest of your consultations' },
                    { label: 'System Updates', desc: 'Get notified about important system updates' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-4 h-4" />
                    </div>
                  ))}

                  <Button disabled className="mt-4">
                    Save Preferences
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <Card className="p-6 border border-border/50">
                <h2 className="text-xl font-semibold mb-6">Security Settings</h2>

                <div className="space-y-4">
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="font-medium text-sm mb-2">Change Password</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Update your password to keep your account secure
                    </p>
                    <Button disabled variant="outline" size="sm">
                      Change Password
                    </Button>
                  </div>

                  <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <p className="font-medium text-sm mb-2">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add an extra layer of security to your account
                    </p>
                    <Button disabled variant="outline" size="sm">
                      Enable 2FA
                    </Button>
                  </div>

                  <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
                    <p className="font-medium text-sm mb-2">Active Sessions</p>
                    <p className="text-xs text-muted-foreground mb-4">Manage your active login sessions</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Current Session (Browser)</span>
                        <span className="text-success">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-4">
              <Card className="p-6 border border-border/50">
                <h2 className="text-xl font-semibold mb-6">Theme Preferences</h2>

                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-sm mb-4">Color Theme</p>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { name: 'Light', value: 'light', color: 'bg-white' },
                        { name: 'Dark', value: 'dark', color: 'bg-slate-900' },
                        { name: 'Auto', value: 'auto', color: 'bg-gradient-to-r from-white to-slate-900' },
                      ].map((theme) => (
                        <div
                          key={theme.value}
                          className="p-4 border-2 border-border/50 rounded-lg cursor-pointer hover:border-primary transition-colors"
                        >
                          <div className={`w-full h-12 rounded ${theme.color} mb-2 border`} />
                          <p className="text-sm font-medium">{theme.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">High Contrast Mode</p>
                        <p className="text-xs text-muted-foreground">Improves readability for accessibility</p>
                      </div>
                      <input type="checkbox" className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
