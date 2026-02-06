
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, Label, Avatar } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/db';
import { firebaseConfig, FIREBASE_DB_ID, firestore } from '../lib/firebase';
import { CheckCircle2, XCircle, Play, Flame, AlertTriangle, ExternalLink, Loader2, User as UserIcon, Database, Zap, RefreshCw, Palette, Image, Type, ExternalLinkIcon, ShieldCheck, Moon, Sun, Monitor } from 'lucide-react';
import { collection, getDocs, updateDoc, doc, query } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { WhiteLabelSettings, Organization } from '../lib/types'; // Fixed potential missing import
import { cn } from '../components/ui';
import { AnimatedDarkModeToggle } from '../components/AnimatedDarkModeToggle';

// --- HELPER COMPONENTS ---
function ColorInput({ label, value, onChange, presets }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  presets?: string[];
}) {
  return (
    <div className="space-y-2.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </Label>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative group shrink-0 h-10 w-12 rounded-lg border shadow-sm overflow-hidden">
            <input
              type="color"
              value={value || '#3b82f6'}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute inset-0 transition-transform group-hover:scale-110"
              style={{ backgroundColor: value || '#3b82f6' }}
            />
          </div>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">#</span>
            <Input
              value={(value || '').replace('#', '')}
              onChange={(e) => onChange(`#${e.target.value.replace(/[^0-9A-Fa-f]/g, '').substring(0, 6)}`)}
              className="pl-7 font-mono text-xs uppercase"
              placeholder="3b82f6"
            />
          </div>
        </div>
        {presets && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange(preset)}
                className={cn(
                  "h-5 w-5 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-125 focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  value === preset && "scale-125 ring-2 ring-primary ring-offset-1 border-white"
                )}
                style={{ backgroundColor: preset }}
                title={preset}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const { profile, refreshProfile, organization } = useAuth();
  const { theme, setTheme } = useTheme();
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Seed State
  const [seedStatus, setSeedStatus] = useState<'idle' | 'seeding' | 'success' | 'error'>('idle');

  // Profile Settings State
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Branding Settings State
  const [branding, setBranding] = useState<WhiteLabelSettings>({
    company_name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    accent_color: '#10b981',
    support_email: '',
    support_phone: '',
    footer_text: '',
  });
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Console Logs State
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check if user is still using the default placeholder config
  const isDefaultConfig = firebaseConfig.projectId === "your-project-id" || firebaseConfig.apiKey === "YOUR_API_KEY";

  // Load Profile Data
  useEffect(() => {
    if (profile) {
      setProfileName(profile.full_name);
      setProfileAvatar(profile.avatar_url || '');
    }
  }, [profile]);

  // Load Organization Branding
  useEffect(() => {
    if (organization?.white_label) {
      setBranding({
        company_name: organization.white_label.company_name || organization.name || '',
        logo_url: organization.white_label.logo_url || '',
        favicon_url: organization.white_label.favicon_url || '',
        primary_color: organization.white_label.primary_color || '#3b82f6',
        secondary_color: organization.white_label.secondary_color || '#1e40af',
        accent_color: organization.white_label.accent_color || '#10b981',
        support_email: organization.white_label.support_email || '',
        support_phone: organization.white_label.support_phone || '',
        footer_text: organization.white_label.footer_text || '',
      });
    } else if (organization) {
      setBranding(prev => ({ ...prev, company_name: organization.name || '' }));
    }
  }, [organization]);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  const saveProfile = async () => {
    if (!profile) return;
    setIsSavingProfile(true);
    try {
      await db.users.update(profile.id, {
        full_name: profileName,
        avatar_url: profileAvatar
      });
      await refreshProfile();
      addLog("Profile updated successfully.");
      alert("Profile updated successfully.");
    } catch (e: any) {
      addLog(`Profile update failed: ${e.message}`);
      alert(`Failed to update profile: ${e.message}`);
    }
    setIsSavingProfile(false);
  };

  const saveBranding = async () => {
    if (!organization) {
      alert("No organization found. Please contact support.");
      return;
    }
    setIsSavingBranding(true);
    try {
      await db.organizations.update(organization.id, {
        white_label: branding
      });
      await refreshProfile(); // This also refreshes organization
      addLog("Branding settings saved successfully.");
      alert("Branding settings saved! Your changes have been applied.");
    } catch (e: any) {
      addLog(`Branding update failed: ${e.message}`);
      alert(`Failed to save branding: ${e.message}`);
    }
    setIsSavingBranding(false);
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    setStatusMessage('Pinging Firebase...');

    try {
      const result = await db.checkConnection();
      if (result.success) {
        setConnectionStatus('connected');
        setStatusMessage('Connected successfully to Firestore.');
      } else {
        setConnectionStatus('error');
        const errMsg = result.error?.message || '';

        if (errMsg.includes('project your-project-id') && !isDefaultConfig) {
          setStatusMessage("Error: Cached configuration detected. Please refresh the page.");
        } else if (errMsg.includes('API has not been used') || errMsg.includes('permission-denied')) {
          setStatusMessage("Error: Firestore Database not found or API disabled.");
        } else if (errMsg.includes('offline')) {
          setStatusMessage("Error: Could not reach Firestore. Check your internet connection.");
        } else if (errMsg.includes('NOT_FOUND')) {
          setStatusMessage(`Error: Database '${FIREBASE_DB_ID}' not found. Please create it in Firebase Console.`);
        } else {
          setStatusMessage(`Connection failed: ${errMsg}`);
        }
      }
    } catch (e: any) {
      setConnectionStatus('error');
      setStatusMessage(`Unexpected error: ${e.message}`);
    }
  };

  const runSeed = async (massive: boolean) => {
    console.log("Seed requested. Massive:", massive);

    if (connectionStatus !== 'connected') {
      if (!confirm("Database connection not verified. Attempt to connect and seed anyway?")) {
        return;
      }
    }

    if (massive) {
      if (!confirm("Massive seeding creates thousands of records (Clients, Sites, Officers, Shifts, Incidents). This may take 10-30 seconds to generate and upload.\n\nAre you sure you want to proceed?")) {
        return;
      }
    }

    setSeedStatus('seeding');
    setConsoleLogs([]);
    addLog(massive ? "Initiating MASSIVE Database Seed..." : "Initiating Standard Database Seed...");

    setTimeout(async () => {
      try {
        addLog("Generating data...");
        const result = await db.seed(addLog, massive);

        if (result.success) {
          setSeedStatus('success');
          addLog("Success: Database populated.");
        } else {
          setSeedStatus('error');
          addLog("Failed: See errors above.");
        }
      } catch (e: any) {
        console.error("Seed Exception:", e);
        setSeedStatus('error');
        addLog(`Critical Error: ${e.message}`);
      }
    }, 100);
  };

  const runMigration = async () => {
    if (!confirm("This will scan all data and associate unlinked records with the default 'AsoRock Security Services' organization.\n\nContinue?")) return;

    setSeedStatus('seeding');
    addLog("Starting Migration to Multi-Tenancy...");

    try {
      const ASOROCK_ORG_ID = 'org_asorock_001';

      const { data: org } = await db.organizations.get(ASOROCK_ORG_ID);
      if (!org) {
        addLog('Creating Default Organization: AsoRock Security Services...');
        await db.organizations.create({
          id: ASOROCK_ORG_ID,
          name: 'AsoRock Security Services',
          owner_id: 'demo_admin_user',
          created_at: new Date().toISOString(),
          settings: { timezone: 'UTC', currency: 'USD' },
          subscription_tier: 'professional',
          subscription_status: 'active',
          portal_enabled: true
        });
      } else {
        addLog('Default Organization Exists.');
      }

      const collections = [
        'users', 'clients', 'sites', 'officers', 'shifts',
        'time_entries', 'incidents', 'payroll_runs', 'invoices',
        'expenses', 'equipment', 'maintenance_records', 'feedback', 'audit_logs'
      ];

      for (const colName of collections) {
        addLog(`Scanning collection: ${colName}...`);
        const q = query(collection(firestore, colName));
        const snapshot = await getDocs(q);
        let count = 0;

        for (const d of snapshot.docs) {
          const data = d.data();
          if (!data.organization_id) {
            await updateDoc(doc(firestore, colName, d.id), {
              organization_id: ASOROCK_ORG_ID
            });
            count++;
          }
        }
        if (count > 0) addLog(`Updated ${count} records in ${colName}.`);
      }

      setSeedStatus('success');
      addLog("Migration Complete. Please refresh the page.");
      alert("Migration Complete. Please refresh the page to see your data.");
    } catch (e: any) {
      console.error(e);
      setSeedStatus('error');
      addLog(`Migration Error: ${e.message}`);
    }
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'ops_manager' || profile?.role === 'owner';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">System Settings</h2>
        <p className="text-sm text-muted-foreground">Manage user profile, branding, and database connection.</p>
      </div>

      {isDefaultConfig && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <h4 className="font-semibold">Configuration Required</h4>
            <p className="text-sm mt-1">
              The application is currently using placeholder credentials (<code>your-project-id</code>).
              You must update <code>lib/firebase.ts</code> with your actual Firebase project configuration.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {/* PROFILE SETTINGS CARD */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-blue-500" />
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar src={profileAvatar} fallback={profileName?.charAt(0)} className="h-16 w-16 border-2 border-slate-100" />
              <div className="space-y-1 flex-1">
                <Label>Profile Picture URL</Label>
                <Input
                  value={profileAvatar}
                  onChange={(e) => setProfileAvatar(e.target.value)}
                  placeholder="https://..."
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={saveProfile} disabled={isSavingProfile}>
                {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* APPEARANCE SETTINGS CARD */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Customize how the application looks for you. This setting is saved to your browser.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'light', label: 'Light', icon: Sun, description: 'Clean and bright' },
                { id: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
                { id: 'system', label: 'System', icon: Monitor, description: 'Matches device' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as any)}
                  className={cn(
                    "flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left group",
                    theme === t.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center mb-3 transition-colors",
                    theme === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-primary"
                  )}>
                    <t.icon className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-sm">{t.label}</span>
                  <span className="text-xs text-muted-foreground mt-1">{t.description}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium italic">Quick Toggle</p>
                <p className="text-xs text-muted-foreground">Swap between light and dark instantly</p>
              </div>
              <AnimatedDarkModeToggle
                isDark={theme === 'dark'}
                onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              />
            </div>
          </CardContent>
        </Card>

        {/* BRANDING SETTINGS CARD (Admin Only) */}
        {isAdmin && (
          <Card className="border-2 border-dashed border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-500" />
                Organization Branding
                <Badge variant="outline" className="ml-auto">White-Label</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Customize how your company appears throughout the application. These settings are applied organization-wide.
              </p>

              {/* Preview */}
              <div className="p-4 bg-muted rounded-lg border">
                <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Live Preview</p>
                <div className="flex items-center gap-3 p-3 bg-background rounded-md border shadow-sm">
                  {branding.logo_url ? (
                    <img src={branding.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded" />
                  ) : (
                    <div
                      className="h-10 w-10 rounded flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: branding.primary_color }}
                    >
                      {branding.company_name?.charAt(0) || 'G'}
                    </div>
                  )}
                  <span className="text-lg font-semibold" style={{ color: branding.primary_color }}>
                    {branding.company_name || 'Your Company Name'}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <div className="h-6 w-16 rounded" style={{ backgroundColor: branding.primary_color }} title="Primary" />
                  <div className="h-6 w-16 rounded" style={{ backgroundColor: branding.secondary_color }} title="Secondary" />
                  <div className="h-6 w-16 rounded" style={{ backgroundColor: branding.accent_color }} title="Accent" />
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Type className="h-4 w-4" /> Company Name</Label>
                    <Input
                      value={branding.company_name}
                      onChange={(e) => setBranding(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="e.g. Apex Security Solutions"
                      className="h-11"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Image className="h-4 w-4" /> Logo URL</Label>
                      <Input
                        value={branding.logo_url || ''}
                        onChange={(e) => setBranding(prev => ({ ...prev, logo_url: e.target.value }))}
                        placeholder="https://domain.com/logo.png"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Image className="h-4 w-4" /> Favicon URL</Label>
                      <Input
                        value={branding.favicon_url || ''}
                        onChange={(e) => setBranding(prev => ({ ...prev, favicon_url: e.target.value }))}
                        placeholder="https://domain.com/fav.ico"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <Palette className="h-4 w-4" /> Brand Identity
                      </h4>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-3">
                      <ColorInput
                        label="Primary"
                        value={branding.primary_color || '#3b82f6'}
                        onChange={(val) => setBranding(prev => ({ ...prev, primary_color: val }))}
                        presets={['#3b82f6', '#2563eb', '#1d4ed8', '#0f172a', '#e11d48', '#d33b33']}
                      />
                      <ColorInput
                        label="Secondary"
                        value={branding.secondary_color || '#1e40af'}
                        onChange={(val) => setBranding(prev => ({ ...prev, secondary_color: val }))}
                        presets={['#1e40af', '#1e3a8a', '#172554', '#334155', '#4b5563', '#444444']}
                      />
                      <ColorInput
                        label="Accent"
                        value={branding.accent_color || '#10b981'}
                        onChange={(val) => setBranding(prev => ({ ...prev, accent_color: val }))}
                        presets={['#10b981', '#059669', '#047857', '#f59e0b', '#d97706', '#ecc94b']}
                      />
                    </div>

                    {/* Theme Presets */}
                    <div className="mt-8 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Quick Theme Presets</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { name: 'Classic Blue', p: '#3b82f6', s: '#1e40af', a: '#10b981' },
                          { name: 'Dark Stealth', p: '#0f172a', s: '#334155', a: '#6366f1' },
                          { name: 'Emergency Red', p: '#e11d48', s: '#4c0519', a: '#fbbf24' },
                          { name: 'Eco Security', p: '#059669', s: '#064e3b', a: '#34d399' },
                          { name: 'Midnight Gold', p: '#1e1b4b', s: '#312e81', a: '#fbbf24' },
                        ].map((theme) => (
                          <Button
                            key={theme.name}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700"
                            onClick={() => setBranding(prev => ({
                              ...prev,
                              primary_color: theme.p,
                              secondary_color: theme.s,
                              accent_color: theme.a
                            }))}
                          >
                            <div className="flex gap-2 items-center">
                              <div className="flex -space-x-1">
                                <div className="h-3 w-3 rounded-full border border-white dark:border-slate-900 shrink-0" style={{ backgroundColor: theme.p }} />
                                <div className="h-3 w-3 rounded-full border border-white dark:border-slate-900 shrink-0" style={{ backgroundColor: theme.s }} />
                              </div>
                              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{theme.name}</span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Real-time Preview Card */}
                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4">
                      <Badge variant="outline" className="bg-slate-800/50 text-slate-400 border-slate-700">Live Preview</Badge>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Interface Appearance</p>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center border" style={{ borderColor: branding.primary_color + '40', backgroundColor: branding.primary_color + '10' }}>
                          <ShieldCheck className="h-5 w-5" style={{ color: branding.primary_color }} />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white" style={{ color: branding.primary_color }}>
                          {branding.company_name || 'Guardian'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800" />
                        <div className="h-3 w-12 bg-slate-100 dark:bg-slate-800 rounded-full my-auto" />
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-4">
                      <div className="flex gap-2">
                        <div className="h-8 px-4 rounded-lg bg-slate-800 border border-slate-700 flex items-center">
                          <div className="h-1.5 w-12 bg-slate-600 rounded-full" />
                        </div>
                        <div className="h-8 px-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center">
                          <div className="h-1.5 w-12 bg-primary rounded-full" style={{ backgroundColor: branding.primary_color }} />
                        </div>
                      </div>

                      <div className="h-32 w-full bg-slate-800/30 rounded-xl border border-dashed border-slate-700/50 flex flex-col items-center justify-center p-6 gap-4">
                        <Button style={{ backgroundColor: branding.primary_color, color: 'white' }} className="shadow-lg shadow-primary/25 border-0">
                          Primary Action
                        </Button>
                        <div className="flex gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: branding.accent_color }} />
                          <div className="h-2 w-20 bg-slate-700 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Support Email</Label>
                      <Input
                        type="email"
                        value={branding.support_email || ''}
                        onChange={(e) => setBranding(prev => ({ ...prev, support_email: e.target.value }))}
                        placeholder="support@domain.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Support Phone</Label>
                      <Input
                        value={branding.support_phone || ''}
                        onChange={(e) => setBranding(prev => ({ ...prev, support_phone: e.target.value }))}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Footer Text</Label>
                    <Input
                      value={branding.footer_text || ''}
                      onChange={(e) => setBranding(prev => ({ ...prev, footer_text: e.target.value }))}
                      placeholder="© 2024 Your Company. All rights reserved."
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button onClick={saveBranding} disabled={isSavingBranding} className="bg-purple-600 hover:bg-purple-700">
                  {isSavingBranding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSavingBranding ? 'Saving...' : 'Save Branding'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CONFIGURATION CARD */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Firebase Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-md text-sm">
              <p className="font-medium mb-2">How to connect your database:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Firebase Console <ExternalLink className="h-3 w-3" /></a> and create a project.</li>
                <li>Navigate to <strong>Build &gt; Firestore Database</strong> and click "Create Database" (Select <strong>Test Mode</strong> for development).</li>
                <li>Create a <strong>Named Database</strong> with ID: <code className="bg-slate-200 px-1 rounded">{FIREBASE_DB_ID}</code></li>
                <li>Go to <strong>Project Settings</strong> (gear icon), scroll to "Your apps", and click the Web icon (<code>&lt;/&gt;</code>).</li>
                <li>Copy the <code>firebaseConfig</code> object provided.</li>
                <li>Open <code>lib/firebase.ts</code> in your editor and paste the config.</li>
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project ID</label>
                <div className={`p-2 rounded border font-mono text-sm flex justify-between items-center ${isDefaultConfig ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                  <span>{firebaseConfig.projectId}</span>
                  {isDefaultConfig && <Badge className="ml-2" variant="destructive">Invalid</Badge>}
                  {!isDefaultConfig && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Database ID</label>
                <div className="p-2 rounded border font-mono text-sm bg-slate-50 border-slate-200 flex items-center justify-between">
                  <span>{FIREBASE_DB_ID}</span>
                  <Badge variant="outline">Target</Badge>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button type="button" onClick={testConnection} disabled={connectionStatus === 'testing'}>
                {connectionStatus === 'testing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>

            {connectionStatus === 'connected' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-3 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{statusMessage}</span>
              </div>
            )}

            {connectionStatus === 'error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Connection Failed</span>
                </div>
                <p className="text-sm ml-8 opacity-90 break-words">{statusMessage}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEED DATA CARD */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Initialize Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Populate <strong>{FIREBASE_DB_ID}</strong> with fresh demo data. Useful for setting up a new environment.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button type="button" onClick={() => runSeed(false)} disabled={seedStatus === 'seeding'} variant="secondary" className="w-full">
                {seedStatus === 'seeding' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Generate Standard Data (Quick)
              </Button>

              <Button type="button" onClick={() => runSeed(true)} disabled={seedStatus === 'seeding'} variant="outline" className="w-full border-dashed hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700">
                {seedStatus === 'seeding' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 text-orange-500" />}
                Generate Massive Data (Heavy)
              </Button>

              <Button type="button" onClick={runMigration} disabled={seedStatus === 'seeding'} className="w-full col-span-1 sm:col-span-2 bg-purple-600 hover:bg-purple-700 text-white">
                {seedStatus === 'seeding' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Migrate Legacy Data
              </Button>
            </div>

            {seedStatus === 'success' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-3 text-green-700 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Database seeded successfully!</span>
              </div>
            )}

            {seedStatus === 'error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-3 text-red-700 text-sm">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>Seeding Failed. Check logs below.</span>
              </div>
            )}

            {/* CONSOLE LOG */}
            <div className="mt-2 rounded-md bg-slate-950 p-4 font-mono text-xs text-slate-50 shadow-inner">
              <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-2">
                <span className="text-slate-400">System Logs</span>
                <span className="text-[10px] text-slate-600">Autoscroll ON</span>
              </div>
              <div
                ref={scrollRef}
                className="h-48 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
              >
                {consoleLogs.length === 0 ? (
                  <div className="text-slate-600 italic">Ready. Click action to start...</div>
                ) : (
                  consoleLogs.map((log, i) => (
                    <div key={i} className="break-all whitespace-pre-wrap font-light">
                      <span className="text-emerald-500 mr-2">{'>'}</span>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

