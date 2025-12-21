import type { Recipe } from '../types'

export const sideDishRecipes: Record<string, Recipe> = {
  '味噌汁': {
    id: 'side-dish-miso-soup',
    name: '味噌汁',
    ingredients: [
      { name: '豆腐', amount: '1/2丁' },
      { name: 'わかめ（乾燥）', amount: '大さじ1' },
      { name: '長ネギ', amount: '1/3本' },
      { name: 'だし汁', amount: '400ml' },
      { name: '味噌', amount: '大さじ2' },
    ],
    steps: [
      '豆腐は2cm角に切り、長ネギは小口切りにする。わかめは水で戻しておく。',
      '鍋にだし汁を入れて中火にかける。',
      '沸騰したら豆腐を加えて2分ほど煮る。',
      '火を弱めて味噌を溶き入れる。',
      'わかめとネギを加えて、再び沸騰直前で火を止める。',
    ],
    cookingTime: 10,
    calories: 50,
    nutrition: {
      protein: 4,
      fat: 2,
      carbs: 5,
    },
  },
  'コーンスープ': {
    id: 'side-dish-corn-soup',
    name: 'コーンスープ',
    ingredients: [
      { name: 'コーンクリーム缶', amount: '1缶（190g）' },
      { name: '牛乳', amount: '200ml' },
      { name: '水', amount: '100ml' },
      { name: 'コンソメ', amount: '小さじ1' },
      { name: '塩こしょう', amount: '少々' },
      { name: 'クルトン', amount: '適量' },
    ],
    steps: [
      '鍋にコーンクリーム缶と水を入れて中火にかける。',
      '沸騰したら牛乳とコンソメを加える。',
      '弱火で5分ほど煮込み、塩こしょうで味を調える。',
      '器に盛り、クルトンをトッピングして完成。',
    ],
    cookingTime: 10,
    calories: 120,
    nutrition: {
      protein: 5,
      fat: 4,
      carbs: 18,
    },
  },
  'サラダ': {
    id: 'side-dish-salad',
    name: 'シーザーサラダ',
    ingredients: [
      { name: 'レタス', amount: '4枚' },
      { name: 'ミニトマト', amount: '6個' },
      { name: 'クルトン', amount: '適量' },
      { name: 'パルメザンチーズ', amount: '大さじ2' },
      { name: 'シーザードレッシング', amount: '大さじ3' },
    ],
    steps: [
      'レタスは洗って食べやすい大きさにちぎり、水気を切る。',
      'ミニトマトは半分に切る。',
      'ボウルにレタスとミニトマトを入れる。',
      'ドレッシングを加えて軽く和える。',
      '器に盛り、クルトンとパルメザンチーズをトッピングして完成。',
    ],
    cookingTime: 5,
    calories: 80,
    nutrition: {
      protein: 3,
      fat: 5,
      carbs: 6,
    },
  },
  'スープ': {
    id: 'side-dish-soup',
    name: 'コンソメスープ',
    ingredients: [
      { name: '玉ねぎ', amount: '1/4個' },
      { name: 'にんじん', amount: '1/4本' },
      { name: 'キャベツ', amount: '1枚' },
      { name: '水', amount: '400ml' },
      { name: 'コンソメ', amount: '小さじ2' },
      { name: '塩こしょう', amount: '少々' },
      { name: 'パセリ', amount: '適量' },
    ],
    steps: [
      '野菜は全て1cm角に切る。',
      '鍋に水と野菜を入れて中火にかける。',
      '沸騰したらアクを取り、弱火で10分煮込む。',
      'コンソメを加えて溶かし、塩こしょうで味を調える。',
      '器に盛り、パセリを散らして完成。',
    ],
    cookingTime: 15,
    calories: 40,
    nutrition: {
      protein: 1,
      fat: 0,
      carbs: 8,
    },
  },
}

