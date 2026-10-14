import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'hazard' | 'accent' | 'outlined';
}

export const Card: React.FC<Props> = ({ children, style, variant = 'default' }) => {
  return (
    <View
      style={[
        styles.base,
        variant === 'hazard' && styles.hazard,
        variant === 'accent' && styles.accent,
        variant === 'outlined' && styles.outlined,
        style
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  hazard: {
    backgroundColor: 'rgba(127, 29, 29, 0.4)',
    borderColor: '#DC2626',
    borderWidth: 1.5
  },
  accent: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderColor: '#0284C7',
    borderWidth: 1
  },
  outlined: {
    backgroundColor: '#0F172A',
    borderColor: '#475569'
  }
});
