import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useMyProfile } from '@/hooks/useLeaderboard';
import { Download, Trash2, Edit2, Eye, EyeOff, X, Check, Search } from 'lucide-react';
import TextureManager from '@/components/admin/TextureManager';
import { toast } from 'sonner';

interface AdminPageProps {
  onBack: () => void;
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: {
    display_name: string;
    is_public: boolean;
    is_admin: boolean;
    total_wins: number;
    total_losses: number;
    best_time_seconds: number | null;
    best_difficulty: string | null;
  } | null;
  game_count: number;
}

function adminAction(action: string, body: Record<string, unknown> = {}) {
  return supabase.functions.invoke('admin', {
    body: { action, ...body },
  });
}

function UserRow({
  user,
  onRefresh,
}: {
  user: AdminUser;
  onRefresh: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user.profile?.display_name ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleExport = async () => {
    const { data, error } = await adminAction('export-user', {
      userId: user.id,
    });
    if (error) {
      toast.error('Failed to export user data.');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-export-${user.profile?.display_name ?? user.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('User data exported.');
  };

  const handleDelete = async () => {
    const { data, error } = await adminAction('delete-user', {
      userId: user.id,
    });
    if (error || data?.error) {
      toast.error(data?.error ?? 'Failed to delete user.');
      return;
    }
    toast.success('User deleted.');
    setConfirmDelete(false);
    onRefresh();
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    const { data, error } = await adminAction('update-user', {
      userId: user.id,
      displayName: newName.trim(),
    });
    if (error || data?.error) {
      toast.error('Failed to update name.');
      return;
    }
    toast.success('Display name updated.');
    setEditingName(false);
    onRefresh();
  };

  const handleToggleVisibility = async () => {
    if (!user.profile) return;
    const { data, error } = await adminAction('update-user', {
      userId: user.id,
      isPublic: !user.profile.is_public,
    });
    if (error || data?.error) {
      toast.error('Failed to toggle visibility.');
      return;
    }
    toast.success(
      user.profile.is_public
        ? 'Profile hidden from leaderboard.'
        : 'Profile now visible on leaderboard.',
    );
    onRefresh();
  };

  return (
    <div className="bg-white/70 rounded-lg border border-[#c4b8a8] p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-[#f5f0e8] border-[#c4b8a8] text-[#3a2a1a] text-sm h-8"
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
                maxLength={30}
                autoFocus
              />
              <button
                onClick={handleSaveName}
                className="text-green-700 hover:text-green-900"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setNewName(user.profile?.display_name ?? '');
                }}
                className="text-[#8b7a68] hover:text-[#3a2a1a]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[#3a2a1a] text-sm tracking-wider font-semibold truncate">
                {user.profile?.display_name ?? '(no profile)'}
              </span>
              {user.profile?.is_admin && (
                <span className="text-[10px] tracking-wider uppercase text-[#8b4513] bg-[#8b4513]/10 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </div>
          )}
          <div
            className="text-[#8b7a68] text-xs mt-0.5 truncate"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            {user.email}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="flex gap-4 text-xs text-[#6b5d4f]"
        style={{ fontFamily: 'Cormorant Garamond, serif' }}
      >
        <span>
          {user.profile
            ? `${user.profile.total_wins}W / ${user.profile.total_losses}L`
            : 'No stats'}
        </span>
        <span>{user.game_count} games</span>
        <span>
          Joined{' '}
          {new Date(user.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        {user.profile && (
          <span
            className={
              user.profile.is_public ? 'text-green-700' : 'text-[#8b7a68]'
            }
          >
            {user.profile.is_public ? 'Public' : 'Private'}
          </span>
        )}
      </div>

      {/* Action buttons */}
      {confirmDelete ? (
        <div className="flex items-center gap-3 bg-red-50 rounded p-3 border border-red-200">
          <p
            className="text-red-800 text-xs flex-1"
            style={{ fontFamily: 'Cormorant Garamond, serif' }}
          >
            This will permanently delete this user&apos;s account, profile, and
            all game history. This cannot be undone.
          </p>
          <Button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 h-7"
            size="sm"
          >
            Confirm Delete
          </Button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-[#8b7a68] hover:text-[#3a2a1a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-[#8b7a68] hover:text-[#3a2a1a] text-xs transition-colors"
            title="Export user data"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          {user.profile && (
            <>
              <button
                onClick={() => setEditingName(true)}
                className="flex items-center gap-1.5 text-[#8b7a68] hover:text-[#3a2a1a] text-xs transition-colors"
                title="Edit display name"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Rename
              </button>
              <button
                onClick={handleToggleVisibility}
                className="flex items-center gap-1.5 text-[#8b7a68] hover:text-[#3a2a1a] text-xs transition-colors"
                title={
                  user.profile.is_public
                    ? 'Hide from leaderboard'
                    : 'Show on leaderboard'
                }
              >
                {user.profile.is_public ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                {user.profile.is_public ? 'Hide' : 'Show'}
              </button>
            </>
          )}
          {!user.profile?.is_admin && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-xs transition-colors"
              title="Delete user"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminPage({ onBack }: AdminPageProps) {
  const { user } = useAuth();
  const { data: myProfile } = useMyProfile(user?.id ?? null);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await adminAction('list-users');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.users as AdminUser[];
    },
    enabled: !!myProfile?.is_admin,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  // Gate access
  if (!myProfile?.is_admin) {
    return (
      <div
        className="min-h-screen bg-[#f5f0e8] flex flex-col"
        style={{ fontFamily: 'Cinzel, serif' }}
      >
        <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-[#c4b8a8]">
          <button
            onClick={onBack}
            className="text-[#8b7a68] hover:text-[#3a2a1a] transition-colors text-sm tracking-wider uppercase"
          >
            &larr; Back
          </button>
          <h1 className="text-[#3a2a1a] text-sm tracking-[0.2em] uppercase font-semibold">
            Admin
          </h1>
          <div className="w-16" />
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-[#8b7a68] text-sm">Access denied.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = usersData?.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.profile?.display_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="min-h-screen bg-[#f5f0e8] flex flex-col"
      style={{ fontFamily: 'Cinzel, serif' }}
    >
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-[#c4b8a8]">
        <button
          onClick={onBack}
          className="text-[#8b7a68] hover:text-[#3a2a1a] transition-colors text-sm tracking-wider uppercase"
        >
          &larr; Back
        </button>
        <h1 className="text-[#3a2a1a] text-sm tracking-[0.2em] uppercase font-semibold">
          Admin Panel
        </h1>
        <div className="w-16" />
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
          {/* Piece Textures */}
          <div className="bg-white/70 rounded-lg border border-[#c4b8a8] p-5">
            <h3 className="text-[#3a2a1a] text-xs tracking-[0.2em] uppercase font-semibold mb-4">
              Piece Textures
            </h3>
            <TextureManager />
          </div>

          {/* Search & stats */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b7a68]" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/70 border-[#c4b8a8] text-[#3a2a1a] placeholder:text-[#8b7a68]/50"
                style={{ fontFamily: 'Cormorant Garamond, serif' }}
              />
            </div>
            <span className="text-[#8b7a68] text-xs tracking-wider whitespace-nowrap">
              {usersData?.length ?? 0} users
            </span>
          </div>

          {/* User list */}
          {isLoading ? (
            <div className="text-center py-8 text-[#8b7a68] text-sm">
              Loading users...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600 text-sm">
              Failed to load users.
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <UserRow key={u.id} user={u} onRefresh={handleRefresh} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#8b7a68] text-sm">
              {searchQuery ? 'No users match your search.' : 'No users found.'}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
