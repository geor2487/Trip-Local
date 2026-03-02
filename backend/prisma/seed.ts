import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcryptjs from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // テストユーザー
  const passwordHash = await bcryptjs.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "test@triplocal.jp" },
    update: {},
    create: {
      email: "test@triplocal.jp",
      passwordHash,
      name: "テスト太郎",
      role: "USER",
    },
  });

  // オーナーユーザー
  const owner = await prisma.user.upsert({
    where: { email: "owner@triplocal.jp" },
    update: {},
    create: {
      email: "owner@triplocal.jp",
      passwordHash,
      name: "宿オーナー花子",
      role: "OWNER",
    },
  });

  // 施設データ
  const accommodations = [
    {
      name: "古民家ゲストハウス 里山",
      description: "築100年の古民家をリノベーションした温かみのあるゲストハウス。里山の自然に囲まれた静かな環境で、日本の原風景をお楽しみいただけます。地元の食材を使った朝食付き。",
      address: "長野県安曇野市穂高有明7575",
      city: "安曇野市",
      prefecture: "長野県",
      zipCode: "399-8301",
      coverImage: "https://images.unsplash.com/photo-1741851373855-5fb305ee6d70?w=800",
      images: [
        "https://images.unsplash.com/photo-1741851373855-5fb305ee6d70?w=800",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
        "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800",
        "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800",
        "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800",
      ],
      amenities: ["Wi-Fi", "駐車場", "朝食付き", "囲炉裏", "縁側", "庭園"],
      rooms: [
        { name: "和室 八畳（松の間）", capacity: 3, pricePerNight: 12000 },
        { name: "和室 十畳（竹の間）", capacity: 4, pricePerNight: 15000 },
        { name: "メゾネット（梅の間）", capacity: 2, pricePerNight: 18000 },
      ],
    },
    {
      name: "海辺のコテージ 潮風",
      description: "太平洋を一望できるプライベートコテージ。波音を聴きながら過ごす贅沢な時間。BBQ設備完備で、地元の新鮮な海の幸をお楽しみいただけます。",
      address: "高知県土佐清水市足摺岬1350",
      city: "土佐清水市",
      prefecture: "高知県",
      zipCode: "787-0315",
      coverImage: "https://images.unsplash.com/photo-1753711440542-d1f48173fdc5?w=800",
      images: [
        "https://images.unsplash.com/photo-1753711440542-d1f48173fdc5?w=800",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
        "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800",
      ],
      amenities: ["Wi-Fi", "駐車場", "BBQ", "オーシャンビュー", "テラス", "キッチン"],
      rooms: [
        { name: "スタンダードコテージ", capacity: 4, pricePerNight: 20000 },
        { name: "プレミアムコテージ", capacity: 6, pricePerNight: 30000 },
      ],
    },
    {
      name: "温泉旅館 山桜庵",
      description: "源泉かけ流しの露天風呂と、四季折々の懐石料理でおもてなし。客室からは桜並木と遠くに富士山を望む絶景。心も体も癒される至福のひとときを。",
      address: "静岡県伊豆市修善寺940",
      city: "伊豆市",
      prefecture: "静岡県",
      zipCode: "410-2416",
      coverImage: "https://images.unsplash.com/photo-1644413638617-02369c89c156?w=800",
      images: [
        "https://images.unsplash.com/photo-1644413638617-02369c89c156?w=800",
        "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800",
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800",
      ],
      amenities: ["Wi-Fi", "露天風呂", "大浴場", "懐石料理", "送迎", "ラウンジ"],
      rooms: [
        { name: "スタンダード和室", capacity: 2, pricePerNight: 25000 },
        { name: "露天風呂付き特別室", capacity: 2, pricePerNight: 45000 },
        { name: "ファミリー和洋室", capacity: 5, pricePerNight: 35000 },
      ],
    },
    {
      name: "農家民泊 田んぼの宿",
      description: "現役の農家が営む田園に佇む民泊。季節ごとの農業体験、手作り味噌づくりなど、日本の里山の暮らしをまるごと体験できます。",
      address: "新潟県南魚沼市六日町180",
      city: "南魚沼市",
      prefecture: "新潟県",
      zipCode: "949-6611",
      coverImage: "https://images.unsplash.com/photo-1549888722-bf34acd6a68c?w=800",
      images: [
        "https://images.unsplash.com/photo-1549888722-bf34acd6a68c?w=800",
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
        "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      ],
      amenities: ["Wi-Fi", "駐車場", "農業体験", "自家製朝食", "囲炉裏", "餅つき体験"],
      rooms: [
        { name: "和室（稲穂の間）", capacity: 3, pricePerNight: 8000 },
        { name: "和室（山霧の間）", capacity: 4, pricePerNight: 10000 },
      ],
    },
  ];

  for (const accom of accommodations) {
    const { rooms, ...accomData } = accom;
    const created = await prisma.accommodation.create({
      data: {
        ...accomData,
        ownerId: owner.id,
        status: "PUBLISHED",
      },
    });

    for (const room of rooms) {
      const createdRoom = await prisma.room.create({
        data: { ...room, accommodationId: created.id },
      });

      // 今後3ヶ月分の Availability レコードを作成
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        await prisma.availability.create({
          data: { roomId: createdRoom.id, date, isBlocked: false },
        });
      }
    }

    console.log(`  Created: ${accom.name}`);
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
