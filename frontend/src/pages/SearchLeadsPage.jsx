import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BellPlus } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { DataTable } from '../components/DataTable';
import { LoadingState, EmptyState, ErrorState } from '../components/StatusStates';

const FIELDS = [
  ['businessName', 'Business name'],
  ['industry', 'Industry'],
  ['category', 'Category'],
  ['keyword', 'Keyword'],
  ['country', 'Country'],
  ['state', 'State'],
  ['city', 'City'],
  ['postalCode', 'Postal code'],
  ['radiusKm', 'Radius (km)'],
];

const RESULT_COLUMNS = [
  { key: 'businessName', label: 'Business' },
  { key: 'category', label: 'Category' },
  { key: 'city', label: 'City' },
  { key: 'phone', label: 'Phone' },
  {
    key: 'email',
    label: 'Email',
    render: (row) =>
      row.email ? (
        row.email
      ) : (
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-500">Enrich to reveal</span>
      ),
  },
  { key: 'website', label: 'Website' },
  { key: 'googleRating', label: 'Rating' },
];

export default function SearchLeadsPage() {
  const [form, setForm] = useState({});
  const [alertSaved, setAlertSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (params) => apiClient.post('/search', params).then((r) => r.data),
  });

  const saveAlert = useMutation({
    mutationFn: () =>
      apiClient.post('/saved-searches', {
        name: buildAlertName(form),
        queryParams: form,
        frequency: 'weekly',
        projectId: mutation.data?.project?._id, // if a search already ran, reuse that project
      }),
    onSuccess: () => setAlertSaved(true),
  });

  function buildAlertName(f) {
    const bits = [f.keyword, f.category, f.city, f.country].filter(Boolean);
    return bits.length ? bits.join(' – ') : `Alert ${new Date().toLocaleDateString()}`;
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setAlertSaved(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Search Leads</h1>
        <p className="text-sm text-gray-500">
          Discover businesses and add them to a new project. Emails aren't included by discovery —
          use <span className="text-brand-400">Enrich</span> from Lead Management to fetch verified contacts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4 p-6 rounded-2xl glass-panel">
        {FIELDS.map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <label className="text-xs text-gray-500">{label}</label>
            <input className="glass-input" value={form[key] || ''} onChange={(e) => updateField(key, e.target.value)} />
          </div>
        ))}
        <div className="col-span-3 flex items-center gap-3">
          <button type="submit" disabled={mutation.isPending} className="glass-button-primary">
            {mutation.isPending ? 'Searching…' : 'Run search'}
          </button>
          <button
            type="button"
            onClick={() => saveAlert.mutate()}
            disabled={saveAlert.isPending || alertSaved || Object.keys(form).length === 0}
            className="glass-button-ghost flex items-center gap-1.5"
          >
            <BellPlus size={14} />
            {alertSaved ? 'Saved as weekly alert' : saveAlert.isPending ? 'Saving…' : 'Save as alert'}
          </button>
        </div>
      </form>

      {mutation.isPending && <LoadingState label="Querying discovery provider…" />}
      {mutation.isError && (
        <ErrorState message="Search failed. Try narrowing your criteria." onRetry={() => mutation.mutate(form)} />
      )}
      {mutation.isSuccess && mutation.data.leads.length === 0 && (
        <EmptyState title="No results" description="Try a broader keyword or location." />
      )}
      {mutation.isSuccess && mutation.data.leads.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          <p className="text-sm text-gray-500">
            {mutation.data.leads.length} new leads saved to project "{mutation.data.project.name}"
            {mutation.data.duplicatesSkipped ? ` (${mutation.data.duplicatesSkipped} duplicates skipped)` : ''}
          </p>
          <DataTable columns={RESULT_COLUMNS} rows={mutation.data.leads} />
        </motion.div>
      )}
    </div>
  );
}
