import { GooglePlacesProvider } from './GooglePlacesProvider.js';
import { FoursquareProvider } from './FoursquareProvider.js';
import { ApolloEnrichmentProvider } from './ApolloEnrichmentProvider.js';

/**
 * Central place that owns provider instances and fallback order.
 * Controllers/services call ProviderRegistry, never a provider class directly.
 * Adding a new provider: instantiate it below, add it to the relevant list.
 *
 * Default order: Google Places (primary — best data quality/coverage) ->
 * Foursquare (free-tier fallback if Google Places fails or isn't configured).
 * OverpassProvider.js still exists in this folder if you want a no-key free
 * option back in the chain later — just import it and add it to the array.
 */
class ProviderRegistry {
  constructor() {
    this.discoveryProviders = [new GooglePlacesProvider(), new FoursquareProvider()];
    this.enrichmentProviders = [new ApolloEnrichmentProvider()];
  }

  getDiscoveryProvider(key) {
    return this.discoveryProviders.find((p) => p.key === key) || this.discoveryProviders[0];
  }

  getEnrichmentProvider(key) {
    return this.enrichmentProviders.find((p) => p.key === key) || this.enrichmentProviders[0];
  }

  /**
   * Try primary discovery provider; on failure (rate limit, network, config),
   * fall through to the next one in the list rather than failing the search.
   */
  async runDiscovery(params) {
    let lastError;
    for (const provider of this.discoveryProviders) {
      try {
        const results = await provider.search(params);
        return { providerKey: provider.key, results };
      } catch (err) {
        lastError = err;
        console.error(`[providers] ${provider.key} search failed, trying next:`, err.message);
      }
    }
    throw lastError || new Error('No discovery providers available');
  }

  async runEnrichment(lead, preferredKey) {
    const provider = this.getEnrichmentProvider(preferredKey);
    return provider.enrich(lead);
  }
}

export const providerRegistry = new ProviderRegistry();
