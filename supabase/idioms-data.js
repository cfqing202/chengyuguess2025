// 成语题库数据 - 难度1-5级
const IDIOMS_DATA = [
  // 难度1 - 常见简单成语
  { idiom: "一心一意", pinyin: "yī xīn yī yì", explanation: "只有一个心思，没有别的念头。形容专心致志。", example_sentence: "他一心一意地学习。", difficulty: 1, category: "常用" },
  { idiom: "马到成功", pinyin: "mǎ dào chéng gōng", explanation: "战马一到就取得胜利。形容迅速取得成功。", example_sentence: "祝你马到成功！", difficulty: 1, category: "祝福" },
  { idiom: "心想事成", pinyin: "xīn xiǎng shì chéng", explanation: "心里想要的都能实现。", example_sentence: "新年快乐，心想事成！", difficulty: 1, category: "祝福" },
  { idiom: "一帆风顺", pinyin: "yī fān fēng shùn", explanation: "船帆顺风航行。比喻一切顺利。", example_sentence: "祝你一帆风顺！", difficulty: 1, category: "祝福" },
  { idiom: "学海无涯", pinyin: "xué hǎi wú yá", explanation: "学问像大海一样没有边际。", example_sentence: "学海无涯，勤勉为径。", difficulty: 1, category: "学习" },
  { idiom: "勤学苦练", pinyin: "qín xué kǔ liàn", explanation: "勤奋学习，刻苦训练。", example_sentence: "要想成功就要勤学苦练。", difficulty: 1, category: "学习" },
  { idiom: "自强不息", pinyin: "zì qiáng bù xī", explanation: "自己努力向上，永不停止。", example_sentence: "天行健，君子以自强不息。", difficulty: 1, category: "品德" },
  { idiom: "厚德载物", pinyin: "hòu dé zài wù", explanation: "道德深厚，能容载万物。", example_sentence: "君子以厚德载物。", difficulty: 1, category: "品德" },
  { idiom: "知足常乐", pinyin: "zhī zú cháng lè", explanation: "知道满足就经常快乐。", example_sentence: "做人要知足常乐。", difficulty: 1, category: "生活" },
  { idiom: "助人为乐", pinyin: "zhù rén wéi lè", explanation: "把帮助别人当作快乐。", example_sentence: "他是一个助人为乐的人。", difficulty: 1, category: "品德" },
  
  // 难度2
  { idiom: "画龙点睛", pinyin: "huà lóng diǎn jīng", explanation: "画龙时点上眼睛。比喻在关键处加一点使整体更生动。", example_sentence: "这篇文章的结尾真是画龙点睛。", difficulty: 2, category: "艺术" },
  { idiom: "胸有成竹", pinyin: "xiōng yǒu chéng zhú", explanation: "画竹子前胸中已有竹子的形象。比喻做事有把握。", example_sentence: "他胸有成竹地参加了比赛。", difficulty: 2, category: "能力" },
  { idiom: "对牛弹琴", pinyin: "duì niú tán qín", explanation: "对牛弹琴。比喻对不懂的人讲道理。", example_sentence: "跟他说了半天简直是对牛弹琴。", difficulty: 2, category: "行为" },
  { idiom: "井底之蛙", pinyin: "jǐng dǐ zhī wā", explanation: "井底的青蛙。比喻见识短浅的人。", example_sentence: "不要做井底之蛙。", difficulty: 2, category: "人物" },
  { idiom: "守株待兔", pinyin: "shǒu zhū dài tù", explanation: "守在树桩旁等兔子撞死。比喻坐等运气。", example_sentence: "不能守株待兔，要主动出击。", difficulty: 2, category: "行为" },
  { idiom: "掩耳盗铃", pinyin: "yǎn ěr dào líng", explanation: "捂住耳朵偷铃铛。比喻自己欺骗自己。", example_sentence: "这种做法简直是掩耳盗铃。", difficulty: 2, category: "行为" },
  { idiom: "刻舟求剑", pinyin: "kè zhōu qiú jiàn", explanation: "在船舷上刻记号找剑。比喻拘泥固执。", example_sentence: "时代变了，不能刻舟求剑。", difficulty: 2, category: "行为" },
  { idiom: "叶公好龙", pinyin: "yè gōng hào lóng", explanation: "叶公喜欢龙。比喻表面喜欢实际害怕。", example_sentence: "他只是叶公好龙而已。", difficulty: 2, category: "人物" },
  { idiom: "狐假虎威", pinyin: "hú jiǎ hǔ wēi", explanation: "狐狸借老虎的威风。比喻依仗他人势力。", example_sentence: "他不过是狐假虎威罢了。", difficulty: 2, category: "人物" },
  { idiom: "鹤立鸡群", pinyin: "hè lì jī qún", explanation: "仙鹤站在鸡群中。比喻才能出众。", example_sentence: "他在人群中真是鹤立鸡群。", difficulty: 2, category: "人物" },
  
  // 难度3
  { idiom: "塞翁失马", pinyin: "sài wēng shī mǎ", explanation: "边塞老人丢失马。比喻祸福无常。", example_sentence: "塞翁失马，焉知非福。", difficulty: 3, category: "哲理" },
  { idiom: "亡羊补牢", pinyin: "wáng yáng bǔ láo", explanation: "丢失羊后修补羊圈。比喻及时补救。", example_sentence: "亡羊补牢，为时未晚。", difficulty: 3, category: "哲理" },
  { idiom: "南辕北辙", pinyin: "nán yuán běi zhé", explanation: "车往南走，车印往北。比喻行动与目标相反。", example_sentence: "这样做完全是南辕北辙。", difficulty: 3, category: "行为" },
  { idiom: "东施效颦", pinyin: "dōng shī xiào pín", explanation: "东施模仿西施皱眉。比喻盲目模仿。", example_sentence: "不要东施效颦。", difficulty: 3, category: "人物" },
  { idiom: "请君入瓮", pinyin: "qǐng jūn rù wèng", explanation: "请人进入瓮中。比喻用对方的方法整治对方。", example_sentence: "这招是请君入瓮。", difficulty: 3, category: "计谋" },
  { idiom: "纸上谈兵", pinyin: "zhǐ shàng tán bīng", explanation: "在纸面上谈论兵法。比喻空谈理论。", example_sentence: "不能纸上谈兵，要实践。", difficulty: 3, category: "行为" },
  { idiom: "杯弓蛇影", pinyin: "bēi gōng shé yǐng", explanation: "把酒杯中的弓影当作蛇。比喻疑神疑鬼。", example_sentence: "不要杯弓蛇影，自己吓自己。", difficulty: 3, category: "心理" },
  { idiom: "草木皆兵", pinyin: "cǎo mù jiē bīng", explanation: "草和树都当作士兵。形容惊慌时极度紧张。", example_sentence: "他吓得草木皆兵。", difficulty: 3, category: "心理" },
  { idiom: "风声鹤唳", pinyin: "fēng shēng hè lì", explanation: "风和鹤的叫声。形容极度惊慌。", example_sentence: "敌人已风声鹤唳。", difficulty: 3, category: "心理" },
  { idiom: "卧薪尝胆", pinyin: "wò xīn cháng dǎn", explanation: "睡在柴草上尝苦胆。比喻刻苦自励。", example_sentence: "他卧薪尝胆，最终成功。", difficulty: 3, category: "人物" },
  
  // 难度4
  { idiom: "韦编三绝", pinyin: "wéi biān sān jué", explanation: "编竹简的皮绳断了多次。比喻读书勤奋。", example_sentence: "孔子读《易》，韦编三绝。", difficulty: 4, category: "学习" },
  { idiom: "悬梁刺股", pinyin: "xuán liáng cì gǔ", explanation: "把头发挂在梁上，用锥子刺大腿。形容学习刻苦。", example_sentence: "古人悬梁刺股，刻苦读书。", difficulty: 4, category: "学习" },
  { idiom: "囊萤映雪", pinyin: "náng yíng yìng xuě", explanation: "用萤火虫照亮读书，在雪地反光读书。形容贫苦好学。", example_sentence: "古人囊萤映雪，勤学不辍。", difficulty: 4, category: "学习" },
  { idiom: "程门立雪", pinyin: "chéng mén lì xuě", explanation: "在程颐门前雪中站立。形容尊师重道。", example_sentence: "他程门立雪的精神令人敬佩。", difficulty: 4, category: "品德" },
  { idiom: "凿壁偷光", pinyin: "záo bì tōu guāng", explanation: "在墙上凿洞借邻居的光读书。形容勤学苦读。", example_sentence: "匡衡凿壁偷光，终成大学者。", difficulty: 4, category: "学习" },
  { idiom: "目不窥园", pinyin: "mù bù kuī yuán", explanation: "眼睛不看一下园子。形容学习专心。", example_sentence: "他目不窥园，专心读书。", difficulty: 4, category: "学习" },
  { idiom: "三顾茅庐", pinyin: "sān gù máo lú", explanation: "三次去茅草屋请诸葛亮。比喻诚心邀请。", example_sentence: "刘备三顾茅庐请诸葛亮。", difficulty: 4, category: "人物" },
  { idiom: "草船借箭", pinyin: "cǎo chuán jiè jiàn", explanation: "用草船借取箭矢。比喻巧妙借用。", example_sentence: "诸葛亮草船借箭，真是妙计。", difficulty: 4, category: "计谋" },
  { idiom: "望梅止渴", pinyin: "wàng méi zhǐ kě", explanation: "看到梅子止住口渴。比喻用空想安慰自己。", example_sentence: "光望梅止渴不行，要实际行动。", difficulty: 4, category: "行为" },
  { idiom: "四面楚歌", pinyin: "sì miàn chǔ gē", explanation: "四面都是楚国的歌声。比喻四面受敌。", example_sentence: "敌军已四面楚歌。", difficulty: 4, category: "处境" },
  
  // 难度5 - 高难度成语
  { idiom: "破釜沉舟", pinyin: "pò fǔ chén zhōu", explanation: "打破饭锅，凿沉船只。比喻下决心拼到底。", example_sentence: "他破釜沉舟，决定奋力一搏。", difficulty: 5, category: "决心" },
  { idiom: "背水一战", pinyin: "bèi shuǐ yī zhàn", explanation: "背靠河水与敌人决战。比喻没有退路。", example_sentence: "这场比赛对他们来说是背水一战。", difficulty: 5, category: "决心" },
  { idiom: "置之死地而后生", pinyin: "zhì zhī sǐ dì ér hòu shēng", explanation: "置于死地然后求生。比喻绝处逢生。", example_sentence: "只有置之死地而后生，才能成功。", difficulty: 5, category: "哲理" },
  { idiom: "因地制宜", pinyin: "yí dì zhì yí", explanation: "根据不同地方的情况制定对策。", example_sentence: "要因地制宜，不能照搬。", difficulty: 5, category: "方法" },
  { idiom: "因材施教", pinyin: "yí cái shī jiào", explanation: "根据不同人的资质进行教育。", example_sentence: "老师要因材施教。", difficulty: 5, category: "教育" },
  { idiom: "循序渐进", pinyin: "xún xù jiàn jìn", explanation: "按步骤逐渐推进。", example_sentence: "学习要循序渐进。", difficulty: 5, category: "方法" },
  { idiom: "举一反三", pinyin: "jǔ yī fǎn sān", explanation: "举出一例就能推知其他。", example_sentence: "学习要举一反三。", difficulty: 5, category: "学习" },
  { idiom: "触类旁通", pinyin: "chù lèi páng tōng", explanation: "接触一类事物就能推知其他。", example_sentence: "要触类旁通，善于总结。", difficulty: 5, category: "学习" },
  { idiom: "事半功倍", pinyin: "shì bàn gōng bèi", explanation: "用一半的力气得到成倍的效果。", example_sentence: "方法正确才能事半功倍。", difficulty: 5, category: "方法" },
  { idiom: "事倍功半", pinyin: "shì bèi gōng bàn", explanation: "花费成倍的力气得到一半的效果。", example_sentence: "方法不对会事倍功半。", difficulty: 5, category: "方法" }
];

// 导出成语数据
if (typeof module !== 'undefined' && module.exports) {
  module.exports = IDIOMS_DATA;
}
