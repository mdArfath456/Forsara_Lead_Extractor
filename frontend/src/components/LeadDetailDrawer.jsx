import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Globe, MapPin, Sparkles, Send } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { ScoreBadge } from './ScoreBadge';
import { LoadingState } from './StatusStates';

export function LeadDetailDrawer({ leadId, onClose }) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => apiClient.get(`/leads/${leadId}`).then((r) => r.data.lead),
    enabled: Boolean(leadId),
  });

  const addNote = useMutation({
    mutationFn: (text) => apiClient.post(`/leads/${leadId}/notes`, { text }),
    onSuccess: () => {
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  return (
    <AnimatePresence>
      {leadId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 glass-panel overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-[var(--panel-border)]">
              <h2 className="font-semibold">Lead Details</h2>
              <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.06]">
                <X size={16} />
              </button>
            </div>

            {isLoading || !data ? (
              <LoadingState label="Loading lead…" />
            ) : (
              <div className="p-5 space-y-6">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold">{data.businessName}</h3>
                    <ScoreBadge score={data.score} scoreTier={data.scoreTier} />
                  </div>
                  <p className="text-sm text-gray-500">{data.category || data.industry}</p>
                </div>

                <div className="space-y-2 text-sm">
                  {data.phone && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone size={14} className="text-gray-500" /> {data.phone}
                    </div>
                  )}
                  {data.website && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Globe size={14} className="text-gray-500" /> {data.website}
                    </div>
                  )}
                  {(data.city || data.country) && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin size={14} className="text-gray-500" /> {[data.city, data.state, data.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {data.email ? (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Sparkles size={14} className="text-brand-400" /> {data.email}
                    </div>
                  ) : (
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-500">Not enriched yet</span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Activity timeline</h4>
                  <div className="space-y-3">
                    {(data.activity || []).length === 0 && <p className="text-sm text-gray-600">No activity logged yet.</p>}
                    {[...(data.activity || [])].reverse().map((entry, i) => (
                      <div key={i} className="text-sm border-l-2 border-brand-500/30 pl-3">
                        <p className="text-gray-300">{entry.text}</p>
                        <p className="text-xs text-gray-600">{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (noteText.trim()) addNote.mutate(noteText);
                    }}
                    className="mt-3 flex gap-2"
                  >
                    <input
                      className="glass-input"
                      placeholder="Add a note — call outcome, follow-up, etc."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                    <button type="submit" disabled={addNote.isPending} className="w-9 h-9 shrink-0 rounded-lg bg-brand-gradient flex items-center justify-center disabled:opacity-50">
                      <Send size={14} className="text-white" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
