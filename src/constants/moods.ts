export type MoodId =
  | "blissful"
  | "scary"
  | "peaceful"
  | "anxious"
  | "loving"
  | "confused"
  | "sad"
  | "empowered"
  | "mystical"
  | "eerie";

export type MoodOption = {
  id: MoodId;
  title: string;
  description: string;
};

export const MOOD_OPTIONS: MoodOption[] = [
  {
    id: "blissful",
    title: "Blissful",
    description: "Feeling pure happiness, lightness, floating joy.",
  },
  {
    id: "scary",
    title: "Scary / Fearful",
    description: "Nightmares, danger, being chased, dark unknowns.",
  },
  {
    id: "peaceful",
    title: "Peaceful",
    description: "Calm landscapes, quiet water, emotional stillness.",
  },
  {
    id: "anxious",
    title: "Anxious",
    description: "Being late, unprepared, lost, or under pressure.",
  },
  {
    id: "loving",
    title: "Loving / Romantic",
    description: "Deep connection, affection, warmth.",
  },
  {
    id: "confused",
    title: "Confused / Surreal",
    description: "Illogical events, shifting scenes, strange logic.",
  },
  {
    id: "sad",
    title: "Sad / Melancholic",
    description: "Loss, longing, emotional heaviness.",
  },
  {
    id: "empowered",
    title: "Empowered / Triumphant",
    description: "Flying, winning, overcoming obstacles.",
  },
  {
    id: "mystical",
    title: "Mystical / Transcendent",
    description: "Spiritual symbols, cosmic journeys, divine presence.",
  },
  {
    id: "eerie",
    title: "Eerie / Unsettling",
    description: "Subtle unease, quiet tension, something off.",
  },
];

export const POSITIVE_MOOD_IDS = new Set<MoodId>([
  "blissful",
  "peaceful",
  "loving",
  "empowered",
  "mystical",
]);

export function getMoodOptionById(id?: string | null) {
  if (!id) return undefined;
  return MOOD_OPTIONS.find((mood) => mood.id === id);
}

export function getMoodOptionByTitle(title?: string | null) {
  if (!title) return undefined;
  return MOOD_OPTIONS.find((mood) => mood.title === title);
}
