import api from './api';

export interface PlaceResult {
  place_id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews_count: number;
  business_status: string;
  types: string[];
  price_level?: number;
  is_open: boolean | null;
  has_website: boolean;
  // Scoring
  opportunity_score: number;
  estimated_value: number;
  likelihood_score: number;
  priority_score: number;
  scoring_reasons: string[];
}

export interface PlaceDetails extends PlaceResult {
  google_maps_url: string;
  price_level?: number;
  hours?: string[];
  recent_reviews?: {
    rating: number;
    text: string;
    time: string;
  }[];
  opportunity_score: number;
}

export interface PlaceSearchResponse {
  results: PlaceResult[];
  total: number;
  totalFound: number;
  query: string;
  location?: string;
  radius_miles?: number;
}

export const placesService = {
  // Quick search for businesses (limited results)
  search: async (params: {
    query?: string;
    location?: string;
    type?: string;
  }): Promise<PlaceSearchResponse> => {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('query', params.query);
    if (params.location) searchParams.set('location', params.location);
    if (params.type) searchParams.set('type', params.type);

    const response = await api.get(`/places/search?${searchParams.toString()}`);
    return response.data;
  },

  // Bulk search - gets ALL businesses of a category (slower but comprehensive)
  bulkSearch: async (params: {
    location: string;
    type: string;
    radiusMiles?: number;
  }): Promise<PlaceSearchResponse & { searchesPerformed: number }> => {
    const response = await api.post('/places/bulk-search', params);
    return response.data;
  },

  // Get detailed info for a place
  getDetails: async (placeId: string): Promise<PlaceDetails> => {
    const response = await api.get(`/places/details/${placeId}`);
    return response.data;
  },
};
