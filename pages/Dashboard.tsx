
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Label, Avatar, Tabs, TabsList, TabsTrigger, TabsContent, cn, Skeleton } from '../components/ui';
import { db } from '../lib/db';
import { Site, Incident, TimeEntry, Shift, Officer } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, Clock, AlertTriangle, DollarSign, Map as MapIcon, LocateFixed, 
  CheckCircle2, XCircle, Loader2, Calendar, Activity, Shield, 
  Radio, Phone, FileText, ChevronRight, Siren, Briefcase, TrendingUp, 
  Wallet, PieChart, BarChart3, ShieldAlert
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';

declare global {
  interface Window {
    L: any;
  }
}

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; 
  var dLat = deg2rad(lat2-lat1);  
  var dLon = deg2rad(lon2-lon1); 
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; 
  return d * 1000; 
}

function deg2rad(deg: number) { return deg * (Math.PI/180); }

// --- ISOLATED MAP COMPONENT ---
// Handles its own lifecycle to prevent Leaflet errors when switching tabs
const DashboardMap = ({ sites }: { sites: Site[] }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        if (!mapContainer.current || !sites.length || mapInstance.current) return;
        
        if (window.L) {
           // Calc bounds to fit all sites
           const lats = sites.map(s => s.lat);
           const lngs = sites.map(s => s.lng);
           const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
           const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

           const map = window.L.map(mapContainer.current).setView([centerLat, centerLng], 12);
           window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
               attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
               subdomains: 'abcd',
               maxZoom: 20
           }).addTo(map);

           sites.forEach(site => {
               if (site.lat && site.lng) {
                   const color = site.risk_level === 'high' ? '#ef4444' : '#3b82f6';
                   
                   const siteIcon = window.L.divIcon({
                       className: 'custom-div-icon',
                       html: `<div style='background-color:${color}; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 0 8px ${color};'></div>`,
                       iconSize: [12, 12],
                       iconAnchor: [6, 6]
                   });

                   window.L.marker([site.lat, site.lng], { icon: siteIcon }).addTo(map)
                    .bindPopup(`
                        <div class="text-sm font-sans">
                            <strong class="block mb-1 text-slate-900">${site.name}</strong>
                            <span class="text-slate-500">${site.address}</span>
                            <br/>
                            <span class="text-xs uppercase font-bold text-slate-400 mt-1 block">${site.risk_level} Risk</span>
                        </div>
                    `);
                   
                   window.L.circle([site.lat, site.lng], { 
                       color: color, 
                       fillColor: color, 
                       fillOpacity: 0.1, 
                       radius: site.radius || 200,
                       weight: 1
                   }).addTo(map);
               }
           });
           mapInstance.current = map;
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [sites]);

    return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden">
             <div ref={mapContainer} className="absolute inset-0 z-0" />
        </div>
    );
};

export default function Dashboard() {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const isAdmin = profile?.role === 'ops_manager' || profile?.role === 'admin' || profile?.role === 'owner';
  const isClient = profile?.role === 'client';
  
  // React Query Fetching
  const { data: sites = [] } = useQuery({
    queryKey: ['sites', profile?.client_id], // specific cache key for client
    queryFn: async () => {
       const { data } = await db.sites.select();
       // Filter sites if client
       if (isClient && profile?.client_id) {
           return (data || []).filter(s => s.client_id === profile.client_id);
       }
       return data || [];
    }
  });

  const { data: dashboardData, isLoading: isLoadingData } = useQuery({
    queryKey: ['dashboardData', isAdmin ? 'admin' : isClient ? 'client' : 'officer'],
    queryFn: async () => {
       if (isAdmin || isClient) {
          const [shiftsRes, entriesRes, incidentsRes, officersRes] = await Promise.all([
              db.getFullSchedule(),
              db.getFullTimeEntries(),
              db.getFullIncidents(),
              db.officers.select()
          ]);
          
          let shifts = shiftsRes.data || [];
          let entries = entriesRes.data || [];
          let incidents = incidentsRes.data || [];
          const officers = officersRes.data || [];

          // CLIENT SPECIFIC FILTERING
          if (isClient && profile?.client_id) {
              const mySiteIds = sites.map(s => s.id);
              shifts = shifts.filter(s => mySiteIds.includes(s.site_id));
              entries = entries.filter(e => e.shift?.site_id && mySiteIds.includes(e.shift.site_id));
              incidents = incidents.filter(i => mySiteIds.includes(i.site_id));
          }

          // Calculate Active Officers (Currently clocked in but not clocked out)
          const activeEntries = entries.filter(e => !e.clock_out);
          const active = activeEntries.length;
          
          // Calculate Weekly Hours
          const hours = entries.reduce((acc, curr) => acc + curr.total_hours, 0);
          
          // Open Incidents
          const openIncidents = incidents.filter(i => i.status !== 'closed').length;

          // Revenue Estimation (Simple calc)
          const revenueEst = Math.round(hours * 45); // Avg bill rate $45
          
          // Payroll Estimation
          const payrollEst = entries.reduce((acc, e) => {
              const rate = e.officer?.financials?.base_rate || 20;
              return acc + (e.total_hours * rate);
          }, 0);

          return {
             shifts,
             entries,
             incidents,
             officers,
             activeEntries,
             stats: {
                 activeOfficers: active,
                 totalOfficers: officers.length,
                 openIncidents: openIncidents, 
                 weeklyHours: Math.round(hours),
                 revenueEst: revenueEst,
                 payrollEst: Math.round(payrollEst)
             }
          };
       }
       return null;
    },
    enabled: sites.length > 0 || isAdmin // Wait for sites to load if client
  });

  const { data: myNextShift } = useQuery({
    queryKey: ['myNextShift', profile?.id],
    enabled: !isAdmin && !isClient && !!profile,
    queryFn: async () => {
        const { data: schedule } = await db.getFullSchedule();
        if (schedule && profile) {
            const myShifts = schedule.filter(s => s.officer_id === profile.id);
            const now = new Date();
            const next = myShifts
               .filter(s => new Date(s.start_time) > now)
               .sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
            return next;
        }
        return null;
    }
  });
  
  // Time Clock State (Mobile)
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearestSite, setNearestSite] = useState<{site: Site, distance: number} | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [shiftDuration, setShiftDuration] = useState(0); // seconds

  // Live Clock Effect
  useEffect(() => {
      let interval: any;
      if (isClockedIn) {
          interval = setInterval(() => {
              setShiftDuration(prev => prev + 1);
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [isClockedIn]);

  const formatDuration = (seconds: number) => {
      const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `${h}:${m}:${s}`;
  };

  // Geolocation Handler
  const handleCheckLocation = () => {
      if (!navigator.geolocation) { alert("Geolocation is not supported by your browser"); return; }
      setGeoStatus('locating');
      navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          setGeoStatus('success');
          if (sites.length > 0) {
              let minDistance = Infinity;
              let closest = null;
              sites.forEach(site => {
                  const dist = getDistanceFromLatLonInM(latitude, longitude, site.lat, site.lng);
                  if (dist < minDistance) { minDistance = dist; closest = site; }
              });
              if (closest) { setNearestSite({ site: closest, distance: Math.round(minDistance) }); }
          }
      }, (error) => { console.error(error); setGeoStatus('error'); });
  };

  const handleClockAction = () => {
      if (!isClockedIn) {
          if (nearestSite && nearestSite.distance > nearestSite.site.radius) {
              addToast({ type: 'warning', title: "Too Far", description: `You are ${nearestSite.distance}m away from ${nearestSite.site.name}. Move closer to clock in.` });
              return;
          }
          setIsClockedIn(true);
          addToast({ type: 'success', title: "Clocked In", description: "Shift started successfully." });
      } else {
          setIsClockedIn(false);
          setShiftDuration(0);
          setGeoStatus('idle');
          setNearestSite(null);
          addToast({ type: 'info', title: "Clocked Out", description: "Shift ended. Time logged." });
      }
  };

  // --- ACTIVITY FEED LOGIC ---
  const activityFeed = useMemo(() => {
      if (!dashboardData) return [];
      
      const feed = [];
      
      // 1. Incidents
      dashboardData.incidents.forEach(inc => {
          feed.push({
              type: 'incident',
              id: inc.id,
              title: `${inc.type} Reported`,
              subtitle: inc.site?.name,
              time: new Date(inc.reported_at),
              user: inc.officer,
              severity: inc.severity
          });
      });

      // 2. Clock Ins
      dashboardData.entries.forEach(entry => {
          feed.push({
              type: 'clock_in',
              id: entry.id,
              title: 'Officer Clocked In',
              subtitle: entry.shift?.site?.name,
              time: new Date(entry.clock_in),
              user: entry.officer
          });
      });

      // 3. Shift Starts (Scheduled)
      dashboardData.shifts.forEach(shift => {
          const start = new Date(shift.start_time);
          if (start < new Date() && start > new Date(Date.now() - 86400000)) { // Only last 24h
              feed.push({
                  type: 'shift_start',
                  id: shift.id,
                  title: 'Shift Started',
                  subtitle: shift.site?.name,
                  time: start,
                  user: shift.officer
              });
          }
      });

      return feed.sort((a,b) => b.time.getTime() - a.time.getTime()).slice(0, 20);
  }, [dashboardData]);

  // --- DERIVED DATA FOR VIEWS ---
  const revenueBySite = useMemo(() => {
      if (!dashboardData) return [];
      const map = new Map();
      dashboardData.entries.forEach(e => {
          const site = e.shift?.site?.name || 'Unknown';
          const rate = e.shift?.bill_rate || e.shift?.site?.client?.billing_settings?.standard_rate || 45;
          const rev = e.total_hours * rate;
          map.set(site, (map.get(site) || 0) + rev);
      });
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
  }, [dashboardData]);

  // --- SKELETONS ---
  const DashboardSkeleton = () => (
      <div className="space-y-6 animate-pulse">
          <div className="flex gap-4">
              <Skeleton className="h-8 w-1/3" />
              <div className="ml-auto flex gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[550px]">
              <Skeleton className="lg:col-span-2 h-full rounded-xl" />
              <Skeleton className="h-full rounded-xl" />
          </div>
      </div>
  );

  // --- STAT CARDS COMPONENT ---
  const StatCard = ({ title, value, subtext, icon: Icon, colorClass, bgColorClass }: any) => (
      <Card className="overflow-hidden hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
                      <h3 className="text-2xl font-bold mt-1 text-foreground">{value}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg bg-opacity-10 dark:bg-opacity-20`} style={{ backgroundColor: `${colorClass}20` }}>
                      <Icon className="h-5 w-5" style={{ color: colorClass }} />
                  </div>
              </div>
          </CardContent>
      </Card>
  );

  if (isLoadingData) {
      return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {(isAdmin || isClient) && dashboardData ? (
        // --- ADMIN & CLIENT COMMAND CENTER (TABBED) ---
        <Tabs defaultValue="overview" className="space-y-6 animate-in fade-in duration-500">
            {/* Header Status Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{isClient ? 'Client Portal' : 'Command Center'}</h2>
                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        {isClient ? `Overview for ${sites.length} Active Locations` : 'Systems Operational'} • {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                {!isClient && (
                <div className="flex items-center gap-3">
                    <TabsList className="hidden md:flex">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="workforce">Workforce</TabsTrigger>
                        <TabsTrigger value="finance">Finance</TabsTrigger>
                        <TabsTrigger value="risk">Risk & Ops</TabsTrigger>
                    </TabsList>
                    <div className="h-8 w-px bg-border hidden md:block" />
                    <Button variant="outline" size="sm" className="gap-2 bg-background shadow-sm hover:shadow-md transition-all border-blue-200 dark:border-blue-900/50 hover:border-blue-300">
                        <Activity className="h-4 w-4 text-blue-500" /> Live Monitor
                    </Button>
                </div>
                )}
            </div>

            {/* TAB: OVERVIEW */}
            <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Active Force" value={dashboardData.stats.activeOfficers} subtext="Officers currently on site" icon={Users} colorClass="#3b82f6" />
                    <StatCard title="Open Incidents" value={dashboardData.stats.openIncidents} subtext="Requires immediate attention" icon={Siren} colorClass="#ef4444" />
                    <StatCard title="Weekly Hours" value={dashboardData.stats.weeklyHours} subtext="Billable time logged" icon={Clock} colorClass="#8b5cf6" />
                    {!isClient ? (
                        <StatCard title="Est. Revenue" value={`$${dashboardData.stats.revenueEst.toLocaleString()}`} subtext="Current week projection" icon={DollarSign} colorClass="#10b981" />
                    ) : (
                        <StatCard title="Active Sites" value={sites.length} subtext="Locations under monitoring" icon={MapIcon} colorClass="#10b981" />
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[550px]">
                    {/* Map */}
                    <div className="lg:col-span-2 flex flex-col h-full">
                         <Card className="flex-1 overflow-hidden border shadow-sm flex flex-col p-0 h-full">
                            <div className="bg-slate-950 px-5 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
                                <h3 className="font-semibold text-slate-50 flex items-center gap-2 tracking-tight"><MapIcon className="h-4 w-4" /> Live Operations Map</h3>
                                <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10">Real-Time</Badge>
                            </div>
                            <div className="flex-1 min-h-[400px]">
                                <DashboardMap sites={sites} />
                            </div>
                        </Card>
                    </div>
                    {/* Activity Feed */}
                    <div className="flex flex-col h-full">
                        <Card className="flex-1 flex flex-col overflow-hidden h-full p-0">
                            <CardHeader className="py-4 px-5 bg-muted/30 border-b shrink-0">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide text-muted-foreground">
                                    <Radio className="h-4 w-4 text-red-500 animate-pulse" /> Dispatch Feed
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                                <div className="divide-y divide-border">
                                    {activityFeed.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No recent activity.</div>}
                                    {activityFeed.map((item, idx) => (
                                        <div key={idx} className="p-4 flex gap-4 hover:bg-muted/30 transition-colors">
                                            <div className="mt-1 shrink-0">
                                                {item.type === 'incident' && <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-2 rounded-lg"><AlertTriangle className="h-4 w-4" /></div>}
                                                {item.type === 'clock_in' && <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg"><CheckCircle2 className="h-4 w-4" /></div>}
                                                {item.type === 'shift_start' && <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 p-2 rounded-lg"><Calendar className="h-4 w-4" /></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <p className="text-sm font-semibold truncate text-foreground">{item.title}</p>
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                        {item.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate mb-2">{item.subtitle}</p>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-5 w-5" fallback={item.user?.full_name[0]} />
                                                    <span className="text-xs font-medium text-foreground/80">{item.user?.full_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>

            {!isClient && (
            <>
            {/* TAB: WORKFORCE */}
            <TabsContent value="workforce" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Total Roster" value={dashboardData.stats.totalOfficers} subtext="Registered Officers" icon={Briefcase} colorClass="#3b82f6" />
                    <StatCard title="On Duty" value={dashboardData.stats.activeOfficers} subtext="Currently clocked in" icon={CheckCircle2} colorClass="#10b981" />
                    <StatCard title="Utilization" value={`${Math.round((dashboardData.stats.activeOfficers / (dashboardData.stats.totalOfficers || 1)) * 100)}%`} subtext="Active / Total" icon={Activity} colorClass="#f59e0b" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Active Personnel List */}
                    <Card className="h-full">
                        <CardHeader className="border-b bg-muted/20 py-4"><CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Active Personnel</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y max-h-[400px] overflow-y-auto">
                                {dashboardData.activeEntries.length === 0 && <p className="p-6 text-muted-foreground text-sm text-center">No officers currently clocked in.</p>}
                                {dashboardData.activeEntries.map(entry => (
                                    <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Avatar fallback={entry.officer?.full_name[0]} className="border-2 border-background" />
                                                <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{entry.officer?.full_name}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapIcon className="h-3 w-3" /> {entry.shift?.site?.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="success" className="mb-1">Active</Badge>
                                            <p className="text-[10px] text-muted-foreground font-mono">{new Date(entry.clock_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Shifts (Next 12h) */}
                    <Card className="h-full">
                         <CardHeader className="border-b bg-muted/20 py-4"><CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Upcoming Shifts (Next 24h)</CardTitle></CardHeader>
                         <CardContent className="p-0">
                             <div className="divide-y max-h-[400px] overflow-y-auto">
                                 {dashboardData.shifts
                                    .filter(s => new Date(s.start_time) > new Date() && new Date(s.start_time) < new Date(Date.now() + 86400000))
                                    .sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                                    .slice(0,10)
                                    .map(shift => (
                                     <div key={shift.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                         <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{shift.site?.name}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    Officer: <span className="font-medium text-foreground/80">{shift.officer?.full_name || 'Unassigned'}</span>
                                                </p>
                                            </div>
                                         </div>
                                         <div className="text-right">
                                            <p className="text-sm font-semibold">{new Date(shift.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                            <p className="text-[10px] text-muted-foreground">Starts in {Math.round((new Date(shift.start_time).getTime() - Date.now()) / 3600000)} hrs</p>
                                         </div>
                                     </div>
                                 ))}
                                 {dashboardData.shifts.filter(s => new Date(s.start_time) > new Date() && new Date(s.start_time) < new Date(Date.now() + 86400000)).length === 0 && (
                                     <p className="p-6 text-muted-foreground text-sm text-center">No upcoming shifts in the next 24h.</p>
                                 )}
                             </div>
                         </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* TAB: FINANCE */}
            <TabsContent value="finance" className="space-y-6 mt-0">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Est. Revenue (WTD)" value={`$${dashboardData.stats.revenueEst.toLocaleString()}`} subtext="Based on billable hours" icon={TrendingUp} colorClass="#10b981" />
                    <StatCard title="Est. Payroll (WTD)" value={`$${dashboardData.stats.payrollEst.toLocaleString()}`} subtext="Based on clock-ins" icon={Wallet} colorClass="#f59e0b" />
                    <StatCard title="Est. Margin" value={`$${(dashboardData.stats.revenueEst - dashboardData.stats.payrollEst).toLocaleString()}`} subtext={`${dashboardData.stats.revenueEst > 0 ? Math.round(((dashboardData.stats.revenueEst - dashboardData.stats.payrollEst)/dashboardData.stats.revenueEst)*100) : 0}% Margin`} icon={PieChart} colorClass="#3b82f6" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader className="border-b py-4 bg-muted/20"><CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Top Revenue Sites (WTD)</CardTitle></CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-5">
                                {revenueBySite.map((item, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-foreground">{item.name}</span>
                                            <span className="font-mono text-foreground">${item.value.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 rounded-full" 
                                                style={{ width: `${Math.min(100, (item.value / (revenueBySite[0]?.value || 1)) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {revenueBySite.length === 0 && <p className="text-sm text-muted-foreground">No revenue data available for this week.</p>}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b py-4 bg-muted/20"><CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Recent Billable Shifts</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y max-h-[300px] overflow-y-auto">
                                {dashboardData.entries.slice(0, 5).map(entry => (
                                    <div key={entry.id} className="p-4 flex justify-between items-center hover:bg-muted/20 transition-colors">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{entry.shift?.site?.name}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(entry.clock_in).toLocaleDateString()} • {entry.total_hours.toFixed(1)} hrs</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-mono font-bold text-foreground">${Math.round(entry.total_hours * (entry.shift?.bill_rate || 45))}</p>
                                            <Badge variant="outline" className="text-[10px] uppercase mt-0.5">Unbilled</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* TAB: RISK */}
            <TabsContent value="risk" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Open Incidents" value={dashboardData.stats.openIncidents} subtext="Pending Investigation" icon={ShieldAlert} colorClass="#ef4444" />
                    <StatCard title="Total Incidents (WTD)" value={dashboardData.incidents.length} subtext="All categories" icon={FileText} colorClass="#f97316" />
                    <StatCard title="High Risk Sites" value={sites.filter(s => s.risk_level === 'high').length} subtext="Requiring increased patrol" icon={AlertTriangle} colorClass="#dc2626" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <Card>
                        <CardHeader className="border-b py-4 bg-muted/20"><CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Recent Incident Log</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y max-h-[400px] overflow-y-auto">
                                {dashboardData.incidents.map(inc => (
                                    <div key={inc.id} className="p-4 hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant={inc.severity === 'high' || inc.severity === 'critical' ? 'destructive' : 'secondary'} className="uppercase text-[10px]">
                                                {inc.severity}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">{new Date(inc.reported_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="font-semibold text-sm text-foreground">{inc.type} Incident at {inc.site?.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{inc.description}</p>
                                    </div>
                                ))}
                                {dashboardData.incidents.length === 0 && <p className="p-6 text-muted-foreground text-sm text-center">No incidents found.</p>}
                            </div>
                        </CardContent>
                     </Card>

                     <Card>
                        <CardHeader className="border-b py-4 bg-muted/20"><CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">High Risk Locations</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y max-h-[400px] overflow-y-auto">
                                {sites.filter(s => s.risk_level === 'high').map(site => (
                                    <div key={site.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-red-500/10 text-red-500 rounded-lg"><ShieldAlert className="h-4 w-4" /></div>
                                            <div>
                                                <p className="font-medium text-sm text-foreground">{site.name}</p>
                                                <p className="text-xs text-muted-foreground">{site.address}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm">Details</Button>
                                    </div>
                                ))}
                                {sites.filter(s => s.risk_level === 'high').length === 0 && (
                                    <div className="p-8 text-center">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                                        <p className="text-sm font-medium text-foreground">No High Risk Sites</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                     </Card>
                </div>
            </TabsContent>
            </>
            )}
        </Tabs>
      ) : !isAdmin && !isClient && profile ? (
        // --- OFFICER MOBILE DASHBOARD ---
        <div className="max-w-md mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'},</h2>
                    <p className="text-muted-foreground text-sm">{profile.full_name}</p>
                </div>
                <Avatar className="h-12 w-12 border-2 border-background shadow-md" fallback={profile.full_name[0]} />
            </div>

            {/* STATUS CARD */}
            <Card className={`border-0 shadow-lg overflow-hidden ${isClockedIn ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30' : 'bg-card'}`}>
                <CardContent className="pt-8 pb-8 text-center space-y-5">
                    <div className="flex justify-center">
                        <div className={cn("rounded-full p-5 transition-all duration-500", isClockedIn ? 'bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50 dark:bg-emerald-900/50 dark:text-emerald-400 dark:ring-emerald-900/20 animate-pulse' : 'bg-muted text-muted-foreground')}>
                            <Shield className="h-12 w-12" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight text-foreground">{isClockedIn ? 'ON DUTY' : 'OFF DUTY'}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isClockedIn ? 'Monitoring active' : 'Ready to start?'}
                        </p>
                    </div>
                    
                    {isClockedIn && (
                        <div className="inline-block bg-foreground text-background px-6 py-2 rounded-full font-mono text-xl font-bold shadow-sm">
                            {formatDuration(shiftDuration)}
                        </div>
                    )}

                    {!isClockedIn && (
                        <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 text-left border text-sm text-muted-foreground shadow-sm">
                            <div className="flex justify-between mb-2">
                                <span>Nearest Site:</span>
                                <span className="font-semibold text-foreground">{geoStatus === 'success' && nearestSite ? nearestSite.site.name : 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>GPS Signal:</span>
                                <span className={cn("font-medium", geoStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
                                    {geoStatus === 'idle' ? 'Waiting...' : geoStatus === 'locating' ? 'Acquiring...' : geoStatus === 'success' ? 'Locked' : 'Error'}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        {geoStatus !== 'success' && !isClockedIn ? (
                            <Button onClick={handleCheckLocation} className="w-full gap-2 h-12 text-base shadow-md" variant="outline">
                                <LocateFixed className="h-5 w-5" /> Verify Location
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleClockAction} 
                                className={cn("w-full gap-2 shadow-lg transition-all h-12 text-base font-semibold", isClockedIn ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white')} 
                                size="lg"
                                disabled={!isClockedIn && (!nearestSite || nearestSite.distance > nearestSite.site.radius)}
                            >
                                {isClockedIn ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                                {isClockedIn ? 'End Shift' : 'Start Shift'}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* QUICK ACTIONS GRID */}
            <div>
                <h3 className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="h-28 flex flex-col items-center justify-center gap-3 bg-card hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:border-red-900 transition-all shadow-sm rounded-xl border-border">
                        <Siren className="h-8 w-8" />
                        <span className="font-medium">Incident</span>
                    </Button>
                    <Button variant="outline" className="h-28 flex flex-col items-center justify-center gap-3 bg-card hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:border-blue-900 transition-all shadow-sm rounded-xl border-border">
                        <FileText className="h-8 w-8" />
                        <span className="font-medium">Log Entry</span>
                    </Button>
                    <Button variant="outline" className="h-28 flex flex-col items-center justify-center gap-3 bg-card hover:bg-accent transition-all shadow-sm rounded-xl border-border">
                        <CheckCircle2 className="h-8 w-8" />
                        <span className="font-medium">Check-In</span>
                    </Button>
                    <Button variant="outline" className="h-28 flex flex-col items-center justify-center gap-3 bg-card hover:bg-accent transition-all shadow-sm rounded-xl border-border">
                        <Phone className="h-8 w-8" />
                        <span className="font-medium">Dispatch</span>
                    </Button>
                </div>
            </div>

            {/* UPCOMING SCHEDULE */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Up Next</h3>
                    <Button variant="link" size="sm" className="h-auto p-0 text-primary">View Calendar</Button>
                </div>
                {myNextShift ? (
                    <Card className="border-l-4 border-l-primary shadow-md">
                        <CardContent className="p-5 flex gap-5 items-center">
                            <div className="flex flex-col items-center justify-center h-14 w-14 bg-primary/10 text-primary rounded-xl">
                                <span className="text-[10px] font-bold uppercase tracking-wider">{new Date(myNextShift.start_time).toLocaleDateString('en-US', {weekday: 'short'})}</span>
                                <span className="text-xl font-bold leading-none">{new Date(myNextShift.start_time).getDate()}</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-base text-foreground">{myNextShift.site?.name}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{new Date(myNextShift.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(myNextShift.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                    </Card>
                ) : (
                    <div className="p-8 border border-dashed rounded-xl text-center text-sm text-muted-foreground bg-muted/20">No upcoming shifts. Enjoy your time off!</div>
                )}
            </div>
        </div>
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  );
}
