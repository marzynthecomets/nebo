/*
 * ============================================================
 * US STATES — State → Capital Coordinates + Bortle Scale
 * ============================================================
 *
 * COPPA-safe: we only ask for state (not city).
 * Each state maps to its capital's lat/long for AstronomyAPI,
 * plus an approximate Bortle Scale rating for the capital city
 * (1 = pristine dark sky, 9 = inner-city sky).
 * Constellation visibility doesn't change much within a state,
 * so capital coords are close enough.
 * ============================================================
 */

const STATE_CAPITALS = {
  Alabama:        { capital: "Montgomery",    lat: 32.38, lon: -86.30,  bortle: 4.6 },
  Alaska:         { capital: "Juneau",        lat: 58.30, lon: -134.42, bortle: 5.1 },
  Arizona:        { capital: "Phoenix",       lat: 33.45, lon: -112.07, bortle: 9 },
  Arkansas:       { capital: "Little Rock",   lat: 34.75, lon: -92.29,  bortle: 8.5 },
  California:     { capital: "Sacramento",    lat: 38.58, lon: -121.49, bortle: 9 },
  Colorado:       { capital: "Denver",        lat: 39.74, lon: -104.99, bortle: 9 },
  Connecticut:    { capital: "Hartford",      lat: 41.76, lon: -72.68,  bortle: 8.8 },
  Delaware:       { capital: "Dover",         lat: 39.16, lon: -75.52,  bortle: 8.1 },
  Florida:        { capital: "Tallahassee",   lat: 30.44, lon: -84.28,  bortle: 8.5 },
  Georgia:        { capital: "Atlanta",       lat: 33.75, lon: -84.39,  bortle: 9 },
  Hawaii:         { capital: "Honolulu",      lat: 21.31, lon: -157.86, bortle: 8.1 },
  Idaho:          { capital: "Boise",         lat: 43.62, lon: -116.21, bortle: 8.2 },
  Illinois:       { capital: "Springfield",   lat: 39.80, lon: -89.65,  bortle: 8.4 },
  Indiana:        { capital: "Indianapolis",  lat: 39.77, lon: -86.16,  bortle: 9 },
  Iowa:           { capital: "Des Moines",    lat: 41.59, lon: -93.62,  bortle: 9 },
  Kansas:         { capital: "Topeka",        lat: 39.05, lon: -95.68,  bortle: 8.2 },
  Kentucky:       { capital: "Frankfort",     lat: 38.20, lon: -84.87,  bortle: 6.2 },
  Louisiana:      { capital: "Baton Rouge",   lat: 30.45, lon: -91.19,  bortle: 9 },
  Maine:          { capital: "Augusta",       lat: 44.31, lon: -69.78,  bortle: 5.7 },
  Maryland:       { capital: "Annapolis",     lat: 38.98, lon: -76.49,  bortle: 7.8 },
  Massachusetts:  { capital: "Boston",        lat: 42.36, lon: -71.06,  bortle: 9 },
  Michigan:       { capital: "Lansing",       lat: 42.73, lon: -84.56,  bortle: 8.7 },
  Minnesota:      { capital: "St. Paul",      lat: 44.94, lon: -93.09,  bortle: 9 },
  Mississippi:    { capital: "Jackson",       lat: 32.30, lon: -90.18,  bortle: 8.7 },
  Missouri:       { capital: "Jefferson City",lat: 38.58, lon: -92.17,  bortle: 6.9 },
  Montana:        { capital: "Helena",        lat: 46.60, lon: -112.04, bortle: 6.6 },
  Nebraska:       { capital: "Lincoln",       lat: 40.81, lon: -96.70,  bortle: 8.6 },
  Nevada:         { capital: "Carson City",   lat: 39.16, lon: -119.77, bortle: 6.2 },
  "New Hampshire":{ capital: "Concord",       lat: 43.21, lon: -71.54,  bortle: 6.6 },
  "New Jersey":   { capital: "Trenton",       lat: 40.22, lon: -74.76,  bortle: 9 },
  "New Mexico":   { capital: "Santa Fe",      lat: 35.69, lon: -105.94, bortle: 6.4 },
  "New York":     { capital: "Albany",        lat: 42.65, lon: -73.76,  bortle: 8.7 },
  "North Carolina":{capital: "Raleigh",       lat: 35.78, lon: -78.64,  bortle: 8.9 },
  "North Dakota": { capital: "Bismarck",      lat: 46.81, lon: -100.78, bortle: 8.3 },
  Ohio:           { capital: "Columbus",      lat: 39.96, lon: -83.00,  bortle: 9 },
  Oklahoma:       { capital: "Oklahoma City", lat: 35.47, lon: -97.52,  bortle: 9 },
  Oregon:         { capital: "Salem",         lat: 44.94, lon: -123.04, bortle: 7.8 },
  Pennsylvania:   { capital: "Harrisburg",    lat: 40.27, lon: -76.88,  bortle: 7.9 },
  "Rhode Island": { capital: "Providence",    lat: 41.82, lon: -71.41,  bortle: 8.8 },
  "South Carolina":{capital: "Columbia",      lat: 34.00, lon: -81.03,  bortle: 9 },
  "South Dakota": { capital: "Pierre",        lat: 44.37, lon: -100.35, bortle: 6.2 },
  Tennessee:      { capital: "Nashville",     lat: 36.16, lon: -86.78,  bortle: 9 },
  Texas:          { capital: "Austin",        lat: 30.27, lon: -97.74,  bortle: 9 },
  Utah:           { capital: "Salt Lake City",lat: 40.76, lon: -111.89, bortle: 9 },
  Vermont:        { capital: "Montpelier",    lat: 44.26, lon: -72.58,  bortle: 4.8 },
  Virginia:       { capital: "Richmond",      lat: 37.54, lon: -77.44,  bortle: 9 },
  Washington:     { capital: "Olympia",       lat: 47.04, lon: -122.90, bortle: 6.5 },
  "Washington DC":{ capital: "Washington",    lat: 38.91, lon: -77.04,  bortle: 9 },
  "West Virginia":{ capital: "Charleston",    lat: 38.35, lon: -81.63,  bortle: 7.8 },
  Wisconsin:      { capital: "Madison",       lat: 43.07, lon: -89.40,  bortle: 7.8 },
  Wyoming:        { capital: "Cheyenne",      lat: 41.14, lon: -104.82, bortle: 7.5 },
};

// Sorted state names for the dropdown
export const STATE_NAMES = Object.keys(STATE_CAPITALS).sort();

// Look up coordinates for a state (returns capital's lat/lon)
export function getStateCoordinates(stateName) {
  return STATE_CAPITALS[stateName] || null;
}

// Default location (New York) for the SKIP button
export const DEFAULT_LOCATION = {
  state: "New York",
  lat: 42.65,
  lon: -73.76,
};

export default STATE_CAPITALS;