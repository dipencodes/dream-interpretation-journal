import React from "react";
import Svg, { Circle, Line, Path } from "react-native-svg";
import type { MoodId } from "../constants/moods";

type Props = {
  id: MoodId;
  size?: number;
  stroke?: string;
};

export function MoodIcon({ id, size = 28, stroke = "#D97706" }: Props) {
  switch (id) {
    case "blissful":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Circle cx="14" cy="14" r="5" stroke={stroke} strokeWidth="2" />
          <Line x1="14" y1="2" x2="14" y2="7" stroke={stroke} strokeWidth="2" />
          <Line x1="14" y1="21" x2="14" y2="26" stroke={stroke} strokeWidth="2" />
          <Line x1="2" y1="14" x2="7" y2="14" stroke={stroke} strokeWidth="2" />
          <Line x1="21" y1="14" x2="26" y2="14" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case "scary":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Path d="M6 23L14 5L22 23H6Z" stroke={stroke} strokeWidth="2" />
          <Line x1="14" y1="11" x2="14" y2="16" stroke={stroke} strokeWidth="2" />
          <Circle cx="14" cy="19" r="1.2" fill={stroke} />
        </Svg>
      );
    case "peaceful":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Path d="M14 4C10 8 10 14 14 20C18 14 18 8 14 4Z" stroke={stroke} strokeWidth="2" />
          <Path d="M6 22C8 20 10 20 12 22" stroke={stroke} strokeWidth="2" />
          <Path d="M16 22C18 20 20 20 22 22" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case "anxious":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Circle cx="14" cy="14" r="10" stroke={stroke} strokeWidth="2" />
          <Circle cx="14" cy="14" r="1.4" fill={stroke} />
          <Line x1="14" y1="7" x2="14" y2="12" stroke={stroke} strokeWidth="2" />
          <Line x1="19" y1="14" x2="16" y2="14" stroke={stroke} strokeWidth="2" />
          <Line x1="14" y1="21" x2="14" y2="18" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case "loving":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Path
            d="M14 23C9 19 6 16 6 12C6 9.8 7.8 8 10 8C11.7 8 13.3 8.9 14 10.3C14.7 8.9 16.3 8 18 8C20.2 8 22 9.8 22 12C22 16 19 19 14 23Z"
            stroke={stroke}
            strokeWidth="2"
          />
        </Svg>
      );
    case "confused":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Path
            d="M10 10C10 8.3 11.3 7 13 7H15C16.7 7 18 8.3 18 10C18 11.4 17 12.1 16 12.8C15 13.5 14 14.1 14 15.5V16"
            stroke={stroke}
            strokeWidth="2"
          />
          <Circle cx="14" cy="20" r="1.3" fill={stroke} />
          <Path d="M5 14C5 9 9 5 14 5" stroke={stroke} strokeWidth="2" />
          <Path d="M23 14C23 19 19 23 14 23" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case "sad":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Circle cx="14" cy="12" r="7" stroke={stroke} strokeWidth="2" />
          <Circle cx="11.5" cy="11" r="1" fill={stroke} />
          <Circle cx="16.5" cy="11" r="1" fill={stroke} />
          <Path d="M10 16C11 14.7 12.3 14 14 14C15.7 14 17 14.7 18 16" stroke={stroke} strokeWidth="2" />
          <Path d="M20 17C21.2 18 21.2 19.5 20 21C18.8 19.5 18.8 18 20 17Z" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case "empowered":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Path d="M5 18L14 6L23 18L14 15L5 18Z" stroke={stroke} strokeWidth="2" />
          <Line x1="14" y1="15" x2="14" y2="23" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case "mystical":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Path
            d="M14 5L16 11L22 14L16 17L14 23L12 17L6 14L12 11L14 5Z"
            stroke={stroke}
            strokeWidth="2"
          />
          <Circle cx="22" cy="7" r="1.3" fill={stroke} />
          <Circle cx="7" cy="21" r="1.1" fill={stroke} />
        </Svg>
      );
    case "eerie":
      return (
        <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
          <Path
            d="M6 20C7.5 17 9.5 17 11 20C12.5 17 14.5 17 16 20C17.5 17 19.5 17 21 20"
            stroke={stroke}
            strokeWidth="2"
          />
          <Path
            d="M5 15C7 13 9 13 11 15C13 13 15 13 17 15C19 13 21 13 23 15"
            stroke={stroke}
            strokeWidth="2"
          />
          <Path d="M7 10C9 8 11 8 13 10C15 8 17 8 19 10" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    default:
      return null;
  }
}
