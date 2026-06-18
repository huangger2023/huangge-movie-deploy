// 为 demo 用户 seed 几个示例剧情文档，演示"读取本地剧情文档"能力
import { db } from "../src/lib/db";

const SAMPLE_PLOTS = [
  {
    movieTitle: "肖申克的救赎",
    content: `《肖申克的救赎》真实剧情：

故事发生在1947年。年轻有为的银行家安迪·杜弗伦（蒂姆·罗宾斯饰）因被指控谋杀妻子及其情人，被判无期徒刑，送入缅因州肖申克监狱。

入狱后，安迪结识了能在狱中搞到各种违禁品的"百事通"瑞德（摩根·弗里曼饰）。安迪向瑞德买了一把小石锤（说是为了雕刻石头），以及一张丽塔·海华丝的海报。

安迪利用自己的财务知识，帮狱警队长哈德利合法避税，换取了给狱友们的啤酒。此后他逐渐被调到监狱图书馆，帮典狱长诺顿洗黑钱，把黑钱洗进一个叫"兰道尔·史蒂文斯"的虚构身份账户。

安迪坚持每周给州政府写信申请图书馆经费，数年后终于建成新英格兰州最大的监狱图书馆。他还教年轻囚犯汤米读书识字考取文凭。汤米告诉安迪，他在另一所监狱遇到过一个叫厄尔莫·布拉奇的人，此人曾承认杀过安迪妻子和她的情人——这意味着安迪是无辜的。安迪找典狱长诺顿希望重审案件，但诺顿为留住安迪这个"洗钱工具"，把汤米转移到别的监狱并封口。

1966年一个雷雨夜，安迪趁雷声砸破下水管道，爬过500码的恶臭污水管逃出监狱。原来那把"石锤"他用了27年凿穿了墙壁，海报一直挡着墙洞。逃出后安迪用"兰道尔·史蒂文斯"身份取走了诺顿洗的黑钱，并把诺顿的罪证寄给报社。诺顿饮弹自尽。

瑞德服刑40年后获假释，本想如老布那样自杀，但想起安迪的嘱托，来到巴克斯顿一棵大橡树下的石墙，找到安迪留的信和钱。瑞德违反假释规定偷渡墨西哥，在芝华塔内欧的海滩与安迪重逢。

核心主题：希望与自由。安迪说"希望是美好的，也许是人间至善，而美好的事物永不消逝"。`,
  },
  {
    movieTitle: "消失的她",
    content: `《消失的她》真实剧情：

何非（朱一龙饰）与妻子李木子到东南亚巴尔半岛度假。某夜何非酒醉醒来，发现妻子凭空消失——护照、行李、入住记录全在，但所有人对妻子的记忆都与何非描述的不符。酒店前台、邻居、甚至监控里出现的女人（文咏珊饰），都不是何非认识的李木子。何非被所有人当成精神病人。

绝望中，金牌律师陈麦（倪妮饰）介入案件。陈麦调查发现，何非其实是个赌徒，欠下巨额赌债，与家境富裕的李木子结婚是为了还债。木子父母双亡留下巨额财产，何非企图制造妻子失踪继承遗产。

随着调查深入，陈麦带何非看到"假妻子"的真面目——这是一个东南亚犯罪团伙的骗局。但最终反转：陈麦真实身份是李木子的闺蜜沈曼，她怀疑何非杀了木子，于是编排了整出"假妻子"戏，逼何非说出木子下落。

最终真相：何非在海底星空笼子里把怀孕的李木子锁死。沈曼带何非回到事发海域，何非在压力下供认了杀妻过程。何非被捕后得知木子怀孕，崩溃后悔。电影结尾，何非被判处死刑。

核心主题：婚姻骗局、人性之恶、赌徒心理。`,
  },
];

async function main() {
  console.log("📄 Seeding plot documents...");
  const demo = await db.user.findUnique({ where: { email: "demo@yingshu.com" } });
  if (!demo) {
    console.log("demo user not found, skip");
    return;
  }
  for (const p of SAMPLE_PLOTS) {
    const existing = await db.plotDocument.findFirst({
      where: { userId: demo.id, movieTitle: p.movieTitle, source: "manual" },
    });
    if (existing) {
      await db.plotDocument.update({
        where: { id: existing.id },
        data: { content: p.content, wordCount: p.content.length },
      });
    } else {
      await db.plotDocument.create({
        data: {
          userId: demo.id,
          movieTitle: p.movieTitle,
          content: p.content,
          source: "manual",
          wordCount: p.content.length,
        },
      });
    }
    console.log(`✓ 剧情文档: ${p.movieTitle} (${p.content.length}字)`);
  }
  console.log("✅ Done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
