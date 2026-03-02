import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcryptjs from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcryptjs.hash("password123", 12);

  // テストユーザー
  const user = await prisma.user.upsert({
    where: { email: "test@triplocal.jp" },
    update: {},
    create: { email: "test@triplocal.jp", passwordHash, name: "テスト太郎", role: "USER" },
  });

  // オーナーユーザー
  const owner = await prisma.user.upsert({
    where: { email: "owner@triplocal.jp" },
    update: {},
    create: { email: "owner@triplocal.jp", passwordHash, name: "宿オーナー花子", role: "OWNER" },
  });

  // イベント主催者
  const organizer = await prisma.user.upsert({
    where: { email: "organizer@triplocal.jp" },
    update: {},
    create: { email: "organizer@triplocal.jp", passwordHash, name: "体験プランナー誠", role: "ORGANIZER" },
  });

  // 管理者
  await prisma.user.upsert({
    where: { email: "admin@triplocal.jp" },
    update: {},
    create: { email: "admin@triplocal.jp", passwordHash, name: "管理者", role: "ADMIN" },
  });

  // ─── 宿泊施設（14件） ───
  const accommodations = [
    {
      name: "古民家ゲストハウス 里山",
      description: "築100年の古民家をリノベーションした温かみのあるゲストハウス。里山の自然に囲まれた静かな環境で、日本の原風景をお楽しみいただけます。",
      address: "長野県安曇野市穂高有明7575", city: "安曇野市", prefecture: "長野県", zipCode: "399-8301",
      coverImage: "https://images.unsplash.com/photo-1741851373855-5fb305ee6d70?w=800",
      images: ["https://images.unsplash.com/photo-1741851373855-5fb305ee6d70?w=800","https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800","https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800","https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800","https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800"],
      amenities: ["Wi-Fi", "駐車場", "朝食付き", "囲炉裏", "縁側", "庭園"],
      rooms: [{ name: "和室 八畳（松の間）", capacity: 3, pricePerNight: 12000 }, { name: "和室 十畳（竹の間）", capacity: 4, pricePerNight: 15000 }, { name: "メゾネット（梅の間）", capacity: 2, pricePerNight: 18000 }],
    },
    {
      name: "海辺のコテージ 潮風",
      description: "太平洋を一望できるプライベートコテージ。波音を聴きながら過ごす贅沢な時間。BBQ設備完備。",
      address: "高知県土佐清水市足摺岬1350", city: "土佐清水市", prefecture: "高知県", zipCode: "787-0315",
      coverImage: "https://images.unsplash.com/photo-1753711440542-d1f48173fdc5?w=800",
      images: ["https://images.unsplash.com/photo-1753711440542-d1f48173fdc5?w=800","https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800","https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800","https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800","https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800"],
      amenities: ["Wi-Fi", "駐車場", "BBQ", "オーシャンビュー", "テラス", "キッチン"],
      rooms: [{ name: "スタンダードコテージ", capacity: 4, pricePerNight: 20000 }, { name: "プレミアムコテージ", capacity: 6, pricePerNight: 30000 }],
    },
    {
      name: "温泉旅館 山桜庵",
      description: "源泉かけ流しの露天風呂と、四季折々の懐石料理でおもてなし。客室からは桜並木と遠くに富士山を望む絶景。",
      address: "静岡県伊豆市修善寺940", city: "伊豆市", prefecture: "静岡県", zipCode: "410-2416",
      coverImage: "https://images.unsplash.com/photo-1644413638617-02369c89c156?w=800",
      images: ["https://images.unsplash.com/photo-1644413638617-02369c89c156?w=800","https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800","https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800","https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800","https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800"],
      amenities: ["Wi-Fi", "露天風呂", "大浴場", "懐石料理", "送迎", "ラウンジ"],
      rooms: [{ name: "スタンダード和室", capacity: 2, pricePerNight: 25000 }, { name: "露天風呂付き特別室", capacity: 2, pricePerNight: 45000 }, { name: "ファミリー和洋室", capacity: 5, pricePerNight: 35000 }],
    },
    {
      name: "農家民泊 田んぼの宿",
      description: "現役の農家が営む田園に佇む民泊。季節ごとの農業体験、手作り味噌づくりなど、里山の暮らしをまるごと体験。",
      address: "新潟県南魚沼市六日町180", city: "南魚沼市", prefecture: "新潟県", zipCode: "949-6611",
      coverImage: "https://images.unsplash.com/photo-1549888722-bf34acd6a68c?w=800",
      images: ["https://images.unsplash.com/photo-1549888722-bf34acd6a68c?w=800","https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800","https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800","https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800","https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"],
      amenities: ["Wi-Fi", "駐車場", "農業体験", "自家製朝食", "囲炉裏", "餅つき体験"],
      rooms: [{ name: "和室（稲穂の間）", capacity: 3, pricePerNight: 8000 }, { name: "和室（山霧の間）", capacity: 4, pricePerNight: 10000 }],
    },
    // ── 追加10件 ──
    {
      name: "合掌造り民宿 白川",
      description: "世界遺産・白川郷の合掌造り集落の中に佇む民宿。囲炉裏端での夕食、雪景色が広がる冬は格別。日本の原風景に泊まる特別な体験を。",
      address: "岐阜県大野郡白川村荻町360", city: "白川村", prefecture: "岐阜県", zipCode: "501-5627",
      coverImage: "https://images.unsplash.com/photo-1559430819-b07798465e35?w=800",
      images: ["https://images.unsplash.com/photo-1559430819-b07798465e35?w=800","https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800","https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800"],
      amenities: ["駐車場", "囲炉裏", "朝食付き"],
      rooms: [{ name: "合掌の間（1F）", capacity: 4, pricePerNight: 14000 }, { name: "見晴らしの間（2F）", capacity: 3, pricePerNight: 16000 }],
    },
    {
      name: "京町家ステイ 花暖簾",
      description: "築120年の京町家を一棟貸し。中庭のある静かな空間で、京都暮らしを体験。祇園・清水寺まで徒歩圏内。",
      address: "京都府京都市東山区祇園町南側570", city: "京都市", prefecture: "京都府", zipCode: "605-0074",
      coverImage: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800",
      images: ["https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800","https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800","https://images.unsplash.com/photo-1624253321171-1be53e12f5f4?w=800"],
      amenities: ["Wi-Fi", "キッチン", "庭園", "縁側"],
      rooms: [{ name: "一棟貸し（最大6名）", capacity: 6, pricePerNight: 38000 }],
    },
    {
      name: "離島グランピング 美ら海",
      description: "沖縄の離島でグランピング体験。透明度抜群のビーチまで徒歩1分。星空の下でBBQを楽しみながら島時間を満喫。",
      address: "沖縄県国頭郡座間味村座間味155", city: "座間味村", prefecture: "沖縄県", zipCode: "901-3402",
      coverImage: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800",
      images: ["https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800","https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800","https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800"],
      amenities: ["Wi-Fi", "BBQ", "オーシャンビュー", "テラス"],
      rooms: [{ name: "ドームテント（オーシャンビュー）", capacity: 2, pricePerNight: 22000 }, { name: "ベルテント（ガーデン）", capacity: 4, pricePerNight: 28000 }],
    },
    {
      name: "蔵造りの宿 日光",
      description: "日光の杉並木近くにある蔵をリノベーションした宿。重厚な蔵の壁と現代的な快適さが融合。世界遺産の社寺巡りの拠点に最適。",
      address: "栃木県日光市鉢石町914", city: "日光市", prefecture: "栃木県", zipCode: "321-1431",
      coverImage: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800",
      images: ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800","https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800","https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800"],
      amenities: ["Wi-Fi", "駐車場", "大浴場", "朝食付き"],
      rooms: [{ name: "蔵スイート", capacity: 2, pricePerNight: 32000 }, { name: "蔵デラックス", capacity: 3, pricePerNight: 28000 }],
    },
    {
      name: "山小屋ロッジ ニセコ",
      description: "ニセコの大自然に囲まれた木造ロッジ。冬はパウダースノー、夏はラフティングやトレッキング。暖炉のある広いリビングでくつろぎの時間を。",
      address: "北海道虻田郡ニセコ町曽我885", city: "ニセコ町", prefecture: "北海道", zipCode: "048-1511",
      coverImage: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800",
      images: ["https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800","https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800","https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800"],
      amenities: ["Wi-Fi", "駐車場", "キッチン", "BBQ", "テラス"],
      rooms: [{ name: "ツインルーム", capacity: 2, pricePerNight: 15000 }, { name: "ファミリールーム", capacity: 5, pricePerNight: 25000 }, { name: "グループルーム", capacity: 8, pricePerNight: 40000 }],
    },
    {
      name: "武家屋敷ステイ 角館",
      description: "秋田・角館の武家屋敷通りにある歴史的建造物に宿泊。枝垂れ桜の名所に位置し、春は圧巻の桜景色。きりたんぽ鍋の夕食付き。",
      address: "秋田県仙北市角館町表町下丁3", city: "仙北市", prefecture: "秋田県", zipCode: "014-0325",
      coverImage: "https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800",
      images: ["https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800","https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800","https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800"],
      amenities: ["Wi-Fi", "庭園", "朝食付き", "送迎"],
      rooms: [{ name: "書院の間", capacity: 2, pricePerNight: 20000 }, { name: "大広間", capacity: 6, pricePerNight: 42000 }],
    },
    {
      name: "漁師の宿 鳥羽",
      description: "現役の漁師が営む海辺の宿。朝獲れの伊勢海老や鮑を使った豪華な海鮮料理が自慢。船釣り体験も可能。",
      address: "三重県鳥羽市浦村町1228", city: "鳥羽市", prefecture: "三重県", zipCode: "517-0025",
      coverImage: "https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=800",
      images: ["https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=800","https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800","https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"],
      amenities: ["Wi-Fi", "駐車場", "オーシャンビュー", "朝食付き"],
      rooms: [{ name: "海の見える和室（8畳）", capacity: 3, pricePerNight: 13000 }, { name: "特別室（12畳+広縁）", capacity: 5, pricePerNight: 22000 }],
    },
    {
      name: "茅葺き屋根の宿 出雲",
      description: "出雲大社のお膝元、築200年の茅葺き屋根の古民家。石見銀山へのアクセスも良好。出雲蕎麦と地酒を味わう夕べを。",
      address: "島根県出雲市大社町杵築東195", city: "出雲市", prefecture: "島根県", zipCode: "699-0701",
      coverImage: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      images: ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800","https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800","https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800"],
      amenities: ["駐車場", "囲炉裏", "庭園", "縁側"],
      rooms: [{ name: "囲炉裏の間", capacity: 4, pricePerNight: 11000 }, { name: "離れ（庭園付き）", capacity: 2, pricePerNight: 16000 }],
    },
    {
      name: "ワイナリーリゾート 甲州",
      description: "甲州ワインの産地に佇むリゾート。ぶどう畑に囲まれたテラスで自社ワインとフレンチを堪能。ワイナリー見学・テイスティング付き。",
      address: "山梨県甲州市勝沼町下岩崎2171", city: "甲州市", prefecture: "山梨県", zipCode: "409-1302",
      coverImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
      images: ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800","https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=800","https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800"],
      amenities: ["Wi-Fi", "駐車場", "テラス", "ラウンジ"],
      rooms: [{ name: "ヴィンヤードビュー ダブル", capacity: 2, pricePerNight: 27000 }, { name: "スイートルーム", capacity: 2, pricePerNight: 48000 }],
    },
    {
      name: "棚田ビュー古民家 明日香",
      description: "奈良・明日香村の棚田を見渡す丘の上の古民家。万葉集の舞台となった歴史ある風景の中で、静かな時を過ごす。サイクリングでの遺跡巡りもおすすめ。",
      address: "奈良県高市郡明日香村岡806", city: "明日香村", prefecture: "奈良県", zipCode: "634-0111",
      coverImage: "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800",
      images: ["https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800","https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800","https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800"],
      amenities: ["Wi-Fi", "駐車場", "縁側", "自家製朝食"],
      rooms: [{ name: "棚田ビュー和室", capacity: 3, pricePerNight: 9500 }, { name: "離れ（露天風呂付き）", capacity: 2, pricePerNight: 18000 }],
    },
  ];

  for (const accom of accommodations) {
    const { rooms, ...accomData } = accom;
    const created = await prisma.accommodation.create({
      data: { ...accomData, ownerId: owner.id, status: "PUBLISHED" },
    });

    for (const room of rooms) {
      const createdRoom = await prisma.room.create({
        data: { ...room, accommodationId: created.id },
      });
      // 今後3ヶ月分の Availability
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        await prisma.availability.create({
          data: { roomId: createdRoom.id, date, isBlocked: false },
        });
      }
    }
    console.log(`  Created accommodation: ${accom.name}`);
  }

  // ─── 体験イベント（10件） ───
  const baseDate = new Date();
  const events = [
    {
      title: "京焼き陶芸体験 — 自分だけの茶碗を作ろう",
      description: "京都の窯元で本格的な陶芸体験。ろくろを使って自分だけの茶碗や皿を制作します。完成品は後日配送。初心者歓迎。",
      category: "ワークショップ", location: "京都市東山区 清水焼の里", city: "京都市", prefecture: "京都府",
      coverImage: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800", images: [],
      capacity: 12, price: 5500, isFree: false, daysFromNow: 14,
    },
    {
      title: "棚田ハイキング＆おにぎりランチ",
      description: "日本の棚田百選に選ばれた星峠の棚田をガイドと一緒に歩きます。地元のお米で作ったおにぎりランチ付き。",
      category: "アウトドア", location: "新潟県十日町市 星峠の棚田", city: "十日町市", prefecture: "新潟県",
      coverImage: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800", images: [],
      capacity: 20, price: 0, isFree: true, daysFromNow: 21,
    },
    {
      title: "信州味噌づくりワークショップ",
      description: "400年の歴史を持つ味噌蔵で、職人の指導のもと自家製味噌を仕込みます。約3kgの味噌をお持ち帰り。",
      category: "食", location: "長野県松本市 老舗味噌蔵", city: "松本市", prefecture: "長野県",
      coverImage: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800", images: [],
      capacity: 15, price: 4000, isFree: false, daysFromNow: 10,
    },
    {
      title: "秋田・なまはげ太鼓体験",
      description: "迫力のなまはげ太鼓を地元の奏者から学ぶ体験プログラム。基本のリズムから練習し、最後は全員で合奏。",
      category: "文化体験", location: "秋田県男鹿市 男鹿温泉郷", city: "男鹿市", prefecture: "秋田県",
      coverImage: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=800", images: [],
      capacity: 25, price: 0, isFree: true, daysFromNow: 28,
    },
    {
      title: "ナイトフォレストウォーク — 北海道の森",
      description: "ガイドと共に夜の原生林を歩く特別体験。エゾフクロウの鳴き声、満天の星空。ヘッドランプとホットドリンク付き。",
      category: "アウトドア", location: "北海道上川郡美瑛町 青い池周辺", city: "美瑛町", prefecture: "北海道",
      coverImage: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800", images: [],
      capacity: 10, price: 3500, isFree: false, daysFromNow: 35,
    },
    {
      title: "伊勢志摩 漁師体験＆海鮮BBQ",
      description: "現役漁師の船に乗って朝の漁を体験。獲れたての魚介をその場でBBQにして味わう贅沢な半日プログラム。",
      category: "食", location: "三重県鳥羽市 答志島漁港", city: "鳥羽市", prefecture: "三重県",
      coverImage: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800", images: [],
      capacity: 8, price: 8000, isFree: false, daysFromNow: 18,
    },
    {
      title: "静岡・茶畑で学ぶ本格茶道体験",
      description: "富士山を望む茶畑で茶摘みから体験。摘んだ茶葉の手揉み製茶、そして茶室での正式なお点前まで。",
      category: "文化体験", location: "静岡県富士市 大淵笹場", city: "富士市", prefecture: "静岡県",
      coverImage: "https://images.unsplash.com/photo-1563911892437-1feda0179e1b?w=800", images: [],
      capacity: 12, price: 6000, isFree: false, daysFromNow: 25,
    },
    {
      title: "藍染めワークショップ — 阿波藍",
      description: "徳島の伝統工芸「阿波藍」を使った藍染め体験。ストールやTシャツに世界に一つだけの模様を染めます。",
      category: "ワークショップ", location: "徳島県徳島市 藍の館", city: "徳島市", prefecture: "徳島県",
      coverImage: "https://images.unsplash.com/photo-1576085898323-218337e3e43c?w=800", images: [],
      capacity: 16, price: 4500, isFree: false, daysFromNow: 12,
    },
    {
      title: "よさこい祭り踊り子体験",
      description: "高知のよさこい祭りに踊り子として参加する特別プログラム。衣装・鳴子貸出し、練習から本番まで完全サポート。",
      category: "祭り", location: "高知県高知市 中央公園", city: "高知市", prefecture: "高知県",
      coverImage: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800", images: [],
      capacity: 30, price: 0, isFree: true, daysFromNow: 45,
    },
    {
      title: "甲州ぶどう収穫体験＆ワインテイスティング",
      description: "ワイナリーのぶどう畑で収穫体験。その後、自社醸造ワイン5種のテイスティングとチーズプレート付き。",
      category: "食", location: "山梨県甲州市勝沼 ワイナリー", city: "甲州市", prefecture: "山梨県",
      coverImage: "https://images.unsplash.com/photo-1474722883778-792e7990302f?w=800", images: [],
      capacity: 20, price: 5000, isFree: false, daysFromNow: 30,
    },
  ];

  for (const evt of events) {
    const { daysFromNow, ...eventData } = evt;
    const eventDate = new Date(baseDate);
    eventDate.setDate(eventDate.getDate() + daysFromNow);
    await prisma.event.create({
      data: {
        ...eventData,
        date: eventDate,
        organizerId: organizer.id,
        status: "PUBLISHED",
      },
    });
    console.log(`  Created event: ${evt.title}`);
  }

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
