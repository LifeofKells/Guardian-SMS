import React, { useState } from 'react';
import {
  Plus,
  Zap,
  ShieldAlert,
  CalendarPlus,
  FileSpreadsheet,
  Search,
  Activity,
  X,
  Bell
} from 'lucide-react';
import { Button, cn, Tooltip } from './ui';
import { PanicAlertModal } from './PanicAlertModal';

interface QuickActionDockProps {
  onNavigate?: (page: string, data?: Record<string, any>) => void;
  onOpenCommandPalette?: () => void;
  onOpenActivityStream?: () => void;
}

export function QuickActionDock({ onNavigate, onOpenCommandPalette, onOpenActivityStream }: QuickActionDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPanicModal, setShowPanicModal] = useState(false);

  const toggleDock = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Floating Action Bar Container */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
        {/* Expanded Actions Stack */}
        {isOpen && (
          <div className="flex flex-col items-end gap-2.5 mb-2 pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-300">
            {/* Command Palette Trigger */}
            <Tooltip content="Command Search (Cmd+K)" side="left">
              <button
                onClick={() => {
                  onOpenCommandPalette?.();
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-xl text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-105 group"
              >
                <span className="text-xs font-semibold">Command Search</span>
                <div className="p-1.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Search className="h-4 w-4" />
                </div>
              </button>
            </Tooltip>

            {/* Quick Shift Creation */}
            <Tooltip content="New Shift Dispatch" side="left">
              <button
                onClick={() => {
                  onNavigate?.('schedule', { drillDown: true });
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-xl text-foreground hover:bg-blue-500/10 hover:text-blue-500 transition-all duration-300 hover:scale-105 group"
              >
                <span className="text-xs font-semibold">Dispatch Shift</span>
                <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <CalendarPlus className="h-4 w-4" />
                </div>
              </button>
            </Tooltip>

            {/* Report Incident */}
            <Tooltip content="Report Incident" side="left">
              <button
                onClick={() => {
                  onNavigate?.('reports', { drillDown: true });
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-xl text-foreground hover:bg-amber-500/10 hover:text-amber-500 transition-all duration-300 hover:scale-105 group"
              >
                <span className="text-xs font-semibold">Log Incident</span>
                <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
              </button>
            </Tooltip>

            {/* Live Activity Stream */}
            {onOpenActivityStream && (
              <Tooltip content="Live Operations Feed" side="left">
                <button
                  onClick={() => {
                    onOpenActivityStream();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-xl text-foreground hover:bg-emerald-500/10 hover:text-emerald-500 transition-all duration-300 hover:scale-105 group"
                >
                  <span className="text-xs font-semibold">Activity Feed</span>
                  <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <Activity className="h-4 w-4" />
                  </div>
                </button>
              </Tooltip>
            )}

            {/* Panic Alert Trigger */}
            <Tooltip content="Trigger Panic Alert" side="left">
              <button
                onClick={() => {
                  setShowPanicModal(true);
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-red-600/90 text-white backdrop-blur-xl border border-red-500/60 shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all duration-300 hover:scale-105 group"
              >
                <span className="text-xs font-bold uppercase tracking-wider">Emergency Panic Alert</span>
                <div className="p-1.5 rounded-xl bg-white/20 text-white">
                  <ShieldAlert className="h-4 w-4 animate-pulse" />
                </div>
              </button>
            </Tooltip>
          </div>
        )}

        {/* Main Trigger Button */}
        <button
          onClick={toggleDock}
          className={cn(
            "pointer-events-auto h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ease-spring group relative border",
            isOpen
              ? "bg-foreground text-background border-foreground hover:scale-110"
              : "bg-primary text-primary-foreground border-primary/40 hover:scale-110 hover:shadow-[0_0_25px_0_rgba(var(--primary),0.5)]"
          )}
          title={isOpen ? "Close Quick Actions" : "Quick Operations Hub"}
        >
          {/* Subtle pulse ring behind main button when closed */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping -z-10 opacity-75" />
          )}

          <div className="relative flex items-center justify-center">
            {isOpen ? (
              <X className="h-6 w-6 transition-transform duration-300 rotate-90" />
            ) : (
              <Zap className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
            )}
          </div>
        </button>
      </div>

      {/* Panic Modal Component */}
      <PanicAlertModal
        alert={showPanicModal ? {
          id: `panic_${Date.now()}`,
          officer_id: 'current_user',
          status: 'active',
          location: { lat: 37.7749, lng: -122.4194 },
          timestamp: new Date().toISOString(),
        } as any : null}
        currentUserId="current_user"
        onClose={() => setShowPanicModal(false)}
      />
    </>
  );
}
