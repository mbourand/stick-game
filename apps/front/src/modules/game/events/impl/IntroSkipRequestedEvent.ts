export const IntroSkipRequested = (targetTime: number) => {
  return { targetTime };
};

export type IntroSkipRequestedEventType = ReturnType<typeof IntroSkipRequested>;
