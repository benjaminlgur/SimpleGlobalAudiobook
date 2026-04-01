import Constants from "expo-constants";

type ExpoExtra = {
  hostedConvexUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

export const HOSTED_CONVEX_URL =
  process.env.EXPO_PUBLIC_HOSTED_CONVEX_URL ?? extra.hostedConvexUrl;
