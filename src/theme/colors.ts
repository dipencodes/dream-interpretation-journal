// src/theme/colors.ts
export const colors = {
    // Base backgrounds
    bg: {
      base: "#F7F3EE",      // warm off-white / sand
      surface: "#FFFFFF",   // cards, sheets
      elevated: "#FBF7F2",  // subtle alt background
    },
  
    // Brand / accents
    brand: {
      primary: "#4E6E5D",   // Ashram Green
      saffron: "#D4A373",   // Soft Saffron (muted)
      copper: "#8C5A2B",    // Temple bell copper (sparingly)
    },
  
    // Text
    text: {
      primary: "#2E2E2E",   // deep charcoal
      secondary: "#6B6B6B", // muted stone
      inverse: "#FFFFFF",
    },
  
    // Borders & dividers
    border: {
      subtle: "#E7DED3",
      default: "#D8CBBE",
    },
  
    // Chat bubbles
    chat: {
      userBubble: "#E6EFE9",
      botBubble: "#F1E6D8",
    },
  
    // System states
    state: {
      success: "#2F7A5A",
      warning: "#B07B2C",
      danger: "#B04A3F",
      info: "#3D6D7A",
    },
  } as const;
  
  export type AppColors = typeof colors;
  