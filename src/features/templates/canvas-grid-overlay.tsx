import { Group, Line } from "react-konva";

type GridOverlayProps = {
  width: number;
  height: number;
  gridSize?: number;
};

export const GridOverlay = ({ width, height, gridSize = 10 }: GridOverlayProps) => {
  const verticalLines = [];
  const horizontalLines = [];

  for (let x = gridSize; x < width; x += gridSize) {
    const isMajor = x % 50 === 0;
    verticalLines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, height]}
        stroke={isMajor ? "#64748b" : "#94a3b8"}
        strokeWidth={isMajor ? 1 : 0.75}
        opacity={isMajor ? 0.6 : 0.35}
        strokeScaleEnabled={false}
        listening={false}
      />,
    );
  }

  for (let y = gridSize; y < height; y += gridSize) {
    const isMajor = y % 50 === 0;
    horizontalLines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, width, y]}
        stroke={isMajor ? "#64748b" : "#94a3b8"}
        strokeWidth={isMajor ? 1 : 0.75}
        opacity={isMajor ? 0.6 : 0.35}
        strokeScaleEnabled={false}
        listening={false}
      />,
    );
  }

  return <Group listening={false}>{[...verticalLines, ...horizontalLines]}</Group>;
};
