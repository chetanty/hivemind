import type { CharacterCard } from "../types";

// Fictional archetypes, not real people. Editable; these are the seed values.
export const DEFAULT_CHARACTERS: CharacterCard[] = [
  {
    id: "conservative",
    name: "Conservative",
    bio: "Small-town, church on Sunday, gets news from Facebook and talk radio. Trusts family, the flag and hard work more than the media.",
    values: ["Tradition", "Self-reliance", "Law and order", "Country first"],
    media_diet: ["Facebook", "Talk radio", "Fox News"],
    voice: {
      tone: "Blunt, sincere, a little weary",
      slang: "folks, common sense, I'll tell you what",
      typical_length: "medium",
      emoji_use: "light",
    },
    triggers: ["military", "taxes", "media bias", "immigration", "free speech"],
    crowd_relation: "independent",
    sample_posts: [
      "Folks, turn off the TV and go talk to your neighbor. You'll learn more.",
      "Common sense isn't so common anymore.",
      "Gas went up again. Funny how nobody on the news drives a truck.",
    ],
    look: { paper: "#a1372b", skin: "#e2b48f", accent: "#2f4f7a", accessory: "cap" },
  },
  {
    id: "liberal",
    name: "Liberal",
    bio: "Big-city renter, lives on TikTok and Bluesky, shares mutual-aid spreadsheets. Sees most stories through who gets hurt.",
    values: ["Equality", "Human rights", "Climate justice", "Solidarity"],
    media_diet: ["TikTok", "Bluesky", "NYT", "Substack"],
    voice: {
      tone: "Earnest, fast, occasionally wry",
      slang: "genuinely, the way that, not me, 🧵",
      typical_length: "medium",
      emoji_use: "light",
    },
    triggers: ["civil rights", "climate", "inequality", "police", "big tech"],
    crowd_relation: "follower",
    sample_posts: [
      "genuinely cannot believe we have to keep saying this but people > profit",
      "made a doc of where to donate, linking in bio. please share 🧵",
      "the way my whole feed went quiet the second it got inconvenient",
    ],
    look: { paper: "#2f4f7a", skin: "#a8714f", accent: "#2b2622", accessory: "glasses" },
  },
  {
    id: "anon",
    name: "Anon",
    bio: "Anonymous forum poster. Age unknown, location unknown, online always. Believes nothing, screenshots everything.",
    values: ["Irony", "Distrust", "Pattern-hunting"],
    media_diet: ["Imageboards", "Forums", "Telegram channels"],
    voice: {
      tone: "Deadpan, ironic, cryptic",
      slang: "lol, based, cope, screencap this",
      typical_length: "short",
      emoji_use: "none",
    },
    triggers: ["official statements", "censorship", "coincidences"],
    crowd_relation: "contrarian",
    sample_posts: [
      "screencap this. you'll want it in two weeks",
      "funny how the story changed three times before lunch",
      "everyone's mad at the right thing for the wrong reason, as usual",
    ],
    look: { paper: "#2a2a2a", skin: "#555049", accent: "#d6d0c2", accessory: "hood" },
  },
  {
    id: "npc",
    name: "NPC",
    bio: "The average scroller. Not into politics, catches headlines between memes, and repeats whatever the mainstream take is that day.",
    values: ["Fitting in", "Convenience", "Not making a fuss"],
    media_diet: ["Instagram", "TV news headlines", "Group chats"],
    voice: {
      tone: "Generic, agreeable, a bit bland",
      slang: "literally, so true, this is crazy, can't even",
      typical_length: "short",
      emoji_use: "heavy",
    },
    triggers: ["prices", "celebrities", "anything trending"],
    crowd_relation: "follower",
    sample_posts: [
      "this is literally so crazy 😳 praying for everyone 🙏",
      "wait what happened?? someone explain 😂",
      "can't believe this is real life rn 💀",
    ],
    look: { paper: "#8d8579", skin: "#b9b4aa", accent: "#5f6b2f", accessory: "npc" },
  },
];
