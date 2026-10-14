import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SeverityLevel } from '../types/models';

interface Props {
  severity: SeverityLevel;
  size?: 'small' | 'medium' | 'large';
}

export const StatusBadge: React.FC<Props> = ({ severity, size = 'medium' }) => {
  let bgColor = '#1E293B';
  let textColor = '#94A3B8';
  let label = severity;

  switch (severity) {
    case 'CRITICAL':
      bgColor = '#7F1D1D';
      textColor = '#FCA5A5';
      break;
    case 'MEDIUM':
      bgColor = '#78350F';
      textColor = '#FCD34D';
      break;
    case 'LOW':
      bgColor = '#064E3B';
      textColor = '#6EE7B7';
      break;
    default:
      bgColor = '#1E293B';
      textColor = '#94A3B8';
      label = 'NONE';
  }

  const isSmall = size === 'small';
  const isLarge = size === 'large';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor },
        isSmall && styles.badgeSmall,
        isLarge && styles.badgeLarge
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: textColor },
          isSmall && styles.dotSmall,
          isLarge && styles.dotLarge
        ]}
      />
      <Text
        style={[
          styles.text,
          { color: textColor },
          isSmall && styles.textSmall,
          isLarge && styles.textLarge
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  badgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4
  },
  dotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  textSmall: {
    fontSize: 10
  },
  textLarge: {
    fontSize: 14
  }
});
