/* ============================================================
 * 魔法英语乐园 - 数据文件（唯一内容源）
 * 教材：人教版PEP 四年级上册 + 下册
 * 每个单元：words 单词（w英文 zh中文 e配图emoji），sents 重点句型
 * ============================================================ */

const UNITS = [
  /* ---------------- 低年级基础（一二年级通用词，暑假复习用）----------------
     说明：人教版PEP是「三年级起点」，二年级没有官方英语教材。
     所以这里收的是各版本二年级共有的基础词：字母认读之外的高频词。 */
  {
    id: "b1", book: "二年级", num: "基础 1", name: "Numbers & Colours", zh: "数字与颜色", icon: "🔢",
    words: [
      { w: "one", zh: "一", e: "1️⃣" }, { w: "two", zh: "二", e: "2️⃣" },
      { w: "three", zh: "三", e: "3️⃣" }, { w: "four", zh: "四", e: "4️⃣" },
      { w: "five", zh: "五", e: "5️⃣" }, { w: "six", zh: "六", e: "6️⃣" },
      { w: "seven", zh: "七", e: "7️⃣" }, { w: "eight", zh: "八", e: "8️⃣" },
      { w: "nine", zh: "九", e: "9️⃣" }, { w: "ten", zh: "十", e: "🔟" },
      { w: "red", zh: "红色", e: "🔴" }, { w: "yellow", zh: "黄色", e: "🟡" },
      { w: "blue", zh: "蓝色", e: "🔵" }, { w: "green", zh: "绿色", e: "🟢" },
      { w: "black", zh: "黑色", e: "⚫" }, { w: "white", zh: "白色", e: "⚪" }
    ],
    sents: [
      { en: "How many?", zh: "有多少个？" },
      { en: "What colour is it?", zh: "它是什么颜色？" },
      { en: "It's red.", zh: "它是红色的。" }
    ]
  },
  {
    id: "b2", book: "二年级", num: "基础 2", name: "My Body & Family", zh: "身体与家人", icon: "👦",
    words: [
      { w: "head", zh: "头", e: "🗣️" }, { w: "eye", zh: "眼睛", e: "👁️" },
      { w: "ear", zh: "耳朵", e: "👂" }, { w: "nose", zh: "鼻子", e: "👃" },
      { w: "mouth", zh: "嘴巴", e: "👄" }, { w: "hand", zh: "手", e: "✋" },
      { w: "foot", zh: "脚", e: "🦶" }, { w: "arm", zh: "胳膊", e: "💪" },
      { w: "father", zh: "爸爸", e: "👨" }, { w: "mother", zh: "妈妈", e: "👩" },
      { w: "brother", zh: "哥哥；弟弟", e: "👦" }, { w: "sister", zh: "姐姐；妹妹", e: "👧" },
      { w: "grandpa", zh: "爷爷", e: "👴" }, { w: "grandma", zh: "奶奶", e: "👵" },
      { w: "me", zh: "我", e: "🙋" }
    ],
    sents: [
      { en: "This is my father.", zh: "这是我的爸爸。" },
      { en: "Touch your nose.", zh: "摸摸你的鼻子。" },
      { en: "Who is she?", zh: "她是谁？" }
    ]
  },
  /* ---------------- 三年级上册 ---------------- */
  {
    id: "t1", book: "三上", num: "Unit 1", name: "Hello!", zh: "你好", icon: "👋",
    words: [
      { w: "pen", zh: "钢笔", e: "🖊️" }, { w: "pencil", zh: "铅笔", e: "✏️" },
      { w: "pencil box", zh: "铅笔盒", e: "🧰" }, { w: "ruler", zh: "尺子", e: "📏" },
      { w: "eraser", zh: "橡皮", e: "🧽" }, { w: "crayon", zh: "蜡笔", e: "🖍️" },
      { w: "bag", zh: "书包", e: "🎒" }, { w: "school", zh: "学校", e: "🏫" },
      { w: "book", zh: "书", e: "📕" }
    ],
    sents: [
      { en: "Hello! I'm Wu Yifan.", zh: "你好！我是吴一凡。" },
      { en: "What's your name?", zh: "你叫什么名字？" },
      { en: "Goodbye!", zh: "再见！" }
    ]
  },
  {
    id: "t2", book: "三上", num: "Unit 2", name: "Colours", zh: "颜色", icon: "🎨",
    words: [
      { w: "brown", zh: "棕色", e: "🟤" }, { w: "orange", zh: "橙色", e: "🟠" },
      { w: "purple", zh: "紫色", e: "🟣" }, { w: "pink", zh: "粉色", e: "🌸" },
      { w: "colour", zh: "颜色", e: "🎨" }, { w: "paint", zh: "涂色", e: "🖌️" },
      { w: "balloon", zh: "气球", e: "🎈" }, { w: "rainbow", zh: "彩虹", e: "🌈" }
    ],
    sents: [
      { en: "I see red.", zh: "我看见红色。" },
      { en: "Colour it brown.", zh: "把它涂成棕色。" },
      { en: "Look at the rainbow!", zh: "看那道彩虹！" }
    ]
  },
  {
    id: "t3", book: "三上", num: "Unit 3", name: "Look at Me!", zh: "看看我", icon: "🙋",
    words: [
      { w: "face", zh: "脸", e: "😊" }, { w: "leg", zh: "腿", e: "🦵" },
      { w: "body", zh: "身体", e: "🧍" }, { w: "finger", zh: "手指", e: "☝️" },
      { w: "hair", zh: "头发", e: "💇" }, { w: "smile", zh: "微笑", e: "😄" },
      { w: "cry", zh: "哭", e: "😭" }, { w: "clap", zh: "拍手", e: "👏" }
    ],
    sents: [
      { en: "Look at me!", zh: "看看我！" },
      { en: "Clap your hands.", zh: "拍拍你的手。" },
      { en: "This is my body.", zh: "这是我的身体。" }
    ]
  },
  {
    id: "t4", book: "三上", num: "Unit 4", name: "We Love Animals", zh: "我们爱动物", icon: "🐾",
    words: [
      { w: "cat", zh: "猫", e: "🐱" }, { w: "dog", zh: "狗", e: "🐶" },
      { w: "monkey", zh: "猴子", e: "🐵" }, { w: "panda", zh: "熊猫", e: "🐼" },
      { w: "rabbit", zh: "兔子", e: "🐰" }, { w: "duck", zh: "鸭子", e: "🦆" },
      { w: "pig", zh: "猪", e: "🐷" }, { w: "bird", zh: "鸟", e: "🐦" },
      { w: "bear", zh: "熊", e: "🐻" }, { w: "elephant", zh: "大象", e: "🐘" },
      { w: "tiger", zh: "老虎", e: "🐯" }, { w: "zoo", zh: "动物园", e: "🦁" }
    ],
    sents: [
      { en: "Look! It's a panda.", zh: "看！是一只熊猫。" },
      { en: "I like animals.", zh: "我喜欢动物。" },
      { en: "What is it?", zh: "它是什么？" }
    ]
  },
  {
    id: "t5", book: "三上", num: "Unit 5", name: "Let's Eat!", zh: "一起吃吧", icon: "🍽️",
    words: [
      { w: "bread", zh: "面包", e: "🍞" }, { w: "juice", zh: "果汁", e: "🧃" },
      { w: "egg", zh: "鸡蛋", e: "🥚" }, { w: "milk", zh: "牛奶", e: "🥛" },
      { w: "water", zh: "水", e: "💧" }, { w: "cake", zh: "蛋糕", e: "🎂" },
      { w: "fish", zh: "鱼", e: "🐟" }, { w: "hamburger", zh: "汉堡", e: "🍔" },
      { w: "hungry", zh: "饿的", e: "😋" }
    ],
    sents: [
      { en: "I'd like some juice, please.", zh: "我想要一些果汁。" },
      { en: "Have some bread.", zh: "吃点面包吧。" },
      { en: "I'm hungry.", zh: "我饿了。" }
    ]
  },
  {
    id: "t6", book: "三上", num: "Unit 6", name: "Happy Birthday!", zh: "生日快乐", icon: "🎂",
    words: [
      { w: "doll", zh: "洋娃娃", e: "🪆" }, { w: "ball", zh: "球", e: "⚽" },
      { w: "boat", zh: "小船", e: "⛵" }, { w: "car", zh: "小汽车", e: "🚗" },
      { w: "kite", zh: "风筝", e: "🪁" }, { w: "plane", zh: "飞机", e: "✈️" },
      { w: "gift", zh: "礼物", e: "🎁" }, { w: "candle", zh: "蜡烛", e: "🕯️" },
      { w: "old", zh: "…岁的", e: "🎊" }
    ],
    sents: [
      { en: "Happy birthday!", zh: "生日快乐！" },
      { en: "How old are you?", zh: "你几岁了？" },
      { en: "I'm nine years old.", zh: "我九岁了。" }
    ]
  },
  /* ---------------- 三年级下册 ---------------- */
  {
    id: "x1", book: "三下", num: "Unit 1", name: "Welcome Back to School", zh: "欢迎回到学校", icon: "🏫",
    words: [
      { w: "China", zh: "中国", e: "🇨🇳" }, { w: "Canada", zh: "加拿大", e: "🍁" },
      { w: "the UK", zh: "英国", e: "🎡" }, { w: "the USA", zh: "美国", e: "🗽" },
      { w: "student", zh: "学生", e: "🧑‍🎓" }, { w: "teacher", zh: "老师", e: "🧑‍🏫" },
      { w: "boy", zh: "男孩", e: "👦" }, { w: "girl", zh: "女孩", e: "👧" },
      { w: "new", zh: "新的", e: "✨" }
    ],
    sents: [
      { en: "Welcome back to school!", zh: "欢迎回到学校！" },
      { en: "I'm from China.", zh: "我来自中国。" },
      { en: "We have a new friend.", zh: "我们有一位新朋友。" }
    ]
  },
  {
    id: "x2", book: "三下", num: "Unit 2", name: "My Family", zh: "我的家人", icon: "👨‍👩‍👧",
    words: [
      { w: "man", zh: "男人", e: "🧔" }, { w: "woman", zh: "女人", e: "👩‍🦰" },
      { w: "dad", zh: "爸爸", e: "👨" }, { w: "mom", zh: "妈妈", e: "👩" },
      { w: "grandmother", zh: "祖母", e: "👵" }, { w: "grandfather", zh: "祖父", e: "👴" },
      { w: "family", zh: "家庭", e: "🏠" }, { w: "friend", zh: "朋友", e: "🫶" }
    ],
    sents: [
      { en: "Who's that man?", zh: "那个男人是谁？" },
      { en: "He's my father.", zh: "他是我的爸爸。" },
      { en: "This is my family.", zh: "这是我的家人。" }
    ]
  },
  {
    id: "x3", book: "三下", num: "Unit 3", name: "At the Zoo", zh: "在动物园", icon: "🦒",
    words: [
      { w: "giraffe", zh: "长颈鹿", e: "🦒" }, { w: "fat", zh: "胖的", e: "🐷" },
      { w: "thin", zh: "瘦的", e: "🦩" }, { w: "big", zh: "大的", e: "🐘" },
      { w: "small", zh: "小的", e: "🐜" }, { w: "so", zh: "如此", e: "😮" },
      { w: "children", zh: "孩子们", e: "🧒" }
    ],
    sents: [
      { en: "It has a long nose.", zh: "它有一个长鼻子。" },
      { en: "Look at that giraffe.", zh: "看那只长颈鹿。" },
      { en: "It's so tall!", zh: "它好高啊！" }
    ]
  },
  {
    id: "x4", book: "三下", num: "Unit 4", name: "Where Is My Car?", zh: "我的小汽车在哪里", icon: "🚗",
    words: [
      { w: "on", zh: "在…上面", e: "⬆️" }, { w: "in", zh: "在…里面", e: "📦" },
      { w: "under", zh: "在…下面", e: "⬇️" }, { w: "chair", zh: "椅子", e: "🪑" },
      { w: "desk", zh: "书桌", e: "🖥️" }, { w: "cap", zh: "帽子", e: "🧢" },
      { w: "box", zh: "盒子", e: "🎁" }, { w: "toy", zh: "玩具", e: "🧸" }
    ],
    sents: [
      { en: "Where is my car?", zh: "我的小汽车在哪里？" },
      { en: "It's under the chair.", zh: "它在椅子下面。" },
      { en: "Is it in your bag?", zh: "它在你的书包里吗？" }
    ]
  },
  {
    id: "x5", book: "三下", num: "Unit 5", name: "Do You Like Pears?", zh: "你喜欢梨吗", icon: "🍐",
    words: [
      { w: "pear", zh: "梨", e: "🍐" }, { w: "apple", zh: "苹果", e: "🍎" },
      { w: "banana", zh: "香蕉", e: "🍌" }, { w: "watermelon", zh: "西瓜", e: "🍉" },
      { w: "strawberry", zh: "草莓", e: "🍓" }, { w: "grape", zh: "葡萄", e: "🍇" },
      { w: "peach", zh: "桃子", e: "🍑" }, { w: "buy", zh: "买", e: "🛒" }
    ],
    sents: [
      { en: "Do you like pears?", zh: "你喜欢梨吗？" },
      { en: "Yes, I do.", zh: "是的，我喜欢。" },
      { en: "I like apples very much.", zh: "我非常喜欢苹果。" }
    ]
  },
  {
    id: "x6", book: "三下", num: "Unit 6", name: "How Many?", zh: "有多少", icon: "🔢",
    words: [
      { w: "eleven", zh: "十一", e: "🕚" }, { w: "twelve", zh: "十二", e: "🕛" },
      { w: "thirteen", zh: "十三", e: "🎂" }, { w: "fifteen", zh: "十五", e: "🌕" },
      { w: "twenty", zh: "二十", e: "💯" }, { w: "beautiful", zh: "美丽的", e: "🌷" },
      { w: "open", zh: "打开", e: "📂" }, { w: "sister", zh: "姐妹", e: "👧" }
    ],
    sents: [
      { en: "How many kites do you see?", zh: "你看见多少只风筝？" },
      { en: "I see twelve.", zh: "我看见十二只。" },
      { en: "Open it and see!", zh: "打开看看！" }
    ]
  },
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

/* ============================================================
 * 自然拼读 Phonics（对应教材 Let's spell 板块）
 * 前4条=魔法e规则(四上)，后4条=元音字母组合(四下)
 * re: 用于把规则字母挖空的正则；words 里每个词都必须能匹配
 * ============================================================ */
const PHONICS = [
  {
    id: "ph1", label: "a-e", ipa: "/eɪ/", book: "四上", icon: "🎂",
    tip: "单词末尾有个不发音的「魔法 e」，它会让前面的 a 读出字母本来的名字 /eɪ/。",
    re: "a([b-df-hj-np-tv-z]+)e$",
    words: [
      { w: "cake", zh: "蛋糕", e: "🎂", ipa: "/keɪk/", syl: ["cake"] }, { w: "name", zh: "名字", e: "📛", ipa: "/neɪm/", syl: ["name"] },
      { w: "face", zh: "脸", e: "😊", ipa: "/feɪs/", syl: ["face"] }, { w: "lake", zh: "湖", e: "🏞️", ipa: "/leɪk/", syl: ["lake"] },
      { w: "game", zh: "游戏", e: "🎮", ipa: "/ɡeɪm/", syl: ["game"] }, { w: "gate", zh: "大门", e: "🚧", ipa: "/ɡeɪt/", syl: ["gate"] },
      { w: "plane", zh: "飞机", e: "✈️", ipa: "/pleɪn/", syl: ["plane"] }, { w: "grape", zh: "葡萄", e: "🍇", ipa: "/ɡreɪp/", syl: ["grape"] }
    ]
  },
  {
    id: "ph2", label: "i-e", ipa: "/aɪ/", book: "四上", icon: "🪁",
    tip: "魔法 e 在末尾，前面的 i 就读 /aɪ/，像「爱」的音。",
    re: "i([b-df-hj-np-tv-z]+)e$",
    words: [
      { w: "five", zh: "五", e: "5️⃣", ipa: "/faɪv/", syl: ["five"] }, { w: "nine", zh: "九", e: "9️⃣", ipa: "/naɪn/", syl: ["nine"] },
      { w: "kite", zh: "风筝", e: "🪁", ipa: "/kaɪt/", syl: ["kite"] }, { w: "rice", zh: "米饭", e: "🍚", ipa: "/raɪs/", syl: ["rice"] },
      { w: "bike", zh: "自行车", e: "🚲", ipa: "/baɪk/", syl: ["bike"] }, { w: "time", zh: "时间", e: "⏰", ipa: "/taɪm/", syl: ["time"] },
      { w: "smile", zh: "微笑", e: "😄", ipa: "/smaɪl/", syl: ["smile"] }, { w: "ice", zh: "冰", e: "🧊", ipa: "/aɪs/", syl: ["ice"] }
    ]
  },
  {
    id: "ph3", label: "o-e", ipa: "/əʊ/", book: "四上", icon: "👃",
    tip: "魔法 e 在末尾，前面的 o 读 /əʊ/，嘴巴要圆圆的。",
    re: "o([b-df-hj-np-tv-z]+)e$",
    words: [
      { w: "nose", zh: "鼻子", e: "👃", ipa: "/nəʊz/", syl: ["nose"] }, { w: "home", zh: "家", e: "🏠", ipa: "/həʊm/", syl: ["home"] },
      { w: "rose", zh: "玫瑰", e: "🌹", ipa: "/rəʊz/", syl: ["rose"] }, { w: "note", zh: "便条", e: "🎵", ipa: "/nəʊt/", syl: ["note"] },
      { w: "hole", zh: "洞", e: "🕳️", ipa: "/həʊl/", syl: ["hole"] }, { w: "bone", zh: "骨头", e: "🦴", ipa: "/bəʊn/", syl: ["bone"] },
      { w: "phone", zh: "电话", e: "📱", ipa: "/fəʊn/", syl: ["phone"] }, { w: "stone", zh: "石头", e: "🪨", ipa: "/stəʊn/", syl: ["stone"] }
    ]
  },
  {
    id: "ph4", label: "u-e", ipa: "/juː/", book: "四上", icon: "🐱",
    tip: "魔法 e 在末尾，前面的 u 读 /juː/，就像在说「You」。",
    re: "u([b-df-hj-np-tv-z]+)e$",
    words: [
      { w: "cute", zh: "可爱的", e: "🐱", ipa: "/kjuːt/", syl: ["cute"] }, { w: "huge", zh: "巨大的", e: "🐘", ipa: "/hjuːdʒ/", syl: ["huge"] },
      { w: "tube", zh: "管子", e: "🧪", ipa: "/tjuːb/", syl: ["tube"] }, { w: "cube", zh: "方块", e: "🎲", ipa: "/kjuːb/", syl: ["cube"] },
      { w: "mule", zh: "骡子", e: "🐎", ipa: "/mjuːl/", syl: ["mule"] }, { w: "use", zh: "使用", e: "♻️", ipa: "/juːz/", syl: ["use"] },
      { w: "excuse", zh: "原谅", e: "🙏", ipa: "/ɪkˈskjuːz/", syl: ["ex", "cuse"] }, { w: "June", zh: "六月", e: "📅", ipa: "/dʒuːn/", syl: ["June"] }
    ]
  },
  {
    id: "ph5", label: "ee", ipa: "/iː/", book: "四下", icon: "🌳",
    tip: "两个 e 手拉手，读长长的 /iː/，像笑着说「衣——」。",
    re: "ee",
    words: [
      { w: "bee", zh: "蜜蜂", e: "🐝", ipa: "/biː/", syl: ["bee"] }, { w: "tree", zh: "树", e: "🌳", ipa: "/triː/", syl: ["tree"] },
      { w: "sleep", zh: "睡觉", e: "😴", ipa: "/sliːp/", syl: ["sleep"] }, { w: "green", zh: "绿色", e: "🟢", ipa: "/ɡriːn/", syl: ["green"] },
      { w: "feet", zh: "脚", e: "🦶", ipa: "/fiːt/", syl: ["feet"] }, { w: "meet", zh: "见面", e: "🤝", ipa: "/miːt/", syl: ["meet"] },
      { w: "week", zh: "星期", e: "📆", ipa: "/wiːk/", syl: ["week"] }, { w: "sweet", zh: "甜的", e: "🍬", ipa: "/swiːt/", syl: ["sweet"] }
    ]
  },
  {
    id: "ph6", label: "ea", ipa: "/iː/", book: "四下", icon: "🍵",
    tip: "e 和 a 在一起，常常也读 /iː/，和 ee 是好朋友。",
    re: "ea",
    words: [
      { w: "tea", zh: "茶", e: "🍵", ipa: "/tiː/", syl: ["tea"] }, { w: "eat", zh: "吃", e: "🍽️", ipa: "/iːt/", syl: ["eat"] },
      { w: "meat", zh: "肉", e: "🥩", ipa: "/miːt/", syl: ["meat"] }, { w: "read", zh: "读", e: "📖", ipa: "/riːd/", syl: ["read"] },
      { w: "seat", zh: "座位", e: "💺", ipa: "/siːt/", syl: ["seat"] }, { w: "clean", zh: "干净的", e: "🧹", ipa: "/kliːn/", syl: ["clean"] },
      { w: "bean", zh: "豆子", e: "🫘", ipa: "/biːn/", syl: ["bean"] }, { w: "teacher", zh: "老师", e: "🧑‍🏫", ipa: "/ˈtiːtʃə(r)/", syl: ["tea", "cher"] }
    ]
  },
  {
    id: "ph7", label: "ai / ay", ipa: "/eɪ/", book: "四下", icon: "🌧️",
    tip: "ai 常在词中间，ay 常在词尾，都读 /eɪ/。",
    re: "(?:ai|ay)",
    words: [
      { w: "rain", zh: "雨", e: "🌧️", ipa: "/reɪn/", syl: ["rain"] }, { w: "tail", zh: "尾巴", e: "🐕", ipa: "/teɪl/", syl: ["tail"] },
      { w: "wait", zh: "等待", e: "⏳", ipa: "/weɪt/", syl: ["wait"] }, { w: "paint", zh: "画画", e: "🎨", ipa: "/peɪnt/", syl: ["paint"] },
      { w: "day", zh: "白天", e: "☀️", ipa: "/deɪ/", syl: ["day"] }, { w: "play", zh: "玩", e: "⚽", ipa: "/pleɪ/", syl: ["play"] },
      { w: "say", zh: "说", e: "💬", ipa: "/seɪ/", syl: ["say"] }, { w: "way", zh: "路", e: "🛣️", ipa: "/weɪ/", syl: ["way"] }
    ]
  },
  {
    id: "ph8", label: "oo", ipa: "/uː/ /ʊ/", book: "四下", icon: "🌙",
    tip: "两个 o 手拉手，多数读长音 /uː/（moon），少数读短音 /ʊ/（book）。",
    re: "oo",
    words: [
      { w: "moon", zh: "月亮", e: "🌙", ipa: "/muːn/", syl: ["moon"] }, { w: "food", zh: "食物", e: "🍔", ipa: "/fuːd/", syl: ["food"] },
      { w: "zoo", zh: "动物园", e: "🦁", ipa: "/zuː/", syl: ["zoo"] }, { w: "room", zh: "房间", e: "🚪", ipa: "/ruːm/", syl: ["room"] },
      { w: "book", zh: "书", e: "📕", ipa: "/bʊk/", syl: ["book"] }, { w: "cook", zh: "烹饪", e: "👨‍🍳", ipa: "/kʊk/", syl: ["cook"] },
      { w: "foot", zh: "脚", e: "👣", ipa: "/fʊt/", syl: ["foot"] }, { w: "school", zh: "学校", e: "🏫", ipa: "/skuːl/", syl: ["school"] }
    ]
  }
];

/* 跟读打分（魔法回声）的常用句，配合各单元句型 */
const ECHO_EXTRA = [
  { en: "Good morning!", zh: "早上好！" },
  { en: "How are you?", zh: "你好吗？" },
  { en: "Nice to meet you.", zh: "很高兴认识你。" },
  { en: "Thank you very much.", zh: "非常感谢你。" },
  { en: "See you tomorrow.", zh: "明天见。" }
];

/* 白白收藏卡：扭蛋奖励永远围绕同一只白白，不再出现其他动物。
   art 是完整收藏卡（不是可穿戴饰品）；r=稀有度 1普通 2稀有 3传说。 */
function baibaiCards(prefix, names, rarity) {
  return names.map((n, i) => ({
    n, e: "🐶", art: `assets/stickers-v2/${prefix}-${String(i + 1).padStart(2, "0")}.webp`,
    r: typeof rarity === "function" ? rarity(i) : rarity
  }));
}
const BAIBAI_BASE_CARDS = [
  { n: "挥手白白", e: "🐶", art: "assets/stickers/baibai-wave.webp", r: 1 },
  { n: "阅读白白", e: "🐶", art: "assets/stickers/baibai-reading.webp", r: 1 },
  { n: "音乐白白", e: "🐶", art: "assets/stickers/baibai-music.webp", r: 1 },
  { n: "派对白白", e: "🐶", art: "assets/stickers/baibai-party.webp", r: 1 },
  { n: "侦探白白", e: "🐶", art: "assets/stickers/baibai-detective.webp", r: 2 },
  { n: "雨天白白", e: "🐶", art: "assets/stickers/baibai-rain.webp", r: 2 },
  { n: "探险白白", e: "🐶", art: "assets/stickers/baibai-explorer.webp", r: 2 },
  { n: "睡梦白白", e: "🐶", art: "assets/stickers/baibai-sleep.webp", r: 2 },
  { n: "圣诞守护白白", e: "🐶", art: "assets/stickers/baibai-holiday.webp", r: 3 },
  { n: "樱花公主白白", e: "🐶", art: "assets/stickers/baibai-blossom.webp", r: 3 },
  { n: "星空魔法白白", e: "🐶", art: "assets/stickers/baibai-wizard.webp", r: 3 },
  { n: "皇家白白", e: "🐶", art: "assets/stickers/baibai-royal.webp", r: 3 },
  ...baibaiCards("school", [
    "校门挥手白白", "绘本时光白白", "铅笔练习白白", "书包出发白白",
    "举手回答白白", "放大镜发现白白", "卡片配对白白", "算珠思考白白",
    "小画家白白", "台灯阅读白白", "答对庆祝白白", "灵感来了白白",
    "整理书架白白", "音乐听读白白", "奖杯时刻白白", "书本午睡白白"
  ], 1),
  ...baibaiCards("season", [
    "春风纸鸢白白", "盛夏西瓜白白", "雨靴小伞白白", "秋叶飞舞白白",
    "花灯夜游白白", "龙舟鼓手白白", "月饼月光白白", "生日蛋糕白白",
    "彩带派对白白", "圣诞暖帽白白", "新年灯笼白白", "海边拾贝白白",
    "樱花野餐白白", "星空露营白白", "雪地围巾白白", "彩虹雨伞白白"
  ], i => i < 10 ? 1 : 2),
  ...baibaiCards("hobby", [
    "饼干烘焙白白", "水果饮品白白", "花园松土白白", "浇花白白",
    "粉色钢琴白白", "尤克里里白白", "彩带舞蹈白白", "安静瑜伽白白",
    "积木城堡白白", "拼图专注白白", "折纸白白", "黏土手作白白",
    "相机白白", "蝴蝶花园白白", "泡泡白白", "抱枕晚安白白"
  ], 1),
  ...baibaiCards("travel", [
    "指南针白白", "山野披风白白", "地图寻路白白", "蒸汽小火车白白",
    "热气球白白", "森林露营白白", "背包远足白白", "溪石探路白白",
    "灯塔白白", "高山红叶白白", "沙漠星空白白", "雪峰旗帜白白",
    "纸船旅行白白", "古城门白白", "望远镜白白", "宝箱发现白白"
  ], 2),
  ...baibaiCards("magic", [
    "星帽魔法白白", "星光魔杖白白", "月牙白白", "云朵梦境白白",
    "彩虹斗篷白白", "花冠精灵白白", "象牙王冠白白", "翡翠守护白白",
    "水晶球白白", "飞行魔法书白白", "星星宝盒白白", "萤火收集白白",
    "月亮摇篮白白", "提灯白白", "爱心环绕白白", "星座勋章白白"
  ], i => i < 6 ? 3 : 2),
  ...baibaiCards("mood", [
    "开心跳跳白白", "自信站立白白", "害羞探头白白", "好奇歪头白白",
    "惊喜白白", "勇气超人白白", "安静呼吸白白", "困困哈欠白白"
  ], 1)
];

/* 长期收藏系列：保留最初 100 张原卡（旧存档名称完全不变），再为同一批白白
   姿势制作四套独立闪卡版本。它们共用轻量原画，但拥有不同卡面色调、边框、
   名称与稀有度；手机只需缓存 100 幅图，也能长期收集 500 张而不撑爆流量。 */
const BAIBAI_CARD_EDITIONS = [
  { id:"classic", n:"原画", prefix:"", tone:"", badge:"🐾" },
  { id:"dawn", n:"晨光", prefix:"晨光·", tone:"sepia(.16) saturate(1.12) brightness(1.06)", badge:"☀️" },
  { id:"mint", n:"薄荷", prefix:"薄荷·", tone:"hue-rotate(58deg) saturate(.88) brightness(1.05)", badge:"🍃" },
  { id:"night", n:"星夜", prefix:"星夜·", tone:"hue-rotate(205deg) saturate(1.15) brightness(.9)", badge:"🌙" },
  { id:"rainbow", n:"彩虹", prefix:"彩虹·", tone:"hue-rotate(315deg) saturate(1.28) brightness(1.04)", badge:"🌈" }
];
const STICKERS = BAIBAI_CARD_EDITIONS.flatMap((edition, editionIndex) =>
  BAIBAI_BASE_CARDS.map((card, cardIndex) => Object.assign({}, card, {
    n: edition.prefix + card.n,
    edition: edition.id,
    editionName: edition.n,
    badge: edition.badge,
    tone: edition.tone,
    /* 后四套每逢 10/25 张提升稀有度，让新系列既有普通卡也有追逐卡。 */
    r: editionIndex === 0 ? card.r : (cardIndex % 25 === 24 ? 3 : cardIndex % 10 === 9 ? 2 : card.r)
  }))
);

/* 宠物成长线：xp达到阈值即进化（老存档默认用这条线，见 PETS.classic） */
const PET_STAGES = [
  { xp: 0, e: "🥚", n: "神秘蛋" },
  { xp: 30, e: "🐣", n: "破壳小啾" },
  { xp: 100, e: "🐥", n: "毛球啾啾" },
  { xp: 300, e: "🦢", n: "优雅天鹅" },
  { xp: 700, e: "🦩", n: "火烈鸟公主" },
  { xp: 1500, e: "🦄", n: "彩虹独角兽" }
];

/* ------------------------------------------------------------
 * 核心伙伴「白白」：陪了孩子五年的真实毛绒伙伴。
 * 暂时隐藏其他伙伴，把养成、装扮与学习反馈都围绕白白建立。
 * ------------------------------------------------------------ */
const PETS = [
  {
    id: "baibai", n: "白白", tag: "陪伴五年的勇气伙伴 · 一直在你身边", cost: 0,
    art: "assets/baibai-base.png",
    stages: [
      { xp: 0, e: "🐶", n: "白白", title: "暖心伙伴" },
      { xp: 30, e: "🐶", n: "白白", title: "勇气搭档" },
      { xp: 100, e: "🐶", n: "白白", title: "星光搭档" },
      { xp: 300, e: "🐶", n: "白白", title: "魔法守护者" },
      { xp: 700, e: "🐶", n: "白白", title: "勇气队长" },
      { xp: 1500, e: "🐶", n: "白白", title: "传奇伙伴" }
    ]
  }
];

/* 喂养道具：金币的日常出口，也是每天回来看它的理由 */
const CARE = [
  { id: "food", n: "投喂", e: "🍖", cost: 5, up: "hunger", bond: 2, say: "白白咂咂嘴：好香呀，我吃饱啦！", fx: "😋" },
  { id: "bath", n: "洗澡", e: "🛁", cost: 5, up: "clean", bond: 2, say: "白白甩甩耳朵：洗得香喷喷，抱一下吧！", fx: "🫧" },
  { id: "play", n: "陪玩", e: "🎾", cost: 8, up: "mood", bond: 3, say: "白白开心地蹦起来：再玩一次嘛！", fx: "🎾" },
  { id: "snack", n: "小零食", e: "🍰", cost: 12, up: "mood", bond: 4, say: "白白眯起眼睛：你最懂我啦！", fx: "💗" }
];

/* 白白衣橱：每一件都能单独拖动 / 缩放 / 旋转。
   art 装扮是按白白身体轮廓绘制的透明层；同一 body 组只穿一件。
   旧的人类裙装 id 原位升级成披风，保留已购买记录，不让孩子丢金币。 */
const OUTFITS = [
  { id:"bb_bow", cat:"发饰", n:"粉色蝴蝶结", e:"🎀", cost:0, pos:{x:31,y:14,s:.62,r:-12} },
  { id:"bb_flower", cat:"发饰", n:"小雏菊发夹", e:"🌼", cost:0, pos:{x:67,y:15,s:.55,r:10} },
  { id:"bb_butterfly", cat:"发饰", n:"蝴蝶发夹", e:"🦋", cost:35, pos:{x:68,y:14,s:.58,r:12} },
  { id:"bb_band", cat:"发饰", n:"星星发箍", e:"🌟", cost:45, pos:{x:50,y:8,s:.62,r:0} },
  { id:"bb_crown", cat:"帽子", n:"皇家小皇冠", e:"👑", art:"assets/outfits/hat-crown.svg", base:.32, cost:80, pos:{x:50,y:14,s:1,r:0} },
  { id:"bb_hat", cat:"帽子", n:"春日花朵帽", e:"🌼", art:"assets/outfits/hat-flower.svg", base:.36, cost:60, pos:{x:50,y:15,s:1,r:0} },
  { id:"bb_treehat", cat:"帽子", n:"圣诞树软帽", e:"🎄", art:"assets/outfits/hat-tree.svg", base:.30, cost:85, pos:{x:50,y:10,s:1,r:0} },
  { id:"bb_wizardhat", cat:"帽子", n:"星空魔法帽", e:"🧙‍♀️", art:"assets/outfits/hat-wizard.svg", base:.32, cost:90, pos:{x:50,y:10,s:1,r:0} },
  { id:"bb_beret", cat:"帽子", n:"寻宝侦探帽", e:"🕵️", art:"assets/outfits/hat-beret.svg", base:.38, cost:65, pos:{x:50,y:15,s:1,r:0} },
  { id:"bb_partyhat", cat:"帽子", n:"彩虹派对帽", e:"🎉", art:"assets/outfits/hat-party.svg", base:.30, cost:55, pos:{x:50,y:10,s:1,r:0} },

  { id:"bb_pearl", cat:"耳饰", n:"珍珠耳环", e:"🤍", cost:30, pos:{x:78,y:39,s:.38,r:0} },
  { id:"bb_gem", cat:"耳饰", n:"宝石耳环", e:"💎", cost:55, pos:{x:79,y:41,s:.4,r:5} },
  { id:"bb_cherry", cat:"耳饰", n:"樱桃耳坠", e:"🍒", cost:45, pos:{x:78,y:42,s:.46,r:5} },
  { id:"bb_moon", cat:"耳饰", n:"月亮耳坠", e:"🌙", cost:50, pos:{x:79,y:41,s:.42,r:0} },

  { id:"bb_heart", cat:"项圈", n:"爱心蝴蝶结项圈", e:"💖", art:"assets/outfits/collar-heart.svg", base:.52, cost:35, pos:{x:50,y:56,s:1,r:0} },
  { id:"bb_pearlneck", cat:"项圈", n:"珍珠宝石项圈", e:"📿", art:"assets/outfits/collar-pearl.svg", base:.52, cost:55, pos:{x:50,y:56,s:1,r:0} },
  { id:"bb_bell", cat:"项链", n:"幸运铃铛", e:"🔔", cost:45, pos:{x:50,y:55,s:.42,r:0} },

  { id:"bb_wedding", cat:"披风", group:"body", n:"象牙皇家披风", e:"🤍", art:"assets/outfits/cape-royal.svg", base:.74, cost:120, pos:{x:50,y:63,s:1,r:0} },
  { id:"bb_pinkdress", cat:"披风", group:"body", n:"樱花珍珠披风", e:"🌸", art:"assets/outfits/cape-blossom.svg", base:.74, cost:90, pos:{x:50,y:63,s:1,r:0} },
  { id:"bb_bluedress", cat:"披风", group:"body", n:"星空魔法披风", e:"🌌", art:"assets/outfits/cape-starry.svg", base:.74, cost:100, pos:{x:50,y:63,s:1,r:0} },
  { id:"bb_tutu", cat:"披风", group:"body", n:"紫藤仙子披风", e:"🪻", art:"assets/outfits/cape-fairy.svg", base:.74, cost:75, pos:{x:50,y:63,s:1,r:0} },
  { id:"bb_shirt", cat:"披风", group:"body", n:"草莓软绒披风", e:"🍓", art:"assets/outfits/cape-strawberry.svg", base:.74, cost:55, pos:{x:50,y:63,s:1,r:0} },
  { id:"bb_coat", cat:"披风", group:"body", n:"森林守护披风", e:"🌲", art:"assets/outfits/cape-forest.svg", base:.74, cost:65, pos:{x:50,y:63,s:1,r:0} },
  { id:"bb_vest", cat:"披风", group:"body", n:"晴空探险披风", e:"🧭", art:"assets/outfits/cape-explorer.svg", base:.74, cost:60, pos:{x:50,y:63,s:1,r:0} },

  { id:"bb_glasses", cat:"脸上", n:"圆框眼镜", e:"👓", cost:35, pos:{x:50,y:37,s:.72,r:0} },
  { id:"bb_sunglasses", cat:"脸上", n:"酷酷墨镜", e:"🕶️", cost:45, pos:{x:50,y:37,s:.72,r:0} },
  { id:"bb_magnifier", cat:"手持", n:"寻宝放大镜", e:"🔍", cost:50, pos:{x:79,y:68,s:.7,r:-12} },
  { id:"bb_wand", cat:"手持", n:"星星魔法棒", e:"🪄", cost:70, pos:{x:79,y:67,s:.75,r:-18} },
  { id:"bb_bag", cat:"手持", n:"珍珠手提包", e:"👜", cost:55, pos:{x:78,y:76,s:.7,r:0} },
  { id:"bb_umbrella", cat:"手持", n:"彩虹小伞", e:"🌂", cost:50, pos:{x:78,y:62,s:.78,r:-10} }
];

/* 长期衣橱：价格随稀有度拉开，避免一次把全部装扮买完。
   同一顶帽子/同一副镜框会有不同配色，仍然都能独立拖放和保存。 */
function outfitSeries(prefix, cat, rows, pos) {
  return rows.map((x, i) => Object.assign({
    id: prefix + (i + 1), cat, n: x[0], e: x[1], cost: x[2]
  }, pos || {}, x[3] || {}));
}
OUTFITS.push(
  ...outfitSeries("bb_gx_", "脸上", [
    ["蜜桃圆框眼镜","👓",90,{art:"assets/outfits/glasses-round.svg",base:.48,hue:0}],
    ["薄荷圆框眼镜","👓",105,{art:"assets/outfits/glasses-round.svg",base:.48,hue:105}],
    ["海盐圆框眼镜","👓",120,{art:"assets/outfits/glasses-round.svg",base:.48,hue:190}],
    ["草莓爱心眼镜","💗",135,{art:"assets/outfits/glasses-heart.svg",base:.50,hue:0}],
    ["葡萄爱心眼镜","💜",150,{art:"assets/outfits/glasses-heart.svg",base:.50,hue:255}],
    ["猫眼公主镜","✨",165,{art:"assets/outfits/glasses-cat.svg",base:.50,hue:0}],
    ["翡翠猫眼镜","💚",180,{art:"assets/outfits/glasses-cat.svg",base:.50,hue:105}],
    ["星星舞台镜","⭐",195,{art:"assets/outfits/glasses-star.svg",base:.52,hue:0}],
    ["蓝莓星星镜","💙",210,{art:"assets/outfits/glasses-star.svg",base:.52,hue:195}],
    ["小花园眼镜","🌸",225,{art:"assets/outfits/glasses-flower.svg",base:.54,hue:0}],
    ["向日葵眼镜","🌻",240,{art:"assets/outfits/glasses-flower.svg",base:.54,hue:55}],
    ["银河亮片眼镜","🌌",280,{art:"assets/outfits/glasses-star.svg",base:.52,hue:250}]
  ], {pos:{x:50,y:37,s:1,r:0}}),
  ...outfitSeries("bb_hx_", "帽子", [
    ["蜜桃皇家冠","👑",130,{art:"assets/outfits/hat-crown.svg",base:.32,hue:335}],
    ["翡翠皇家冠","👑",160,{art:"assets/outfits/hat-crown.svg",base:.32,hue:95}],
    ["蓝宝石皇冠","👑",190,{art:"assets/outfits/hat-crown.svg",base:.32,hue:205}],
    ["紫藤花朵帽","🌼",130,{art:"assets/outfits/hat-flower.svg",base:.36,hue:245}],
    ["海蓝花朵帽","🌼",150,{art:"assets/outfits/hat-flower.svg",base:.36,hue:175}],
    ["月光魔法帽","🧙‍♀️",180,{art:"assets/outfits/hat-wizard.svg",base:.32,hue:45}],
    ["樱花魔法帽","🧙‍♀️",210,{art:"assets/outfits/hat-wizard.svg",base:.32,hue:300}],
    ["薄荷侦探帽","🕵️",145,{art:"assets/outfits/hat-beret.svg",base:.38,hue:95}],
    ["莓果侦探帽","🕵️",175,{art:"assets/outfits/hat-beret.svg",base:.38,hue:315}],
    ["星光派对帽","🎉",230,{art:"assets/outfits/hat-party.svg",base:.30,hue:220}]
  ], {pos:{x:50,y:12,s:1,r:0}}),
  ...outfitSeries("bb_fx_", "发饰", [
    ["草莓双蝴蝶结","🎀",85],["蓝莓丝带夹","🎀",100],["珍珠星星夹","⭐",115],
    ["樱花发夹","🌸",130],["彩虹发箍","🌈",145],["月牙发夹","🌙",160],
    ["糖果发箍","🍬",175],["小皇冠发箍","♛",190],["雪花发夹","❄️",205],["水晶蝴蝶夹","🦋",235]
  ], {pos:{x:66,y:15,s:.56,r:8}}),
  ...outfitSeries("bb_ex_", "耳饰", [
    ["粉晶耳坠","💗",90],["蓝晶耳坠","💙",105],["小星星耳坠","⭐",120],["小花耳坠","🌸",135],
    ["珍珠蝴蝶耳坠","🦋",150],["彩虹耳坠","🌈",170],["月光耳坠","🌙",195],["皇家宝石耳坠","💎",240]
  ], {pos:{x:79,y:42,s:.42,r:3}}),
  ...outfitSeries("bb_nx_", "项链", [
    ["草莓吊坠","🍓",90],["小骨头项链","🦴",105],["四叶草项链","🍀",120],["星星项链","⭐",135],
    ["彩虹项链","🌈",150],["月亮项链","🌙",170],["爱心宝石项链","💖",195],["勇气勋章","🏅",230]
  ], {pos:{x:50,y:56,s:.42,r:0}}),
  ...outfitSeries("bb_ix_", "手持", [
    ["草莓奶昔","🥤",90],["绘本故事","📖",105],["小画板","🎨",120],["泡泡水","🫧",135],
    ["花束","💐",150],["小提琴","🎻",170],["星星灯笼","🏮",190],["魔法水晶球","🔮",215],
    ["探险望远镜","🔭",240],["皇家权杖","🪄",280]
  ], {pos:{x:79,y:68,s:.70,r:-10}}),
  ...outfitSeries("bb_cx_", "披风", [
    ["蜜桃旅行披风","🍑",150,{art:"assets/outfits/cape-blossom.svg",base:.74,hue:330,group:"body"}],
    ["海盐旅行披风","🌊",175,{art:"assets/outfits/cape-explorer.svg",base:.74,hue:180,group:"body"}],
    ["月光守护披风","🌙",200,{art:"assets/outfits/cape-starry.svg",base:.74,hue:35,group:"body"}],
    ["紫晶守护披风","💜",225,{art:"assets/outfits/cape-forest.svg",base:.74,hue:245,group:"body"}],
    ["彩虹仙子披风","🌈",250,{art:"assets/outfits/cape-fairy.svg",base:.74,hue:55,group:"body"}],
    ["雪国皇家披风","❄️",275,{art:"assets/outfits/cape-royal.svg",base:.74,hue:190,group:"body"}],
    ["红莓节日披风","🎄",300,{art:"assets/outfits/cape-strawberry.svg",base:.74,hue:330,group:"body"}],
    ["银河传奇披风","🌌",340,{art:"assets/outfits/cape-starry.svg",base:.74,hue:280,group:"body"}]
  ], {pos:{x:50,y:63,s:1,r:0}})
);

/* 点白白时的中文鼓励：英语学习发音与角色台词分开，孩子不会混淆。 */
const PRAISES = [
  { en: "Great job!", zh: "干得漂亮！" },
  { en: "You are amazing!", zh: "你太棒了！" },
  { en: "Keep going!", zh: "继续加油！" },
  { en: "Wonderful!", zh: "好极了！" },
  { en: "I believe in you!", zh: "我相信你！" },
  { en: "You are a super star!", zh: "你是超级明星！" }
];
