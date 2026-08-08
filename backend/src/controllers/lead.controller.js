import { Lead } from '../models/Lead.model.js';
import { providerRegistry } from '../services/leadProviders/ProviderRegistry.js';
import { withScore } from '../utils/leadScoring.js';

export async function listLeads(req, res, next) {
  try {
    const { projectId, industry, city, country, tag, page = 1, limit = 25, sortBy = 'createdAt', sortDir = 'desc', withLocation } = req.query;

    const filter = {};
    if (projectId) filter.projectId = projectId;
    if (industry) filter.industry = industry;
    if (city) filter.city = city;
    if (country) filter.country = country;
    if (tag) filter.tags = tag;
    if (withLocation === 'true') filter['location.coordinates'] = { $exists: true };

    // Score isn't a stored field, so DB-level sort can't order by it. Fetch
    // a capped working set, score+sort in memory, then paginate. Fine for
    // this app's scale (thousands, not millions, of leads per project);
    // revisit with a stored/precomputed score field if that changes.
    if (sortBy === 'score') {
      const skip = (Number(page) - 1) * Number(limit);
      const [candidates, total] = await Promise.all([
        Lead.find(filter).notDeleted().limit(1000).lean(),
        Lead.countDocuments({ ...filter, isDeleted: false }),
      ]);
      const scored = candidates.map(withScore).sort((a, b) => (sortDir === 'asc' ? a.score - b.score : b.score - a.score));
      const leads = scored.slice(skip, skip + Number(limit));
      return res.json({ leads, total, page: Number(page), limit: Number(limit) });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [leads, total] = await Promise.all([
      Lead.find(filter).notDeleted().sort({ [sortBy]: sortDir === 'asc' ? 1 : -1 }).skip(skip).limit(Number(limit)).lean(),
      Lead.countDocuments({ ...filter, isDeleted: false }),
    ]);

    res.json({ leads: leads.map(withScore), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

export async function getLead(req, res, next) {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: false }).lean();
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ lead: withScore(lead) });
  } catch (err) {
    next(err);
  }
}

export async function addNote(req, res, next) {
  try {
    const { text, type = 'note' } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Note text is required' });
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $push: { activity: { type, text: text.trim() } } },
      { new: true }
    );
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

export async function updateLead(req, res, next) {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { $set: req.body }, // fields validated upstream
      { new: true }
    );
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ lead });
  } catch (err) {
    next(err);
  }
}

export async function deleteLead(req, res, next) {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function bulkUpdateLeads(req, res, next) {
  try {
    const { leadIds, action, payload } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds must be a non-empty array' });
    }

    let update;
    switch (action) {
      case 'delete':
        update = { isDeleted: true };
        break;
      case 'addTag':
        update = { $addToSet: { tags: payload.tag } };
        break;
      case 'moveProject':
        update = { projectId: payload.projectId };
        break;
      default:
        return res.status(400).json({ error: `Unknown bulk action: ${action}` });
    }

    const result = await Lead.updateMany({ _id: { $in: leadIds } }, update);
    res.json({ matched: result.matchedCount, modified: result.modifiedCount });
  } catch (err) {
    next(err);
  }
}

export async function enrichLead(req, res, next) {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: false });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    lead.enrichmentStatus = 'pending';
    await lead.save();

    const enrichment = await providerRegistry.runEnrichment(lead, 'apollo');
    Object.assign(lead, enrichment);
    await lead.save();

    res.json({ lead });
  } catch (err) {
    err.publicMessage = 'Enrichment failed for this lead';
    next(err);
  }
}
