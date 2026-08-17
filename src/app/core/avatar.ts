/**
 * Avatar URLs via ui-avatars.com (free, no key, deterministic).
 * If a player later gets a real photo (players.avatar_url), pass it as
 * `override` and it wins.
 */
const TEAM_COLORS: Record<string, string> = {
  MI:   '004ba0',
  CSK:  'f9cd05',
  RCB:  'd11a2d',
  KKR:  '3a225d',
  DC:   '17449b',
  SRH:  'f26522',
  PBKS: 'dd1f2d',
  RR:   'ea1a8c',
  GT:   '1560bd',
  LSG:  '00b7eb',
};

const DARK_TEXT_TEAMS = new Set(['CSK']); // yellow bg needs dark text

export function playerAvatar(name: string, teamShort?: string, override?: string | null): string {
  if (override) return override;
  const bg = (teamShort && TEAM_COLORS[teamShort]) || '182238';
  const color = teamShort && DARK_TEXT_TEAMS.has(teamShort) ? '1a1a1a' : 'fff';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=${color}&size=128&bold=true`;
}

export function userAvatar(displayName: string, override?: string | null): string {
  if (override) return override;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=534AB7&color=fff&size=128&bold=true`;
}

export function teamColor(teamShort: string): string {
  return '#' + (TEAM_COLORS[teamShort] || '182238');
}
