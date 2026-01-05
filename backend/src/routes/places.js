const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Industry value tiers (average project value)
const INDUSTRY_VALUE = {
  lawyer: 8000,
  attorney: 8000,
  law_firm: 8000,
  dentist: 6000,
  doctor: 6000,
  medical: 5000,
  real_estate_agency: 7000,
  finance: 6000,
  insurance_agency: 5000,
  accounting: 5000,
  car_dealer: 6000,
  veterinary_care: 4000,
  spa: 4000,
  gym: 3500,
  restaurant: 3000,
  cafe: 2500,
  bar: 2500,
  store: 2500,
  salon: 2500,
  contractor: 4000,
  plumber: 3500,
  electrician: 3500,
  roofing: 4000,
  landscaping: 3000,
  default: 3000,
};

// Expanded search terms for each category to find more businesses
const CATEGORY_SEARCH_TERMS = {
  legal: ['lawyer', 'attorney', 'law firm', 'family lawyer', 'personal injury attorney', 'criminal defense lawyer', 'estate planning attorney', 'business lawyer', 'immigration lawyer', 'bankruptcy attorney', 'divorce lawyer', 'real estate attorney'],
  healthcare: ['dentist', 'doctor', 'medical clinic', 'physician', 'chiropractor', 'physical therapy', 'dermatologist', 'pediatrician', 'optometrist', 'orthodontist', 'oral surgeon', 'urgent care'],
  realestate: ['real estate agent', 'realtor', 'real estate agency', 'property management', 'real estate broker', 'mortgage broker', 'title company'],
  homeservices: ['plumber', 'electrician', 'contractor', 'landscaping', 'roofing', 'HVAC', 'painting contractor', 'flooring', 'handyman', 'garage door', 'fence company', 'tree service', 'pest control', 'cleaning service'],
  professional: ['accountant', 'CPA', 'financial advisor', 'insurance agent', 'tax preparer', 'bookkeeper', 'business consultant', 'marketing agency'],
  automotive: ['auto repair', 'mechanic', 'car dealer', 'auto body shop', 'tire shop', 'oil change', 'transmission repair', 'auto detailing'],
  salon: ['hair salon', 'barber shop', 'spa', 'nail salon', 'beauty salon', 'massage therapist', 'med spa', 'waxing'],
  fitness: ['gym', 'fitness center', 'yoga studio', 'crossfit', 'personal trainer', 'pilates', 'martial arts', 'dance studio'],
  restaurant: ['restaurant', 'cafe', 'pizzeria', 'bar', 'bakery', 'catering', 'food truck', 'diner', 'bistro'],
  retail: ['retail store', 'boutique', 'gift shop', 'jewelry store', 'furniture store', 'clothing store', 'pet store', 'florist'],
};

// Calculate comprehensive lead scoring
function calculateLeadScore(place) {
  const reasons = [];
  let opportunity = 0;
  let likelihood = 0;
  let value = INDUSTRY_VALUE.default;

  // === OPPORTUNITY SCORE (0-100) - How much do they need us? ===
  if (!place.website) {
    opportunity += 40;
    reasons.push('🔥 No website - needs one built');
  } else {
    opportunity += 10;
  }

  if (place.rating) {
    if (place.rating < 3) {
      opportunity += 20;
      reasons.push('⚠️ Poor rating - needs reputation management');
    } else if (place.rating < 4) {
      opportunity += 10;
      reasons.push('📊 Below average rating');
    }
  } else {
    opportunity += 15;
    reasons.push('No Google rating yet');
  }

  if (place.user_ratings_total < 10) {
    opportunity += 15;
    reasons.push('📉 Very few reviews - low online visibility');
  } else if (place.user_ratings_total < 30) {
    opportunity += 8;
  }

  // === LIKELIHOOD SCORE (0-100) - How likely to buy? ===
  if (place.formatted_phone_number) {
    likelihood += 15;
  }

  if (place.business_status === 'OPERATIONAL') {
    likelihood += 10;
  }

  if (place.user_ratings_total > 100) {
    likelihood += 20;
    reasons.push('✓ Established business (100+ reviews)');
  } else if (place.user_ratings_total > 50) {
    likelihood += 15;
    reasons.push('✓ Growing business (50+ reviews)');
  } else if (place.user_ratings_total > 20) {
    likelihood += 10;
  }

  if (place.price_level) {
    if (place.price_level >= 3) {
      likelihood += 20;
      reasons.push('💰 Premium pricing - higher budget');
    } else if (place.price_level >= 2) {
      likelihood += 10;
    }
  }

  if (place.rating >= 4 && !place.website) {
    likelihood += 25;
    reasons.push('⭐ Good reputation, ready for online presence');
  }

  // === VALUE ESTIMATION based on industry ===
  const types = place.types || [];
  for (const type of types) {
    if (INDUSTRY_VALUE[type] && INDUSTRY_VALUE[type] > value) {
      value = INDUSTRY_VALUE[type];
    }
  }

  if (!place.website) {
    value = Math.round(value * 1.5);
  }

  // === PRIORITY SCORE (weighted combination) ===
  const normalizedValue = Math.min(100, (value / 10000) * 100);
  const priority = Math.round(
    (normalizedValue * 0.4) + 
    (likelihood * 0.35) + 
    (opportunity * 0.25)
  );

  return {
    opportunity: Math.min(100, opportunity),
    likelihood: Math.min(100, likelihood),
    value: value,
    priority: priority,
    reasons: reasons,
  };
}

// Helper to get place details
async function getPlaceDetails(place) {
  try {
    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.set('place_id', place.place_id);
    detailsUrl.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,types,business_status,price_level');
    detailsUrl.searchParams.set('key', GOOGLE_API_KEY);

    const detailsResponse = await fetch(detailsUrl.toString());
    const detailsData = await detailsResponse.json();

    if (detailsData.status === 'OK') {
      const details = detailsData.result;
      const scoring = calculateLeadScore(details);
      
      return {
        place_id: place.place_id,
        name: details.name,
        address: details.formatted_address,
        phone: details.formatted_phone_number || null,
        website: details.website || null,
        rating: details.rating || null,
        reviews_count: details.user_ratings_total || 0,
        business_status: details.business_status,
        types: details.types || [],
        price_level: details.price_level,
        is_open: details.opening_hours?.open_now ?? null,
        has_website: !!details.website,
        opportunity_score: scoring.opportunity,
        estimated_value: scoring.value,
        likelihood_score: scoring.likelihood,
        priority_score: scoring.priority,
        scoring_reasons: scoring.reasons,
      };
    }
    return null;
  } catch (err) {
    console.error(`Error fetching details for ${place.name}:`, err.message);
    return null;
  }
}

// Bulk search endpoint - gets ALL businesses of a category
router.post('/bulk-search', authenticateToken, async (req, res) => {
  try {
    const { location, type, radiusMiles = 50 } = req.body;

    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ 
        error: 'Google Places API key not configured',
        message: 'Add GOOGLE_PLACES_API_KEY to your .env file'
      });
    }

    if (!location || !type) {
      return res.status(400).json({ error: 'Location and type are required' });
    }

    // Get search terms for this category
    const searchTerms = CATEGORY_SEARCH_TERMS[type] || [type];
    
    // Collect all places using Text Search
    const allPlacesMap = new Map();
    let totalSearches = 0;
    
    console.log(`Bulk search: ${type} in ${location} (${searchTerms.length} search terms)`);
    
    // Search each term with the location in the query
    for (const term of searchTerms) {
      try {
        const searchQuery = `${term} in ${location}`;
        let nextPageToken = null;
        let pageCount = 0;
        
        do {
          const textSearchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
          
          if (nextPageToken) {
            textSearchUrl.searchParams.set('pagetoken', nextPageToken);
          } else {
            textSearchUrl.searchParams.set('query', searchQuery);
          }
          textSearchUrl.searchParams.set('key', GOOGLE_API_KEY);

          const searchResponse = await fetch(textSearchUrl.toString());
          const searchData = await searchResponse.json();
          totalSearches++;

          if (searchData.status === 'OK' && searchData.results) {
            for (const place of searchData.results) {
              if (!allPlacesMap.has(place.place_id)) {
                allPlacesMap.set(place.place_id, place);
              }
            }
          }
          
          nextPageToken = searchData.next_page_token;
          pageCount++;
          
          // Required delay for pagetoken
          if (nextPageToken && pageCount < 3) {
            await new Promise(r => setTimeout(r, 2000));
          }
          
        } while (nextPageToken && pageCount < 3);

        // Small delay between different search terms
        await new Promise(r => setTimeout(r, 200));
        
      } catch (err) {
        console.error(`Error searching "${term}":`, err.message);
      }
      
      console.log(`Searched "${term}" - Total unique places: ${allPlacesMap.size}`);
    }

    console.log(`Completed ${totalSearches} API calls, found ${allPlacesMap.size} unique places`);

    const allPlaces = Array.from(allPlacesMap.values());

    if (allPlaces.length === 0) {
      return res.json({ results: [], total: 0, message: 'No businesses found' });
    }

    // Get details for all places (in batches)
    const batchSize = 10;
    const detailedResults = [];
    
    for (let i = 0; i < allPlaces.length; i += batchSize) {
      const batch = allPlaces.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(getPlaceDetails));
      detailedResults.push(...batchResults.filter(Boolean));
      console.log(`Processed ${Math.min(i + batchSize, allPlaces.length)}/${allPlaces.length} places`);
    }

    // Sort by priority score
    detailedResults.sort((a, b) => b.priority_score - a.priority_score);

    res.json({
      results: detailedResults,
      total: detailedResults.length,
      totalFound: allPlaces.length,
      searchesPerformed: totalSearches,
      query: type,
      location: location,
      radius_miles: radiusMiles,
    });

  } catch (error) {
    console.error('Bulk search error:', error);
    res.status(500).json({ error: 'Failed to perform bulk search', details: error.message });
  }
});

// Quick search for businesses
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query, location, type } = req.query;

    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ 
        error: 'Google Places API key not configured',
        message: 'Add GOOGLE_PLACES_API_KEY to your .env file'
      });
    }

    if (!location && !query && !type) {
      return res.status(400).json({ error: 'Location, query, or type is required' });
    }

    // Build the search query
    let searchQuery = query || '';
    if (type) {
      const typeKeywords = {
        restaurant: 'restaurant',
        retail: 'retail store shop',
        healthcare: 'doctor dentist clinic medical',
        legal: 'lawyer attorney law firm',
        realestate: 'real estate agent realtor',
        homeservices: 'plumber electrician contractor landscaping roofing',
        salon: 'hair salon barber spa',
        fitness: 'gym fitness yoga crossfit',
        automotive: 'auto repair mechanic car dealer',
        professional: 'accountant financial advisor insurance',
      };
      searchQuery = `${typeKeywords[type] || type} ${searchQuery}`.trim();
    }

    // Use Text Search
    const allPlaces = [];
    let nextPageToken = null;
    let pageCount = 0;
    
    do {
      const textSearchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      
      if (nextPageToken) {
        textSearchUrl.searchParams.set('pagetoken', nextPageToken);
      } else {
        textSearchUrl.searchParams.set('query', `${searchQuery} in ${location || ''}`);
      }
      textSearchUrl.searchParams.set('key', GOOGLE_API_KEY);

      console.log(`Text search page ${pageCount + 1}: ${searchQuery} in ${location}`);
      
      const searchResponse = await fetch(textSearchUrl.toString());
      const searchData = await searchResponse.json();

      if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
        if (searchData.status === 'INVALID_REQUEST' && nextPageToken) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        console.error('Places API error:', searchData);
        break;
      }

      if (searchData.results) {
        allPlaces.push(...searchData.results);
      }
      
      nextPageToken = searchData.next_page_token;
      pageCount++;
      
      if (nextPageToken && pageCount < 3) {
        await new Promise(r => setTimeout(r, 2000));
      }
      
    } while (nextPageToken && pageCount < 3);

    console.log(`Found ${allPlaces.length} places`);

    if (allPlaces.length === 0) {
      return res.json({ results: [], message: 'No businesses found' });
    }

    // Dedupe and get details for top 40
    const uniquePlaces = [...new Map(allPlaces.map(p => [p.place_id, p])).values()].slice(0, 40);
    const detailedResults = await Promise.all(uniquePlaces.map(getPlaceDetails));
    const validResults = detailedResults.filter(Boolean).sort((a, b) => b.priority_score - a.priority_score);

    res.json({
      results: validResults,
      total: validResults.length,
      totalFound: allPlaces.length,
      query: searchQuery,
      location: location,
    });

  } catch (error) {
    console.error('Places search error:', error);
    res.status(500).json({ error: 'Failed to search places', details: error.message });
  }
});

// Get detailed info for a specific place
router.get('/details/:placeId', authenticateToken, async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!GOOGLE_API_KEY) {
      return res.status(500).json({ error: 'Google Places API key not configured' });
    }

    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.set('place_id', placeId);
    detailsUrl.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,international_phone_number,website,url,opening_hours,rating,user_ratings_total,reviews,types,business_status,price_level');
    detailsUrl.searchParams.set('key', GOOGLE_API_KEY);

    const response = await fetch(detailsUrl.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      return res.status(404).json({ error: 'Place not found', details: data.status });
    }

    const place = data.result;
    const scoring = calculateLeadScore(place);
    
    res.json({
      place_id: placeId,
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || place.international_phone_number,
      website: place.website,
      google_maps_url: place.url,
      rating: place.rating,
      reviews_count: place.user_ratings_total,
      price_level: place.price_level,
      business_status: place.business_status,
      types: place.types,
      hours: place.opening_hours?.weekday_text,
      is_open: place.opening_hours?.open_now,
      recent_reviews: (place.reviews || []).slice(0, 3).map(r => ({
        rating: r.rating,
        text: r.text,
        time: r.relative_time_description,
      })),
      has_website: !!place.website,
      opportunity_score: scoring.opportunity,
      estimated_value: scoring.value,
      likelihood_score: scoring.likelihood,
      priority_score: scoring.priority,
      scoring_reasons: scoring.reasons,
    });

  } catch (error) {
    console.error('Place details error:', error);
    res.status(500).json({ error: 'Failed to get place details', details: error.message });
  }
});

module.exports = router;
