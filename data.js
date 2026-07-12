/* ============================================================
 * 魔法英语乐园 - 数据文件（唯一内容源）
 * 教材：人教版PEP 四年级上册 + 下册
 * 每个单元：words 单词（w英文 zh中文 e配图emoji），sents 重点句型
 * ============================================================ */

const UNITS = [
  /* ---------------- 四年级上册 ---------------- */
  {
    id: "u1", book: "四上", num: "Unit 1", name: "My Classroom", zh: "我的教室", icon: "🏫",
    words: [
      { w: "classroom", zh: "教室", e: "🏫" },
      { w: "window", zh: "窗户", e: "🪟" },
      { w: "blackboard", zh: "黑板", e: "⬛" },
      { w: "light", zh: "电灯", e: "💡" },
      { w: "picture", zh: "图画", e: "🖼️" },
      { w: "door", zh: "门", e: "🚪" },
      { w: "computer", zh: "电脑", e: "💻" },
      { w: "fan", zh: "风扇", e: "🌀" },
      { w: "wall", zh: "墙壁", e: "🧱" },
      { w: "floor", zh: "地板", e: "🟫" },
      { w: "TV", zh: "电视", e: "📺" },
      { w: "clean", zh: "打扫", e: "🧹" },
      { w: "near", zh: "在…旁边", e: "📍" },
      { w: "help", zh: "帮助", e: "🤝" }
    ],
    sents: [
      { en: "What's in the classroom?", zh: "教室里有什么？" },
      { en: "It's near the window.", zh: "它在窗户旁边。" },
      { en: "Let's clean the classroom.", zh: "我们一起打扫教室吧。" },
      { en: "Where is it?", zh: "它在哪里？" },
      { en: "Let me clean the blackboard.", zh: "让我来擦黑板。" }
    ]
  },
  {
    id: "u2", book: "四上", num: "Unit 2", name: "My Schoolbag", zh: "我的书包", icon: "🎒",
    words: [
      { w: "schoolbag", zh: "书包", e: "🎒" },
      { w: "maths book", zh: "数学书", e: "📐" },
      { w: "English book", zh: "英语书", e: "📘" },
      { w: "Chinese book", zh: "语文书", e: "📕" },
      { w: "storybook", zh: "故事书", e: "📖" },
      { w: "notebook", zh: "笔记本", e: "📓" },
      { w: "candy", zh: "糖果", e: "🍬" },
      { w: "toy", zh: "玩具", e: "🧸" },
      { w: "key", zh: "钥匙", e: "🔑" },
      { w: "lost", zh: "丢失的", e: "❓" },
      { w: "cute", zh: "可爱的", e: "🥰" }
    ],
    sents: [
      { en: "What's in your schoolbag?", zh: "你的书包里有什么？" },
      { en: "I have an English book.", zh: "我有一本英语书。" },
      { en: "What colour is it?", zh: "它是什么颜色的？" },
      { en: "It's blue and white.", zh: "它是蓝白相间的。" }
    ]
  },
  {
    id: "u3", book: "四上", num: "Unit 3", name: "My Friends", zh: "我的朋友", icon: "👭",
    words: [
      { w: "strong", zh: "强壮的", e: "💪" },
      { w: "friendly", zh: "友好的", e: "🤗" },
      { w: "quiet", zh: "安静的", e: "🤫" },
      { w: "hair", zh: "头发", e: "💇‍♀️" },
      { w: "shoe", zh: "鞋子", e: "👟" },
      { w: "glasses", zh: "眼镜", e: "👓" },
      { w: "hat", zh: "帽子", e: "👒" },
      { w: "tall", zh: "高的", e: "🦒" },
      { w: "short", zh: "矮的", e: "🍄" },
      { w: "long", zh: "长的", e: "📏" },
      { w: "friend", zh: "朋友", e: "🫶" }
    ],
    sents: [
      { en: "What's his name?", zh: "他叫什么名字？" },
      { en: "His name is Zhang Peng.", zh: "他的名字叫张鹏。" },
      { en: "He's tall and strong.", zh: "他又高又壮。" },
      { en: "She has long hair.", zh: "她有一头长发。" },
      { en: "My friend is quiet.", zh: "我的朋友很文静。" }
    ]
  },
  {
    id: "u4", book: "四上", num: "Unit 4", name: "My Home", zh: "我的家", icon: "🏠",
    words: [
      { w: "bedroom", zh: "卧室", e: "🛏️" },
      { w: "living room", zh: "客厅", e: "🛋️" },
      { w: "study", zh: "书房", e: "📚" },
      { w: "kitchen", zh: "厨房", e: "🍳" },
      { w: "bathroom", zh: "浴室", e: "🛁" },
      { w: "bed", zh: "床", e: "🛌" },
      { w: "phone", zh: "电话", e: "📱" },
      { w: "table", zh: "桌子", e: "🪑" },
      { w: "sofa", zh: "沙发", e: "🪄" },
      { w: "fridge", zh: "冰箱", e: "🧊" },
      { w: "find", zh: "找到", e: "🔍" }
    ],
    sents: [
      { en: "Is she in the living room?", zh: "她在客厅里吗？" },
      { en: "Where are the keys?", zh: "钥匙在哪里？" },
      { en: "They're on the table.", zh: "它们在桌子上。" },
      { en: "Open the door, please.", zh: "请打开门。" }
    ]
  },
  {
    id: "u5", book: "四上", num: "Unit 5", name: "Dinner's Ready", zh: "开饭啦", icon: "🍽️",
    words: [
      { w: "beef", zh: "牛肉", e: "🥩" },
      { w: "chicken", zh: "鸡肉", e: "🍗" },
      { w: "noodles", zh: "面条", e: "🍜" },
      { w: "soup", zh: "汤", e: "🍲" },
      { w: "vegetable", zh: "蔬菜", e: "🥦" },
      { w: "chopsticks", zh: "筷子", e: "🥢" },
      { w: "bowl", zh: "碗", e: "🥣" },
      { w: "fork", zh: "叉子", e: "🍴" },
      { w: "knife", zh: "刀", e: "🔪" },
      { w: "spoon", zh: "勺子", e: "🥄" },
      { w: "bread", zh: "面包", e: "🍞" },
      { w: "rice", zh: "米饭", e: "🍚" }
    ],
    sents: [
      { en: "What would you like for dinner?", zh: "晚餐你想吃什么？" },
      { en: "I'd like some soup and bread.", zh: "我想要一些汤和面包。" },
      { en: "Would you like a knife and fork?", zh: "你想要刀叉吗？" },
      { en: "Help yourself.", zh: "请随便吃。" },
      { en: "Dinner's ready!", zh: "开饭啦！" }
    ]
  },
  {
    id: "u6", book: "四上", num: "Unit 6", name: "Meet My Family", zh: "认识我的家人", icon: "👨‍👩‍👧",
    words: [
      { w: "parents", zh: "父母", e: "👫" },
      { w: "uncle", zh: "叔叔", e: "👨" },
      { w: "aunt", zh: "婶婶；姨母", e: "👩‍🦰" },
      { w: "baby brother", zh: "小弟弟", e: "👶" },
      { w: "doctor", zh: "医生", e: "👩‍⚕️" },
      { w: "cook", zh: "厨师", e: "👨‍🍳" },
      { w: "driver", zh: "司机", e: "🚗" },
      { w: "farmer", zh: "农民", e: "👨‍🌾" },
      { w: "nurse", zh: "护士", e: "🩺" },
      { w: "basketball player", zh: "篮球运动员", e: "🏀" },
      { w: "football player", zh: "足球运动员", e: "⚽" },
      { w: "family", zh: "家庭", e: "👨‍👩‍👧‍👦" }
    ],
    sents: [
      { en: "How many people are there in your family?", zh: "你家有几口人？" },
      { en: "My family has six people.", zh: "我家有六口人。" },
      { en: "What's your father's job?", zh: "你爸爸是做什么工作的？" },
      { en: "He's a doctor.", zh: "他是一名医生。" },
      { en: "My aunt is a nurse.", zh: "我的姨母是一名护士。" }
    ]
  },
  /* ---------------- 四年级下册 ---------------- */
  {
    id: "d1", book: "四下", num: "Unit 1", name: "My School", zh: "我的学校", icon: "🏫",
    words: [
      { w: "first floor", zh: "一楼", e: "1️⃣" },
      { w: "second floor", zh: "二楼", e: "2️⃣" },
      { w: "teachers' office", zh: "教师办公室", e: "🧑‍🏫" },
      { w: "library", zh: "图书馆", e: "📚" },
      { w: "playground", zh: "操场", e: "🛝" },
      { w: "computer room", zh: "计算机房", e: "💻" },
      { w: "art room", zh: "美术教室", e: "🎨" },
      { w: "music room", zh: "音乐教室", e: "🎵" },
      { w: "garden", zh: "花园", e: "🌷" },
      { w: "homework", zh: "作业", e: "📝" },
      { w: "forty", zh: "四十", e: "🔢" }
    ],
    sents: [
      { en: "Where's the teachers' office?", zh: "教师办公室在哪里？" },
      { en: "It's on the second floor.", zh: "它在二楼。" },
      { en: "Is this the library?", zh: "这是图书馆吗？" },
      { en: "Yes, it is.", zh: "是的，它是。" },
      { en: "The art room is on the first floor.", zh: "美术教室在一楼。" }
    ]
  },
  {
    id: "d2", book: "四下", num: "Unit 2", name: "What Time Is It?", zh: "几点了", icon: "⏰",
    words: [
      { w: "breakfast", zh: "早餐", e: "🥞" },
      { w: "lunch", zh: "午餐", e: "🍱" },
      { w: "dinner", zh: "晚餐", e: "🍽️" },
      { w: "English class", zh: "英语课", e: "🔤" },
      { w: "music class", zh: "音乐课", e: "🎶" },
      { w: "PE class", zh: "体育课", e: "🏃" },
      { w: "get up", zh: "起床", e: "🌅" },
      { w: "go to school", zh: "去上学", e: "🚸" },
      { w: "go home", zh: "回家", e: "🏡" },
      { w: "go to bed", zh: "上床睡觉", e: "😴" },
      { w: "o'clock", zh: "…点钟", e: "🕐" },
      { w: "time", zh: "时间", e: "⏳" }
    ],
    sents: [
      { en: "What time is it?", zh: "现在几点了？" },
      { en: "It's nine o'clock.", zh: "现在九点了。" },
      { en: "It's time for English class.", zh: "该上英语课了。" },
      { en: "It's time to go to school.", zh: "该去上学了。" },
      { en: "Hurry up!", zh: "快点！" }
    ]
  },
  {
    id: "d3", book: "四下", num: "Unit 3", name: "Weather", zh: "天气", icon: "🌤️",
    words: [
      { w: "cold", zh: "寒冷的", e: "🥶" },
      { w: "cool", zh: "凉爽的", e: "🍃" },
      { w: "warm", zh: "温暖的", e: "🌸" },
      { w: "hot", zh: "炎热的", e: "🥵" },
      { w: "sunny", zh: "晴朗的", e: "☀️" },
      { w: "windy", zh: "有风的", e: "💨" },
      { w: "cloudy", zh: "多云的", e: "☁️" },
      { w: "snowy", zh: "下雪的", e: "❄️" },
      { w: "rainy", zh: "下雨的", e: "🌧️" },
      { w: "weather", zh: "天气", e: "🌤️" },
      { w: "outside", zh: "外面", e: "🏞️" },
      { w: "fly a kite", zh: "放风筝", e: "🪁" }
    ],
    sents: [
      { en: "What's the weather like in Beijing?", zh: "北京的天气怎么样？" },
      { en: "It's rainy today.", zh: "今天下雨。" },
      { en: "Can I go outside?", zh: "我能出去玩吗？" },
      { en: "Yes, you can.", zh: "是的，你可以。" },
      { en: "It's cold outside.", zh: "外面很冷。" }
    ]
  },
  {
    id: "d4", book: "四下", num: "Unit 4", name: "At the Farm", zh: "在农场", icon: "🚜",
    words: [
      { w: "tomato", zh: "西红柿", e: "🍅" },
      { w: "potato", zh: "土豆", e: "🥔" },
      { w: "green beans", zh: "豆角", e: "🫛" },
      { w: "carrot", zh: "胡萝卜", e: "🥕" },
      { w: "horse", zh: "马", e: "🐴" },
      { w: "cow", zh: "奶牛", e: "🐮" },
      { w: "sheep", zh: "绵羊", e: "🐑" },
      { w: "hen", zh: "母鸡", e: "🐔" },
      { w: "goat", zh: "山羊", e: "🐐" },
      { w: "farm", zh: "农场", e: "🚜" },
      { w: "animal", zh: "动物", e: "🐾" }
    ],
    sents: [
      { en: "What are these?", zh: "这些是什么？" },
      { en: "They're tomatoes.", zh: "它们是西红柿。" },
      { en: "Are these carrots?", zh: "这些是胡萝卜吗？" },
      { en: "Yes, they are.", zh: "是的，它们是。" },
      { en: "What are those?", zh: "那些是什么？" },
      { en: "They're horses.", zh: "它们是马。" }
    ]
  },
  {
    id: "d5", book: "四下", num: "Unit 5", name: "My Clothes", zh: "我的衣服", icon: "👗",
    words: [
      { w: "clothes", zh: "衣服", e: "👚" },
      { w: "pants", zh: "裤子", e: "👖" },
      { w: "dress", zh: "连衣裙", e: "👗" },
      { w: "skirt", zh: "短裙", e: "💃" },
      { w: "coat", zh: "外套", e: "🧥" },
      { w: "sweater", zh: "毛衣", e: "🧶" },
      { w: "sock", zh: "袜子", e: "🧦" },
      { w: "shorts", zh: "短裤", e: "🩳" },
      { w: "shirt", zh: "衬衫", e: "👔" },
      { w: "whose", zh: "谁的", e: "❔" },
      { w: "mine", zh: "我的", e: "🙋‍♀️" }
    ],
    sents: [
      { en: "Whose coat is this?", zh: "这是谁的外套？" },
      { en: "It's mine.", zh: "是我的。" },
      { en: "Whose pants are those?", zh: "那条裤子是谁的？" },
      { en: "They're your father's.", zh: "是你爸爸的。" },
      { en: "I like this dress.", zh: "我喜欢这条连衣裙。" }
    ]
  },
  {
    id: "d6", book: "四下", num: "Unit 6", name: "Shopping", zh: "购物", icon: "🛍️",
    words: [
      { w: "gloves", zh: "手套", e: "🧤" },
      { w: "scarf", zh: "围巾", e: "🧣" },
      { w: "umbrella", zh: "雨伞", e: "☂️" },
      { w: "sunglasses", zh: "太阳镜", e: "🕶️" },
      { w: "pretty", zh: "漂亮的", e: "🌺" },
      { w: "expensive", zh: "昂贵的", e: "💎" },
      { w: "cheap", zh: "便宜的", e: "🏷️" },
      { w: "nice", zh: "好看的", e: "👍" },
      { w: "size", zh: "尺码", e: "📏" },
      { w: "try on", zh: "试穿", e: "👠" },
      { w: "shopping", zh: "购物", e: "🛍️" }
    ],
    sents: [
      { en: "Can I help you?", zh: "我能帮您吗？" },
      { en: "How much is this dress?", zh: "这条连衣裙多少钱？" },
      { en: "It's eighty-nine yuan.", zh: "八十九元。" },
      { en: "It's too expensive!", zh: "太贵了！" },
      { en: "I'll take it.", zh: "我买了。" },
      { en: "Can I try them on?", zh: "我能试穿一下吗？" }
    ]
  }
];

/* 扭蛋贴纸库：r=稀有度 1普通 2稀有 3传说 */
const STICKERS = [
  { n: "草莓甜甜", e: "🍓", r: 1 }, { n: "棒棒糖", e: "🍭", r: 1 },
  { n: "纸杯蛋糕", e: "🧁", r: 1 }, { n: "甜甜圈", e: "🍩", r: 1 },
  { n: "小饼干", e: "🍪", r: 1 }, { n: "郁金香", e: "🌷", r: 1 },
  { n: "小雏菊", e: "🌼", r: 1 }, { n: "四叶草", e: "🍀", r: 1 },
  { n: "蝴蝶结", e: "🎀", r: 1 }, { n: "小气球", e: "🎈", r: 1 },
  { n: "小星星", e: "⭐", r: 1 }, { n: "月亮船", e: "🌙", r: 1 },
  { n: "小瓢虫", e: "🐞", r: 1 }, { n: "小蜜蜂", e: "🐝", r: 1 },
  { n: "花蝴蝶", e: "🦋", r: 1 }, { n: "小丑鱼", e: "🐠", r: 1 },
  { n: "月兔", e: "🐰", r: 2 }, { n: "胖达", e: "🐼", r: 2 },
  { n: "考拉宝宝", e: "🐨", r: 2 }, { n: "小狐狸", e: "🦊", r: 2 },
  { n: "企鹅蛋蛋", e: "🐧", r: 2 }, { n: "白天鹅", e: "🦢", r: 2 },
  { n: "彩虹桥", e: "🌈", r: 2 }, { n: "旋转木马", e: "🎠", r: 2 },
  { n: "梦幻城堡", e: "🏰", r: 2 }, { n: "泰迪熊", e: "🧸", r: 2 },
  { n: "摩天轮", e: "🎡", r: 2 }, { n: "小樱桃", e: "🍒", r: 2 },
  { n: "水晶球", e: "🔮", r: 2 },
  { n: "彩虹独角兽", e: "🦄", r: 3 }, { n: "小美人鱼", e: "🧜‍♀️", r: 3 },
  { n: "仙女婷婷", e: "🧚", r: 3 }, { n: "公主皇冠", e: "👑", r: 3 },
  { n: "魔法棒", e: "🪄", r: 3 }, { n: "幸运小龙", e: "🐉", r: 3 },
  { n: "星光宝石", e: "💠", r: 3 }, { n: "超新星", e: "🌟", r: 3 }
];

/* 宠物成长线：xp达到阈值即进化 */
const PET_STAGES = [
  { xp: 0, e: "🥚", n: "神秘蛋" },
  { xp: 30, e: "🐣", n: "破壳小啾" },
  { xp: 100, e: "🐥", n: "毛球啾啾" },
  { xp: 300, e: "🦢", n: "优雅天鹅" },
  { xp: 700, e: "🦩", n: "火烈鸟公主" },
  { xp: 1500, e: "🦄", n: "彩虹独角兽" }
];

/* 点宠物时的英语鼓励（顺带磨耳朵） */
const PRAISES = [
  { en: "Great job!", zh: "干得漂亮！" },
  { en: "You are amazing!", zh: "你太棒了！" },
  { en: "Keep going!", zh: "继续加油！" },
  { en: "Wonderful!", zh: "好极了！" },
  { en: "I believe in you!", zh: "我相信你！" },
  { en: "You are a super star!", zh: "你是超级明星！" }
];
