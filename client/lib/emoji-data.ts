const BASE_URL = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Telegram-Animated-Emojis/main";

export interface Emoji {
  name: string;
  url: string;
  category: string;
}

export interface EmojiCategory {
  name: string;
  icon: string;
  emojis: Emoji[];
}

// Helper to generate emoji URL
const getEmojiUrl = (category: string, name: string) =>
  `${BASE_URL}/${encodeURIComponent(category)}/${encodeURIComponent(name)}.webp`;

// Emoji shortcode mapping (for parsing messages)
export const emojiShortcodes: Record<string, string> = {
  ":smile:": getEmojiUrl("Smileys", "Smiling Face"),
  ":grin:": getEmojiUrl("Smileys", "Grinning Face"),
  ":laugh:": getEmojiUrl("Smileys", "Face With Tears Of Joy"),
  ":rofl:": getEmojiUrl("Smileys", "Rolling On The Floor Laughing"),
  ":wink:": getEmojiUrl("Smileys", "Winking Face"),
  ":heart_eyes:": getEmojiUrl("Smileys", "Smiling Face With Hearts"),
  ":kiss:": getEmojiUrl("Smileys", "Face Blowing A Kiss"),
  ":thinking:": getEmojiUrl("Smileys", "Thinking Face"),
  ":cool:": getEmojiUrl("Smileys", "Smiling Face With Sunglasses"),
  ":cry:": getEmojiUrl("Smileys", "Crying Face"),
  ":sob:": getEmojiUrl("Smileys", "Loudly Crying Face"),
  ":angry:": getEmojiUrl("Smileys", "Angry Face"),
  ":rage:": getEmojiUrl("Smileys", "Pouting Face"),
  ":exploding:": getEmojiUrl("Smileys", "Exploding Head"),
  ":skull:": getEmojiUrl("Smileys", "Skull"),
  ":fire:": getEmojiUrl("Symbols", "Fire"),
  ":heart:": getEmojiUrl("Symbols", "Red Heart"),
  ":thumbsup:": getEmojiUrl("People", "Thumbs Up"),
  ":thumbsdown:": getEmojiUrl("People", "Thumbs Down"),
  ":clap:": getEmojiUrl("People", "Clapping Hands"),
  ":wave:": getEmojiUrl("People", "Waving Hand"),
  ":pray:": getEmojiUrl("People", "Folded Hands"),
  ":100:": getEmojiUrl("Symbols", "Hundred Points"),
  ":party:": getEmojiUrl("Smileys", "Partying Face"),
  ":nerd:": getEmojiUrl("Smileys", "Nerd Face"),
  ":star_struck:": getEmojiUrl("Smileys", "Star Struck"),
  ":sleeping:": getEmojiUrl("Smileys", "Sleeping Face"),
  ":poop:": getEmojiUrl("Smileys", "Pile Of Poo"),
  ":ghost:": getEmojiUrl("Smileys", "Ghost"),
  ":robot:": getEmojiUrl("Smileys", "Robot"),
};

// Popular/frequently used emojis
export const popularEmojis: Emoji[] = [
  { name: "Smiling Face With Hearts", url: getEmojiUrl("Smileys", "Smiling Face With Hearts"), category: "Smileys" },
  { name: "Face With Tears Of Joy", url: getEmojiUrl("Smileys", "Face With Tears Of Joy"), category: "Smileys" },
  { name: "Grinning Face", url: getEmojiUrl("Smileys", "Grinning Face"), category: "Smileys" },
  { name: "Thinking Face", url: getEmojiUrl("Smileys", "Thinking Face"), category: "Smileys" },
  { name: "Winking Face", url: getEmojiUrl("Smileys", "Winking Face"), category: "Smileys" },
  { name: "Face Blowing A Kiss", url: getEmojiUrl("Smileys", "Face Blowing A Kiss"), category: "Smileys" },
  { name: "Smiling Face With Sunglasses", url: getEmojiUrl("Smileys", "Smiling Face With Sunglasses"), category: "Smileys" },
  { name: "Partying Face", url: getEmojiUrl("Smileys", "Partying Face"), category: "Smileys" },
  { name: "Star Struck", url: getEmojiUrl("Smileys", "Star Struck"), category: "Smileys" },
  { name: "Rolling On The Floor Laughing", url: getEmojiUrl("Smileys", "Rolling On The Floor Laughing"), category: "Smileys" },
  { name: "Loudly Crying Face", url: getEmojiUrl("Smileys", "Loudly Crying Face"), category: "Smileys" },
  { name: "Skull", url: getEmojiUrl("Smileys", "Skull"), category: "Smileys" },
];

// All emoji categories with their emojis
export const emojiCategories: EmojiCategory[] = [
  {
    name: "Smileys",
    icon: "😀",
    emojis: [
      "Grinning Face", "Grinning Face With Big Eyes", "Grinning Face With Smiling Eyes",
      "Beaming Face With Smiling Eyes", "Grinning Squinting Face", "Grinning Face With Sweat",
      "Rolling On The Floor Laughing", "Face With Tears Of Joy", "Slightly Smiling Face",
      "Upside Down Face", "Melting Face", "Winking Face", "Smiling Face With Smiling Eyes",
      "Smiling Face With Halo", "Smiling Face With Hearts", "Smiling Face With Heart Eyes",
      "Star Struck", "Face Blowing A Kiss", "Kissing Face", "Smiling Face",
      "Kissing Face With Closed Eyes", "Face Savoring Food", "Face With Tongue",
      "Winking Face With Tongue", "Squinting Face With Tongue", "Money Mouth Face",
      "Smiling Face With Sunglasses", "Nerd Face", "Face With Monocle", "Confused Face",
      "Worried Face", "Slightly Frowning Face", "Frowning Face", "Face With Open Mouth",
      "Hushed Face", "Astonished Face", "Flushed Face", "Pleading Face", "Crying Face",
      "Loudly Crying Face", "Face Screaming In Fear", "Confounded Face", "Persevering Face",
      "Disappointed Face", "Downcast Face With Sweat", "Weary Face", "Tired Face",
      "Yawning Face", "Angry Face", "Pouting Face", "Face With Steam From Nose",
      "Exploding Head", "Thinking Face", "Face With Raised Eyebrow", "Neutral Face",
      "Expressionless Face", "Face Without Mouth", "Smirking Face", "Unamused Face",
      "Face With Rolling Eyes", "Grimacing Face", "Lying Face", "Relieved Face",
      "Pensive Face", "Sleepy Face", "Drooling Face", "Sleeping Face", "Face With Medical Mask",
      "Face With Thermometer", "Face With Head Bandage", "Nauseated Face", "Face Vomiting",
      "Sneezing Face", "Hot Face", "Cold Face", "Woozy Face", "Dizzy Face",
      "Shushing Face", "Face With Hand Over Mouth", "Saluting Face", "Zipper Mouth Face",
      "Face With Peeking Eye", "Face In Clouds", "Face Exhaling", "Partying Face",
      "Disguised Face", "Skull", "Ghost", "Alien", "Robot", "Pile Of Poo", "Clown Face",
      "Cowboy Hat Face", "Smiling Face With Horns", "Angry Face With Horns", "Ogre", "Goblin"
    ].map(name => ({ name, url: getEmojiUrl("Smileys", name), category: "Smileys" }))
  },
  {
    name: "People",
    icon: "👋",
    emojis: [
      "Waving Hand", "Raised Back Of Hand", "Hand With Fingers Splayed", "Raised Hand",
      "Vulcan Salute", "Ok Hand", "Pinched Fingers", "Pinching Hand", "Victory Hand",
      "Crossed Fingers", "Love You Gesture", "Sign Of The Horns", "Call Me Hand",
      "Backhand Index Pointing Left", "Backhand Index Pointing Right", "Backhand Index Pointing Up",
      "Middle Finger", "Backhand Index Pointing Down", "Index Pointing Up", "Thumbs Up",
      "Thumbs Down", "Raised Fist", "Oncoming Fist", "Left Facing Fist", "Right Facing Fist",
      "Clapping Hands", "Raising Hands", "Open Hands", "Palms Up Together", "Handshake",
      "Folded Hands", "Writing Hand", "Nail Polish", "Selfie", "Flexed Biceps"
    ].map(name => ({ name, url: getEmojiUrl("People", name), category: "People" }))
  },
  {
    name: "Animals",
    icon: "🐱",
    emojis: [
      "Cat Face", "Cat", "Dog Face", "Dog", "Fox", "Bear", "Panda", "Koala",
      "Tiger Face", "Lion", "Cow Face", "Pig Face", "Frog", "Monkey Face",
      "Rabbit Face", "Hamster", "Mouse Face", "Wolf", "Unicorn", "Horse Face",
      "Chicken", "Penguin", "Bird", "Eagle", "Duck", "Owl", "Bat",
      "Shark", "Dolphin", "Whale", "Fish", "Octopus", "Butterfly", "Bug",
      "Honeybee", "Lady Beetle", "Snail", "Spider", "Turtle", "Snake", "Dragon"
    ].map(name => ({ name, url: getEmojiUrl("Animals and Nature", name), category: "Animals" }))
  },
  {
    name: "Food",
    icon: "🍕",
    emojis: [
      "Grapes", "Melon", "Watermelon", "Tangerine", "Lemon", "Banana", "Pineapple",
      "Mango", "Apple", "Green Apple", "Pear", "Peach", "Cherries", "Strawberry",
      "Tomato", "Avocado", "Eggplant", "Potato", "Carrot", "Corn", "Hot Pepper",
      "Cucumber", "Broccoli", "Garlic", "Onion", "Bread", "Croissant", "Pizza",
      "Hamburger", "French Fries", "Hot Dog", "Taco", "Burrito", "Popcorn",
      "Chocolate Bar", "Candy", "Lollipop", "Doughnut", "Cookie", "Birthday Cake", "Ice Cream"
    ].map(name => ({ name, url: getEmojiUrl("Food and Drink", name), category: "Food" }))
  },
  {
    name: "Objects",
    icon: "💡",
    emojis: [
      "Watch", "Mobile Phone", "Laptop", "Keyboard", "Desktop Computer", "Mouse",
      "Joystick", "Light Bulb", "Flashlight", "Candle", "Money Bag", "Dollar Banknote",
      "Credit Card", "Gem Stone", "Balance Scale", "Wrench", "Hammer", "Axe",
      "Pick", "Scissors", "Key", "Old Key", "Lock", "Unlocked", "Glasses",
      "Sunglasses", "Ring", "Bouquet", "Rose", "Cherry Blossom", "Fire", "Droplet",
      "Star", "Sparkles", "Balloon", "Party Popper", "Gift", "Trophy", "Medal"
    ].map(name => ({ name, url: getEmojiUrl("Objects", name), category: "Objects" }))
  },
  {
    name: "Symbols",
    icon: "❤️",
    emojis: [
      "Red Heart", "Orange Heart", "Yellow Heart", "Green Heart", "Blue Heart",
      "Purple Heart", "Black Heart", "White Heart", "Brown Heart", "Broken Heart",
      "Heart Exclamation", "Two Hearts", "Revolving Hearts", "Beating Heart",
      "Growing Heart", "Sparkling Heart", "Heart With Arrow", "Heart With Ribbon",
      "Hundred Points", "Anger Symbol", "Collision", "Dizzy", "Sweat Droplets",
      "Zzz", "Speech Balloon", "Thought Balloon", "Right Anger Bubble",
      "Check Mark", "Cross Mark", "Question Mark", "Exclamation Mark"
    ].map(name => ({ name, url: getEmojiUrl("Symbols", name), category: "Symbols" }))
  }
];

// Get shortcode from emoji name
export const getShortcode = (name: string): string => {
  return `:${name.toLowerCase().replace(/\s+/g, "_")}:`;
};

// Get all emojis as a flat array
export const getAllEmojis = (): Emoji[] => {
  const all: Emoji[] = []
  emojiCategories.forEach(category => {
    all.push(...category.emojis)
  })
  return all
}

// Build a complete shortcode map from all emojis
export const buildShortcodeMap = (): Record<string, string> => {
  const map: Record<string, string> = { ...emojiShortcodes }

  // Add all emojis with their auto-generated shortcodes
  emojiCategories.forEach(category => {
    category.emojis.forEach(emoji => {
      const shortcode = getShortcode(emoji.name)
      if (!map[shortcode]) {
        map[shortcode] = emoji.url
      }
    })
  })

  return map
}

// Parse message and replace shortcodes with emoji markers
export const parseEmojisInMessage = (message: string): string => {
  const allShortcodes = buildShortcodeMap()
  let parsed = message

  Object.entries(allShortcodes).forEach(([shortcode, url]) => {
    // Use regex to match whole shortcodes only
    const regex = new RegExp(shortcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    parsed = parsed.replace(regex, `[[EMOJI:${url}]]`)
  })

  return parsed
}
