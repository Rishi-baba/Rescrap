/**
 * ReScrap design system color tokens.
 *
 * Source of truth: frontend-discussion.md §6.3
 * Deep Forest + Impact Green palette designed for high contrast and trust.
 */

export const colors = {
  forest: {
    900: '#0B2E23', // Deep Forest — primary dark, headers
    700: '#14513C', // Deep Forest mid — primary surfaces
  },
  green: {
    500: '#2FBF71', // Impact Green — primary CTA, success
    400: '#4FD68C', // Impact Green light — hover, highlight
  },
  ash: {
    100: '#F4F6F5', // Soft Ash — app background
    200: '#E4E8E6', // Soft Ash border — dividers
    400: '#9AA5A0', // Muted text, disabled
  },
  carbon: {
    800: '#1A1D1C', // Carbon Grey — primary text
    500: '#5B6461', // Carbon Grey — secondary text
  },
  surface: '#FFFFFF',
} as const;

export type ColorToken = typeof colors;

export type SemanticStatus = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusStyle {
  bg: string;
  text: string;
  border: string;
  iconColor: string;
  dotColor: string;
}

export const semanticStatusStyles: Record<SemanticStatus, StatusStyle> = {
  success: {
    bg: '#ECFDF5',
    text: '#065F46',
    border: '#A7F3D0',
    iconColor: '#2FBF71',
    dotColor: '#2FBF71',
  },
  warning: {
    bg: '#FFFBEB',
    text: '#92400E',
    border: '#FDE68A',
    iconColor: '#E8A33D',
    dotColor: '#E8A33D',
  },
  danger: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    iconColor: '#D9534F',
    dotColor: '#D9534F',
  },
  info: {
    bg: '#EFF6FF',
    text: '#1E40AF',
    border: '#BFDBFE',
    iconColor: '#3D8BE8',
    dotColor: '#3D8BE8',
  },
  neutral: {
    bg: '#F3F4F6',
    text: '#374151',
    border: '#E5E7EB',
    iconColor: '#9AA5A0',
    dotColor: '#9AA5A0',
  },
} as const;
