import React from "react";
import { View, Image } from "react-native";
import Svg, { Circle, Ellipse, Path, G } from "react-native-svg";

export function DreamingIllustration({
  height = 220,
}: {
  height?: number;
}) {
  // Width is proportional so it looks good on most screens
  const width = Math.round((height * 360) / 260);

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={height} viewBox="0 0 360 260">
        {/* soft background glow */}
        <Ellipse cx="180" cy="130" rx="150" ry="105" fill="#F7F7F7" />

        {/* cloud base */}
        <G>
          <Ellipse cx="140" cy="175" rx="72" ry="38" fill="#FFFFFF" />
          <Ellipse cx="205" cy="175" rx="78" ry="42" fill="#FFFFFF" />
          <Ellipse cx="175" cy="162" rx="120" ry="52" fill="#FFFFFF" />
          <Path
            d="M70 180c18 26 62 44 110 44s92-18 110-44"
            stroke="#EAEAEA"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </G>

        {/* sleeping person */}
        <G>
          {/* pillow */}
          <Path
            d="M122 166c0-12 10-22 22-22h54c12 0 22 10 22 22v26c0 12-10 22-22 22h-54c-12 0-22-10-22-22v-26z"
            fill="#F3F4F6"
          />
          <Path
            d="M128 170c0-9 7-16 16-16h48c9 0 16 7 16 16v16c0 9-7 16-16 16h-48c-9 0-16-7-16-16v-16z"
            fill="#FFFFFF"
          />

          {/* head */}
          <Circle cx="168" cy="165" r="22" fill="#F3D5C7" />
          {/* hair */}
          <Path
            d="M149 163c3-16 18-26 33-20 8 3 13 10 14 18-2-3-6-6-11-7-9-3-18 1-22 9-4 8-14 9-14 0z"
            fill="#3B3B3B"
            opacity="0.9"
          />
          {/* closed eye */}
          <Path
            d="M160 167c4 3 10 3 14 0"
            stroke="#1F1F1F"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
          {/* smile */}
          <Path
            d="M162 176c3 3 9 3 12 0"
            stroke="#1F1F1F"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
          />

          {/* blanket */}
          <Path
            d="M120 205c0-26 26-46 60-46s60 20 60 46v16H120v-16z"
            fill="#E8F1FF"
          />
          <Path
            d="M120 205c0-26 26-46 60-46s60 20 60 46"
            stroke="#DADADA"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
        </G>

        {/* dream bubbles */}
        <G opacity="0.95">
          <Circle cx="255" cy="95" r="36" fill="#E8F1FF" />
          <Circle cx="226" cy="122" r="10" fill="#E8F1FF" />
          <Circle cx="208" cy="138" r="6" fill="#E8F1FF" />

          {/* moon */}
          <Path
            d="M265 86c-8 4-12 14-8 22 4 8 14 12 22 8-5 7-15 10-24 6-12-6-17-20-11-32 5-10 18-15 31-11-4-1-7 0-10 2z"
            fill="#F28C28"
            opacity="0.9"
          />
          {/* stars */}
          <Path
            d="M245 80l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z"
            fill="#F28C28"
            opacity="0.8"
          />
          <Path
            d="M285 105l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"
            fill="#F28C28"
            opacity="0.75"
          />
        </G>
      </Svg>
    </View>
  );
}
