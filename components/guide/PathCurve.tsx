import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../constants/theme";

interface PathCurveProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  completed?: boolean;
}

export default function PathCurve({
  startX,
  startY,
  endX,
  endY,
  completed = false,
}: PathCurveProps) {
  const dy = endY - startY;
  // Cubic Bezier with vertical tangents at both ends for a smooth snake path
  const controlY1 = startY + dy * 0.5;
  const controlY2 = endY - dy * 0.5;
  const d = `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;

  // Find min/max boundaries to set the SVG viewBox size accurately
  const minX = Math.min(startX, endX) - 10;
  const maxX = Math.max(startX, endX) + 10;
  const minY = Math.min(startY, endY);
  const maxY = Math.max(startY, endY);

  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <Svg
      style={{
        position: "absolute",
        left: minX,
        top: minY,
        width,
        height,
      }}
      viewBox={`${minX} ${minY} ${width} ${height}`}
    >
      <Path
        d={d}
        fill="none"
        stroke={completed ? colors.button : colors.border}
        strokeWidth={6}
        strokeOpacity={completed ? 1.0 : 0.2}
        strokeDasharray={completed ? undefined : "10, 8"}
        strokeLinecap="round"
      />
    </Svg>
  );
}
