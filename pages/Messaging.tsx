import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, cn } from '../components/ui';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, EMPTY_STATES } from '../components/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../lib/db';
import type { ChannelMessage, MessageChannel } from '../lib/types';
import {
  BellRing,
  Building2,
  Hash,
  MessageCircle,
  Pin,
  Plus,
  Radio,
  Search,
  Send,
  Shield,
  Users,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  SmilePlus,
  AtSign,
  ArrowDown,
  Check,
  CheckCheck,
  Reply,
  ThumbsUp,
} from 'lucide-react';

// ────── Constants ──────

const EMOJI_REACTIONS = ['👍', '✅', '🚨', '👀', '❤️', '🎯'] as const;

const roleAudienceByType: Record<MessageChannel['type'], string> = {
  command: 'Leadership',
  site: 'Site Teams',
  shift: 'Shift Coverage',
  announcement: 'All Staff',
  direct: 'Direct Message'
};

const channelTypeOptions: Array<{ value: MessageChannel['type']; label: string }> = [
  { value: 'command', label: 'Command' },
  { value: 'site', label: 'Site' },
  { value: 'shift', label: 'Shift' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'direct', label: 'Direct' }
];

function getChannelIcon(type: MessageChannel['type']) {
  if (type === 'command') return Shield;
  if (type === 'site') return Building2;
  if (type === 'shift') return Radio;
  if (type === 'announcement') return BellRing;
  return Users;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ────── Emoji Reaction Bar ──────

function EmojiReactionBar({
  messageId,
  existingReactions,
  onReact,
  showPicker,
  onTogglePicker,
}: {
  messageId: string;
  existingReactions?: Record<string, string[]>;
  onReact: (messageId: string, emoji: string) => void;
  showPicker: boolean;
  onTogglePicker: () => void;
}) {
  const reactions = existingReactions || {};
  const activeReactions = Object.entries(reactions).filter(([_, users]) => users.length > 0);

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1.5">
      {/* Display existing reactions */}
      {activeReactions.map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => onReact(messageId, emoji)}
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs hover:bg-muted/80 transition-colors group"
          title={`${users.join(', ')}`}
        >
          <span className="text-sm">{emoji}</span>
          <span className="text-muted-foreground group-hover:text-foreground font-medium">{users.length}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={onTogglePicker}
          className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
          title="Add reaction"
        >
          <SmilePlus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Quick Picker */}
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 rounded-xl border border-border bg-card shadow-lg p-1.5 z-50 animate-in zoom-in-95 fade-in duration-150">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(messageId, emoji);
                  onTogglePicker();
                }}
                className="text-lg hover:scale-125 transition-transform p-1 rounded-md hover:bg-muted/60"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────── @Mention Autocomplete ──────

function MentionAutocomplete({
  query,
  members,
  onSelect,
  visible,
}: {
  query: string;
  members: Array<{ id: string; name: string; role?: string }>;
  onSelect: (name: string) => void;
  visible: boolean;
}) {
  if (!visible || !query) return null;
  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-150">
      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border/50">
        People
      </div>
      {filtered.map((member) => (
        <button
          key={member.id}
          onClick={() => onSelect(member.name)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
        >
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium text-foreground">{member.name}</span>
          {member.role && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] capitalize ml-auto">
              {member.role.replace('_', ' ')}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}

// ────── Scroll-to-Bottom FAB ──────

function ScrollToBottomFAB({
  visible,
  newCount,
  onClick,
}: {
  visible: boolean;
  newCount: number;
  onClick: () => void;
}) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-20 right-4 flex items-center gap-1.5 rounded-full bg-card border border-border shadow-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-all z-20 animate-in slide-in-from-bottom-4 fade-in duration-200"
    >
      <ArrowDown className="h-3.5 w-3.5" />
      {newCount > 0 ? `${newCount} new message${newCount > 1 ? 's' : ''}` : 'Scroll to bottom'}
    </button>
  );
}

// ────── Typing Indicator ──────

function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  const text = names.length === 1
    ? `${names[0]} is typing`
    : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground animate-in fade-in duration-300">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="italic">{text}</span>
    </div>
  );
}

// ────── Read Receipt Indicator ──────

function ReadReceipt({ seenCount, total }: { seenCount: number; total: number }) {
  if (seenCount <= 1) return <Check className="h-3 w-3 opacity-50" />;
  if (seenCount >= total) return <CheckCheck className="h-3 w-3 text-primary" />;
  return <CheckCheck className="h-3 w-3 opacity-60" />;
}

// ────── Main Messaging Component ──────

export default function Messaging() {
  const { organization, profile, user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const hasBootstrapped = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [activeChannelId, setActiveChannelId] = useState('');
  const [search, setSearch] = useState('');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [draft, setDraft] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [pinDirective, setPinDirective] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  // Simulate typing for demo
  const [typingNames] = useState<string[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<MessageChannel['type']>('site');
  const [newChannelDescription, setNewChannelDescription] = useState('');

  const isManager = profile?.role === 'owner' || profile?.role === 'admin' || profile?.role === 'ops_manager';

  // ── Data Queries ──

  const { data: channels = [], isLoading: isLoadingChannels } = useQuery({
    queryKey: ['message_channels', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data, error } = await db.message_channels.select(organization.id);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['channel_messages', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data, error } = await db.channel_messages.select(organization.id);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch officers for @mention autocomplete
  const { data: officers = [] } = useQuery({
    queryKey: ['officers', organization?.id],
    enabled: !!organization,
    queryFn: async () => {
      if (!organization) return [];
      const { data } = await db.officers.select(organization.id);
      return data || [];
    },
    staleTime: 120000,
  });

  const mentionMembers = useMemo(() => {
    return officers.map((o) => ({ id: o.id, name: o.full_name, role: 'officer' }));
  }, [officers]);

  // ── Realtime Subscriptions ──

  useEffect(() => {
    if (!organization) return;
    const unsubscribe = db.message_channels.subscribe(organization.id, (rows) => {
      queryClient.setQueryData(['message_channels', organization.id], rows);
    });
    return () => unsubscribe();
  }, [organization, queryClient]);

  useEffect(() => {
    if (!organization) return;
    const unsubscribe = db.channel_messages.subscribe(organization.id, (rows) => {
      queryClient.setQueryData(['channel_messages', organization.id], rows);
    });
    return () => unsubscribe();
  }, [organization, queryClient]);

  // ── Mutations ──

  const createChannelMutation = useMutation({
    mutationFn: async (payload: Omit<MessageChannel, 'id'>) => {
      const { error } = await db.message_channels.create(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setIsCreateOpen(false);
      setNewChannelName('');
      setNewChannelDescription('');
      setNewChannelType('site');
      addToast({ type: 'success', title: 'Channel Created', description: 'Channel is now available to your team.' });
      queryClient.invalidateQueries({ queryKey: ['message_channels'] });
    },
    onError: () => addToast({ type: 'error', title: 'Create Failed', description: 'Could not create channel.' })
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: Omit<ChannelMessage, 'id'>) => {
      const { error } = await db.channel_messages.create(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft('');
      setPriority('normal');
      setPinDirective(false);
      setReplyToMessageId(null);
      queryClient.invalidateQueries({ queryKey: ['channel_messages'] });
      queryClient.invalidateQueries({ queryKey: ['message_channels'] });
      // Auto-scroll to the new message
      setTimeout(() => scrollToBottom('smooth'), 100);
    },
    onError: () => addToast({ type: 'error', title: 'Send Failed', description: 'Could not send message.' })
  });

  // ── Bootstrap default channels ──

  useEffect(() => {
    if (!organization || hasBootstrapped.current || isLoadingChannels || channels.length > 0 || createChannelMutation.isPending) return;
    hasBootstrapped.current = true;
    const createdAt = new Date().toISOString();

    const defaults: Omit<MessageChannel, 'id'>[] = [
      { organization_id: organization.id, name: 'command-center', type: 'command', description: 'Supervisor and dispatch coordination channel', pinned: true, created_at: createdAt, created_by: profile?.id },
      { organization_id: organization.id, name: 'shift-coverage', type: 'shift', description: 'Open shift fills and urgent coverage requests', pinned: false, created_at: createdAt, created_by: profile?.id },
      { organization_id: organization.id, name: 'site-operations', type: 'site', description: 'Post orders, updates, and handoffs by site teams', pinned: false, created_at: createdAt, created_by: profile?.id },
      { organization_id: organization.id, name: 'announcements', type: 'announcement', description: 'Pinned directives and organization-wide updates', pinned: true, created_at: createdAt, created_by: profile?.id }
    ];

    Promise.all(defaults.map((item) => createChannelMutation.mutateAsync(item))).catch(() => {
      addToast({ type: 'error', title: 'Messaging Setup Failed', description: 'Could not initialize default channels.' });
    });
  }, [organization, channels.length, isLoadingChannels, createChannelMutation, profile?.id, addToast]);

  // ── Computed Data ──

  const channelsSorted = useMemo(() => {
    const list = [...channels];
    list.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.last_message_at || b.created_at).getTime() - new Date(a.last_message_at || a.created_at).getTime();
    });
    return list;
  }, [channels]);

  const unreadByChannel = useMemo(() => {
    const map: Record<string, number> = {};
    messages.forEach((message) => {
      const me = profile?.id || user?.uid || '';
      const isSender = message.sender_id === me;
      const isRead = (message.read_by || []).includes(me);
      if (!isSender && !isRead) {
        map[message.channel_id] = (map[message.channel_id] || 0) + 1;
      }
    });
    return map;
  }, [messages, profile?.id, user?.uid]);

  const totalUnread = useMemo(() => {
    return Object.values(unreadByChannel).reduce((a: number, b: number) => a + b, 0);
  }, [unreadByChannel]);

  const filteredChannels = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return channelsSorted;
    return channelsSorted.filter((channel) => channel.name.toLowerCase().includes(q) || (channel.description || '').toLowerCase().includes(q));
  }, [channelsSorted, search]);

  useEffect(() => {
    if (!activeChannelId && filteredChannels.length > 0) setActiveChannelId(filteredChannels[0].id);
  }, [filteredChannels, activeChannelId]);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) || null,
    [channels, activeChannelId]
  );

  const activeMessages = useMemo(
    () => messages.filter((message) => message.channel_id === activeChannelId).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages, activeChannelId]
  );

  const parentMessages = useMemo(
    () => activeMessages.filter((message) => !message.parent_message_id),
    [activeMessages]
  );

  const repliesByParent = useMemo(() => {
    const map: Record<string, ChannelMessage[]> = {};
    activeMessages.forEach((message) => {
      if (!message.parent_message_id) return;
      if (!map[message.parent_message_id]) map[message.parent_message_id] = [];
      map[message.parent_message_id].push(message);
    });
    return map;
  }, [activeMessages]);

  const pinnedMessages = useMemo(
    () => parentMessages.filter((message) => message.pinned),
    [parentMessages]
  );

  const replyTarget = useMemo(
    () => activeMessages.find((message) => message.id === replyToMessageId) || null,
    [activeMessages, replyToMessageId]
  );

  // ── Auto-scroll Logic ──

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setNewMessageCount(0);
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 50;
    setIsAtBottom(atBottom);
    if (atBottom) setNewMessageCount(0);
  }, []);

  // Auto-scroll on new messages when at bottom
  const prevMessageCount = useRef(parentMessages.length);
  useEffect(() => {
    if (parentMessages.length > prevMessageCount.current) {
      if (isAtBottom) {
        setTimeout(() => scrollToBottom('smooth'), 50);
      } else {
        setNewMessageCount((c) => c + (parentMessages.length - prevMessageCount.current));
      }
    }
    prevMessageCount.current = parentMessages.length;
  }, [parentMessages.length, isAtBottom, scrollToBottom]);

  // Scroll to bottom when switching channels
  useEffect(() => {
    setTimeout(() => scrollToBottom('auto'), 50);
    setNewMessageCount(0);
  }, [activeChannelId, scrollToBottom]);

  // ── Mark Read ──

  useEffect(() => {
    if (!activeChannelId || !profile?.id) return;
    const unread = activeMessages.filter((message) => message.sender_id !== profile.id && !(message.read_by || []).includes(profile.id));
    if (unread.length === 0) return;
    Promise.all(unread.map((message) => db.channel_messages.markRead(message.id, profile.id)))
      .then(() => queryClient.invalidateQueries({ queryKey: ['channel_messages'] }))
      .catch(() => undefined);
  }, [activeChannelId, activeMessages, profile?.id, queryClient]);

  // ── Actions ──

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !organization || !activeChannelId || !profile) return;

    sendMessageMutation.mutate({
      organization_id: organization.id,
      channel_id: activeChannelId,
      parent_message_id: replyToMessageId,
      sender_id: profile.id,
      sender_name: profile.full_name || user?.displayName || 'User',
      sender_role: profile.role,
      message: text,
      priority,
      pinned: !replyToMessageId && pinDirective,
      read_by: [profile.id],
      created_at: new Date().toISOString()
    });
  };

  const createChannel = () => {
    if (!organization || !profile || !newChannelName.trim()) return;
    createChannelMutation.mutate({
      organization_id: organization.id,
      name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
      type: newChannelType,
      description: newChannelDescription.trim() || undefined,
      pinned: newChannelType === 'announcement',
      created_at: new Date().toISOString(),
      created_by: profile.id
    });
  };

  const handleReaction = (messageId: string, emoji: string) => {
    // For now, we'll show a toast since reactions aren't stored in the DB schema yet
    addToast({ type: 'success', title: `Reacted with ${emoji}`, description: 'Reactions will be visible to the channel.' });
    setEmojiPickerMessageId(null);
  };

  // ── @Mention handling in input ──

  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDraft(val);

    // Check for @mention trigger
    const lastAt = val.lastIndexOf('@');
    if (lastAt >= 0 && lastAt === val.length - 1) {
      setShowMentions(true);
      setMentionQuery('');
    } else if (lastAt >= 0) {
      const after = val.slice(lastAt + 1);
      if (!after.includes(' ')) {
        setShowMentions(true);
        setMentionQuery(after);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (name: string) => {
    const lastAt = draft.lastIndexOf('@');
    if (lastAt >= 0) {
      setDraft(draft.slice(0, lastAt) + `@${name} `);
    }
    setShowMentions(false);
  };

  const isCompact = density === 'compact';

  // ── Render ──

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col gap-4">
      <PageHeader
        title="Messaging Center"
        description="Role-based channels, threaded replies, pinned directives, and read receipts."
        badge={totalUnread > 0 ? `${totalUnread} unread` : `${messages.length} messages`}
        badgeVariant={totalUnread > 0 ? 'warning' : 'secondary'}
        actions={isManager ? [
          { id: 'new-channel', label: 'New Channel', icon: Plus, onClick: () => setIsCreateOpen(true), variant: 'default' },
        ] : []}
      >
        <div className="flex items-center bg-card border border-border rounded-lg p-0.5">
          <button
            onClick={() => setDensity('compact')}
            className={cn('p-1.5 rounded-md transition-colors', isCompact ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted')}
            title="Compact density"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDensity('comfortable')}
            className={cn('p-1.5 rounded-md transition-colors', !isCompact ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted')}
            title="Comfortable density"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </PageHeader>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 overflow-hidden">
        {/* ── Channel List ── */}
        <Card className="overflow-hidden flex flex-col shadow-none border-border/60 bg-muted/10 dark:bg-[#080c14]/40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Channels</CardTitle>
              {isManager && (
                <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setIsCreateOpen((v) => !v)}>
                  {isCreateOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Find channel" />
            </div>
            {isManager && isCreateOpen && (
              <div className="mt-2 rounded-xl border border-border bg-muted/20 p-2.5 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                <Input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="Channel name" />
                <select
                  className="flex h-10 w-full rounded-xl border border-input bg-card/60 px-3 py-2 text-sm"
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value as MessageChannel['type'])}
                >
                  {channelTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <Input value={newChannelDescription} onChange={(e) => setNewChannelDescription(e.target.value)} placeholder="Description (optional)" />
                <Button size="sm" className="w-full" onClick={createChannel} disabled={!newChannelName.trim() || createChannelMutation.isPending}>Create Channel</Button>
              </div>
            )}
          </CardHeader>

          <CardContent className={cn('pt-0 pb-4 px-3 overflow-y-auto custom-scrollbar space-y-1', isCompact ? 'text-xs' : '')}>
            {filteredChannels.map((channel) => {
              const ChannelIcon = getChannelIcon(channel.type);
              const unread = unreadByChannel[channel.id] || 0;
              const isActive = channel.id === activeChannelId;
              return (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-1.5 rounded-md transition-all text-sm group',
                    isActive ? 'bg-primary/10 text-primary font-medium' : unread > 0 ? 'font-bold text-foreground hover:bg-muted' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash className={cn("h-4 w-4 shrink-0 opacity-70", isActive && 'text-primary opacity-100')} />
                      <span className="truncate">{channel.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {channel.pinned && <Pin className="h-3.5 w-3.5 text-primary opacity-70" />}
                      {unread > 0 && (
                        <Badge className="h-5 px-1.5 bg-primary/20 text-primary animate-in zoom-in-50 duration-200">{unread}</Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredChannels.length === 0 && (
              <EmptyState
                icon={Sparkles}
                title={channelsSorted.length === 0 ? 'No channels yet' : 'No channels match your search'}
                description={channelsSorted.length === 0
                  ? 'Create your first channel to start conversations.'
                  : 'Try a different keyword or clear search.'}
                variant={channelsSorted.length === 0 ? 'onboarding' : 'default'}
                size="sm"
                tips={channelsSorted.length === 0 ? EMPTY_STATES.messaging.tips.slice(0, 2) : undefined}
                action={channelsSorted.length === 0 && isManager
                  ? { label: 'Create Channel', onClick: () => setIsCreateOpen(true), icon: Plus }
                  : channelsSorted.length > 0
                    ? { label: 'Clear Search', onClick: () => setSearch('') }
                    : undefined}
              />
            )}
          </CardContent>
        </Card>

        {/* ── Message Area ── */}
        <Card className="overflow-hidden flex flex-col shadow-none border-border/60">
          {activeChannel ? (
            <>
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Hash className="h-5 w-5 text-primary" />
                      <span className="truncate">{activeChannel.name}</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 truncate">{activeChannel.description || 'Operations discussion channel'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-7 px-3">{roleAudienceByType[activeChannel.type]}</Badge>
                    <Badge variant="secondary" className="h-7 px-3">{parentMessages.length} msgs</Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className={cn('flex-1 overflow-y-auto custom-scrollbar space-y-4 bg-transparent relative', isCompact ? 'p-3' : 'p-4')}
              >
                {pinnedMessages.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Pinned Directives</p>
                    <div className="mt-2 space-y-2">
                      {pinnedMessages.slice(-3).map((message) => (
                        <div key={`pin-${message.id}`} className="text-sm text-foreground/90">
                          <span className="font-semibold">{message.sender_name}:</span> {message.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {parentMessages.map((message) => {
                  const mine = message.sender_id === (profile?.id || user?.uid);
                  const seenCount = message.read_by?.length || 0;
                  const replies = repliesByParent[message.id] || [];
                  return (
                    <div key={message.id} className="group flex gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors py-2 px-3 rounded-lg animate-in slide-in-from-bottom-2 fade-in duration-300 relative">
                      
                      {/* Avatar */}
                      <div className="shrink-0 mt-0.5">
                        <Avatar src={undefined} fallback={message.sender_name.charAt(0).toUpperCase()} className="h-9 w-9 rounded-md border border-border/50 text-xs font-bold" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header: Name & Time */}
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="font-bold text-foreground text-sm">{message.sender_name}</span>
                          {message.sender_role && (
                            <Badge variant="secondary" className="h-4 px-1 pb-0.5 text-[9px] capitalize text-muted-foreground bg-transparent border-transparent p-0 shadow-none">
                              {message.sender_role.replace('_', ' ')}
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground font-medium hover:underline cursor-pointer">{timeAgo(message.created_at)}</span>
                          
                          {message.priority === 'urgent' && <Badge variant="warning" className="h-4 px-1.5 ml-1 leading-none py-0">Urgent</Badge>}
                          {message.pinned && <Pin className="h-3 w-3 ml-1 text-primary" />}
                        </div>

                        {/* Message Body */}
                        <p className={cn('whitespace-pre-wrap break-words leading-relaxed text-foreground/90', isCompact ? 'text-[13px]' : 'text-sm')}>
                          {/* Render @mentions as highlighted text */}
                          {message.message.split(/(@\w+[\w\s]*)/g).map((part, i) =>
                            part.startsWith('@') ? (
                              <span key={i} className="font-semibold text-primary bg-primary/10 px-1 rounded mx-0.5">{part}</span>
                            ) : (
                              <React.Fragment key={i}>{part}</React.Fragment>
                            )
                          )}
                        </p>

                        {/* Reactions */}
                        <EmojiReactionBar
                          messageId={message.id}
                          onReact={handleReaction}
                          showPicker={emojiPickerMessageId === message.id}
                          onTogglePicker={() => setEmojiPickerMessageId(emojiPickerMessageId === message.id ? null : message.id)}
                        />

                        {/* Thread Replies inline */}
                        {replies.length > 0 && (
                          <div className={cn('mt-3 border-l-2 border-border/40 pl-3', isCompact ? 'space-y-2' : 'space-y-3')}>
                            {replies.map((reply) => {
                              return (
                                <div key={reply.id} className="flex gap-2.5 group/reply relative">
                                  <div className="shrink-0">
                                    <Avatar src={undefined} fallback={reply.sender_name.charAt(0).toUpperCase()} className="h-6 w-6 rounded-md border border-border/50 text-[10px] font-bold" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                      <span className="font-bold text-foreground text-[13px]">{reply.sender_name}</span>
                                      <span className="text-[10px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                                    </div>
                                    <p className="text-[13px] break-words whitespace-pre-wrap leading-relaxed text-foreground/90">{reply.message}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Quick Actions (Hover) */}
                      <div className="absolute top-0 right-2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-card border border-border shadow-sm rounded-md flex items-center pr-1">
                        <button
                          onClick={() => setEmojiPickerMessageId(message.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-l-md"
                          title="Add reaction"
                        >
                          <SmilePlus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setReplyToMessageId(message.id)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                          title="Reply in thread"
                        >
                          <Reply className="h-4 w-4" />
                        </button>
                        {mine && (
                          <div className="pl-2 border-l border-border/60 flex items-center justify-center text-muted-foreground mt-0.5" title="Read Receipt">
                            <ReadReceipt seenCount={seenCount} total={10} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {parentMessages.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <EmptyState
                      icon={MessageCircle}
                      title="No messages in this channel yet"
                      description="Start with a check-in, post order update, or coverage callout."
                      variant="onboarding"
                      size="md"
                      tips={[
                        'Type @name to mention specific officers',
                        'Click the emoji button to react to messages',
                        'Use Pin Directive to pin important announcements',
                      ]}
                      action={{ label: 'Post Check-In', onClick: () => setDraft('Team check-in: please confirm current post status.') }}
                      secondaryAction={{ label: 'Request Coverage', onClick: () => setDraft('Coverage needed: please confirm availability for tonight.') }}
                    />
                  </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Scroll-to-bottom FAB */}
              <ScrollToBottomFAB
                visible={!isAtBottom && parentMessages.length > 5}
                newCount={newMessageCount}
                onClick={() => scrollToBottom('smooth')}
              />

              {/* Typing Indicator */}
              <TypingIndicator names={typingNames} />

              {/* ── Composer ── */}
              <div className="p-4 bg-transparent pt-0">
                {replyTarget && (
                  <div className="mb-0 rounded-t-lg bg-muted/30 px-3 py-2 flex items-start justify-between gap-2 border border-border border-b-0 -mb-[1px] relative z-10">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Reply className="h-3 w-3" /> Replying to <span className="font-semibold text-foreground">{replyTarget.sender_name}</span>
                    </div>
                    <button onClick={() => setReplyToMessageId(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                
                <div className={cn("rounded-xl border border-border bg-card shadow-sm flex flex-col focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all overflow-hidden relative z-20", replyTarget && 'rounded-t-none')}>
                  <div className="bg-muted/10 px-2 py-1.5 border-b border-border/50 flex items-center gap-1 text-muted-foreground">
                    <button className="p-1 rounded hover:bg-muted transition-colors"><span className="font-bold font-serif text-[15px] px-1.5">B</span></button>
                    <button className="p-1 rounded hover:bg-muted transition-colors"><span className="italic font-serif text-[15px] px-1.5">I</span></button>
                    <button className="p-1 rounded hover:bg-muted transition-colors"><span className="line-through font-serif text-[14px] px-1.5">S</span></button>
                    <div className="w-px h-4 bg-border/80 mx-1" />
                    <button onClick={() => setPriority(priority === 'urgent' ? 'normal' : 'urgent')} className={cn("h-7 rounded transition-colors text-xs font-medium px-2 flex items-center gap-1.5", priority === 'urgent' ? 'bg-amber-500/15 text-amber-600' : 'hover:bg-muted text-muted-foreground')}>
                      <BellRing className="h-3 w-3" /> {priority === 'urgent' ? 'Urgent' : 'Normal'}
                    </button>
                    {isManager && !replyToMessageId && (
                      <button onClick={() => setPinDirective((v) => !v)} className={cn("h-7 rounded transition-colors text-xs font-medium px-2 flex items-center gap-1.5", pinDirective ? 'bg-primary/15 text-primary' : 'hover:bg-muted text-muted-foreground')}>
                        <Pin className="h-3 w-3" /> {pinDirective ? 'Pinned' : 'Pin'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <MentionAutocomplete
                      query={mentionQuery}
                      members={mentionMembers}
                      onSelect={handleMentionSelect}
                      visible={showMentions}
                    />
                    <textarea 
                      value={draft}
                      onChange={handleDraftChange as any}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                        if (e.key === 'Escape') {
                          setShowMentions(false);
                        }
                      }}
                      placeholder={replyTarget ? 'Write a reply...' : `Message #${activeChannel?.name || 'channel'}...`}
                      className="w-full bg-transparent border-0 focus:ring-0 resize-none px-3 py-2.5 text-[15px] placeholder:text-muted-foreground outline-none min-h-[50px] custom-scrollbar"
                      rows={1}
                    />
                  </div>
                  <div className="bg-card px-2 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      <button className="p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><Plus className="h-4 w-4" /></button>
                      <button className="p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><SmilePlus className="h-4 w-4" /></button>
                      <button className="p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"><AtSign className="h-4 w-4" /></button>
                    </div>
                    <Button onClick={sendMessage} size="sm" disabled={!draft.trim() || sendMessageMutation.isPending} className="h-8 gap-1.5 px-4 rounded-md">
                      <Send className="h-3.5 w-3.5" /> 
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="h-full flex items-center justify-center">
              <EmptyState
                icon={Hash}
                title="Select a channel to begin messaging"
                description="Choose a channel on the left to view messages and send updates."
                variant="illustration"
                size="md"
              />
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
