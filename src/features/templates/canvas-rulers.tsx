import { Group, Line, Rect, Text } from "react-konva";

export const RULER_SIZE = 30;
const MAJOR_TICK = 50;
const MINOR_TICK = 10;

type CanvasRulersProps = {
  pageWidth: number;
  pageHeight: number;
  rulerSize?: number;
};

const tickValues = (size: number): number[] => {
  const values: number[] = [];

  for (let value = 0; value <= size; value += MINOR_TICK) {
    values.push(value);
  }

  return values;
};

export const CanvasRulers = ({ pageWidth, pageHeight, rulerSize = RULER_SIZE }: CanvasRulersProps) => (
  <Group listening={false}>
    <Rect x={0} y={0} width={rulerSize} height={rulerSize} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />
    <Rect x={rulerSize} y={0} width={pageWidth} height={rulerSize} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />
    <Rect x={0} y={rulerSize} width={rulerSize} height={pageHeight} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} />

    {tickValues(pageWidth).map((value) => {
      const isMajor = value % MAJOR_TICK === 0;
      const tickHeight = isMajor ? 14 : 7;

      return (
        <Group key={`x-${value}`} x={rulerSize + value}>
          <Line points={[0, rulerSize, 0, rulerSize - tickHeight]} stroke="#64748b" strokeWidth={isMajor ? 1 : 0.75} />
          {isMajor ? (
            <Text
              x={3}
              y={4}
              text={String(value)}
              fontSize={9}
              fontFamily="Inter, Arial, sans-serif"
              fill="#475569"
            />
          ) : null}
        </Group>
      );
    })}

    {tickValues(pageHeight).map((value) => {
      const isMajor = value % MAJOR_TICK === 0;
      const tickWidth = isMajor ? 14 : 7;

      return (
        <Group key={`y-${value}`} y={rulerSize + value}>
          <Line points={[rulerSize, 0, rulerSize - tickWidth, 0]} stroke="#64748b" strokeWidth={isMajor ? 1 : 0.75} />
          {isMajor ? (
            <Text
              x={3}
              y={value === 0 ? 2 : -5}
              text={String(value)}
              fontSize={9}
              fontFamily="Inter, Arial, sans-serif"
              fill="#475569"
            />
          ) : null}
        </Group>
      );
    })}
  </Group>
);
