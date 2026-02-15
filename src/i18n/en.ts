export const en = {
  onboarding: {
    title: "We’re starting now — here we go on this journey!",
    subtitle:
      "Capture your dreams, spot patterns, and get gentle AI insights whenever you’re ready.",
    cta: "Start Interpreting your Dreams",
  },

  dreamInput: {
    title: "Tell me your dream",
    subtitle: "Write what you remember. We’ll interpret the meaning using AI.",
    dateLabel: "Dream date",
    dreamLabel: "Your dream",
    placeholder: "Start writing…\n\nWhat happened? Who was there?\nWhat did you feel?",
    helper:
      "Tip: include emotions, people, places, colors, and anything that felt important.",
    cta: "Continue",
    back: "Back",
  },

  dreamMood: {
    title: "How did this dream feel?",
    subtitle: "Choose one mood before saving your dream.",
    saveCta: "Save",
    saveAndInterpretCta: "Save and AI Interpretation",
    saveError: "Could not save your dream. Please try again.",
    interpretError: "Could not generate interpretation. Please try again.",
  },

  dreamInterpretMethod: {
    title: "Choose your interpretation method",
    subtitle: "Pick one method, then interpret your dream.",
    makeDefault: "Make this default method",
    interpretCta: "Interpret",
    error: "Could not interpret this dream. Please try again.",
  },

  dreamSummary: {
    title: "Dream Reflection",
    subtitle: "Read your dream and interpretation, then decide what to do next.",
    yourDream: "Your Dream",
    mood: "Mood",
    interpretation: "Interpretation",
    interpretOthers: "Interpret in other methods",
    noInterpretation: "No AI interpretation was generated for this entry.",
  },

  home: {
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    namePlaceholder: "What should we call you?",
    tapToEditName: "Tap to edit",
    readyTitle: "Get ready for sleep:",
    quickActionOneTitle: "Random Dream",
    quickActionOneSubtitle: "A good way to get in the mood for sleep.",
    quickActionTwoTitle: "LD Technique",
    quickActionTwoSubtitle: "Train your lucid dreaming skills tonight.",
    quickStatsTitle: "Quick stats",
    positiveDreamsLabel: "Positive Dreams",
    negativeDreamsLabel: "Negative Dreams",
    quickStatsSeeMoreCta: "See more",
    recentSectionTitle: "Recent dream",
    recentSectionSubtext: "Your latest saved dream.",
    viewAllDreamsCta: "View all dreams",
    emptyRecent: "No dreams saved yet. Log a new dream to begin your journal.",
    logNewDreamCta: "Log New Dream",
    recommendationTitle: "Recommendation",
    recommendationCardTitle: "Enable morning notifications",
    recommendationCardSubtitle:
      "You are likely to remember your dreams more in the morning.",
  },

  journal: {
    title: "Journal",
    searchPlaceholder: "Search in your dreams",
    addDreamCta: "Dream",
    empty: "No dreams found. Add a dream to start your journal.",
  },

  settings: {
    title: "Settings",
    subtitle: "Customize how your dream journal works.",
    interpretationTitle: "Interpretation Method",
    interpretationSubtitle:
      "Choose your default interpretation method. Select None to show method options every time.",
    interpretationMenuSubtitle: "Set your default AI interpretation method.",
    notificationsTitle: "Notifications",
    notificationsMenuSubtitle: "Enable reminders and choose morning time.",
  },

  notifications: {
    title: "Notifications",
    subtitle:
      "Enable notifications to remind you to write down your dreams upon awakening.",
    morningToggleLabel: "Morning notifications",
    timeLabel: "Time",
    permissionTitle: "Permission needed",
    permissionDeniedMessage:
      "Please allow notifications to enable morning reminders.",
    saveError: "Could not update notifications settings. Please try again.",
  },

  common: {},
} as const;
