import axios from 'axios';
import { LeadProvider } from './LeadProvider.interface.js';
import { env } from '../../config/env.js';

const ENRICH_URL = 'https://api.apollo.io/api/v1/organizations/enrich';

export class ApolloEnrichmentProvider extends LeadProvider {
  key = 'apollo';

  async enrich(lead) {
    if (!env.apolloApiKey) {
      throw new Error('APOLLO_API_KEY is not configured');
    }
    if (!lead.website) {
      // Apollo's org enrichment keys off domain — without a website we have
      // nothing reliable to match on, so fail fast rather than guess.
      return { enrichmentStatus: 'failed' };
    }

    const domain = lead.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

    const response = await axios.get(ENRICH_URL, {
      params: { domain },
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.apolloApiKey,
      },
    });

    const org = response.data?.organization;
    if (!org) {
      return { enrichmentStatus: 'failed' };
    }

    return {
      email: org.primary_email || undefined,
      phone: org.phone || lead.phone,
      enrichmentStatus: 'enriched',
    };
  }

  // Discovery not implemented — Apollo is the enrichment step only in this
  // architecture; GooglePlacesProvider (or a future ApolloDiscoveryProvider,
  // Apollo also has a people/org search API) owns search().
}
