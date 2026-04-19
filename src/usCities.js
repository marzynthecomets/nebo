/*
 * ============================================================
 * US CITIES — State → City → Coordinates
 * ============================================================
 *
 * Mars! This is the location picker's brain.
 * Each state has its major cities with lat/long so we can
 * send coordinates to AstronomyAPI without asking the kid
 * for precise location data. COPPA-friendly!
 *
 * The dropdown flow: Kid picks state → cities filter → we grab lat/long.
 * ============================================================
 */

const US_CITIES = {
  Alabama: [
    { city: "Birmingham", lat: 33.52, lon: -86.81 },
    { city: "Montgomery", lat: 32.38, lon: -86.30 },
    { city: "Huntsville", lat: 34.73, lon: -86.59 },
    { city: "Mobile", lat: 30.69, lon: -88.04 },
    { city: "Tuscaloosa", lat: 33.21, lon: -87.57 },
  ],
  Alaska: [
    { city: "Anchorage", lat: 61.22, lon: -149.90 },
    { city: "Fairbanks", lat: 64.84, lon: -147.72 },
    { city: "Juneau", lat: 58.30, lon: -134.42 },
    { city: "Sitka", lat: 57.05, lon: -135.33 },
    { city: "Ketchikan", lat: 55.34, lon: -131.64 },
  ],
  Arizona: [
    { city: "Phoenix", lat: 33.45, lon: -112.07 },
    { city: "Tucson", lat: 32.22, lon: -110.97 },
    { city: "Mesa", lat: 33.42, lon: -111.83 },
    { city: "Scottsdale", lat: 33.49, lon: -111.93 },
    { city: "Flagstaff", lat: 35.20, lon: -111.65 },
    { city: "Tempe", lat: 33.43, lon: -111.94 },
  ],
  Arkansas: [
    { city: "Little Rock", lat: 34.75, lon: -92.29 },
    { city: "Fayetteville", lat: 36.08, lon: -94.17 },
    { city: "Fort Smith", lat: 35.39, lon: -94.40 },
    { city: "Bentonville", lat: 36.37, lon: -94.21 },
    { city: "Hot Springs", lat: 34.50, lon: -93.05 },
  ],
  California: [
    { city: "Los Angeles", lat: 34.05, lon: -118.24 },
    { city: "San Francisco", lat: 37.77, lon: -122.42 },
    { city: "San Diego", lat: 32.72, lon: -117.16 },
    { city: "Sacramento", lat: 38.58, lon: -121.49 },
    { city: "San Jose", lat: 37.34, lon: -121.89 },
    { city: "Oakland", lat: 37.80, lon: -122.27 },
    { city: "Fresno", lat: 36.74, lon: -119.77 },
    { city: "Long Beach", lat: 33.77, lon: -118.19 },
  ],
  Colorado: [
    { city: "Denver", lat: 39.74, lon: -104.99 },
    { city: "Colorado Springs", lat: 38.83, lon: -104.82 },
    { city: "Aurora", lat: 39.73, lon: -104.83 },
    { city: "Boulder", lat: 40.01, lon: -105.27 },
    { city: "Fort Collins", lat: 40.59, lon: -105.08 },
  ],
  Connecticut: [
    { city: "Hartford", lat: 41.76, lon: -72.68 },
    { city: "New Haven", lat: 41.31, lon: -72.92 },
    { city: "Stamford", lat: 41.05, lon: -73.54 },
    { city: "Bridgeport", lat: 41.19, lon: -73.20 },
    { city: "Waterbury", lat: 41.56, lon: -73.04 },
  ],
  Delaware: [
    { city: "Wilmington", lat: 39.74, lon: -75.55 },
    { city: "Dover", lat: 39.16, lon: -75.52 },
    { city: "Newark", lat: 39.68, lon: -75.75 },
    { city: "Rehoboth Beach", lat: 38.72, lon: -75.08 },
  ],
  Florida: [
    { city: "Miami", lat: 25.76, lon: -80.19 },
    { city: "Orlando", lat: 28.54, lon: -81.38 },
    { city: "Tampa", lat: 27.95, lon: -82.46 },
    { city: "Jacksonville", lat: 30.33, lon: -81.66 },
    { city: "Tallahassee", lat: 30.44, lon: -84.28 },
    { city: "St. Petersburg", lat: 27.77, lon: -82.64 },
    { city: "Fort Lauderdale", lat: 26.12, lon: -80.14 },
  ],
  Georgia: [
    { city: "Atlanta", lat: 33.75, lon: -84.39 },
    { city: "Savannah", lat: 32.08, lon: -81.09 },
    { city: "Augusta", lat: 33.47, lon: -81.97 },
    { city: "Athens", lat: 33.96, lon: -83.38 },
    { city: "Macon", lat: 32.84, lon: -83.63 },
  ],
  Hawaii: [
    { city: "Honolulu", lat: 21.31, lon: -157.86 },
    { city: "Hilo", lat: 19.72, lon: -155.08 },
    { city: "Kailua", lat: 21.40, lon: -157.74 },
    { city: "Pearl City", lat: 21.40, lon: -157.97 },
  ],
  Idaho: [
    { city: "Boise", lat: 43.62, lon: -116.21 },
    { city: "Idaho Falls", lat: 43.49, lon: -112.03 },
    { city: "Coeur d'Alene", lat: 47.68, lon: -116.78 },
    { city: "Twin Falls", lat: 42.56, lon: -114.46 },
  ],
  Illinois: [
    { city: "Chicago", lat: 41.88, lon: -87.63 },
    { city: "Springfield", lat: 39.80, lon: -89.65 },
    { city: "Naperville", lat: 41.79, lon: -88.15 },
    { city: "Peoria", lat: 40.69, lon: -89.59 },
    { city: "Rockford", lat: 42.27, lon: -89.09 },
  ],
  Indiana: [
    { city: "Indianapolis", lat: 39.77, lon: -86.16 },
    { city: "Fort Wayne", lat: 41.08, lon: -85.14 },
    { city: "Bloomington", lat: 39.17, lon: -86.53 },
    { city: "Evansville", lat: 37.97, lon: -87.56 },
    { city: "South Bend", lat: 41.68, lon: -86.25 },
  ],
  Iowa: [
    { city: "Des Moines", lat: 41.59, lon: -93.62 },
    { city: "Cedar Rapids", lat: 41.98, lon: -91.67 },
    { city: "Iowa City", lat: 41.66, lon: -91.53 },
    { city: "Davenport", lat: 41.52, lon: -90.58 },
    { city: "Sioux City", lat: 42.50, lon: -96.40 },
  ],
  Kansas: [
    { city: "Wichita", lat: 37.69, lon: -97.34 },
    { city: "Kansas City", lat: 39.11, lon: -94.63 },
    { city: "Topeka", lat: 39.05, lon: -95.68 },
    { city: "Lawrence", lat: 38.97, lon: -95.24 },
    { city: "Manhattan", lat: 39.18, lon: -96.57 },
  ],
  Kentucky: [
    { city: "Louisville", lat: 38.25, lon: -85.76 },
    { city: "Lexington", lat: 38.04, lon: -84.50 },
    { city: "Bowling Green", lat: 36.99, lon: -86.44 },
    { city: "Frankfort", lat: 38.20, lon: -84.87 },
    { city: "Covington", lat: 39.08, lon: -84.51 },
  ],
  Louisiana: [
    { city: "New Orleans", lat: 29.95, lon: -90.07 },
    { city: "Baton Rouge", lat: 30.45, lon: -91.19 },
    { city: "Shreveport", lat: 32.53, lon: -93.75 },
    { city: "Lafayette", lat: 30.22, lon: -92.02 },
    { city: "Lake Charles", lat: 30.23, lon: -93.22 },
  ],
  Maine: [
    { city: "Portland", lat: 43.66, lon: -70.26 },
    { city: "Augusta", lat: 44.31, lon: -69.78 },
    { city: "Bangor", lat: 44.80, lon: -68.77 },
    { city: "Bar Harbor", lat: 44.39, lon: -68.20 },
  ],
  Maryland: [
    { city: "Baltimore", lat: 39.29, lon: -76.61 },
    { city: "Annapolis", lat: 38.98, lon: -76.49 },
    { city: "Bethesda", lat: 38.98, lon: -77.10 },
    { city: "Silver Spring", lat: 39.00, lon: -77.03 },
    { city: "Frederick", lat: 39.41, lon: -77.41 },
  ],
  Massachusetts: [
    { city: "Boston", lat: 42.36, lon: -71.06 },
    { city: "Cambridge", lat: 42.37, lon: -71.11 },
    { city: "Worcester", lat: 42.26, lon: -71.80 },
    { city: "Springfield", lat: 42.10, lon: -72.59 },
    { city: "Salem", lat: 42.52, lon: -70.90 },
  ],
  Michigan: [
    { city: "Detroit", lat: 42.33, lon: -83.05 },
    { city: "Grand Rapids", lat: 42.96, lon: -85.66 },
    { city: "Ann Arbor", lat: 42.28, lon: -83.74 },
    { city: "Lansing", lat: 42.73, lon: -84.56 },
    { city: "Kalamazoo", lat: 42.29, lon: -85.59 },
  ],
  Minnesota: [
    { city: "Minneapolis", lat: 44.98, lon: -93.27 },
    { city: "St. Paul", lat: 44.94, lon: -93.09 },
    { city: "Duluth", lat: 46.79, lon: -92.10 },
    { city: "Rochester", lat: 44.02, lon: -92.47 },
    { city: "Bloomington", lat: 44.84, lon: -93.30 },
  ],
  Mississippi: [
    { city: "Jackson", lat: 32.30, lon: -90.18 },
    { city: "Biloxi", lat: 30.40, lon: -88.89 },
    { city: "Hattiesburg", lat: 31.33, lon: -89.29 },
    { city: "Oxford", lat: 34.37, lon: -89.52 },
    { city: "Tupelo", lat: 34.26, lon: -88.70 },
  ],
  Missouri: [
    { city: "Kansas City", lat: 39.10, lon: -94.58 },
    { city: "St. Louis", lat: 38.63, lon: -90.20 },
    { city: "Springfield", lat: 37.22, lon: -93.29 },
    { city: "Columbia", lat: 38.95, lon: -92.33 },
    { city: "Jefferson City", lat: 38.58, lon: -92.17 },
  ],
  Montana: [
    { city: "Billings", lat: 45.78, lon: -108.50 },
    { city: "Missoula", lat: 46.87, lon: -114.00 },
    { city: "Great Falls", lat: 47.51, lon: -111.30 },
    { city: "Helena", lat: 46.60, lon: -112.04 },
    { city: "Bozeman", lat: 45.68, lon: -111.04 },
  ],
  Nebraska: [
    { city: "Omaha", lat: 41.26, lon: -95.93 },
    { city: "Lincoln", lat: 40.81, lon: -96.70 },
    { city: "Grand Island", lat: 40.92, lon: -98.34 },
    { city: "Kearney", lat: 40.70, lon: -99.08 },
  ],
  Nevada: [
    { city: "Las Vegas", lat: 36.17, lon: -115.14 },
    { city: "Reno", lat: 39.53, lon: -119.81 },
    { city: "Henderson", lat: 36.04, lon: -114.98 },
    { city: "Carson City", lat: 39.16, lon: -119.77 },
  ],
  "New Hampshire": [
    { city: "Manchester", lat: 42.99, lon: -71.46 },
    { city: "Concord", lat: 43.21, lon: -71.54 },
    { city: "Nashua", lat: 42.77, lon: -71.47 },
    { city: "Portsmouth", lat: 43.07, lon: -70.76 },
  ],
  "New Jersey": [
    { city: "Newark", lat: 40.74, lon: -74.17 },
    { city: "Jersey City", lat: 40.73, lon: -74.08 },
    { city: "Trenton", lat: 40.22, lon: -74.76 },
    { city: "Atlantic City", lat: 39.36, lon: -74.42 },
    { city: "Princeton", lat: 40.35, lon: -74.66 },
    { city: "Hoboken", lat: 40.74, lon: -74.03 },
  ],
  "New Mexico": [
    { city: "Albuquerque", lat: 35.08, lon: -106.65 },
    { city: "Santa Fe", lat: 35.69, lon: -105.94 },
    { city: "Las Cruces", lat: 32.32, lon: -106.76 },
    { city: "Roswell", lat: 33.39, lon: -104.52 },
    { city: "Taos", lat: 36.41, lon: -105.57 },
  ],
  "New York": [
    { city: "New York City", lat: 40.71, lon: -74.01 },
    { city: "Buffalo", lat: 42.89, lon: -78.88 },
    { city: "Rochester", lat: 43.16, lon: -77.61 },
    { city: "Albany", lat: 42.65, lon: -73.76 },
    { city: "Syracuse", lat: 43.05, lon: -76.15 },
    { city: "Ithaca", lat: 42.44, lon: -76.50 },
  ],
  "North Carolina": [
    { city: "Charlotte", lat: 35.23, lon: -80.84 },
    { city: "Raleigh", lat: 35.78, lon: -78.64 },
    { city: "Durham", lat: 35.99, lon: -78.90 },
    { city: "Asheville", lat: 35.60, lon: -82.55 },
    { city: "Greensboro", lat: 36.07, lon: -79.79 },
    { city: "Wilmington", lat: 34.23, lon: -77.95 },
  ],
  "North Dakota": [
    { city: "Fargo", lat: 46.88, lon: -96.79 },
    { city: "Bismarck", lat: 46.81, lon: -100.78 },
    { city: "Grand Forks", lat: 47.93, lon: -97.03 },
    { city: "Minot", lat: 48.23, lon: -101.30 },
  ],
  Ohio: [
    { city: "Columbus", lat: 39.96, lon: -83.00 },
    { city: "Cleveland", lat: 41.50, lon: -81.69 },
    { city: "Cincinnati", lat: 39.10, lon: -84.51 },
    { city: "Dayton", lat: 39.76, lon: -84.19 },
    { city: "Toledo", lat: 41.65, lon: -83.54 },
    { city: "Akron", lat: 41.08, lon: -81.52 },
  ],
  Oklahoma: [
    { city: "Oklahoma City", lat: 35.47, lon: -97.52 },
    { city: "Tulsa", lat: 36.15, lon: -95.99 },
    { city: "Norman", lat: 35.22, lon: -97.44 },
    { city: "Stillwater", lat: 36.12, lon: -97.06 },
  ],
  Oregon: [
    { city: "Portland", lat: 45.52, lon: -122.68 },
    { city: "Eugene", lat: 44.05, lon: -123.09 },
    { city: "Salem", lat: 44.94, lon: -123.04 },
    { city: "Bend", lat: 44.06, lon: -121.31 },
    { city: "Ashland", lat: 42.19, lon: -122.71 },
  ],
  Pennsylvania: [
    { city: "Philadelphia", lat: 39.95, lon: -75.17 },
    { city: "Pittsburgh", lat: 40.44, lon: -80.00 },
    { city: "Harrisburg", lat: 40.27, lon: -76.88 },
    { city: "State College", lat: 40.79, lon: -77.86 },
    { city: "Erie", lat: 42.13, lon: -80.09 },
  ],
  "Rhode Island": [
    { city: "Providence", lat: 41.82, lon: -71.41 },
    { city: "Newport", lat: 41.49, lon: -71.31 },
    { city: "Warwick", lat: 41.70, lon: -71.42 },
    { city: "Cranston", lat: 41.78, lon: -71.44 },
  ],
  "South Carolina": [
    { city: "Charleston", lat: 32.78, lon: -79.93 },
    { city: "Columbia", lat: 34.00, lon: -81.03 },
    { city: "Greenville", lat: 34.85, lon: -82.39 },
    { city: "Myrtle Beach", lat: 33.69, lon: -78.89 },
  ],
  "South Dakota": [
    { city: "Sioux Falls", lat: 43.55, lon: -96.70 },
    { city: "Rapid City", lat: 44.08, lon: -103.23 },
    { city: "Pierre", lat: 44.37, lon: -100.35 },
    { city: "Brookings", lat: 44.31, lon: -96.80 },
  ],
  Tennessee: [
    { city: "Nashville", lat: 36.16, lon: -86.78 },
    { city: "Memphis", lat: 35.15, lon: -90.05 },
    { city: "Knoxville", lat: 35.96, lon: -83.92 },
    { city: "Chattanooga", lat: 35.05, lon: -85.31 },
    { city: "Gatlinburg", lat: 35.71, lon: -83.51 },
  ],
  Texas: [
    { city: "Houston", lat: 29.76, lon: -95.37 },
    { city: "Austin", lat: 30.27, lon: -97.74 },
    { city: "Dallas", lat: 32.78, lon: -96.80 },
    { city: "San Antonio", lat: 29.42, lon: -98.49 },
    { city: "Fort Worth", lat: 32.76, lon: -97.33 },
    { city: "El Paso", lat: 31.76, lon: -106.44 },
    { city: "Galveston", lat: 29.30, lon: -94.80 },
  ],
  Utah: [
    { city: "Salt Lake City", lat: 40.76, lon: -111.89 },
    { city: "Provo", lat: 40.23, lon: -111.66 },
    { city: "Ogden", lat: 41.22, lon: -111.97 },
    { city: "Park City", lat: 40.65, lon: -111.50 },
    { city: "Moab", lat: 38.57, lon: -109.55 },
  ],
  Vermont: [
    { city: "Burlington", lat: 44.48, lon: -73.21 },
    { city: "Montpelier", lat: 44.26, lon: -72.58 },
    { city: "Stowe", lat: 44.47, lon: -72.69 },
    { city: "Brattleboro", lat: 42.85, lon: -72.56 },
  ],
  Virginia: [
    { city: "Richmond", lat: 37.54, lon: -77.44 },
    { city: "Virginia Beach", lat: 36.85, lon: -75.98 },
    { city: "Norfolk", lat: 36.85, lon: -76.29 },
    { city: "Arlington", lat: 38.88, lon: -77.10 },
    { city: "Charlottesville", lat: 38.03, lon: -78.48 },
  ],
  Washington: [
    { city: "Seattle", lat: 47.61, lon: -122.33 },
    { city: "Spokane", lat: 47.66, lon: -117.43 },
    { city: "Tacoma", lat: 47.25, lon: -122.44 },
    { city: "Olympia", lat: 47.04, lon: -122.90 },
    { city: "Bellingham", lat: 48.76, lon: -122.49 },
  ],
  "Washington DC": [
    { city: "Washington", lat: 38.91, lon: -77.04 },
  ],
  "West Virginia": [
    { city: "Charleston", lat: 38.35, lon: -81.63 },
    { city: "Morgantown", lat: 39.63, lon: -79.96 },
    { city: "Huntington", lat: 38.42, lon: -82.45 },
    { city: "Wheeling", lat: 40.06, lon: -80.72 },
  ],
  Wisconsin: [
    { city: "Milwaukee", lat: 43.04, lon: -87.91 },
    { city: "Madison", lat: 43.07, lon: -89.40 },
    { city: "Green Bay", lat: 44.51, lon: -88.02 },
    { city: "Eau Claire", lat: 44.81, lon: -91.50 },
    { city: "Kenosha", lat: 42.58, lon: -87.82 },
  ],
  Wyoming: [
    { city: "Cheyenne", lat: 41.14, lon: -104.82 },
    { city: "Casper", lat: 42.87, lon: -106.31 },
    { city: "Jackson", lat: 43.48, lon: -110.76 },
    { city: "Laramie", lat: 41.31, lon: -105.59 },
  ],
};

// Helper: get sorted state names for the dropdown
export const STATE_NAMES = Object.keys(US_CITIES).sort();

// Helper: get cities for a given state
export function getCitiesForState(stateName) {
  return US_CITIES[stateName] || [];
}

// Helper: look up coordinates for a state + city combo
export function getCoordinates(stateName, cityName) {
  const cities = US_CITIES[stateName] || [];
  const match = cities.find((c) => c.city === cityName);
  return match || null;
}

// Default location (New York City) for the SKIP button
export const DEFAULT_LOCATION = {
  city: "New York City",
  state: "New York",
  lat: 40.71,
  lon: -74.01,
};

export default US_CITIES;
