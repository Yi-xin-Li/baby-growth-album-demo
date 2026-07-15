import iconAdventure from "@/assets/icon_adventure.png.asset.json";
import iconBirth from "@/assets/icon_birth.png.asset.json";
import iconContinue from "@/assets/icon_continue.png.asset.json";
import iconExplore from "@/assets/icon_explore.png.asset.json";
import iconTalk from "@/assets/icon_talk.png.asset.json";
import iconWalk from "@/assets/icon_walk.png.asset.json";
import type { GrowthAlbum } from "@/types/album";

const PHOTO_A = "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=900&q=80";
const PHOTO_A_THUMB = "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=300&q=70";
const PHOTO_B = "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=900&q=80";
const PHOTO_B_THUMB = "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&q=70";

export const demoAlbum: GrowthAlbum = {
  profile: {
    displayName: "皮君尧",
    romanizedName: "PIJUNYAO",
    birthDate: "2024.4.24",
    welcome: "欢迎来到皮君尧的成长时光机！",
  },
  theme: "cream",
  chapters: [
    {
      id: "birth",
      title: "诞生记忆",
      age: "0-100天",
      icon: iconBirth.url,
      bg: "var(--c-birth)",
      smallIcon: "🚗",
      stories: [
        {
          id: "s1",
          title: "出生啦！",
          date: "2024.4.24",
          cover: PHOTO_A,
          thumbs: [PHOTO_A_THUMB, PHOTO_B_THUMB],
          extraCount: 5,
          note: "七斤九两，真是个大胖儿子！\n爸妈没有经验，提前去医院待产搞了个乌龙，但好在你平安降生。",
        },
        {
          id: "s2",
          title: "第一次便便",
          date: "2024.4.26",
          cover: PHOTO_B,
          thumbs: [PHOTO_B_THUMB],
          extraCount: 2,
          note: "没有经验，给爸爸吓坏了。第一次打襁褓时哇哇大哭，你自己也憋哭了吧。",
        },
      ],
    },
    {
      id: "talk",
      title: "蹒跚学语",
      age: "3-6个月",
      icon: iconTalk.url,
      bg: "var(--c-talk)",
      smallIcon: "💬",
      stories: [
        {
          id: "t1",
          title: "第一次咯咯笑",
          date: "2024.7.10",
          cover: PHOTO_B,
          thumbs: [PHOTO_A_THUMB],
          extraCount: 3,
          note: "爸爸做了个鬼脸，你就笑得停不下来，那串笑声真是天底下最好听的声音。",
        },
      ],
    },
    {
      id: "walk",
      title: "跌跌撞撞",
      age: "6个月-1岁",
      icon: iconWalk.url,
      bg: "var(--c-walk)",
      smallIcon: "👣",
      stories: [
        {
          id: "w1",
          title: "扶着沙发站起来",
          date: "2024.11.2",
          cover: PHOTO_A,
          thumbs: [PHOTO_A_THUMB, PHOTO_B_THUMB],
          extraCount: 1,
          note: "你扶着沙发慢慢站了起来，回头冲我们咧嘴笑，那一瞬间妈妈差点哭出来。",
        },
      ],
    },
    {
      id: "explore",
      title: "探索世界",
      age: "1岁-2岁",
      icon: iconExplore.url,
      bg: "var(--c-explore)",
      smallIcon: "🚙",
      stories: [
        {
          id: "e1",
          title: "第一次去海边",
          date: "2025.6.15",
          cover: PHOTO_B,
          thumbs: [PHOTO_B_THUMB, PHOTO_A_THUMB],
          extraCount: 8,
          note: "脚趾刚碰到海水你就缩回去了，可没一会儿就追着浪花跑得满沙滩都是脚印。",
        },
      ],
    },
    {
      id: "adventure",
      title: "小冒险家",
      age: "2岁-3岁",
      icon: iconAdventure.url,
      bg: "var(--c-adventure)",
      smallIcon: "🪁",
      stories: [
        {
          id: "a1",
          title: "第一次放风筝",
          date: "2026.3.20",
          cover: PHOTO_A,
          thumbs: [PHOTO_A_THUMB],
          extraCount: 4,
          note: "风筝飞起来的时候你举着线轴跑了很远，喊着“看！我的飞起来啦！”",
        },
      ],
    },
    {
      id: "continue",
      title: "继续长大",
      age: "3岁+",
      icon: iconContinue.url,
      bg: "var(--c-continue)",
      smallIcon: "📖",
      stories: [
        {
          id: "c1",
          title: "未来的故事",
          date: "待续…",
          cover: PHOTO_B,
          thumbs: [],
          extraCount: 0,
          note: "还有很多故事，慢慢写给你听。",
        },
      ],
    },
  ],
};
