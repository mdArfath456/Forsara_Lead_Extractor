import axios from 'axios';
import { LeadProvider } from './LeadProvider.interface.js';
import { env } from '../../config/env.js';

const SEARCH_URL = 'https://api.foursquare.com/v3/places/search';

export class FoursquareProvider extends LeadProvider {
  key = 'foursquare';

  async search(params) {
    if (!env.foursquareApiKey) {
      throw new Error('FOURSQUARE_API_KEY is not configured');
    }

    const query = [params.keyword, params.category, params.businessName].filter(Boolean).join(' ');
    const near = [params.city, params.state, params.country].filter(Boolean).join(', ');

    const response = await axios.get(SEARCH_URL, {
      headers: { Authorization: env.foursquareApiKey, Accept: 'application/json' },
      params: {
        query: query || undefined,
        near: near || undefined,
        ...(params.lat && params.lng ? { ll: `${params.lat},${params.lng}` } : {}),
        radius: (params.radiusKm || 10) * 1000,
        limit: 50,
      },
    });

    return response.data?.results || [];
  }

  // Foursquare's free tier doesn't include verified contact enrichment —
  // Apollo remains the enrichment provider.
}
