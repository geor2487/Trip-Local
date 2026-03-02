/** Maps Japanese amenity names (from DB) to English display names */
export const AMENITY_EN: Record<string, string> = {
  '駐車場': 'Parking',
  '朝食付き': 'Breakfast',
  '囲炉裏': 'Hearth',
  '縁側': 'Veranda',
  '庭園': 'Garden',
  'オーシャンビュー': 'Ocean View',
  'テラス': 'Terrace',
  'キッチン': 'Kitchen',
  '露天風呂': 'Open-air Bath',
  '大浴場': 'Public Bath',
  '懐石料理': 'Kaiseki Cuisine',
  '送迎': 'Shuttle',
  'ラウンジ': 'Lounge',
  '農業体験': 'Farming Experience',
  '自家製朝食': 'Homemade Breakfast',
  '餅つき体験': 'Mochi Making',
};

export function translateAmenity(name: string, lang: string): string {
  if (lang === 'ja') return name;
  return AMENITY_EN[name] || name;
}
