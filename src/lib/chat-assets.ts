export const CHAT_EMOJI_CATEGORIES = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: ["😀", "😂", "🥹", "😍", "🤩", "😎", "🥳", "😅", "😭", "🤔", "😴", "🙃"],
  },
  {
    id: "gestures",
    label: "Gestures",
    emojis: ["👍", "👏", "🙌", "🤝", "✌️", "🤞", "👋", "💪", "🙏", "🫶", "👀", "🔥"],
  },
  {
    id: "hearts",
    label: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💯", "✨", "⭐", "🎉"],
  },
  {
    id: "objects",
    label: "Fun",
    emojis: ["☕", "🍕", "🎨", "💡", "🚀", "📱", "🎯", "🏆", "🎤", "📸", "🎁", "⚡"],
  },
] as const;

export const CHAT_GIFS = [
  {
    id: "thumbs-up",
    alt: "Thumbs up",
    url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
  },
  {
    id: "clap",
    alt: "Clapping",
    url: "https://media.giphy.com/media/7zJMho4ZoBGHeesUFY/giphy.gif",
  },
  {
    id: "celebrate",
    alt: "Celebration",
    url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif",
  },
  {
    id: "laugh",
    alt: "Laughing",
    url: "https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif",
  },
  {
    id: "wow",
    alt: "Wow",
    url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif",
  },
  {
    id: "yes",
    alt: "Yes!",
    url: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
  },
  {
    id: "thinking",
    alt: "Thinking",
    url: "https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif",
  },
  {
    id: "high-five",
    alt: "High five",
    url: "https://media.giphy.com/media/l3q2j6j7iLjpgGf7G/giphy.gif",
  },
  {
    id: "dance",
    alt: "Dance",
    url: "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif",
  },
  {
    id: "heart-eyes",
    alt: "Heart eyes",
    url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  },
  {
    id: "ok",
    alt: "OK",
    url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
  },
  {
    id: "cheer",
    alt: "Cheering",
    url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
  },
] as const;

export const CHAT_STICKER_PACKS = [
  {
    id: "fof",
    label: "FOF",
    stickers: [
      { id: "wave", label: "Wave", url: "/chat/stickers/wave.svg" },
      { id: "heart", label: "Love", url: "/chat/stickers/heart.svg" },
      { id: "party", label: "Party", url: "/chat/stickers/party.svg" },
      { id: "fire", label: "Fire", url: "/chat/stickers/fire.svg" },
      { id: "star", label: "Star", url: "/chat/stickers/star.svg" },
      { id: "thumbs-up", label: "Nice", url: "/chat/stickers/thumbs-up.svg" },
      { id: "idea", label: "Idea", url: "/chat/stickers/idea.svg" },
      { id: "cool", label: "Cool", url: "/chat/stickers/cool.svg" },
    ],
  },
] as const;
