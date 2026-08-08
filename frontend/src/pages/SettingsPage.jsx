import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { LoadingState, ErrorState } from '../components/StatusStates';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/settings').then((r) => r.data.settings),
  });

  const [theme, setTheme] = useState('dark');
  const [radius, setRadius] = useState(10);

  useEffect(() => {
    if (data) {
      setTheme(data.theme);
      setRadius(data.defaultSearchRadiusKm);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: (payload) => apiClient.patch('/settings', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  if (isLoading) return <LoadingState label="Loading settings…" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-gray-500">Theme</label>
          <select className="glass-input" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="dark" className="bg-surface-900">Dark</option>
            <option value="light" className="bg-surface-900">Light</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-gray-500">Default search radius (km)</label>
          <input type="number" className="glass-input" value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
        </div>

        <button onClick={() => save.mutate({ theme, defaultSearchRadiusKm: radius })} disabled={save.isPending} className="glass-button-primary">
          {save.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
