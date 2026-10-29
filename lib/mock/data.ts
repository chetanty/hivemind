// Template bank for the M1 mock simulator. Replaced by real LLM calls in M2/M3.
import type { Category, Platform, Stance, StanceSplit } from "../types";

export const CATEGORY_KEYWORDS: [Category, RegExp][] = [
  ["terror", /\b(terror\w*|shooting|gunman|hostage|bombing|stabbing|massacre)\b/i],
  ["disaster", /\b(earthquake|quake|hurricane|typhoon|cyclone|flood\w*|wildfire|tsunami|volcan\w*|storm|tornado|drought|outbreak|pandemic)\b/i],
  ["celebrity_death", /\b(dies|died|death of|passed away|is dead|dead at|funeral)\b/i],
  ["war", /\b(invade\w*|invasion|war|missile\w*|troops|airstrike\w*|bomb\w*|ceasefire|annex\w*|border clash|military)\b/i],
  ["economic", /\b(fed|rates?|crash\w*|inflation|recession|stocks?|market\w*|tariff\w*|bank\w*|default\w*|dollar|bitcoin|layoffs?|unemployment)\b/i],
  ["election", /\b(election|elected|wins|vote\w*|ballot|president\w*|prime minister|referendum|runoff|primary)\b/i],
  ["scandal", /\b(scandal|fraud|lawsuit|leak\w*|fired|resign\w*|bans?|banned|fine[ds]?|antitrust|recall\w*|caught|cover-?up|selling|data)\b/i],
  ["tech_launch", /\b(launch\w*|release\w*|unveil\w*|announce\w*|iphone|ai|app|model|device|headset|update|sideload\w*)\b/i],
];

export const SEVERITY_HINTS: [RegExp, number][] = [
  [/\b(invade\w*|nuclear|massacre|dead|dies|killed|earthquake|tsunami|crash\w*|collapse\w*)\b/i, 5],
  [/\b(war|attack|bomb\w*|emergency|hurricane|default|shooting)\b/i, 4],
  [/\b(bans?|fraud|scandal|cuts?|hike\w*|wins|resign\w*|layoffs?)\b/i, 3],
];

export const BASE_STANCE: Record<Category, StanceSplit> = {
  war: { condemn: 0.46, support: 0.1, indifferent: 0.16, conspiracy: 0.14, humor: 0.14 },
  terror: { condemn: 0.6, support: 0.04, indifferent: 0.12, conspiracy: 0.16, humor: 0.08 },
  election: { condemn: 0.3, support: 0.3, indifferent: 0.15, conspiracy: 0.12, humor: 0.13 },
  scandal: { condemn: 0.45, support: 0.1, indifferent: 0.17, conspiracy: 0.08, humor: 0.2 },
  celebrity_death: { condemn: 0.05, support: 0.55, indifferent: 0.15, conspiracy: 0.1, humor: 0.15 },
  tech_launch: { condemn: 0.27, support: 0.28, indifferent: 0.2, conspiracy: 0.07, humor: 0.18 },
  economic: { condemn: 0.3, support: 0.2, indifferent: 0.2, conspiracy: 0.12, humor: 0.18 },
  disaster: { condemn: 0.16, support: 0.52, indifferent: 0.12, conspiracy: 0.12, humor: 0.08 },
};

export const PHASE_SHIFT: Record<string, StanceSplit> = {
  hour1: { condemn: 1.0, support: 0.9, indifferent: 1.3, conspiracy: 0.6, humor: 0.85 },
  day1: { condemn: 1, support: 1, indifferent: 1, conspiracy: 1, humor: 1 },
  week1: { condemn: 0.75, support: 0.9, indifferent: 1.6, conspiracy: 1.4, humor: 1.2 },
};

export const PLATFORM_SKEW: Record<Platform, StanceSplit> = {
  x: { condemn: 1, support: 1, indifferent: 0.7, conspiracy: 1.3, humor: 1.3 },
  reddit: { condemn: 1.15, support: 0.9, indifferent: 0.8, conspiracy: 0.7, humor: 1.5 },
  tiktok: { condemn: 0.9, support: 0.9, indifferent: 1.1, conspiracy: 1.1, humor: 1.7 },
  facebook: { condemn: 1.05, support: 1.3, indifferent: 0.9, conspiracy: 1.4, humor: 0.6 },
  youtube: { condemn: 0.9, support: 1, indifferent: 0.9, conspiracy: 1.6, humor: 1.1 },
  news: { condemn: 1.25, support: 1.1, indifferent: 0.8, conspiracy: 1, humor: 0.5 },
};

export const PLATFORM_MIX: Record<Platform, number> = {
  x: 0.25,
  reddit: 0.2,
  tiktok: 0.2,
  facebook: 0.15,
  youtube: 0.1,
  news: 0.1,
};

export const EMOTIONS: Record<Stance, string[]> = {
  condemn: ["anger", "grief", "disgust", "fear"],
  support: ["hope", "pride", "relief", "sympathy"],
  indifferent: ["boredom", "fatigue", "detachment"],
  conspiracy: ["suspicion", "distrust", "smugness"],
  humor: ["amusement", "irony", "gallows humor"],
};

export interface NarrativeTemplate {
  name: string;
  stance: Stance;
  posts: string[];
}

// {A} = main actor, {B} = second actor (falls back to generic words)
export const NARRATIVES: Record<Category, NarrativeTemplate[]> = {
  war: [
    { name: "Stand with the invaded", stance: "condemn", posts: [
      "There is no 'both sides' here. {A} started this and the world needs to say so.",
      "Watching the footage at 3am and feeling completely useless. Donate where you can.",
      "Sanctions yesterday. Not next week. Yesterday.",
    ] },
    { name: "Is this WW3?", stance: "condemn", posts: [
      "ok so who else is checking how far they live from a military base",
      "my group chat went from memes to bunker prices in 40 minutes",
      "every alert on my phone today has made my heart stop",
    ] },
    { name: "Follow the oil money", stance: "conspiracy", posts: [
      "Funny how this happens the same week the defense contractors report earnings.",
      "Nobody is asking who benefits. Ask who benefits.",
      "The timing on this is too clean. Remember what they told us last time.",
    ] },
    { name: "Not our war", stance: "indifferent", posts: [
      "Respectfully, I can't afford groceries. Why is this my problem?",
      "We have problems at home. Fix those first.",
      "Another war on the news. I'll check back when it's over.",
    ] },
    { name: "They were provoked", stance: "support", posts: [
      "Everyone screaming now was silent for years of provocations. Context matters.",
      "Strength is the only language that works. Weakness invited this.",
      "Read some history before you post. {A} warned everyone for years.",
    ] },
  ],
  terror: [
    { name: "Thoughts are not enough", stance: "condemn", posts: [
      "Thoughts and prayers again. How many more times?",
      "I can't stop thinking about the families waiting for a phone call.",
      "Whoever did this, I hope they face every consequence there is.",
    ] },
    { name: "Don't blame a whole group", stance: "condemn", posts: [
      "Already seeing people blame an entire community. Stop. Wait for facts.",
      "The attacker wanted division. Don't hand it to them.",
      "Hate answering hate is exactly the plan. Don't play along.",
    ] },
    { name: "False flag talk", stance: "conspiracy", posts: [
      "Why were the cameras down that exact hour? Asking questions isn't a crime.",
      "Watch which law gets proposed next week. That's your answer.",
      "Official story changed twice before lunch. Interesting.",
    ] },
    { name: "Security theater incoming", stance: "indifferent", posts: [
      "Can't wait to take my shoes off for another 20 years.",
      "Nothing will change except longer lines at the stadium.",
      "Sad, but this is the world now. Back to work.",
    ] },
  ],
  election: [
    { name: "The people have spoken", stance: "support", posts: [
      "Democracy worked. Congrats to everyone who knocked doors in the rain.",
      "Finally. A mandate. Now deliver.",
      "Cried at the speech, not ashamed. Big night.",
    ] },
    { name: "The country is lost", stance: "condemn", posts: [
      "I genuinely don't recognize this country anymore.",
      "Half of my neighbors voted for this. Let that sink in.",
      "Four more years of this. Checking visa requirements, not joking.",
    ] },
    { name: "It was rigged", stance: "conspiracy", posts: [
      "Explain the 3am ballot jump. I'll wait.",
      "Funny how the polls were 'wrong' in exactly one direction.",
      "Machines counted, humans didn't. Think about it.",
    ] },
    { name: "Same circus, new clowns", stance: "indifferent", posts: [
      "Both of them were going to raise my rent anyway.",
      "Nothing changes for people like me. Never has.",
      "Turned off the TV at 9pm. Best decision of the year.",
    ] },
  ],
  scandal: [
    { name: "Hold them accountable", stance: "condemn", posts: [
      "Fine them a percentage of revenue or it's just a cost of doing business.",
      "{A} knew. Internal emails always show they knew.",
      "Deleting my account today. Who's coming with me?",
    ] },
    { name: "Everyone does it", stance: "indifferent", posts: [
      "Shocked, shocked I tell you. Every company does this.",
      "This will be forgotten by Friday. It always is.",
      "Anyway, the stock is up 2%.",
    ] },
    { name: "A distraction story", stance: "conspiracy", posts: [
      "Ask what else got announced today while everyone's looking at this.",
      "This 'leak' was planned. Classic PR maneuver.",
      "Competitors fed this to the press. Follow the lobbyists.",
    ] },
    { name: "Defending the brand", stance: "support", posts: [
      "Honestly I trust {A} more than the regulators on this.",
      "Overblown. The product still works and I'm still using it.",
      "Everyone's piling on for clicks. Read the actual statement.",
    ] },
  ],
  celebrity_death: [
    { name: "Tributes and memories", stance: "support", posts: [
      "Their work got me through the worst year of my life. Thank you. Rest easy.",
      "Played their album on repeat all day. Hits different now.",
      "One of the greats. They don't make them like that anymore.",
    ] },
    { name: "Treated badly while alive", stance: "condemn", posts: [
      "The same outlets mocking them for years are now posting tributes. Spare me.",
      "We celebrate people only after it's too late.",
      "The industry chewed them up. Say it.",
    ] },
    { name: "Something doesn't add up", stance: "conspiracy", posts: [
      "Healthy one week, gone the next? Odd timing given what they were about to say.",
      "Notice nobody's releasing the details.",
      "Third one this year who was 'about to talk'.",
    ] },
    { name: "Who?", stance: "indifferent", posts: [
      "Sorry for their family, but I genuinely didn't know who this was.",
      "Parasocial grief is wild to watch from the outside.",
      "Sad but not my business. Back to the game.",
    ] },
  ],
  tech_launch: [
    { name: "Take my money", stance: "support", posts: [
      "Pre-ordered before the keynote ended. No regrets.",
      "This changes everything. Again.",
      "People will complain then buy it anyway. I'm just skipping the complaining.",
    ] },
    { name: "Anti-consumer move", stance: "condemn", posts: [
      "So I paid for the device but {A} still decides what I can install? No.",
      "Regulators, this is your cue.",
      "Walled garden got another wall. Switching next upgrade.",
    ] },
    { name: "It's surveillance", stance: "conspiracy", posts: [
      "Read the privacy policy. Then read it again. It's a data hose.",
      "Free features are never free. You're the training data.",
      "Mic is always on. Prove me wrong.",
    ] },
    { name: "Nobody asked for this", stance: "indifferent", posts: [
      "My phone from four years ago still works fine.",
      "Wake me up when the battery lasts two days.",
      "Another launch, another price hike. Pass.",
    ] },
  ],
  economic: [
    { name: "Who pays for this", stance: "condemn", posts: [
      "Banks get a soft landing. We get the bill. Every time.",
      "My rent didn't get the memo about any of this.",
      "Wages flat for years and now this. Unreal.",
    ] },
    { name: "Buy the dip", stance: "support", posts: [
      "Fear is a discount. Loading up.",
      "Long term this is bullish. Zoom out.",
      "Mortgage refi time, finally some good news.",
    ] },
    { name: "Rigged for the rich", stance: "conspiracy", posts: [
      "Someone knew this was coming. Look at Friday's options volume.",
      "The whole system is a casino and the house told itself the odds.",
      "Watch who buys the cheap assets next month.",
    ] },
    { name: "Doesn't change my life", stance: "indifferent", posts: [
      "Market's down? I don't own a market.",
      "Numbers on a screen. Groceries still cost what they cost.",
      "Explain it like I'm 5 or don't bother.",
    ] },
  ],
  disaster: [
    { name: "Help where you can", stance: "support", posts: [
      "Here are verified donation links, please avoid the scam pages.",
      "Rescue teams have been working 30 hours straight. Heroes.",
      "If you're in the area, the school gym is open as a shelter.",
    ] },
    { name: "This was preventable", stance: "condemn", posts: [
      "Building codes existed. Nobody enforced them.",
      "Scientists warned about this exact scenario for a decade.",
      "Climate isn't 'coming'. It's here.",
    ] },
    { name: "Weather weapons", stance: "conspiracy", posts: [
      "Strange how it hit right where the land deal was blocked.",
      "Why did the warning system fail that exact night?",
      "Look up the patents before you laugh.",
    ] },
    { name: "Compassion fatigue", stance: "indifferent", posts: [
      "Another disaster, another round of hashtags.",
      "Terrible, truly. I just can't keep up with all of them.",
      "News will move on by Tuesday. It always does.",
    ] },
  ],
};

export const SHARED_NARRATIVES: Record<"humor" | "indifferent" | "conspiracy", NarrativeTemplate> = {
  humor: { name: "Meme mode", stance: "humor", posts: [
    "the timeline when {A} trends: [screaming]",
    "not me finding out about this from a meme",
    "putting this in the group chat with zero context",
    "2026 writers really said 'one more plot twist'",
    "me pretending to understand this at dinner",
    "someone already made a soundtrack for this, the internet is undefeated",
  ] },
  indifferent: { name: "Why should I care", stance: "indifferent", posts: [
    "Logging off for the day.",
    "Wake me up when it affects my rent.",
  ] },
  conspiracy: { name: "What they're not telling you", stance: "conspiracy", posts: [
    "Look at the timing. Then look again.",
    "Every outlet using the same phrasing. Coincidence?",
  ] },
};

export const CHARACTER_LEANS: Record<string, Record<Category, Stance>> = {
  conservative: { war: "support", terror: "condemn", election: "support", scandal: "condemn", celebrity_death: "support", tech_launch: "indifferent", economic: "condemn", disaster: "support" },
  liberal: { war: "condemn", terror: "condemn", election: "condemn", scandal: "condemn", celebrity_death: "support", tech_launch: "conspiracy", economic: "condemn", disaster: "condemn" },
  anon: { war: "conspiracy", terror: "conspiracy", election: "indifferent", scandal: "conspiracy", celebrity_death: "conspiracy", tech_launch: "humor", economic: "conspiracy", disaster: "conspiracy" },
  npc: { war: "condemn", terror: "condemn", election: "indifferent", scandal: "humor", celebrity_death: "support", tech_launch: "support", economic: "indifferent", disaster: "support" },
};

export const CHARACTER_POSTS: Record<string, Record<Stance, string[]>> = {
  conservative: {
    condemn: ["Been watching this all morning. {A} ought to be ashamed. We used to call things what they were. 🇺🇸", "I'll tell you what, folks, somebody needs to answer for this. And not with a press release."],
    support: ["Finally somebody with a backbone. Media's gonna spin it but I know what I'm seeing.", "Say what you want, but this is what standing your ground looks like."],
    indifferent: ["Not gonna lose sleep over it. Got work in the morning and the news will say something different tomorrow."],
    conspiracy: ["Notice how every channel is reading the same script? Somebody wrote that script."],
    humor: ["Wife asked what I think about it. Told her I think it's time for coffee. ☕"],
  },
  liberal: {
    condemn: ["I can't stop thinking about the people this actually hurts. Sharing resources in my stories, please amplify 🧵", "genuinely furious and also exhausted. we keep doing this. the people paying for it never chose it."],
    support: ["okay this is genuinely good news?? let me have one (1) hopeful day", "made a doc of verified ways to help, link in bio. please share 🧵"],
    indifferent: ["trying to log off but the algorithm said no. taking a walk. drink water."],
    conspiracy: ["not saying it's planned but the timing w/ the other news cycle is... a choice. who profits here?"],
    humor: ["my professor just said 'let's not discuss current events' and the whole class laughed nervously 💀"],
  },
  anon: {
    condemn: ["lol everyone pretending to be shocked like this wasn't obvious 6 months ago"],
    support: ["unpopular opinion but this is based and you all know it"],
    indifferent: ["another day another main character. wake me when something real happens"],
    conspiracy: ["screencap this. in 2 weeks you'll see what this was actually for", "three outlets, same headline, same minute. nobody finds that weird?"],
    humor: ["the timeline is cooking itself again. grab popcorn"],
  },
  npc: {
    condemn: ["this is literally so scary 😳 praying for everyone 🙏🙏", "can't believe this is happening rn 😭 so sad"],
    support: ["love this for us honestly 🙌✨", "this is so wholesome omg 🥹"],
    indifferent: ["wait what happened?? someone explain 😂", "idk what's going on but ok 🤷"],
    conspiracy: ["not gonna lie this seems kinda sus 👀"],
    humor: ["the memes about this are sending me 💀💀", "{A} trending again 😂 the internet is undefeated"],
  },
};
