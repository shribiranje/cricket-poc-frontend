export type Role = 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
export type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED';

export interface User {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin?: boolean;
  joinDate?: string;
}

export interface TeamRef { id: number; name: string; short: string; }

export interface Match {
  id: number;
  format: string;
  venue: string;
  startTime: string;        // UTC ISO ('...Z') — render with the date pipe for local time
  timezone?: string;        // IANA zone the match was scheduled in (display only)
  status: MatchStatus;
  isExternal?: boolean;     // true = Sportmonks fixture (engine/autoplay disabled)
  teamA: TeamRef;
  teamB: TeamRef;
  /** Compact engine state for list cards (live score / final result). Null if never started. */
  state?: MatchSummaryState | null;
}

/** Trimmed scoreboard returned alongside each match in list/detail responses. */
export interface MatchSummaryState {
  innings: number;
  battingShort: string;
  runs: number;
  wickets: number;
  overs: string;
  target: number | null;
  finished: boolean;
  result: string | null;
}

/** Live scoreboard produced by the ball-aware engine (null for external fixtures). */
export interface MatchState {
  innings: number;
  battingTeam: TeamRef;
  bowlingTeamShort: string;
  runs: number;
  wickets: number;
  overs: string;            // e.g. "12.4"
  totalOvers: number;
  target: number | null;
  innings1: { runs: number; wickets: number; overs: string } | null;
  striker: string | null;
  nonStriker: string | null;
  bowler: string | null;
  finished: boolean;
  result: string | null;
}

export type AutoplayMode = 'BALL_1' | 'OVER_1' | 'OVER_5' | 'INNINGS' | 'END_MATCH';

export interface AutoplaySummary {
  mode: AutoplayMode;
  ballsPlayed: number;
  innings: number;
  battingTeam: string;
  runs: number;
  wickets: number;
  overs: string;
  target: number | null;
  finished: boolean;
  completed: boolean;
  result: string | null;
  scoreline: string;
}

export interface MatchPlayer {
  id: number;
  name: string;
  role: Role;
  credit: number;
  teamId: number;
  teamShort: string;
  currentPoints: number;
}

export interface UserTeamPlayer {
  id: number;
  name: string;
  role: Role;
  credit: number;
  teamShort: string;
  points: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface UserTeam {
  id: number;
  captainId: number;
  viceCaptainId: number;
  totalCreditsUsed: number;
  totalPoints: number;
  isLocked: boolean;
  createdAt: string;
  players: UserTeamPlayer[];
}

export interface LeaderboardEntry {
  rank: number;
  userTeamId: number;
  userId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  totalCreditsUsed: number;
}

export interface HistoryEntry {
  userTeamId: number;
  match: {
    id: number;
    format: string;
    venue: string;
    startTime: string;
    status: MatchStatus;
    teamAShort: string;
    teamBShort: string;
  };
  totalPoints: number;
  totalCreditsUsed: number;
  rank: number;
  totalEntries: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}
