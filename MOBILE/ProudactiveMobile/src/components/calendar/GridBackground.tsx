import React from 'react';
import { View } from 'react-native';

interface GridBackgroundProps {
  width: number;
  height: number;
  cellHeight: number;
}

const GridBackground = ({ width, height, cellHeight }: GridBackgroundProps) => {
  const lines = [];
  const numRows = Math.ceil(height / cellHeight);
  
  for (let i = 1; i < numRows; i++) {
    const y = i * cellHeight;
    lines.push(
      <View
        key={`line-${i}`}
        style={{
          position: 'absolute',
          top: y,
          left: 0,
          right: 0,
          height: 0.5,
          backgroundColor: '#f0f0f0',
          zIndex: 0
        }}
      />
    );
  }
  
  return <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>{lines}</View>;
};

export default GridBackground;
