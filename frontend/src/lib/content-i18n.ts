/**
 * Frontend translation layer for DB-sourced content (seed data).
 * Maps Japanese strings to English equivalents.
 */

const PREFECTURE_EN: Record<string, string> = {
  '北海道': 'Hokkaido', '秋田県': 'Akita', '栃木県': 'Tochigi',
  '新潟県': 'Niigata', '長野県': 'Nagano', '山梨県': 'Yamanashi',
  '静岡県': 'Shizuoka', '三重県': 'Mie', '京都府': 'Kyoto',
  '奈良県': 'Nara', '島根県': 'Shimane', '徳島県': 'Tokushima',
  '高知県': 'Kochi', '岐阜県': 'Gifu', '沖縄県': 'Okinawa',
};

const CITY_EN: Record<string, string> = {
  '安曇野市': 'Azumino', '土佐清水市': 'Tosashimizu', '伊豆市': 'Izu',
  '南魚沼市': 'Minamiuonuma', '白川村': 'Shirakawa', '京都市': 'Kyoto',
  '座間味村': 'Zamami', '日光市': 'Nikko', 'ニセコ町': 'Niseko',
  '仙北市': 'Semboku', '鳥羽市': 'Toba', '出雲市': 'Izumo',
  '甲州市': 'Koshu', '明日香村': 'Asuka', '松本市': 'Matsumoto',
  '男鹿市': 'Oga', '美瑛町': 'Biei', '十日町市': 'Tokamachi',
  '富士市': 'Fuji', '徳島市': 'Tokushima', '高知市': 'Kochi',
};

const NAME_EN: Record<string, string> = {
  // Users
  'テスト太郎': 'Taro Test',
  '宿オーナー花子': 'Hanako Owner',
  '体験プランナー誠': 'Makoto Planner',
  '管理者': 'Admin',
  // Accommodations
  '古民家ゲストハウス 里山': 'Satoyama Heritage Guesthouse',
  '海辺のコテージ 潮風': 'Seaside Cottage Shiokaze',
  '温泉旅館 山桜庵': 'Yamazakura Onsen Ryokan',
  '農家民泊 田んぼの宿': 'Rice Paddy Farmstay',
  '合掌造り民宿 白川': 'Shirakawa Gassho-zukuri Inn',
  '京町家ステイ 花暖簾': 'Kyoto Machiya Stay Hananoren',
  '離島グランピング 美ら海': 'Island Glamping Churaumi',
  '蔵造りの宿 日光': 'Nikko Kura-zukuri Lodge',
  '山小屋ロッジ ニセコ': 'Niseko Mountain Lodge',
  '武家屋敷ステイ 角館': 'Kakunodate Samurai House Stay',
  '漁師の宿 鳥羽': "Fisherman's Inn Toba",
  '茅葺き屋根の宿 出雲': 'Izumo Thatched Roof Inn',
  'ワイナリーリゾート 甲州': 'Koshu Winery Resort',
  '棚田ビュー古民家 明日香': 'Asuka Terraced Rice Field House',
};

const DESC_EN: Record<string, string> = {
  '築100年の古民家をリノベーションした温かみのあるゲストハウス。里山の自然に囲まれた静かな環境で、日本の原風景をお楽しみいただけます。':
    'A warm guesthouse renovated from a 100-year-old traditional house. Enjoy the original Japanese countryside landscape in a quiet setting surrounded by nature.',
  '太平洋を一望できるプライベートコテージ。波音を聴きながら過ごす贅沢な時間。BBQ設備完備。':
    'A private cottage overlooking the Pacific Ocean. Spend luxurious time listening to the waves. Fully equipped BBQ facilities.',
  '源泉かけ流しの露天風呂と、四季折々の懐石料理でおもてなし。客室からは桜並木と遠くに富士山を望む絶景。':
    'Enjoy natural hot spring open-air baths and seasonal kaiseki cuisine. Rooms offer stunning views of cherry blossoms and distant Mt. Fuji.',
  '現役の農家が営む田園に佇む民泊。季節ごとの農業体験、手作り味噌づくりなど、里山の暮らしをまるごと体験。':
    'A farmstay run by active farmers. Experience rural life with seasonal farming activities and handmade miso making.',
  '世界遺産・白川郷の合掌造り集落の中に佇む民宿。囲炉裏端での夕食、雪景色が広がる冬は格別。日本の原風景に泊まる特別な体験を。':
    'An inn nestled in the UNESCO World Heritage Shirakawa-go gassho-zukuri village. Dinner by the hearth and snowy winter scenery are unforgettable.',
  '築120年の京町家を一棟貸し。中庭のある静かな空間で、京都暮らしを体験。祇園・清水寺まで徒歩圏内。':
    'A 120-year-old Kyoto machiya available for exclusive rental. Experience Kyoto living in a quiet space with a courtyard. Walking distance to Gion and Kiyomizu-dera.',
  '沖縄の離島でグランピング体験。透明度抜群のビーチまで徒歩1分。星空の下でBBQを楽しみながら島時間を満喫。':
    'Glamping on a remote Okinawan island. Crystal-clear beach just 1 minute on foot. Enjoy BBQ under the stars and island time.',
  '日光の杉並木近くにある蔵をリノベーションした宿。重厚な蔵の壁と現代的な快適さが融合。世界遺産の社寺巡りの拠点に最適。':
    "A renovated storehouse near Nikko's cedar avenue. Combining the solid storehouse walls with modern comfort. Ideal base for visiting World Heritage shrines.",
  'ニセコの大自然に囲まれた木造ロッジ。冬はパウダースノー、夏はラフティングやトレッキング。暖炉のある広いリビングでくつろぎの時間を。':
    "A wooden lodge surrounded by Niseko's nature. Powder snow in winter, rafting and trekking in summer. Relax in the spacious living room by the fireplace.",
  '秋田・角館の武家屋敷通りにある歴史的建造物に宿泊。枝垂れ桜の名所に位置し、春は圧巻の桜景色。きりたんぽ鍋の夕食付き。':
    "Stay in a historic samurai house on Kakunodate's samurai district. Located at a famous weeping cherry spot. Includes kiritanpo hot pot dinner.",
  '現役の漁師が営む海辺の宿。朝獲れの伊勢海老や鮑を使った豪華な海鮮料理が自慢。船釣り体験も可能。':
    "A seaside inn run by an active fisherman. Proud of luxurious seafood dishes using fresh-caught lobster and abalone. Boat fishing available.",
  '出雲大社のお膝元、築200年の茅葺き屋根の古民家。石見銀山へのアクセスも良好。出雲蕎麦と地酒を味わう夕べを。':
    'A 200-year-old thatched roof house near Izumo Grand Shrine. Good access to Iwami Ginzan Silver Mine. Enjoy Izumo soba and local sake.',
  '甲州ワインの産地に佇むリゾート。ぶどう畑に囲まれたテラスで自社ワインとフレンチを堪能。ワイナリー見学・テイスティング付き。':
    'A resort in the Koshu wine region. Enjoy house wine and French cuisine on a terrace surrounded by vineyards. Includes winery tours and tasting.',
  '奈良・明日香村の棚田を見渡す丘の上の古民家。万葉集の舞台となった歴史ある風景の中で、静かな時を過ごす。サイクリングでの遺跡巡りもおすすめ。':
    'A traditional house on a hill overlooking the rice terraces of Asuka. Spend quiet time in the historic landscape of Manyoshu poetry. Cycling to ancient ruins recommended.',
};

const ROOM_EN: Record<string, string> = {
  '和室 八畳（松の間）': 'Japanese 8-Tatami (Matsu Room)',
  '和室 十畳（竹の間）': 'Japanese 10-Tatami (Take Room)',
  'メゾネット（梅の間）': 'Maisonette (Ume Room)',
  'スタンダードコテージ': 'Standard Cottage',
  'プレミアムコテージ': 'Premium Cottage',
  'スタンダード和室': 'Standard Japanese Room',
  '露天風呂付き特別室': 'Suite with Open-air Bath',
  'ファミリー和洋室': 'Family Japanese-Western Room',
  '和室（稲穂の間）': 'Japanese Room (Inaho)',
  '和室（山霧の間）': 'Japanese Room (Yamagiri)',
  '合掌の間（1F）': 'Gassho Room (1F)',
  '見晴らしの間（2F）': 'Panorama Room (2F)',
  '一棟貸し（最大6名）': 'Whole House (up to 6 guests)',
  'ドームテント（オーシャンビュー）': 'Dome Tent (Ocean View)',
  'ベルテント（ガーデン）': 'Bell Tent (Garden)',
  '蔵スイート': 'Kura Suite',
  '蔵デラックス': 'Kura Deluxe',
  'ツインルーム': 'Twin Room',
  'ファミリールーム': 'Family Room',
  'グループルーム': 'Group Room',
  '書院の間': 'Shoin Room',
  '大広間': 'Grand Hall',
  '海の見える和室（8畳）': 'Ocean View Japanese Room (8-Tatami)',
  '特別室（12畳+広縁）': 'Special Room (12-Tatami + Veranda)',
  '囲炉裏の間': 'Hearth Room',
  '離れ（庭園付き）': 'Annex (with Garden)',
  'ヴィンヤードビュー ダブル': 'Vineyard View Double',
  'スイートルーム': 'Suite Room',
  '棚田ビュー和室': 'Terraced Field View Japanese Room',
  '離れ（露天風呂付き）': 'Annex (with Open-air Bath)',
};

const EVENT_TITLE_EN: Record<string, string> = {
  '京焼き陶芸体験 — 自分だけの茶碗を作ろう': 'Kyo-yaki Pottery — Make Your Own Tea Bowl',
  '棚田ハイキング＆おにぎりランチ': 'Rice Terrace Hiking & Onigiri Lunch',
  '信州味噌づくりワークショップ': 'Shinshu Miso Making Workshop',
  '秋田・なまはげ太鼓体験': 'Akita Namahage Drumming Experience',
  'ナイトフォレストウォーク — 北海道の森': 'Night Forest Walk — Hokkaido Woods',
  '伊勢志摩 漁師体験＆海鮮BBQ': 'Ise-Shima Fishing & Seafood BBQ',
  '静岡・茶畑で学ぶ本格茶道体験': 'Shizuoka Tea Fields — Authentic Tea Ceremony',
  '藍染めワークショップ — 阿波藍': 'Indigo Dyeing Workshop — Awa Indigo',
  'よさこい祭り踊り子体験': 'Yosakoi Festival Dancer Experience',
  '甲州ぶどう収穫体験＆ワインテイスティング': 'Koshu Grape Harvest & Wine Tasting',
};

const EVENT_DESC_EN: Record<string, string> = {
  '京都の窯元で本格的な陶芸体験。ろくろを使って自分だけの茶碗や皿を制作します。完成品は後日配送。初心者歓迎。':
    'Authentic pottery at a Kyoto kiln. Create your own tea bowl or plate on the wheel. Finished pieces shipped later. Beginners welcome.',
  '日本の棚田百選に選ばれた星峠の棚田をガイドと一緒に歩きます。地元のお米で作ったおにぎりランチ付き。':
    "Hike the Hoshitoge rice terraces — one of Japan's top 100 — with a guide. Includes onigiri lunch made with local rice.",
  '400年の歴史を持つ味噌蔵で、職人の指導のもと自家製味噌を仕込みます。約3kgの味噌をお持ち帰り。':
    'Make your own miso at a 400-year-old miso brewery under artisan guidance. Take home about 3kg of miso.',
  '迫力のなまはげ太鼓を地元の奏者から学ぶ体験プログラム。基本のリズムから練習し、最後は全員で合奏。':
    'Learn powerful Namahage drumming from local musicians. Practice basic rhythms and finish with a group performance.',
  'ガイドと共に夜の原生林を歩く特別体験。エゾフクロウの鳴き声、満天の星空。ヘッドランプとホットドリンク付き。':
    'A special walk through primeval forest at night with a guide. Listen for Blakiston\'s fish owls under starry skies. Headlamp and hot drink included.',
  '現役漁師の船に乗って朝の漁を体験。獲れたての魚介をその場でBBQにして味わう贅沢な半日プログラム。':
    "Board a fisherman's boat for morning fishing. BBQ your fresh catch on the spot — a luxurious half-day program.",
  '富士山を望む茶畑で茶摘みから体験。摘んだ茶葉の手揉み製茶、そして茶室での正式なお点前まで。':
    'Pick tea leaves in fields with Mt. Fuji views. Hand-roll your tea and enjoy a formal tea ceremony.',
  '徳島の伝統工芸「阿波藍」を使った藍染め体験。ストールやTシャツに世界に一つだけの模様を染めます。':
    "Indigo dyeing using Tokushima's traditional Awa indigo. Dye unique patterns on scarves or T-shirts.",
  '高知のよさこい祭りに踊り子として参加する特別プログラム。衣装・鳴子貸出し、練習から本番まで完全サポート。':
    "Join Kochi's Yosakoi Festival as a dancer. Costume and naruko clappers provided. Full support from practice to performance.",
  'ワイナリーのぶどう畑で収穫体験。その後、自社醸造ワイン5種のテイスティングとチーズプレート付き。':
    'Harvest grapes at the winery vineyard. Then enjoy a tasting of 5 house wines with a cheese plate.',
};

const EVENT_LOCATION_EN: Record<string, string> = {
  '京都市東山区 清水焼の里': 'Kiyomizu-yaki Village, Higashiyama, Kyoto',
  '新潟県十日町市 星峠の棚田': 'Hoshitoge Rice Terraces, Tokamachi, Niigata',
  '長野県松本市 老舗味噌蔵': 'Historic Miso Brewery, Matsumoto, Nagano',
  '秋田県男鹿市 男鹿温泉郷': 'Oga Onsen Village, Oga, Akita',
  '北海道上川郡美瑛町 青い池周辺': 'Blue Pond Area, Biei, Hokkaido',
  '三重県鳥羽市 答志島漁港': 'Toshijima Fishing Port, Toba, Mie',
  '静岡県富士市 大淵笹場': 'Obuchi Sasaba, Fuji, Shizuoka',
  '徳島県徳島市 藍の館': 'Ai no Yakata (Indigo Museum), Tokushima',
  '高知県高知市 中央公園': 'Central Park, Kochi',
  '山梨県甲州市勝沼 ワイナリー': 'Katsunuma Winery, Koshu, Yamanashi',
};

/** Translate a string if English, return as-is if Japanese */
function lookup(map: Record<string, string>, value: string, lang: string): string {
  if (lang === 'ja') return value;
  return map[value] || value;
}

export function tPrefecture(value: string, lang: string): string {
  return lookup(PREFECTURE_EN, value, lang);
}

export function tCity(value: string, lang: string): string {
  return lookup(CITY_EN, value, lang);
}

export function tName(value: string, lang: string): string {
  return lookup(NAME_EN, value, lang);
}

export function tDesc(value: string, lang: string): string {
  return lookup(DESC_EN, value, lang);
}

export function tRoom(value: string, lang: string): string {
  return lookup(ROOM_EN, value, lang);
}

export function tEventTitle(value: string, lang: string): string {
  return lookup(EVENT_TITLE_EN, value, lang);
}

export function tEventDesc(value: string, lang: string): string {
  return lookup(EVENT_DESC_EN, value, lang);
}

export function tEventLocation(value: string, lang: string): string {
  return lookup(EVENT_LOCATION_EN, value, lang);
}
