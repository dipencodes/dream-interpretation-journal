export const colors = {
  // Base backgrounds
  bg: {
    base: "#FFFFFF",
    surface: "#FFFFFF",
    elevated: "#F7F7F7",
  },

  // Brand / accents
  brand: {
    primary: "#F28C28", // Headspace-like orange
    saffron: "#FFD6A8", // soft warm highlight
    copper: "#D97706",  // deeper orange (sparingly)
  },

  // Text
  text: {
    primary: "#1F1F1F",
    secondary: "#6B6B6B",
    inverse: "#FFFFFF",
  },

  // Borders & dividers
  border: {
    subtle: "#EAEAEA",
    default: "#DADADA",
  },

  // Chat bubbles (optional for later)
  chat: {
    userBubble: "#FFF1E5",
    botBubble: "#F3F4F6",
  },

  // System states (used for soft bubble tints above)
  state: {
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#3B82F6",
  },
} as const;

export type AppColors = typeof colors;
