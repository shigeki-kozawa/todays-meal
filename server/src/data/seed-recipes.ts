import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';

interface SeedRecipe {
  name: string;
  description: string;
  ingredients: Array<{ name: string; amount: string }>;
  steps: string[];
  cookingTime: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  cuisineType: string;
  tags: string[];
  difficulty: string;
  source: string;
}

const seedRecipes: SeedRecipe[] = [
  {
    name: '豚バラとネギの塩炒め',
    description: 'シンプルで美味しい豚バラとネギの炒め物。ご飯が進む一品です。',
    ingredients: [
      { name: '豚バラ肉', amount: '200g' },
      { name: '長ネギ', amount: '2本' },
      { name: '塩', amount: '小さじ1/2' },
      { name: '黒こしょう', amount: '少々' },
      { name: 'ごま油', amount: '大さじ1' },
      { name: '鶏がらスープの素', amount: '小さじ1' },
    ],
    steps: [
      '豚バラ肉を5cm幅に切る。長ネギは斜め切りにする。',
      'フライパンにごま油を熱し、豚バラ肉を中火で炒める。',
      '豚バラ肉に火が通ったら、長ネギを加えて炒める。',
      '塩、黒こしょう、鶏がらスープの素で味付けする。',
      'ネギがしんなりしたら完成。',
    ],
    cookingTime: 15,
    calories: 450,
    protein: 18,
    fat: 35,
    carbs: 8,
    cuisineType: '中華',
    tags: ['簡単', '時短', 'ご飯に合う'],
    difficulty: '簡単',
    source: 'オリジナル',
  },
  {
    name: '麻婆豆腐',
    description: 'ピリ辛で食欲そそる本格的な麻婆豆腐。',
    ingredients: [
      { name: '豚ひき肉', amount: '150g' },
      { name: '絹ごし豆腐', amount: '1丁' },
      { name: '長ネギ', amount: '1/2本' },
      { name: 'にんにく', amount: '1片' },
      { name: '生姜', amount: '1片' },
      { name: '豆板醤', amount: '大さじ1' },
      { name: '甜麺醤', amount: '大さじ1' },
      { name: '鶏がらスープ', amount: '150ml' },
      { name: '水溶き片栗粉', amount: '適量' },
      { name: 'ごま油', amount: '大さじ1' },
    ],
    steps: [
      '豆腐は2cm角に切り、軽く水切りする。長ネギ、にんにく、生姜はみじん切りにする。',
      'フライパンにごま油、にんにく、生姜を入れて香りが出るまで炒める。',
      '豚ひき肉を加えて色が変わるまで炒める。',
      '豆板醤、甜麺醤を加えて炒め合わせる。',
      '鶏がらスープを加えて煮立たせ、豆腐を加えて5分ほど煮る。',
      '水溶き片栗粉でとろみをつけ、長ネギを散らして完成。',
    ],
    cookingTime: 20,
    calories: 400,
    protein: 22,
    fat: 25,
    carbs: 18,
    cuisineType: '中華',
    tags: ['辛い', 'ご飯に合う', '本格的'],
    difficulty: '普通',
    source: 'オリジナル',
  },
  {
    name: '鶏むね肉と長ねぎの甘辛炒め',
    description: 'ヘルシーな鶏むね肉を使った甘辛い炒め物。',
    ingredients: [
      { name: '鶏むね肉', amount: '300g' },
      { name: '長ネギ', amount: '2本' },
      { name: '醤油', amount: '大さじ2' },
      { name: 'みりん', amount: '大さじ2' },
      { name: '砂糖', amount: '大さじ1' },
      { name: '酒', amount: '大さじ1' },
      { name: 'サラダ油', amount: '大さじ1' },
    ],
    steps: [
      '鶏むね肉は一口大に切り、長ネギは斜め切りにする。',
      '調味料（醤油、みりん、砂糖、酒）を混ぜ合わせておく。',
      'フライパンに油を熱し、鶏肉を中火で焼く。',
      '鶏肉に火が通ったら、長ネギを加えて炒める。',
      '調味料を加えて全体に絡めながら炒める。',
      'とろみがついたら完成。',
    ],
    cookingTime: 15,
    calories: 350,
    protein: 35,
    fat: 12,
    carbs: 20,
    cuisineType: '和食',
    tags: ['ヘルシー', '時短', 'ご飯に合う'],
    difficulty: '簡単',
    source: 'オリジナル',
  },
  {
    name: 'ナスと豚バラの味噌炒め',
    description: 'ナスと豚バラの相性抜群な味噌炒め。',
    ingredients: [
      { name: 'ナス', amount: '3本' },
      { name: '豚バラ肉', amount: '150g' },
      { name: '味噌', amount: '大さじ2' },
      { name: '砂糖', amount: '大さじ1' },
      { name: '酒', amount: '大さじ1' },
      { name: 'みりん', amount: '大さじ1' },
      { name: 'サラダ油', amount: '大さじ2' },
    ],
    steps: [
      'ナスは乱切りにして水にさらす。豚バラ肉は3cm幅に切る。',
      '味噌、砂糖、酒、みりんを混ぜ合わせておく。',
      'フライパンに油を熱し、水気を切ったナスを炒める。',
      'ナスがしんなりしたら、豚バラ肉を加えて炒める。',
      '肉に火が通ったら、合わせた調味料を加えて全体に絡める。',
      '照りが出たら完成。',
    ],
    cookingTime: 20,
    calories: 380,
    protein: 15,
    fat: 25,
    carbs: 22,
    cuisineType: '和食',
    tags: ['ご飯に合う', '味噌味'],
    difficulty: '簡単',
    source: 'オリジナル',
  },
  {
    name: '鶏大根煮',
    description: '優しい味わいの定番和食。',
    ingredients: [
      { name: '鶏もも肉', amount: '300g' },
      { name: '大根', amount: '1/2本' },
      { name: '醤油', amount: '大さじ3' },
      { name: 'みりん', amount: '大さじ3' },
      { name: '砂糖', amount: '大さじ2' },
      { name: '酒', amount: '大さじ2' },
      { name: '水', amount: '400ml' },
      { name: '生姜', amount: '1片' },
    ],
    steps: [
      '鶏もも肉は一口大に切り、大根は2cm厚のいちょう切りにする。',
      '生姜は薄切りにする。',
      '鍋に鶏肉、大根、調味料、水を入れて中火にかける。',
      '煮立ったらアクを取り、弱火で30分煮込む。',
      '大根が柔らかくなり、味が染みたら完成。',
    ],
    cookingTime: 40,
    calories: 350,
    protein: 28,
    fat: 18,
    carbs: 20,
    cuisineType: '和食',
    tags: ['煮物', 'ほっこり'],
    difficulty: '普通',
    source: 'オリジナル',
  },
  {
    name: 'トマトパスタ',
    description: 'シンプルで美味しいトマトソースのパスタ。',
    ingredients: [
      { name: 'パスタ', amount: '200g' },
      { name: 'トマト缶', amount: '1缶' },
      { name: 'にんにく', amount: '2片' },
      { name: 'オリーブオイル', amount: '大さじ2' },
      { name: '塩', amount: '適量' },
      { name: 'バジル', amount: '適量' },
    ],
    steps: [
      'パスタを茹で始める。にんにくはみじん切りにする。',
      'フライパンにオリーブオイルとにんにくを入れて弱火で香りを出す。',
      'トマト缶を加えて中火で10分煮込む。',
      '塩で味を調える。',
      '茹で上がったパスタをソースに絡め、バジルを散らして完成。',
    ],
    cookingTime: 20,
    calories: 450,
    protein: 15,
    fat: 12,
    carbs: 70,
    cuisineType: '洋食',
    tags: ['パスタ', '簡単', 'イタリアン'],
    difficulty: '簡単',
    source: 'オリジナル',
  },
  {
    name: 'チキンカレー',
    description: 'スパイシーで本格的なチキンカレー。',
    ingredients: [
      { name: '鶏もも肉', amount: '400g' },
      { name: '玉ねぎ', amount: '2個' },
      { name: 'トマト', amount: '2個' },
      { name: 'カレールー', amount: '1/2箱' },
      { name: 'にんにく', amount: '2片' },
      { name: '生姜', amount: '1片' },
      { name: 'サラダ油', amount: '大さじ2' },
      { name: '水', amount: '500ml' },
    ],
    steps: [
      '鶏肉は一口大に切る。玉ねぎ、トマトはみじん切り、にんにく、生姜もみじん切りにする。',
      '鍋に油を熱し、にんにく、生姜を炒めて香りを出す。',
      '玉ねぎを加えて飴色になるまで炒める。',
      '鶏肉を加えて色が変わるまで炒める。',
      'トマトと水を加えて20分煮込む。',
      'カレールーを加えて溶かし、さらに10分煮込んで完成。',
    ],
    cookingTime: 45,
    calories: 550,
    protein: 30,
    fat: 28,
    carbs: 40,
    cuisineType: '洋食',
    tags: ['カレー', '本格的', 'スパイシー'],
    difficulty: '普通',
    source: 'オリジナル',
  },
  {
    name: '野菜炒め',
    description: 'シンプルで健康的な野菜炒め。',
    ingredients: [
      { name: 'キャベツ', amount: '1/4個' },
      { name: 'にんじん', amount: '1/2本' },
      { name: 'ピーマン', amount: '2個' },
      { name: 'もやし', amount: '1袋' },
      { name: '豚バラ肉', amount: '100g' },
      { name: '醤油', amount: '大さじ1' },
      { name: '塩こしょう', amount: '適量' },
      { name: 'ごま油', amount: '大さじ1' },
    ],
    steps: [
      '野菜は食べやすい大きさに切る。豚肉は3cm幅に切る。',
      'フライパンにごま油を熱し、豚肉を炒める。',
      '肉の色が変わったら、硬い野菜から順に加えて炒める。',
      '全体に火が通ったら、醤油、塩こしょうで味付けする。',
      '強火でさっと炒めて完成。',
    ],
    cookingTime: 15,
    calories: 300,
    protein: 15,
    fat: 18,
    carbs: 20,
    cuisineType: '中華',
    tags: ['ヘルシー', '野菜たっぷり', '時短'],
    difficulty: '簡単',
    source: 'オリジナル',
  },
];

export async function seedRecipeKnowledgeBase(): Promise<void> {
  const db = getDatabase();
  
  console.log('🌱 レシピナレッジベースにデータを投入中...');
  
  for (const recipe of seedRecipes) {
    const id = uuidv4();
    
    const existing = db.prepare('SELECT id FROM recipe_knowledge_base WHERE name = ?').get(recipe.name);
    if (existing) {
      console.log(`⏭️  スキップ: ${recipe.name} は既に存在します`);
      continue;
    }
    
    console.log(`📝 追加中: ${recipe.name}`);
    
    db.prepare(`
      INSERT INTO recipe_knowledge_base (
        id, name, description, ingredients, steps, cooking_time, calories,
        protein, fat, carbs, cuisine_type, tags, difficulty, source,
        image_url, source_url, source_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      recipe.name,
      recipe.description,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.steps),
      recipe.cookingTime,
      recipe.calories,
      recipe.protein,
      recipe.fat,
      recipe.carbs,
      recipe.cuisineType,
      JSON.stringify(recipe.tags),
      recipe.difficulty,
      recipe.source,
      null,
      null,
      null
    );
    
    console.log(`✅ 追加完了: ${recipe.name}`);
  }
  
  console.log('🎉 レシピデータの投入が完了しました！');
}

