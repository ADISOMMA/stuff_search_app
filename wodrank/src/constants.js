export const GLOBAL_ROLES = { ADMIN: 'admin', USER: 'user' };
export const GYM_ROLES = { OWNER: 'owner', COACH: 'coach', ATHLETE: 'athlete' };
export const CHALLENGE_TYPES = { MOST_WODS: 'MOST_WODS', BEST_SCORE: 'BEST_SCORE' };
export const LOG_LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' };

// Emoji-based avatars (CrossFit/fitness vibes + fun picks)
export const AVATARS = ['🦁', '🐺', '🦊', '🐻', '🐶', '🐴', '🦄', '💀', '👽', '🤖', '🎃', '💪', '🏋️', '🏃', '🔥', '⚡️', '🌊'];

export const THEMES = [
  { id: 'slate-dark', name: 'Slate Dark', className: 'theme-slate', accent: 'emerald' },
  { id: 'light', name: 'Light', className: 'theme-light', accent: 'emerald' },
];

export const BENCHMARKS_DATA = {
  LIFTS: [
    { id: 'b_bs', title: 'Back Squat', type: 'WEIGHT', icon: 'back_squat' },
    { id: 'b_fs', title: 'Front Squat', type: 'WEIGHT', icon: 'front_squat' },
    { id: 'b_dl', title: 'Deadlift', type: 'WEIGHT', icon: 'deadlift' },
    { id: 'b_bp', title: 'Bench Press', type: 'WEIGHT', icon: 'bench' },
    { id: 'b_sn', title: 'Snatch', type: 'WEIGHT', icon: 'snatch' },
    { id: 'b_cj', title: 'Clean & Jerk', type: 'WEIGHT', icon: 'clean' },
  ],
  GIRLS: [
    { id: 'b_fran', title: 'Fran', type: 'FORTIME', desc: '21-15-9 Thrusters + Pull-ups', icon: '🎯' },
    { id: 'b_grace', title: 'Grace', type: 'FORTIME', desc: '30 C&J for time', icon: '🏹' },
    { id: 'b_cindy', title: 'Cindy', type: 'AMRAP', desc: '20 min: 5 Pull, 10 Push, 15 Squat', icon: '⏱️' },
  ],
  HEROES: [
    { id: 'b_murph', title: 'Murph', type: 'FORTIME', desc: 'Run, Pull, Push, Squat, Run', icon: '🎖️' },
    { id: 'b_dt', title: 'DT', type: 'FORTIME', desc: '5R: 12 DL, 9 HPC, 6 PJ', icon: '🪖' },
  ]
};
