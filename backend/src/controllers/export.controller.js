import { Lead } from '../models/Lead.model.js';
import { ExportRecord } from '../models/index.js';

// Deliberately exports from the DB, never re-hits the discovery API — keeps
// cost predictable and avoids re-triggering provider rate limits on export.
export async function createExport(req, res, next) {
  try {
    const { projectId, format = 'csv', columns } = req.body;

    const leads = await Lead.find({ projectId, isDeleted: false }).lean();
    const selectedColumns = columns?.length ? columns : Object.keys(leads[0] || {});

    let payload;
    let contentType;

    if (format === 'json') {
      payload = JSON.stringify(leads.map((l) => pick(l, selectedColumns)), null, 2);
      contentType = 'application/json';
    } else if (format === 'csv') {
      payload = toCsv(leads, selectedColumns);
      contentType = 'text/csv';
    } else {
      // xlsx generation delegated to a dedicated library (e.g. exceljs) —
      // stubbed here since it needs a binary buffer response, not inline text
      return res.status(501).json({ error: 'XLSX export not yet wired — use csv or json' });
    }

    await ExportRecord.create({ projectId, format, columnsSelected: selectedColumns });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="leads-export.${format}"`);
    res.send(payload);
  } catch (err) {
    next(err);
  }
}

function pick(obj, keys) {
  return keys.reduce((acc, k) => {
    if (k in obj) acc[k] = obj[k];
    return acc;
  }, {});
}

function toCsv(rows, columns) {
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const header = columns.map(escape).join(',');
  const lines = rows.map((row) => columns.map((c) => escape(row[c])).join(','));
  return [header, ...lines].join('\n');
}
