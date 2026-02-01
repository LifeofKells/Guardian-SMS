
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, Label, Avatar } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/db';
import { firebaseConfig, FIREBASE_DB_ID } from '../lib/firebase';
import { CheckCircle2, XCircle, Play, Flame, AlertTriangle, ExternalLink, Loader2, User as UserIcon, Database, Zap } from 'lucide-react';

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  // Seed State
  const [seedStatus, setSeedStatus] = useState<'idle' | 'seeding' | 'success' | 'error'>('idle');
  
  // Profile Settings State
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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
        // Handle specific Firebase error messages for better UX
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
    
    // 1. Connection Check
    if (connectionStatus !== 'connected') {
      // If we haven't verified connection, ask user.
      if (!confirm("Database connection not verified. Attempt to connect and seed anyway?")) {
          return;
      }
    }
    
    // 2. Massive Data Warning
    if (massive) {
        if (!confirm("Massive seeding creates thousands of records (Clients, Sites, Officers, Shifts, Incidents). This may take 10-30 seconds to generate and upload.\n\nAre you sure you want to proceed?")) {
            return;
        }
    }
    
    // 3. Set UI State immediately
    setSeedStatus('seeding');
    setConsoleLogs([]); 
    addLog(massive ? "Initiating MASSIVE Database Seed..." : "Initiating Standard Database Seed...");

    // 4. Defer execution to allow UI to render the 'seeding' state
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">System Settings</h2>
        <p className="text-sm text-muted-foreground">Manage user profile and database connection.</p>
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

            {/* CONNECTION STATUS RESULTS */}
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
