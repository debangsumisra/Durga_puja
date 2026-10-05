import type { Place } from '@/types/pandal';

/**
 * Curated food & stay spots near pandal clusters. Ratings are indicative;
 * run `npm run scrape:food` with a Google Places key to refresh.
 */
export const PLACES: Place[] = [
  // North
  { id: 'mitra-cafe', name: 'Mitra Cafe', kind: 'restaurant', coordinates: { lat: 22.5968, lng: 88.3628 }, rating: 4.4, priceLevel: 1, speciality: 'Fish fry & kabiraji cutlet', address: 'Shobhabazar' },
  { id: 'chittaranjan', name: 'Chittaranjan Mistanna Bhandar', kind: 'street-food', coordinates: { lat: 22.5955, lng: 88.3640 }, rating: 4.5, priceLevel: 1, speciality: 'Rasgulla & sandesh', address: 'Shobhabazar crossing' },
  { id: 'kumartuli-telebhaja', name: 'Kumartuli Telebhaja Stalls', kind: 'street-food', coordinates: { lat: 22.6000, lng: 88.3585 }, rating: 4.2, priceLevel: 1, speciality: 'Beguni, alur chop', address: 'Banamali Sarkar St' },
  { id: 'girish-dey', name: 'Girish Chandra Dey & Nakur', kind: 'street-food', coordinates: { lat: 22.5878, lng: 88.3642 }, rating: 4.6, priceLevel: 1, speciality: 'Heritage sandesh', address: 'Ramdulal Sarkar St' },
  { id: 'belgachia-biryani', name: 'Belgachia Biryani House', kind: 'restaurant', coordinates: { lat: 22.6070, lng: 88.3800 }, rating: 4.0, priceLevel: 2, speciality: 'Kolkata biryani', address: 'Belgachia Rd' },
  { id: 'shyambazar-stay', name: 'Shyambazar Guest House', kind: 'hotel', coordinates: { lat: 22.6010, lng: 88.3720 }, rating: 3.8, priceLevel: 1, speciality: 'Budget rooms near 5-point crossing', address: 'Shyambazar' },
  // Central
  { id: 'coffee-house', name: 'Indian Coffee House', kind: 'restaurant', coordinates: { lat: 22.5763, lng: 88.3626 }, rating: 4.4, priceLevel: 1, speciality: 'Infusion coffee & mutton cutlet', address: 'College Street' },
  { id: 'paramount', name: 'Paramount Sherbat', kind: 'street-food', coordinates: { lat: 22.5751, lng: 88.3644 }, rating: 4.6, priceLevel: 1, speciality: 'Daab sherbat', address: 'College Square' },
  { id: 'royal-indian', name: 'Royal Indian Hotel', kind: 'restaurant', coordinates: { lat: 22.5792, lng: 88.3573 }, rating: 4.4, priceLevel: 2, speciality: 'Mutton chaap & biryani', address: 'Chitpur Rd' },
  { id: 'putiram', name: 'Putiram', kind: 'street-food', coordinates: { lat: 22.5745, lng: 88.3630 }, rating: 4.3, priceLevel: 1, speciality: 'Kochuri & chholar dal', address: 'Surya Sen St' },
  { id: 'sealdah-stay', name: 'Sealdah Business Hotel', kind: 'hotel', coordinates: { lat: 22.5660, lng: 88.3705 }, rating: 3.9, priceLevel: 2, speciality: '2–3★ stays by the station', address: 'APC Rd' },
  { id: 'park-hotel', name: 'The Park Kolkata', kind: 'hotel', coordinates: { lat: 22.5531, lng: 88.3510 }, rating: 4.3, priceLevel: 4, speciality: 'Park Street luxury', address: '17 Park Street' },
  { id: 'peter-cat', name: 'Peter Cat', kind: 'restaurant', coordinates: { lat: 22.5527, lng: 88.3527 }, rating: 4.4, priceLevel: 3, speciality: 'Chelo kebab', address: 'Park Street' },
  { id: 'arsalan', name: 'Arsalan', kind: 'restaurant', coordinates: { lat: 22.5440, lng: 88.3655 }, rating: 4.3, priceLevel: 2, speciality: 'Biryani & kebabs', address: 'Park Circus' },
  // South
  { id: 'bhojohori', name: 'Bhojohori Manna', kind: 'restaurant', coordinates: { lat: 22.5165, lng: 88.3658 }, rating: 4.3, priceLevel: 2, speciality: 'Bengali thali', address: 'Ekdalia Rd' },
  { id: 'gariahat-fuchka', name: 'Gariahat Fuchka Corner', kind: 'street-food', coordinates: { lat: 22.5188, lng: 88.3660 }, rating: 4.5, priceLevel: 1, speciality: 'Fuchka & churmur', address: 'Gariahat crossing' },
  { id: 'kasturi', name: 'Kasturi', kind: 'restaurant', coordinates: { lat: 22.5208, lng: 88.3540 }, rating: 4.2, priceLevel: 2, speciality: 'Bangladeshi-style fish curries', address: 'Rashbehari' },
  { id: 'bijoli', name: 'Bijoli Grill', kind: 'restaurant', coordinates: { lat: 22.5235, lng: 88.3486 }, rating: 4.2, priceLevel: 3, speciality: 'Bengali fine-dine', address: 'Southern Avenue' },
  { id: 'hindusthan-intl', name: 'Hindusthan International', kind: 'hotel', coordinates: { lat: 22.5382, lng: 88.3532 }, rating: 4.1, priceLevel: 3, speciality: '5★ on AJC Bose Rd', address: 'AJC Bose Rd' },
  { id: 'southern-avenue-stay', name: 'Southern Avenue Guest House', kind: 'hotel', coordinates: { lat: 22.5160, lng: 88.3510 }, rating: 3.9, priceLevel: 2, speciality: 'Budget stay near the Lake', address: 'Southern Avenue' },
  { id: 'behala-roll', name: 'Behala Chowrasta Roll Centre', kind: 'street-food', coordinates: { lat: 22.4955, lng: 88.3125 }, rating: 4.1, priceLevel: 1, speciality: 'Egg-chicken roll', address: 'DH Rd' },
  { id: 'tolly-mughlai', name: 'Tollygunge Mughlai Paratha', kind: 'street-food', coordinates: { lat: 22.4990, lng: 88.3460 }, rating: 4.1, priceLevel: 1, speciality: 'Mughlai paratha', address: 'Tollygunge' },
  { id: 'behala-stay', name: 'Behala Residency', kind: 'hotel', coordinates: { lat: 22.4900, lng: 88.3150 }, rating: 3.7, priceLevel: 1, speciality: 'Budget rooms on DH Rd', address: 'Behala' },
  // Salt Lake
  { id: 'city-centre-food', name: 'City Centre Food Court', kind: 'restaurant', coordinates: { lat: 22.5880, lng: 88.4085 }, rating: 4.0, priceLevel: 2, speciality: 'Multi-cuisine', address: 'City Centre, DC Block' },
  { id: 'karunamoyee-stalls', name: 'Karunamoyee Momo Stalls', kind: 'street-food', coordinates: { lat: 22.5815, lng: 88.4170 }, rating: 4.1, priceLevel: 1, speciality: 'Momos & chowmein', address: 'Karunamoyee' },
  { id: 'saltlake-bengali', name: 'Salt Lake Bengali Kitchen', kind: 'restaurant', coordinates: { lat: 22.5860, lng: 88.4140 }, rating: 4.3, priceLevel: 3, speciality: 'Bengali heritage cuisine', address: 'Sector I' },
  { id: 'saltlake-stay', name: 'Salt Lake Sector I Hotel', kind: 'hotel', coordinates: { lat: 22.5870, lng: 88.4110 }, rating: 4.0, priceLevel: 2, speciality: 'Mid-range stay near City Centre', address: 'Sector I' },
  { id: 'laketown-stay', name: 'Lake Town Residency', kind: 'hotel', coordinates: { lat: 22.6050, lng: 88.4010 }, rating: 3.8, priceLevel: 2, speciality: 'Budget rooms near Sreebhumi', address: 'Lake Town' },
];
