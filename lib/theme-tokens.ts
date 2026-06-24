export const fd = {
  primary:    '#3B82F6',
  secondary:  '#10B981',
  accent:     '#F59E0B',
  muted:      '#F3F4F6',
  border:     '#E5E7EB',
  foreground: '#111827',
  background: '#FFFFFF',
} as const

// Legacy — will be removed in Task 9 after all consumers are migrated
export const pg = {
  orange:  '#F5853F',
  violet:  '#8B5CF6',
  pink:    '#F472B6',
  amber:   '#FBBF24',
  emerald: '#34D399',
  cream:   '#FFFDF5',
  ink:     '#1E293B',
  muted:   '#64748B',
  border:  '#E2E8F0',
  shadow: {
    sm:    '3px 3px 0px 0px #1E293B',
    md:    '5px 5px 0px 0px #1E293B',
    lg:    '8px 8px 0px 0px #1E293B',
    pink:  '5px 5px 0px 0px #F472B6',
    hover: '7px 7px 0px 0px #1E293B',
  },
  transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms cubic-bezier(0.34,1.56,0.64,1)',
} as const
