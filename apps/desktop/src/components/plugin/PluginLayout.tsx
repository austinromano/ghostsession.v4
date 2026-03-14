import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import { api } from '../../lib/api';
import Avatar from '../common/Avatar';
import ChatPanel from '../session/ChatPanel';
import { useSessionStore } from '../../stores/sessionStore';
import { useAudioStore } from '../../stores/audioStore';
import { isPlugin } from '../../lib/hostContext';

interface Invitation {
  id: string;
  projectName: string;
  inviterName: string;
}

interface SamplePack {
  id: string;
  name: string;
  samples: { id: string; name: string; fileId?: string }[];
  updatedAt?: string;
}

function ProjectListSidebar({
  projects,
  selectedId,
  onSelect,
  onCreate,
  samplePacks,
  selectedPackId,
  onSelectPack,
  onCreatePack,
  friends,
}: {
  projects: { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  samplePacks: SamplePack[];
  selectedPackId: string | null;
  onSelectPack: (id: string) => void;
  onCreatePack: () => void;
  friends: { id: string; displayName: string; avatarUrl: string | null }[];
}) {
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [packsOpen, setPacksOpen] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ghost_favorites') || '[]')); } catch { return new Set(); }
  });
  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('ghost_favorites', JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Ghost Session branding */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5 border-b border-ghost-border/30 mb-1">
        <svg width="32" height="32" viewBox="0 0 26 26" fill="none" className="shrink-0">
          <circle cx="13" cy="13" r="11.5" stroke="#00FFC8" strokeWidth="2" fill="none" />
          <circle cx="13" cy="13" r="7" stroke="#00FFC8" strokeWidth="2" fill="none" />
          <circle cx="13" cy="13" r="2.5" fill="#00FFC8" />
        </svg>
        <span className="text-[16px] font-extrabold tracking-[0.15em] uppercase whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #00FFC8, #00B4D8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Ghost Session</span>
      </div>

      <FriendsPanel friends={friends} />

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Favorites dropdown */}
        <div>
          <button
            onClick={() => setFavoritesOpen((v) => !v)}
            className="h-8 px-3 flex items-center justify-between w-full hover:bg-ghost-surface-hover/30 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`text-ghost-text-muted transition-transform ${favoritesOpen ? 'rotate-90' : ''}`}>
                <polygon points="2,0 8,5 2,10" />
              </svg>
              <span className="text-[15px] font-bold text-ghost-text-muted uppercase tracking-[0.06em]">
                Favorites
              </span>
            </span>
          </button>
          {favoritesOpen && (
            <div className="px-2 pb-1.5 space-y-0.5">
              {projects.filter((p) => favoriteIds.has(p.id)).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className={`w-full text-left px-2 py-1.5 text-[15px] rounded-md transition-colors ${
                    selectedId === p.id && !selectedPackId
                      ? 'bg-ghost-surface-hover text-white font-semibold'
                      : 'text-ghost-text-muted font-medium hover:bg-ghost-surface-hover/50 hover:text-ghost-text-secondary'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ghost-text-muted shrink-0">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {p.name}
                  </span>
                </button>
              ))}
              {samplePacks.filter((sp) => favoriteIds.has(sp.id)).map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => onSelectPack(sp.id)}
                  className={`w-full text-left px-2 py-1.5 text-[15px] rounded-md transition-colors ${
                    selectedPackId === sp.id
                      ? 'bg-ghost-surface-hover text-white font-semibold'
                      : 'text-ghost-text-muted font-medium hover:bg-ghost-surface-hover/50 hover:text-ghost-text-secondary'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ghost-purple">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    {sp.name}
                  </span>
                </button>
              ))}
              {projects.filter((p) => favoriteIds.has(p.id)).length === 0 && samplePacks.filter((sp) => favoriteIds.has(sp.id)).length === 0 && (
                <p className="px-2 py-1.5 text-[13px] text-ghost-text-muted italic">No favorites yet</p>
              )}
            </div>
          )}
        </div>

        {/* Projects dropdown */}
        <div>
          <button
            onClick={() => setProjectsOpen((v) => !v)}
            className="h-8 px-3 flex items-center justify-between w-full hover:bg-ghost-surface-hover/30 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`text-ghost-text-muted transition-transform ${projectsOpen ? 'rotate-90' : ''}`}>
                <polygon points="2,0 8,5 2,10" />
              </svg>
              <span className="text-[15px] font-bold text-ghost-text-muted uppercase tracking-[0.06em]">
                Projects
              </span>
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); onCreate(); }}
              className="w-5 h-5 flex items-center justify-center rounded text-ghost-text-muted hover:text-ghost-text-primary text-sm transition-colors"
            >
              +
            </span>
          </button>
          {projectsOpen && (
            <div className="px-2 pb-1.5 space-y-0.5">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className={`group flex items-center w-full px-2 py-1.5 text-[15px] rounded-md transition-colors cursor-pointer ${
                    selectedId === p.id && !selectedPackId
                      ? 'bg-ghost-surface-hover text-white font-semibold'
                      : 'text-ghost-text-muted font-medium hover:bg-ghost-surface-hover/50 hover:text-ghost-text-secondary'
                  }`}
                  onClick={() => onSelect(p.id)}
                >
                  <span className="flex items-center gap-2 flex-1 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ghost-text-muted shrink-0">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span className="truncate">{p.name}</span>
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                    className={`shrink-0 ml-1 transition-colors ${favoriteIds.has(p.id) ? 'text-yellow-400' : 'text-ghost-text-muted/40 hover:text-yellow-400'}`}
                    title={favoriteIds.has(p.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={favoriteIds.has(p.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sample Packs dropdown */}
        <div>
          <button
            onClick={() => setPacksOpen((v) => !v)}
            className="h-8 px-3 flex items-center justify-between w-full hover:bg-ghost-surface-hover/30 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`text-ghost-text-muted transition-transform ${packsOpen ? 'rotate-90' : ''}`}>
                <polygon points="2,0 8,5 2,10" />
              </svg>
              <span className="text-[15px] font-bold text-ghost-text-muted uppercase tracking-[0.06em]">
                Sample Packs
              </span>
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); onCreatePack(); }}
              className="w-5 h-5 flex items-center justify-center rounded text-ghost-text-muted hover:text-ghost-text-primary text-sm transition-colors"
            >
              +
            </span>
          </button>
          {packsOpen && (
            <div className="px-2 pb-1.5 space-y-0.5">
              {samplePacks.length === 0 && (
                <p className="text-[11px] text-ghost-text-muted italic px-2 py-1">No packs yet</p>
              )}
              {samplePacks.map((sp) => (
                <div
                  key={sp.id}
                  onClick={() => onSelectPack(sp.id)}
                  className={`group flex items-center w-full px-2 py-1.5 text-[15px] rounded-md transition-colors cursor-pointer ${
                    selectedPackId === sp.id
                      ? 'bg-ghost-surface-hover text-white font-semibold'
                      : 'text-ghost-text-muted font-medium hover:bg-ghost-surface-hover/50 hover:text-ghost-text-secondary'
                  }`}
                >
                  <span className="flex items-center gap-2 flex-1 min-w-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ghost-purple">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    <span className="truncate">{sp.name}</span>
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(sp.id); }}
                    className={`shrink-0 ml-1 transition-colors ${favoriteIds.has(sp.id) ? 'text-yellow-400' : 'text-ghost-text-muted/40 hover:text-yellow-400'}`}
                    title={favoriteIds.has(sp.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={favoriteIds.has(sp.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FriendsPanel({ friends }: { friends: { id: string; displayName: string; avatarUrl: string | null }[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-8 px-3 flex items-center justify-between w-full hover:bg-ghost-surface-hover/30 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={`text-ghost-text-muted transition-transform ${open ? 'rotate-90' : ''}`}>
            <polygon points="2,0 8,5 2,10" />
          </svg>
          <span className="text-[15px] font-bold text-ghost-text-muted uppercase tracking-[0.06em]">
            Friends — {friends.length}
          </span>
        </span>
      </button>
      {open && (
        <div className="px-2 pb-1.5 space-y-px">
          {friends.length === 0 ? (
            <p className="text-[12px] text-ghost-text-muted px-2 py-3 text-center italic">No friends yet</p>
          ) : (
            friends.map((f) => (
              <div key={f.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-ghost-surface-hover cursor-pointer group transition-colors">
                <div className="relative">
                  <Avatar name={f.displayName} src={f.avatarUrl} size="sm" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-ghost-text-muted/40 border-2 border-ghost-surface" />
                </div>
                <span className="text-[15px] font-medium text-ghost-text-muted group-hover:text-ghost-text-primary flex-1 truncate transition-colors">{f.displayName}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CollaboratorPanel({ members, onInvite, isOwner, onRemove }: {
  members: { userId: string; displayName: string; role: string; avatarUrl?: string | null }[];
  onInvite: () => void;
  isOwner: boolean;
  onRemove: (userId: string, name: string) => void;
}) {
  return (
    <div className="mt-1">
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-ghost-text-secondary uppercase tracking-wide">
          Collaborators
        </span>
        <button
          onClick={onInvite}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-ghost-text-muted hover:text-ghost-text-primary transition-colors"
        >
          + Invite
        </button>
      </div>
      <div className="px-2 space-y-0.5">
        {[...members].sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0)).map((m) => (
          <div key={m.userId} className="group flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-ghost-surface-hover/50 cursor-pointer">
            <div className="relative">
              <Avatar name={m.displayName} src={m.avatarUrl} size="sm" colour={m.role === 'owner' ? '#F0B232' : '#23A559'} />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-ghost-online-green border-2 border-ghost-sidebar" />
            </div>
            <span className="text-[14px] text-ghost-text-muted flex-1 truncate hover:text-ghost-text-secondary">{m.displayName}</span>
            {m.role === 'owner' ? (
              <span className="text-[10px] font-semibold text-ghost-host-gold bg-ghost-host-gold/15 px-1.5 py-0.5 rounded">HOST</span>
            ) : isOwner ? (
              <button
                onClick={() => onRemove(m.userId, m.displayName)}
                className="opacity-0 group-hover:opacity-100 text-ghost-text-muted hover:text-ghost-error-red transition-all"
                title={`Remove ${m.displayName}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPopup({ user, onSignOut, onClose }: { user: any; onSignOut: () => void; onClose: () => void }) {
  return (
    <div className="absolute right-2 top-12 w-56 bg-[#111214] rounded-lg shadow-popup animate-popup z-50 p-2 border border-white/5">
      <div className="p-2 mb-1">
        <div className="flex items-center gap-2.5">
          <Avatar name={user?.displayName || '?'} size="md" colour="#5865F2" />
          <div>
            <p className="text-sm font-semibold text-ghost-text-primary">{user?.displayName || 'Unknown'}</p>
            <p className="text-[12px] text-ghost-text-muted">{user?.email || ''}</p>
          </div>
        </div>
      </div>
      <div className="h-px bg-white/5 mx-1 mb-1" />
      <button
        onClick={onSignOut}
        className="w-full px-2 py-1.5 text-[13px] text-left rounded text-ghost-text-secondary hover:bg-ghost-error-red hover:text-white transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}

interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

function NotificationPopup({ invitations, onAccept, onDecline, notifications, onMarkRead }: {
  invitations: Invitation[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  notifications: Notification[];
  onMarkRead: () => void;
}) {
  return (
    <div className="absolute right-14 top-12 w-80 bg-[#111214] rounded-lg shadow-popup animate-popup z-50 border border-white/5 max-h-80 overflow-y-auto">
      {/* Invitations section */}
      {invitations.length > 0 && (
        <>
          <div className="p-3 pb-1">
            <span className="text-[12px] font-semibold text-ghost-text-secondary uppercase tracking-wide">Invitations</span>
          </div>
          <div>
            {invitations.map((inv) => (
              <div key={inv.id} className="p-3 border-b border-ghost-border/50">
                <p className="text-xs font-bold text-ghost-green">{inv.inviterName}</p>
                <p className="text-[10px] text-ghost-text-muted mt-0.5">invited you to <span className="text-ghost-text-secondary">{inv.projectName}</span></p>
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => onAccept(inv.id)} className="px-3 py-1 text-[10px] font-semibold bg-ghost-green/10 text-ghost-green border border-ghost-green/30 rounded hover:bg-ghost-green/20">Accept</button>
                  <button onClick={() => onDecline(inv.id)} className="px-2 py-1 text-[10px] font-semibold text-ghost-text-muted hover:text-ghost-error-red">X</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Notifications section */}
      {notifications.length > 0 && (
        <>
          <div className="p-3 pb-1 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-ghost-text-secondary uppercase tracking-wide">Messages</span>
            <button onClick={onMarkRead} className="text-[11px] text-ghost-purple hover:text-ghost-purple/80 font-medium">Mark all read</button>
          </div>
          <div>
            {notifications.map((n) => (
              <div key={n.id} className="px-3 py-2 border-b border-ghost-border/50 flex gap-2 items-start">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5865F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-ghost-text-secondary leading-snug">{n.message}</p>
                  <p className="text-[10px] text-ghost-text-muted mt-0.5">
                    {new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {invitations.length === 0 && notifications.length === 0 && (
        <div className="p-4 text-center text-[13px] text-ghost-text-muted italic">No new notifications</div>
      )}
    </div>
  );
}

function BellIcon({ count }: { count: number }) {
  return (
    <div className="relative">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
          {count}
        </span>
      )}
    </div>
  );
}

function InviteModal({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; displayName: string; email: string; avatarUrl: string | null }[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; displayName: string; email: string; avatarUrl: string | null }[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      api.listUsers().then(setAllUsers).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    const matches = allUsers.filter(
      (u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
    setSuggestions(matches.slice(0, 5));
  }, [query, allUsers]);

  if (!open) return null;

  const handleInvite = async (emailOrName: string) => {
    if (!emailOrName.trim()) return;
    try {
      const isEmail = emailOrName.includes('@');
      if (isEmail) {
        await api.inviteMember(projectId, emailOrName.trim());
      } else {
        await api.inviteMember(projectId, '', emailOrName.trim());
      }
      setStatus('Invited!');
      setQuery('');
      setSuggestions([]);
      setTimeout(() => { setStatus(''); onClose(); }, 1000);
    } catch (err: any) {
      setStatus(err.message || 'Invite failed');
    }
  };

  return (
    <div className="absolute right-2 top-12 w-72 bg-[#111214] rounded-lg shadow-popup animate-popup z-50 p-4 border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-semibold text-ghost-text-secondary uppercase tracking-wide">Invite Collaborator</span>
        <button onClick={onClose} className="text-ghost-text-muted hover:text-ghost-text-primary text-sm">X</button>
      </div>
      <div className="relative">
        <input
          className="ghost-input w-full text-sm mb-0"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInvite(query)}
          autoFocus
        />
        {suggestions.length > 0 && (
          <div ref={suggestionsRef} className="mt-1 bg-[#0a0a12] rounded-lg border border-white/5 overflow-hidden">
            {suggestions.map((u) => (
              <button
                key={u.id}
                onClick={() => handleInvite(u.email)}
                className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-ghost-surface-hover transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-ghost-green text-black flex items-center justify-center text-[11px] font-bold shrink-0">
                  {u.displayName?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white truncate">{u.displayName}</p>
                  <p className="text-[12px] text-ghost-text-muted truncate">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {suggestions.length === 0 && query.trim() && (
        <button onClick={() => handleInvite(query)} className="w-full mt-2 px-3 py-2 text-[13px] font-medium bg-ghost-purple text-white rounded hover:bg-[#4752C4] transition-colors">
          Send Invite
        </button>
      )}
      {status && <p className={`text-xs mt-2 ${status === 'Invited!' ? 'text-ghost-green' : 'text-ghost-error-red'}`}>{status}</p>}
    </div>
  );
}

// Stores raw audio channel data for pixel-accurate rendering
const rawDataCache = new Map<string, Float32Array>();

function Waveform({
  seed, height = 60, fileId, projectId, showPlayhead = false, trackId,
}: {
  seed: string; height?: number; fileId?: string | null; projectId?: string; showPlayhead?: boolean; trackId?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rawData, setRawData] = useState<Float32Array | null>(
    fileId ? rawDataCache.get(fileId) || null : null
  );

  // Load raw audio data
  useEffect(() => {
    if (!fileId || !projectId) return;
    if (rawDataCache.has(fileId)) { setRawData(rawDataCache.get(fileId)!); return; }

    let cancelled = false;
    const url = api.getDirectDownloadUrl(projectId, fileId);

    fetch(url, { headers: { Authorization: `Bearer ${useAuthStore.getState().token}` } })
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const ctx = new AudioContext();
        return ctx.decodeAudioData(buf).finally(() => ctx.close());
      })
      .then((audioBuffer) => {
        if (cancelled) return;
        const data = audioBuffer.getChannelData(0);
        rawDataCache.set(fileId, data);
        setRawData(data);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [fileId, projectId]);

  // Generate fake audio-like data from seed
  const fakeData = useMemo(() => {
    if (rawData || (fileId && projectId)) return null;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    const len = 44100 * 4;
    const data = new Float32Array(len);
    let env = 0;
    for (let i = 0; i < len; i++) {
      h = ((h * 1103515245 + 12345) & 0x7fffffff);
      const noise = ((h & 0xffff) / 32768) - 1;
      if (i % 512 === 0) {
        h = ((h * 1103515245 + 12345) & 0x7fffffff);
        const target = (h % 100) / 100;
        env += (target - env) * 0.3;
      }
      data[i] = noise * env * 0.9;
    }
    return data;
  }, [seed, rawData, fileId, projectId]);

  const audioData = rawData || fakeData;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !audioData) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Background — matches JUCE GhostColours::waveformBg
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const mid = h / 2;
    const samplesPerPixel = audioData.length / w;

    // Pre-compute peaks once
    const peaks = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      let max = 0;
      const start = Math.floor(x * samplesPerPixel);
      const end = Math.min(Math.floor((x + 1) * samplesPerPixel), audioData.length);
      for (let j = start; j < end; j++) {
        const abs = Math.abs(audioData[j]);
        if (abs > max) max = abs;
      }
      peaks[x] = max;
    }

    // Draw each column with gradient from #00FFC8 to #8B5CF6 across width
    // Matches JUCE: accentGradStart.interpolatedWith(accentGradEnd, t)
    for (let x = 0; x < w; x++) {
      const t = x / w;
      // Interpolate #00FFC8 → #8B5CF6
      const r = Math.round(0x00 + (0x8B - 0x00) * t);
      const g = Math.round(0xFF + (0x5C - 0xFF) * t);
      const b = Math.round(0xC8 + (0xF6 - 0xC8) * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      const peakH = peaks[x] * mid * 0.84; // 0.42 * h in JUCE = 0.84 * mid
      if (peakH > 0.5) {
        ctx.fillRect(x, mid - peakH, 1, peakH * 2);
      }
    }
  }, [audioData]);

  useEffect(() => {
    draw();
    const obs = new ResizeObserver(draw);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  const { currentTime, duration, isPlaying, soloPlayingTrackId, soloCurrentTime, soloDuration } = useAudioStore();

  // Determine playhead position: solo track takes priority
  let playheadPct = 0;
  let showLine = false;
  if (showPlayhead) {
    if (trackId && soloPlayingTrackId === trackId && soloDuration > 0) {
      playheadPct = (soloCurrentTime / soloDuration) * 100;
      showLine = true;
    } else if (isPlaying && duration > 0) {
      playheadPct = (currentTime / duration) * 100;
      showLine = true;
    }
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden rounded relative" style={{ height }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {showLine && (
        <div
          className="absolute top-0 bottom-0 w-px bg-white pointer-events-none"
          style={{ left: `${playheadPct}%` }}
        />
      )}
    </div>
  );
}

function FullMixDropZone({ projectId, onFilesAdded }: { projectId: string; onFilesAdded: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('audio/') || f.name.match(/\.(wav|mp3|flac|aiff|ogg|m4a|aac)$/i)
    );
    if (droppedFiles.length === 0) {
      setStatus('No audio files detected');
      setTimeout(() => setStatus(''), 2000);
      return;
    }
    setUploading(true);
    setStatus(`Uploading ${droppedFiles.length} file(s)...`);
    try {
      for (const file of droppedFiles) {
        const { fileId } = await api.uploadFile(projectId, file);
        const trackName = file.name.replace(/\.[^.]+$/, '');
        await api.addTrack(projectId, { name: trackName, type: 'fullmix', fileId, fileName: file.name } as any);
      }
      setStatus(`Added ${droppedFiles.length} mix(es)`);
      onFilesAdded();
    } catch (err: any) {
      setStatus(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleBrowse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*,.wav,.mp3,.flac,.aiff,.ogg,.m4a,.aac';
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const fakeEvent = {
          preventDefault: () => {},
          dataTransfer: { files: input.files },
        } as unknown as React.DragEvent;
        handleDrop(fakeEvent);
      }
    };
    input.click();
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`bg-ghost-surface rounded-lg overflow-hidden transition-colors border-2 border-dashed ${
        dragOver ? 'border-ghost-green' : 'border-ghost-text-muted/30'
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <button className="w-7 h-7 rounded-full border border-ghost-border flex items-center justify-center text-ghost-text-secondary hover:text-ghost-green hover:border-ghost-green transition-colors">
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
        </button>
        <span className="text-xs font-bold text-ghost-text-muted uppercase tracking-wider">Full Mix</span>
        <div className="flex-1" />
      </div>
      <div className={`h-[80px] relative overflow-hidden rounded-b-lg transition-colors ${dragOver ? 'bg-ghost-green/5' : 'bg-ghost-bg'}`}>
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <Waveform seed="fullmix-demo-placeholder" height={80} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-4 px-6">
          {uploading ? (
            <span className="text-sm text-ghost-green animate-pulse">{status}</span>
          ) : status ? (
            <span className="text-sm text-ghost-green">{status}</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dragOver ? '#00FFC8' : '#ffffff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className={`text-sm font-semibold ${dragOver ? 'text-ghost-green' : 'text-white'}`}>Drop your mix here</span>
              <div className="flex-1" />
              <button
                onClick={handleBrowse}
                className="px-3 py-1 text-xs font-semibold bg-ghost-surface-light border border-ghost-text-muted/40 rounded-md text-white hover:text-ghost-green hover:border-ghost-green transition-colors shrink-0"
              >
                + Add File
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function StemRow({
  name, type, onDelete, onRename, fileId, projectId, trackId, createdAt,
}: {
  name: string; type: string;
  onDelete: () => void;
  onRename: (newName: string) => void;
  fileId?: string | null; projectId?: string; trackId: string;
  createdAt?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const { loadedTracks, loadTrack, playSoloTrack, stopSoloTrack, soloPlayingTrackId } = useAudioStore();
  const loaded = loadedTracks.has(trackId);
  const isThisPlaying = soloPlayingTrackId === trackId;

  // Auto-load track audio when it has a file
  useEffect(() => {
    if (fileId && projectId && !loaded) {
      loadTrack(trackId, fileId, projectId);
    }
  }, [fileId, projectId, trackId, loaded]);

  const downloadUrl = fileId && projectId ? api.getDirectDownloadUrl(projectId, fileId) : null;

  const handleDownload = () => {
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = name + '.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const dragTriggeredRef = useRef(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!downloadUrl) return;

    if (isPlugin) {
      // Kill the browser drag completely — clear all data, set to none
      e.dataTransfer.clearData();
      e.dataTransfer.effectAllowed = 'none';
      e.dataTransfer.dropEffect = 'none';

      // Prevent double-trigger
      if (dragTriggeredRef.current) return;
      dragTriggeredRef.current = true;
      setTimeout(() => { dragTriggeredRef.current = false; }, 2000);

      // Trigger JUCE native drag (the only drag Ableton should see)
      const ghostUrl = `ghost://drag-to-daw?url=${encodeURIComponent(downloadUrl)}&fileName=${encodeURIComponent(name + '.wav')}`;
      window.location.href = ghostUrl;
      return;
    }

    // Browser/standalone: use Chromium DownloadURL
    e.dataTransfer.setData('DownloadURL', `audio/wav:${name}.wav:${downloadUrl}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handlePlay = () => {
    if (isThisPlaying) {
      stopSoloTrack();
    } else if (loaded) {
      playSoloTrack(trackId);
    }
  };

  return (
    <div
      draggable={!!fileId}
      onDragStart={handleDragStart}
      className={`flex items-center bg-ghost-surface border border-ghost-border rounded-lg overflow-hidden h-[72px] ${fileId ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {/* Play button */}
      <div className="w-14 shrink-0 flex items-center justify-center border-r border-ghost-border">
        <button
          onClick={handlePlay}
          className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
            isThisPlaying
              ? 'border-ghost-green text-ghost-green bg-ghost-green/10'
              : loaded
                ? 'border-ghost-border text-ghost-text-secondary hover:text-ghost-green hover:border-ghost-green'
                : 'border-ghost-border text-ghost-text-muted opacity-40'
          }`}
          disabled={!loaded}
        >
          {isThisPlaying ? (
            <svg width="10" height="10" viewBox="0 0 12 14" fill="currentColor">
              <rect x="0" y="0" width="4" height="14" rx="1" />
              <rect x="8" y="0" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="8" height="10" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
          )}
        </button>
      </div>

      {/* Name + type */}
      <div className="w-28 shrink-0 px-3 overflow-hidden">
        {editing ? (
          <input
            autoFocus
            className="text-xs font-semibold text-ghost-text-primary bg-ghost-bg border border-ghost-green/50 rounded px-1 py-0.5 outline-none focus:border-ghost-green w-full"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => {
              if (editName.trim() && editName !== name) onRename(editName.trim());
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') { setEditName(name); setEditing(false); }
            }}
          />
        ) : (
          <p
            className="text-xs font-semibold text-ghost-text-primary truncate cursor-pointer hover:text-ghost-green transition-colors"
            onClick={() => { setEditName(name); setEditing(true); }}
            title="Click to rename"
          >
            {name}
          </p>
        )}
        <p className="text-[10px] text-ghost-text-muted uppercase mt-0.5">{type === 'audio' ? 'stem' : type === 'fullmix' ? 'mix' : type}</p>
        {createdAt && (
          <p className="text-[11px] text-ghost-green font-medium mt-0.5" title={new Date(createdAt).toLocaleString()}>
            {formatDate(createdAt)}
          </p>
        )}
      </div>

      {/* Waveform */}
      <div className="flex-1 h-full overflow-hidden bg-ghost-bg">
        <Waveform seed={name + type} height={72} fileId={fileId} projectId={projectId} showPlayhead trackId={trackId} />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-3 shrink-0">
        <button
          onClick={handleDownload}
          title="Download"
          className="w-8 h-8 rounded text-xs font-bold text-ghost-text-muted hover:text-ghost-green hover:bg-ghost-green/10 transition-colors flex items-center justify-center"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded text-xs font-bold text-ghost-text-muted hover:text-ghost-error-red hover:bg-ghost-error-red/10 transition-colors"
        >
          X
        </button>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TransportBar() {
  const { isPlaying, currentTime, duration, play, pause, stop, seekTo } = useAudioStore();

  const handlePlayPause = () => {
    if (isPlaying) pause();
    else play();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekTo(ratio * duration);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="h-14 bg-ghost-surface flex flex-col shrink-0">
      {/* Seek bar */}
      <div
        className="h-1 bg-ghost-bg cursor-pointer hover:h-2 transition-all group"
        onClick={handleSeek}
      >
        <div className="h-full bg-ghost-green group-hover:bg-ghost-green" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex items-center px-4 gap-3">
        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isPlaying
              ? 'bg-ghost-green text-black'
              : 'bg-ghost-surface-hover text-ghost-text-secondary hover:bg-ghost-surface-hover hover:text-white'
          }`}
        >
          {isPlaying ? (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
              <rect x="0" y="0" width="4" height="14" rx="1" />
              <rect x="8" y="0" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
          )}
        </button>

        {/* Stop */}
        <button
          onClick={stop}
          className="w-8 h-8 rounded-full bg-ghost-surface-hover flex items-center justify-center text-ghost-text-secondary hover:text-white transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="0" y="0" width="12" height="12" rx="1" />
          </svg>
        </button>

        {/* Time display */}
        <span className="text-sm font-mono text-ghost-text-muted">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Playing indicator */}
        {isPlaying && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-ghost-green font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-ghost-green animate-pulse" />
            Playing
          </span>
        )}
      </div>
    </div>
  );
}

function SamplePackContentView({
  pack,
  onRenamePack,
  onDeletePack,
  onRemoveSample,
  onRefresh,
  members,
  onInvite,
}: {
  pack: SamplePack & { items?: any[] };
  onRenamePack: (id: string, name: string) => void;
  onDeletePack: (id: string) => void;
  onRemoveSample: (packId: string, itemId: string) => void;
  onRefresh: (id: string) => void;
  members: { userId: string; displayName: string; role: string; avatarUrl?: string | null }[];
  onInvite: () => void;
}) {
  const items = pack.items || [];
  const [packDragOver, setPackDragOver] = useState(false);
  const [packUploading, setPackUploading] = useState(false);
  const [showPackMenu, setShowPackMenu] = useState(false);
  const packMenuRef = useRef<HTMLDivElement>(null);
  const [packStatus, setPackStatus] = useState('');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (packMenuRef.current && !packMenuRef.current.contains(e.target as Node)) {
        setShowPackMenu(false);
      }
    };
    if (showPackMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPackMenu]);

  const handlePackDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setPackDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('audio/') || f.name.match(/\.(wav|mp3|flac|aiff|ogg|m4a|aac)$/i)
    );
    if (droppedFiles.length === 0) {
      setPackStatus('No audio files detected');
      setTimeout(() => setPackStatus(''), 2000);
      return;
    }
    setPackUploading(true);
    setPackStatus(`Uploading ${droppedFiles.length} file(s)...`);
    try {
      for (const file of droppedFiles) {
        const { fileId } = await api.uploadFile(pack.id, file);
        const sampleName = file.name.replace(/\.[^.]+$/, '');
        await api.addSamplePackItem(pack.id, { name: sampleName, fileId });
      }
      setPackStatus(`Added ${droppedFiles.length} sample(s)`);
      onRefresh(pack.id);
    } catch (err: any) {
      setPackStatus(err.message || 'Upload failed');
    } finally {
      setPackUploading(false);
      setTimeout(() => setPackStatus(''), 3000);
    }
  };

  const handlePackBrowse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*,.wav,.mp3,.flac,.aiff,.ogg,.m4a,.aac';
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const fakeEvent = {
          preventDefault: () => {},
          dataTransfer: { files: input.files },
        } as unknown as React.DragEvent;
        handlePackDrop(fakeEvent);
      }
    };
    input.click();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {/* Pack info bar */}
        <div className="mb-4">
          <div className="flex items-center gap-3 bg-ghost-surface/80 rounded-lg border border-ghost-border/30 px-5 py-3 min-w-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5865F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <input
              className="text-[15px] font-bold text-white bg-transparent border-none outline-none hover:bg-ghost-surface-hover px-2 py-1 rounded-lg transition-colors min-w-[60px] flex-1"
              value={pack.name}
              onChange={(e) => onRenamePack(pack.id, e.target.value)}
            />
            <span className="text-[12px] text-ghost-text-muted shrink-0">{items.length} sample{items.length !== 1 ? 's' : ''}</span>
            {pack.updatedAt && (
              <>
                <div className="w-px h-4 bg-ghost-border shrink-0" />
                <span className="text-[12px] text-ghost-text-muted flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="text-ghost-green font-medium">
                    {new Date(pack.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </span>
              </>
            )}
            {/* Three-dot menu */}
            <div className="relative" ref={packMenuRef}>
              <button
                onClick={() => setShowPackMenu(!showPackMenu)}
                className="w-6 h-6 flex items-center justify-center rounded text-ghost-text-muted hover:text-white hover:bg-ghost-surface-hover transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {showPackMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-[#111214] rounded-lg shadow-popup animate-popup z-50 border border-white/5 py-1">
                  <button
                    onClick={() => {
                      if (confirm('Delete this sample pack? This cannot be undone.')) {
                        onDeletePack(pack.id);
                      }
                      setShowPackMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-error-red hover:bg-ghost-error-red/10 transition-colors flex items-center gap-2"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete Pack
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collaborators bar */}
        {(() => {
          const { user } = useAuthStore.getState();
          const displayMembers = members.length > 0 ? members : user ? [{ userId: user.id, displayName: user.displayName, role: 'owner' }] : [];
          return displayMembers.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-4 bg-ghost-surface/80 rounded-lg border border-ghost-border/30 px-5 py-3">
                <div className="flex items-center -space-x-2.5">
                  {[...displayMembers].sort((a: any, b: any) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0)).map((m: any) => (
                    <div key={m.userId} className="relative group cursor-pointer transition-transform hover:scale-110 hover:z-10" title={m.displayName}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shadow-lg ${
                        m.role === 'owner' ? 'bg-ghost-host-gold text-black' : 'bg-ghost-green text-black'
                      }`} style={{ border: '3px solid #0F0F18' }}>
                        {m.displayName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-ghost-online-green" style={{ border: '2.5px solid #0F0F18' }} />
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    {[...displayMembers].sort((a: any, b: any) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0)).map((m: any, i: number) => (
                      <span key={m.userId} className="flex items-center gap-1">
                        <span className={`text-[14px] ${m.role === 'owner' ? 'font-bold text-ghost-host-gold' : 'font-medium text-ghost-text-primary'}`}>{m.displayName}</span>
                        {m.role === 'owner' && <span className="text-[10px] font-bold uppercase tracking-wider text-ghost-host-gold/70 bg-ghost-host-gold/10 px-1.5 py-px rounded">host</span>}
                        {i < displayMembers.length - 1 && <span className="text-ghost-text-muted/40 mx-0.5">/</span>}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-ghost-online-green animate-pulse" />
                    <span className="text-[14px] text-ghost-text-muted">{displayMembers.length} collaborator{displayMembers.length !== 1 ? 's' : ''} online</span>
                  </div>
                </div>

                <button
                  onClick={onInvite}
                  className="shrink-0 px-4 py-1.5 text-[14px] font-bold bg-ghost-green text-black rounded-lg hover:bg-ghost-green/85 transition-colors"
                >
                  Invite
                </button>

              </div>
            </div>
          );
        })()}

        {/* Samples drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setPackDragOver(true); }}
          onDragLeave={() => setPackDragOver(false)}
          onDrop={handlePackDrop}
          className={`bg-ghost-surface rounded-lg overflow-hidden transition-colors border-2 border-dashed ${
            packDragOver ? 'border-ghost-green' : 'border-ghost-text-muted/30'
          }`}
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <button className="w-7 h-7 rounded-full border border-ghost-border flex items-center justify-center text-ghost-text-secondary hover:text-ghost-green hover:border-ghost-green transition-colors">
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
            </button>
            <span className="text-xs font-bold text-ghost-text-muted uppercase tracking-wider">Samples</span>
            <div className="flex-1" />
          </div>
          <div className={`h-[80px] relative overflow-hidden rounded-b-lg transition-colors ${packDragOver ? 'bg-ghost-green/5' : 'bg-ghost-bg'}`}>
            <div className="absolute inset-0 opacity-15 pointer-events-none">
              <Waveform seed="samplepack-demo-placeholder" height={80} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center gap-4 px-6">
              {packUploading ? (
                <span className="text-sm text-ghost-green animate-pulse">{packStatus}</span>
              ) : packStatus ? (
                <span className="text-sm text-ghost-green">{packStatus}</span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={packDragOver ? '#00FFC8' : '#ffffff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className={`text-sm font-semibold ${packDragOver ? 'text-ghost-green' : 'text-white'}`}>Drop your samples here</span>
                  <div className="flex-1" />
                  <button
                    onClick={handlePackBrowse}
                    className="px-3 py-1 text-xs font-semibold bg-ghost-surface-light border border-ghost-text-muted/40 rounded-md text-white hover:text-ghost-green hover:border-ghost-green transition-colors shrink-0"
                  >
                    + Add File
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sample rows */}
        <div className="space-y-2 mt-2">
          {items.map((sample: any) => (
            <StemRow
              key={sample.id}
              trackId={sample.id}
              name={sample.name}
              type="audio"
              fileId={sample.fileId}
              projectId={pack.id}
              onDelete={() => onRemoveSample(pack.id, sample.id)}
              onRename={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DropZone({ projectId, onFilesAdded }: { projectId: string; onFilesAdded: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('audio/') || f.name.match(/\.(wav|mp3|flac|aiff|ogg|m4a|aac|stem)$/i)
    );

    if (droppedFiles.length === 0) {
      setStatus('No audio files detected');
      setTimeout(() => setStatus(''), 2000);
      return;
    }

    setUploading(true);
    setStatus(`Uploading ${droppedFiles.length} file(s)...`);

    try {
      for (const file of droppedFiles) {
        const { fileId } = await api.uploadFile(projectId, file);
        const trackName = file.name.replace(/\.[^.]+$/, '');
        await api.addTrack(projectId, { name: trackName, type: 'audio', fileId, fileName: file.name });
      }
      setStatus(`Added ${droppedFiles.length} track(s)`);
      onFilesAdded();
    } catch (err: any) {
      setStatus(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleBrowse = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'audio/*,.wav,.mp3,.flac,.aiff,.ogg,.m4a,.aac';
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const fakeEvent = {
          preventDefault: () => {},
          dataTransfer: { files: input.files },
        } as unknown as React.DragEvent;
        handleDrop(fakeEvent);
      }
    };
    input.click();
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`bg-ghost-surface rounded-lg overflow-hidden transition-colors border-2 border-dashed ${
        dragOver ? 'border-ghost-green' : 'border-ghost-text-muted/30'
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2">
        <button className="w-7 h-7 rounded-full border border-ghost-border flex items-center justify-center text-ghost-text-secondary hover:text-ghost-green hover:border-ghost-green transition-colors">
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><polygon points="0,0 10,6 0,12" /></svg>
        </button>
        <span className="text-xs font-bold text-ghost-text-muted uppercase tracking-wider">Stems</span>
        <div className="flex-1" />
      </div>
      <div className={`h-[80px] relative overflow-hidden rounded-b-lg transition-colors ${dragOver ? 'bg-ghost-green/5' : 'bg-ghost-bg'}`}>
        {/* Faded demo waveform in background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <Waveform seed="stems-demo-placeholder" height={80} />
        </div>
        {/* Content overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-4 px-6">
          {uploading ? (
            <span className="text-sm text-ghost-green animate-pulse">{status}</span>
          ) : status ? (
            <span className="text-sm text-ghost-green">{status}</span>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dragOver ? '#00FFC8' : '#ffffff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className={`text-sm font-semibold ${dragOver ? 'text-ghost-green' : 'text-white'}`}>Drop your stems here</span>
              <div className="flex-1" />
              <button
                onClick={handleBrowse}
                className="px-3 py-1 text-xs font-semibold bg-ghost-surface-light border border-ghost-text-muted/40 rounded-md text-white hover:text-ghost-green hover:border-ghost-green transition-colors shrink-0"
              >
                + Add File
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PluginLayout() {
  const { user, logout } = useAuthStore();
  const { projects, currentProject, fetchProjects, fetchProject, createProject, updateProject, addTrack, updateTrack, deleteTrack, versions, fetchVersions } = useProjectStore();
  const { join, leave } = useSessionStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState<{ id: string; displayName: string; email: string; avatarUrl: string | null }[]>([]);
  const friendSearchRef = useRef<HTMLDivElement>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [chatNotifications, setChatNotifications] = useState<Notification[]>([]);
  const [friends, setFriends] = useState<{ id: string; displayName: string; avatarUrl: string | null }[]>([]);
  const [samplePacks, setSamplePacks] = useState<SamplePack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<(SamplePack & { items?: any[] }) | null>(null);
  const fullMixTracks = currentProject?.tracks.filter((t: any) => t.type === 'fullmix') || [];
  const [editingField, setEditingField] = useState<'name' | 'tempo' | 'key' | 'genre' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [reverting, setReverting] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const [projectName, setProjectName] = useState('');
  const projectNameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSamplePacks = async () => {
    try {
      const packs = await api.listSamplePacks();
      setSamplePacks(packs.map((p: any) => ({ id: p.id, name: p.name, samples: [], updatedAt: p.updatedAt })));
    } catch {}
  };

  const fetchNotifications = async () => {
    try {
      const notifs = await api.getNotifications();
      setChatNotifications(notifs);
    } catch {}
  };

  useEffect(() => {
    fetchProjects();
    fetchInvitations();
    fetchNotifications();
    fetchSamplePacks();
    api.listUsers().then(setFriends).catch(() => {});
    const pollInterval = setInterval(() => {
      fetchInvitations();
      fetchNotifications();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, []);

  // Real-time polling: refresh project data every 3 seconds
  useEffect(() => {
    if (!selectedProjectId) return;
    const poll = setInterval(() => {
      fetchProject(selectedProjectId);
      fetchVersions(selectedProjectId);
      fetchNotifications();
    }, 3000);
    return () => clearInterval(poll);
  }, [selectedProjectId]);

  // Sync project name local state
  useEffect(() => {
    if (currentProject) setProjectName(currentProject.name);
  }, [currentProject?.id, currentProject?.name]);

  // Friend search — debounced query against user list
  useEffect(() => {
    if (!friendSearchQuery.trim()) { setFriendSearchResults([]); return; }
    const q = friendSearchQuery.toLowerCase();
    const matches = friends.filter(
      (f) => f.displayName.toLowerCase().includes(q) || (f as any).email?.toLowerCase().includes(q)
    );
    if (matches.length > 0) { setFriendSearchResults(matches as any); return; }
    // Fallback: search all users from API
    const timer = setTimeout(() => {
      api.listUsers().then((users) => {
        const filtered = users.filter(
          (u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        );
        setFriendSearchResults(filtered);
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [friendSearchQuery, friends]);

  // Auto-select first project
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      selectProject(projects[0].id);
    }
  }, [projects]);

  const audioCleanup = useAudioStore((s) => s.cleanup);

  const selectProject = (id: string) => {
    if (selectedProjectId) { leave(); audioCleanup(); }
    setSelectedProjectId(id);
    setSelectedPackId(null);
    fetchProject(id);
    fetchVersions(id);
    join(id);
  };

  const handleRevert = async (versionId: string) => {
    if (!selectedProjectId || reverting) return;
    setReverting(true);
    try {
      await api.revertToVersion(selectedProjectId, versionId);
      await fetchProject(selectedProjectId);
      await fetchVersions(selectedProjectId);
    } catch (err: any) {
      console.error('Revert failed:', err);
    } finally {
      setReverting(false);
    }
  };

  // Close project menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setShowProjectMenu(false);
      }
    };
    if (showProjectMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProjectMenu]);

  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    try {
      await api.deleteProject(selectedProjectId);
      leave();
      audioCleanup();
      setSelectedProjectId(null);
      setShowProjectMenu(false);
      fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
      setShowProjectMenu(false);
    }
  };

  const handleLeaveProject = async () => {
    if (!selectedProjectId) return;
    if (!confirm('Leave this project? You will need a new invite to rejoin.')) return;
    try {
      await api.leaveProject(selectedProjectId);
      leave();
      audioCleanup();
      setSelectedProjectId(null);
      setShowProjectMenu(false);
      fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to leave project');
      setShowProjectMenu(false);
    }
  };

  const handleShareProject = () => {
    if (!selectedProjectId) return;
    setShowProjectMenu(false);
    setShowInvite(true);
  };

  const handleCreate = async () => {
    const p = await createProject({ name: 'New Project', tempo: 140, key: 'C' });
    await fetchProjects();
    selectProject(p.id);
  };

  const handleCreatePack = async () => {
    try {
      const pack = await api.createSamplePack({ name: 'New Pack' });
      await fetchSamplePacks();
      setSelectedPackId(pack.id);
      setSelectedProjectId(null);
      fetchPackDetail(pack.id);
    } catch {}
  };

  const fetchPackDetail = async (id: string) => {
    try {
      const detail = await api.getSamplePack(id);
      setSelectedPack(detail);
    } catch {}
  };

  const handleSelectPack = (id: string) => {
    setSelectedPackId(id);
    setSelectedProjectId(null);
    if (selectedProjectId) { leave(); audioCleanup(); }
    fetchPackDetail(id);
  };

  const handleRenamePack = async (id: string, name: string) => {
    setSamplePacks((prev) => prev.map((sp) => sp.id === id ? { ...sp, name } : sp));
    try { await api.updateSamplePack(id, { name }); } catch {}
  };

  const handleDeletePack = async (id: string) => {
    try {
      await api.deleteSamplePack(id);
      setSamplePacks((prev) => prev.filter((sp) => sp.id !== id));
      if (selectedPackId === id) { setSelectedPackId(null); setSelectedPack(null); }
    } catch {}
  };

  const handleAddSampleToPack = async (packId: string, sample: { name: string; fileId?: string }) => {
    try {
      await api.addSamplePackItem(packId, { name: sample.name, fileId: sample.fileId });
      fetchPackDetail(packId);
    } catch {}
  };

  const handleRemoveSampleFromPack = async (packId: string, itemId: string) => {
    try {
      await api.removeSamplePackItem(packId, itemId);
      fetchPackDetail(packId);
    } catch {}
  };

  const fetchInvitations = async () => {
    try {
      const res = await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1') + '/invitations',
        { headers: { Authorization: `Bearer ${useAuthStore.getState().token}` } }
      );
      const json = await res.json();
      if (json.data) setInvitations(json.data);
    } catch {}
  };

  const acceptInvite = async (id: string) => {
    try {
      await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1') + `/invitations/${id}/accept`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().token}` }, body: '{}' }
      );
      fetchInvitations();
      fetchProjects();
    } catch {}
  };

  const declineInvite = async (id: string) => {
    try {
      await fetch(
        (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1') + `/invitations/${id}/decline`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${useAuthStore.getState().token}` }, body: '{}' }
      );
      fetchInvitations();
    } catch {}
  };

  const members = currentProject?.members || [];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ghost-surface-light relative">
      {/* Left sidebar */}
      <div className="w-[240px] shrink-0 bg-ghost-surface flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col">
          <ProjectListSidebar
            projects={projects}
            selectedId={selectedProjectId}
            onSelect={selectProject}
            onCreate={handleCreate}
            samplePacks={samplePacks}
            selectedPackId={selectedPackId}
            onSelectPack={handleSelectPack}
            onCreatePack={handleCreatePack}
            friends={friends}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div className="bg-ghost-surface shadow-[0_1px_0_rgba(0,0,0,0.4)] flex items-stretch shrink-0 relative h-14">
          <div className="flex-1 flex items-center pl-0 pr-4">
            {/* Friend search bar — expands full width of header */}
            {showFriendSearch && (
              <div ref={friendSearchRef} className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost-text-muted/50 pointer-events-none">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    autoFocus
                    type="text"
                    value={friendSearchQuery}
                    onChange={(e) => setFriendSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setShowFriendSearch(false); setFriendSearchQuery(''); } }}
                    placeholder="Search by name or email..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-ghost-surface-hover border border-ghost-border text-[13px] text-ghost-text-secondary placeholder:text-ghost-text-secondary focus:outline-none focus:border-ghost-border transition-all"
                  />
                  {/* Search results dropdown */}
                  {friendSearchQuery.trim() && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-ghost-surface border border-ghost-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                      {friendSearchResults.length === 0 ? (
                        <p className="px-3 py-2.5 text-[13px] text-ghost-text-muted">No users found</p>
                      ) : (
                        friendSearchResults.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => { setShowFriendSearch(false); setFriendSearchQuery(''); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-ghost-surface-hover transition-colors"
                          >
                            <div className="w-7 h-7 rounded-full bg-ghost-purple/30 flex items-center justify-center text-[11px] font-bold text-ghost-purple shrink-0">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} className="w-7 h-7 rounded-full object-cover" />
                              ) : (
                                u.displayName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex flex-col items-start min-w-0">
                              <span className="text-[13px] text-ghost-text-primary font-medium truncate">{u.displayName}</span>
                              <span className="text-[11px] text-ghost-text-muted truncate">{u.email}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { setShowFriendSearch(false); setFriendSearchQuery(''); }}
                  className="text-ghost-text-muted hover:text-white transition-colors shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Right section aligned with chat panel */}
          <div className="w-64 shrink-0 border-l border-ghost-border flex items-center justify-center px-4 py-3 gap-4">
            {/* Add Friend button */}
            <button
              onClick={() => { setShowFriendSearch(!showFriendSearch); setFriendSearchQuery(''); }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-[14px] bg-ghost-green text-black hover:bg-ghost-green/85 transition-colors"
              title="Add Friend"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Friend
            </button>

            {/* Bell icon */}
            <button
              onClick={() => {
                const opening = !showNotifs;
                setShowNotifs(opening);
                setShowSettings(false);
                if (opening && chatNotifications.length > 0) {
                  api.markNotificationsRead().then(() => setChatNotifications([])).catch(() => {});
                }
              }}
              className="text-ghost-text-secondary hover:text-ghost-purple transition-colors shrink-0"
            >
              <BellIcon count={invitations.length + chatNotifications.length} />
            </button>

            {/* Inbox icon */}
            <button
              className="text-ghost-text-secondary hover:text-ghost-purple transition-colors shrink-0"
              title="Inbox"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            </button>

            {/* Settings gear */}
            <button
              onClick={() => { setShowSettings(!showSettings); setShowNotifs(false); }}
              className="text-ghost-text-secondary hover:text-ghost-purple transition-colors shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Popups */}
        {showSettings && (
          <SettingsPopup
            user={user}
            onSignOut={() => { setShowSettings(false); logout(); }}
            onClose={() => setShowSettings(false)}
          />
        )}
        {showNotifs && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
            <NotificationPopup
              invitations={invitations}
              onAccept={(id) => { acceptInvite(id); }}
              onDecline={(id) => { declineInvite(id); }}
              notifications={chatNotifications}
              onMarkRead={() => { api.markNotificationsRead().then(() => setChatNotifications([])).catch(() => {}); }}
            />
          </>
        )}
        {showInvite && selectedProjectId && (
          <InviteModal open={showInvite} onClose={() => setShowInvite(false)} projectId={selectedProjectId} />
        )}
        {showInvite && selectedPackId && !selectedProjectId && (
          <InviteModal open={showInvite} onClose={() => setShowInvite(false)} projectId={selectedPackId} />
        )}

        {/* Arrangement content + chat */}
        <div className="flex-1 flex min-h-0">
          {selectedProjectId && currentProject ? (
            <>
              <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
                {/* Project info bar */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 bg-ghost-surface/80 rounded-lg border border-ghost-border/30 px-5 py-3 min-w-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00FFC8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <input
                      className="text-[15px] font-bold text-white bg-transparent border-none outline-none hover:bg-ghost-surface-hover px-2 py-1 rounded-lg transition-colors min-w-[60px] flex-1"
                      value={projectName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProjectName(val);
                        if (projectNameTimer.current) clearTimeout(projectNameTimer.current);
                        projectNameTimer.current = setTimeout(() => {
                          if (val.trim()) updateProject(currentProject.id, { name: val });
                        }, 500);
                      }}
                      onBlur={() => {
                        if (projectNameTimer.current) clearTimeout(projectNameTimer.current);
                        if (projectName.trim() && projectName !== currentProject.name) {
                          updateProject(currentProject.id, { name: projectName });
                        }
                      }}
                    />
                    <span className="text-[12px] text-ghost-text-muted uppercase tracking-wider font-semibold shrink-0">BPM</span>
                    <span className="text-[14px] font-bold text-white shrink-0" style={{ fontFamily: "'Consolas', monospace" }}>{currentProject.tempo || 120}</span>
                    <div className="w-px h-4 bg-ghost-border shrink-0" />
                    <span className="text-[12px] text-ghost-text-muted uppercase tracking-wider font-semibold shrink-0">Key</span>
                    <span className="text-[14px] font-bold text-white shrink-0" style={{ fontFamily: "'Consolas', monospace" }}>{currentProject.key || 'C'}</span>
                    {currentProject.updatedAt && (
                      <>
                        <div className="w-px h-4 bg-ghost-border shrink-0" />
                        <span className="text-[11px] text-ghost-text-muted flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span className="text-ghost-green font-medium">
                            {new Date(currentProject.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </span>
                        </span>
                      </>
                    )}
                    {/* Project menu — far right */}
                    <div className="relative" ref={projectMenuRef}>
                      <button
                        onClick={() => setShowProjectMenu(!showProjectMenu)}
                        className="w-6 h-6 flex items-center justify-center rounded text-ghost-text-muted hover:text-white hover:bg-ghost-surface-hover transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                      {showProjectMenu && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-[#111214] rounded-lg shadow-popup animate-popup z-50 border border-white/5 py-1">
                          <button
                            onClick={handleShareProject}
                            className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-text-secondary hover:bg-ghost-surface-hover hover:text-white transition-colors flex items-center gap-2"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                              <polyline points="16 6 12 2 8 6" />
                              <line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                            Share
                          </button>
                          <div className="h-px bg-white/5 mx-2 my-1" />
                          {currentProject.ownerId === user?.id ? (
                            <button
                              onClick={handleDeleteProject}
                              className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-error-red hover:bg-ghost-error-red/10 transition-colors flex items-center gap-2"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Delete Project
                            </button>
                          ) : (
                            <button
                              onClick={handleLeaveProject}
                              className="w-full px-3 py-1.5 text-[13px] text-left text-ghost-error-red hover:bg-ghost-error-red/10 transition-colors flex items-center gap-2"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                              </svg>
                              Leave Project
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collaborators bar */}
                <div className="mb-4">
                <div className="flex items-center gap-4 bg-ghost-surface/80 rounded-lg border border-ghost-border/30 px-5 py-3">
                  <div className="flex items-center -space-x-2.5">
                    {[...members].sort((a: any, b: any) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0)).map((m: any) => (
                      <div key={m.userId} className="relative group cursor-pointer transition-transform hover:scale-110 hover:z-10" title={m.displayName}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shadow-lg ${
                          m.role === 'owner' ? 'bg-ghost-host-gold text-black' : 'bg-ghost-green text-black'
                        }`} style={{ border: '3px solid #0F0F18' }}>
                          {m.displayName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-ghost-online-green" style={{ border: '2.5px solid #0F0F18' }} />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      {[...members].sort((a: any, b: any) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0)).map((m: any, i: number) => (
                        <span key={m.userId} className="flex items-center gap-1">
                          <span className={`text-[14px] ${m.role === 'owner' ? 'font-bold text-ghost-host-gold' : 'font-medium text-ghost-text-primary'}`}>{m.displayName}</span>
                          {m.role === 'owner' && <span className="text-[10px] font-bold uppercase tracking-wider text-ghost-host-gold/70 bg-ghost-host-gold/10 px-1.5 py-px rounded">host</span>}
                          {i < members.length - 1 && <span className="text-ghost-text-muted/40 mx-0.5">/</span>}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-ghost-online-green animate-pulse" />
                      <span className="text-[14px] text-ghost-text-muted">{members.length} collaborator{members.length !== 1 ? 's' : ''} online</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { setShowVersionHistory(!showVersionHistory); if (!showVersionHistory && selectedProjectId) fetchVersions(selectedProjectId); }}
                    className={`shrink-0 px-3 py-1.5 text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      showVersionHistory
                        ? 'bg-ghost-purple text-white'
                        : 'bg-ghost-surface-light border border-ghost-border text-ghost-text-secondary hover:text-white'
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    History
                    {versions.length > 0 && (
                      <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full">{versions.length}</span>
                    )}
                  </button>

                  <button
                    onClick={() => setShowInvite(!showInvite)}
                    className="shrink-0 px-4 py-1.5 text-[14px] font-bold bg-ghost-green text-black rounded-lg hover:bg-ghost-green/85 transition-colors"
                  >
                    Invite
                  </button>

                </div>
                </div>

                {/* Version History panel */}
                {showVersionHistory && (
                  <div className="mb-4 bg-ghost-surface/80 rounded-lg border border-ghost-border/30 overflow-hidden border border-ghost-border/50">
                    <div className="px-4 py-2 border-b border-ghost-border/30 flex items-center justify-between">
                      <span className="text-[13px] font-bold text-ghost-text-secondary uppercase tracking-wider">Version History</span>
                      <span className="text-[11px] text-ghost-text-muted">{versions.length} snapshot{versions.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {versions.length === 0 ? (
                        <div className="px-4 py-4 text-center text-[12px] text-ghost-text-muted italic">
                          No snapshots yet — changes will be saved automatically
                        </div>
                      ) : (
                        versions.map((v: any) => (
                          <div key={v.id} className="flex items-center gap-3 px-4 py-2 border-b border-ghost-border/20 hover:bg-ghost-surface-light/30 transition-colors group">
                            {/* Version dot */}
                            <div className="w-2.5 h-2.5 rounded-full border-2 border-ghost-purple bg-ghost-bg shrink-0" />

                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-ghost-text-primary font-medium truncate">{v.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-ghost-text-muted">{v.createdByName || 'Unknown'}</span>
                                <span className="text-[11px] text-ghost-green font-medium">
                                  {new Date(v.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                </span>
                              </div>
                            </div>

                            {/* Version number */}
                            <span className="text-[11px] font-mono text-ghost-purple bg-ghost-purple/10 px-2 py-0.5 rounded shrink-0">
                              V{v.versionNumber}
                            </span>

                            {/* Revert button */}
                            {(v.snapshotJson || v.snapshot) && (
                              <button
                                onClick={() => handleRevert(v.id)}
                                disabled={reverting}
                                className="opacity-0 group-hover:opacity-100 text-[11px] font-semibold px-2 py-1 bg-ghost-surface-light border border-ghost-border rounded text-ghost-text-secondary hover:text-white hover:border-ghost-purple transition-all shrink-0"
                              >
                                {reverting ? '...' : 'Revert'}
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Full Mix drop zone */}
                <FullMixDropZone projectId={selectedProjectId!} onFilesAdded={() => fetchProject(selectedProjectId!)} />

                {/* Full Mix rows */}
                <div className="space-y-2 mt-2">
                  {fullMixTracks.map((t: any) => (
                    <StemRow
                      key={t.id}
                      trackId={t.id}
                      name={t.name || t.fileName || 'Full Mix'}
                      type="fullmix"
                      fileId={t.fileId}
                      projectId={selectedProjectId!}
                      createdAt={t.createdAt}
                      onDelete={() => deleteTrack(selectedProjectId!, t.id)}
                      onRename={(newName) => updateTrack(selectedProjectId!, t.id, { name: newName })}
                    />
                  ))}
                </div>

                {/* Drop zone for adding stems */}
                <div className="mt-4">
                  <DropZone projectId={selectedProjectId!} onFilesAdded={() => fetchProject(selectedProjectId!)} />
                </div>

                {/* Stem rows */}
                <div className="space-y-2 mt-2">
                  {currentProject.tracks.filter((t: any) => t.type !== 'fullmix').map((t) => (
                    <StemRow
                      key={t.id}
                      trackId={t.id}
                      name={t.name}
                      type={t.type || 'audio'}
                      fileId={t.fileId}
                      projectId={selectedProjectId!}
                      createdAt={t.createdAt}
                      onDelete={() => deleteTrack(selectedProjectId!, t.id)}
                      onRename={(newName) => updateTrack(selectedProjectId!, t.id, { name: newName })}
                    />
                  ))}
                </div>
              </div>

              </div>

              {/* Right panel: chat */}
              <div className="w-64 shrink-0 border-l border-ghost-border flex flex-col min-h-0 overflow-hidden">
                <ChatPanel />
              </div>
            </>
          ) : selectedPackId && selectedPack ? (
            <>
              <SamplePackContentView
                pack={selectedPack}
                onRenamePack={handleRenamePack}
                onDeletePack={handleDeletePack}
                onRemoveSample={handleRemoveSampleFromPack}
                onRefresh={fetchPackDetail}
                members={members}
                onInvite={() => setShowInvite(true)}
              />
              {/* Right panel: chat */}
              <div className="w-64 shrink-0 border-l border-ghost-border flex flex-col min-h-0 overflow-hidden">
                <ChatPanel />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-ghost-text-muted text-sm italic">
              Select a project or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
