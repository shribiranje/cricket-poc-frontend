import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse, Match, MatchPlayer, UserTeam, LeaderboardEntry, HistoryEntry, MatchStatus,
  MatchState, AutoplayMode, AutoplaySummary,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  listMatches(status?: MatchStatus): Observable<Match[]> {
    let p = new HttpParams();
    if (status) p = p.set('status', status);
    return this.http
      .get<ApiResponse<Match[]>>(`${this.base}/matches`, { params: p })
      .pipe(map((r) => r.data ?? []));
  }

  getMatch(id: number): Observable<Match> {
    return this.http.get<ApiResponse<Match>>(`${this.base}/matches/${id}`).pipe(map((r) => r.data!));
  }

  getMatchState(id: number): Observable<MatchState | null> {
    return this.http
      .get<ApiResponse<MatchState | null>>(`${this.base}/matches/${id}/state`)
      .pipe(map((r) => r.data ?? null));
  }

  getMatchPlayers(id: number): Observable<MatchPlayer[]> {
    return this.http
      .get<ApiResponse<MatchPlayer[]>>(`${this.base}/matches/${id}/players`)
      .pipe(map((r) => r.data ?? []));
  }

  submitTeam(matchId: number, body: { playerIds: number[]; captainId: number; viceCaptainId: number }) {
    return this.http.post<ApiResponse<{ userTeamId: number; totalCreditsUsed: number }>>(
      `${this.base}/matches/${matchId}/teams`, body,
    ).pipe(map((r) => r.data!));
  }

  getMyTeam(matchId: number): Observable<UserTeam | null> {
    return this.http
      .get<ApiResponse<UserTeam | null>>(`${this.base}/matches/${matchId}/teams/me`)
      .pipe(map((r) => r.data ?? null));
  }

  getLeaderboard(matchId: number): Observable<LeaderboardEntry[]> {
    return this.http
      .get<ApiResponse<LeaderboardEntry[]>>(`${this.base}/matches/${matchId}/leaderboard`)
      .pipe(map((r) => r.data ?? []));
  }

  getHistory(): Observable<HistoryEntry[]> {
    return this.http
      .get<ApiResponse<HistoryEntry[]>>(`${this.base}/history`)
      .pipe(map((r) => r.data ?? []));
  }

  // POC helpers — start / complete a match; tick simulator
  startMatch(id: number)    { return this.http.post<ApiResponse<unknown>>(`${this.base}/admin/matches/${id}/start`, {}); }
  completeMatch(id: number) { return this.http.post<ApiResponse<unknown>>(`${this.base}/admin/matches/${id}/complete`, {}); }
  tickSimulator()           { return this.http.post<ApiResponse<unknown>>(`${this.base}/admin/simulator/tick`, {}); }

  // Admin
  adminStats()              { return this.http.get<ApiResponse<AdminStats>>(`${this.base}/admin/stats`).pipe(map((r) => r.data!)); }
  adminMatches()            { return this.http.get<ApiResponse<AdminMatch[]>>(`${this.base}/admin/matches`).pipe(map((r) => r.data ?? [])); }
  adminUsers()              { return this.http.get<ApiResponse<AdminUser[]>>(`${this.base}/admin/users`).pipe(map((r) => r.data ?? [])); }
  adminSetAdmin(userId: number, isAdmin: boolean) {
    return this.http.patch<ApiResponse<unknown>>(`${this.base}/admin/users/${userId}/admin`, { isAdmin });
  }
  adminCreateUser(body: UserPayload) {
    return this.http.post<ApiResponse<{ id: number; username: string; isAdmin: boolean }>>(
      `${this.base}/admin/users`, body);
  }
  adminUpdateUser(id: number, body: Partial<UserPayload>) {
    return this.http.patch<ApiResponse<{ id: number; updated: boolean }>>(`${this.base}/admin/users/${id}`, body);
  }
  adminResetMatch(id: number) {
    return this.http.post<ApiResponse<unknown>>(`${this.base}/admin/matches/${id}/reset`, {});
  }

  // Manual match CRUD
  adminTeams() {
    return this.http.get<ApiResponse<AdminTeam[]>>(`${this.base}/admin/teams`).pipe(map((r) => r.data ?? []));
  }
  adminCreateMatch(body: MatchPayload) {
    return this.http.post<ApiResponse<{ id: number; status: string }>>(`${this.base}/admin/matches`, body);
  }
  adminUpdateMatch(id: number, body: Partial<MatchPayload>) {
    return this.http.patch<ApiResponse<{ id: number; updated: boolean }>>(`${this.base}/admin/matches/${id}`, body);
  }
  adminDeleteMatch(id: number) {
    return this.http.delete<ApiResponse<{ id: number; deleted: boolean }>>(`${this.base}/admin/matches/${id}`);
  }

  /** Pull RapidAPI live/schedule and flip local matches LIVE/COMPLETED. */
  syncRapidApiStatuses(): Observable<RapidApiStatusSync> {
    return this.http
      .post<ApiResponse<RapidApiStatusSync>>(`${this.base}/admin/rapidapi/sync-status`, {})
      .pipe(map((r) => r.data!));
  }

  /** Import fixtures (same as `npm run rapidapi:sync -- --clean --limit N`). */
  syncRapidApiFixtures(opts: { clean?: boolean; limit?: number } = {}): Observable<RapidApiFixtureSync> {
    const body: { clean: boolean; limit?: number } = { clean: opts.clean !== false };
    if (opts.limit != null) body.limit = opts.limit;
    return this.http
      .post<ApiResponse<RapidApiFixtureSync>>(`${this.base}/admin/rapidapi/sync-fixtures`, body)
      .pipe(map((r) => r.data!));
  }

  getRapidApiPollStatus(): Observable<RapidApiPollStatus> {
    return this.http
      .get<ApiResponse<RapidApiPollStatus>>(`${this.base}/admin/rapidapi/poll/status`)
      .pipe(map((r) => r.data!));
  }

  getRapidApiAnalytics(opts: { limit?: number; offset?: number } = {}): Observable<RapidApiAnalytics> {
    const params: Record<string, string | number> = {};
    if (opts.limit != null) params['limit'] = opts.limit;
    if (opts.offset != null) params['offset'] = opts.offset;
    return this.http
      .get<ApiResponse<RapidApiAnalytics>>(`${this.base}/admin/rapidapi/analytics`, { params })
      .pipe(map((r) => r.data!));
  }

  startRapidApiPoll(durationMinutes: 15 | 60 | 120): Observable<RapidApiPollStatus> {
    return this.http
      .post<ApiResponse<RapidApiPollStatus>>(`${this.base}/admin/rapidapi/poll/start`, { durationMinutes })
      .pipe(map((r) => r.data!));
  }

  stopRapidApiPoll(): Observable<RapidApiPollStatus> {
    return this.http
      .post<ApiResponse<RapidApiPollStatus>>(`${this.base}/admin/rapidapi/poll/stop`, {})
      .pipe(map((r) => r.data!));
  }

  getRapidApiSettings(): Observable<RapidApiSettings> {
    return this.http
      .get<ApiResponse<RapidApiSettings>>(`${this.base}/admin/rapidapi/settings`)
      .pipe(map((r) => r.data!));
  }

  updateRapidApiSettings(body: Partial<RapidApiSettingsPatch>): Observable<RapidApiSettings> {
    return this.http
      .put<ApiResponse<RapidApiSettings>>(`${this.base}/admin/rapidapi/settings`, body)
      .pipe(map((r) => r.data!));
  }

  // Instant autoplay (ball-aware engine)
  autoplay(matchId: number, mode: AutoplayMode): Observable<AutoplaySummary> {
    return this.http
      .post<ApiResponse<AutoplaySummary>>(`${this.base}/admin/matches/${matchId}/autoplay`, { mode })
      .pipe(map((r) => r.data!));
  }

  // Free-to-play over/ball predictions
  getPredictionWallet(): Observable<PredictionWallet> {
    return this.http
      .get<ApiResponse<PredictionWallet>>(`${this.base}/predictions/wallet`)
      .pipe(map((r) => r.data!));
  }

  getMatchProgress(matchId: number): Observable<MatchProgress> {
    return this.http
      .get<ApiResponse<MatchProgress>>(`${this.base}/matches/${matchId}/progress`)
      .pipe(map((r) => r.data!));
  }

  placePrediction(matchId: number, body: PlacePredictionBody): Observable<{ placed: boolean; balance: number }> {
    return this.http
      .post<ApiResponse<{ placed: boolean; balance: number }>>(
        `${this.base}/matches/${matchId}/predictions`, body,
      )
      .pipe(map((r) => r.data!));
  }

  getMyPredictions(matchId: number): Observable<MyPrediction[]> {
    return this.http
      .get<ApiResponse<MyPrediction[]>>(`${this.base}/matches/${matchId}/predictions/mine`)
      .pipe(map((r) => r.data ?? []));
  }

  getMyBets(opts: { limit?: number; offset?: number; status?: string } = {}): Observable<MyBetsPage> {
    const params: Record<string, string | number> = {};
    if (opts.limit != null) params['limit'] = opts.limit;
    if (opts.offset != null) params['offset'] = opts.offset;
    if (opts.status) params['status'] = opts.status;
    return this.http
      .get<ApiResponse<MyBetsPage>>(`${this.base}/predictions/bets`, { params })
      .pipe(map((r) => r.data!));
  }

  getWalletTransactions(opts: { limit?: number; offset?: number } = {}): Observable<WalletTxPage> {
    const params: Record<string, string | number> = {};
    if (opts.limit != null) params['limit'] = opts.limit;
    if (opts.offset != null) params['offset'] = opts.offset;
    return this.http
      .get<ApiResponse<WalletTxPage>>(`${this.base}/predictions/transactions`, { params })
      .pipe(map((r) => r.data!));
  }

  buyPoints(amount: number): Observable<{ balance: number; purchased: number }> {
    return this.http
      .post<ApiResponse<{ balance: number; purchased: number }>>(
        `${this.base}/predictions/wallet/buy`, { amount },
      )
      .pipe(map((r) => r.data!));
  }

  getPredictionAnalytics(): Observable<UserPredictionAnalytics> {
    return this.http
      .get<ApiResponse<UserPredictionAnalytics>>(`${this.base}/predictions/analytics`)
      .pipe(map((r) => r.data!));
  }

  /** Sync one RapidAPI match (scores + settle over-bets). */
  syncMatch(matchId: number): Observable<MatchSyncResult> {
    return this.http
      .post<ApiResponse<MatchSyncResult>>(`${this.base}/matches/${matchId}/sync`, {})
      .pipe(map((r) => r.data!));
  }
}

export interface MatchSyncResult {
  matchId: number;
  status: string;
  started: boolean;
  scored: boolean;
  completed: boolean;
  progress: MatchProgress | null;
}

export interface RapidApiStatusSync {
  checked: number;
  liveFeed: number;
  started: number[];
  completed: number[];
  scored?: number[];
  refreshed: number[];
  unchanged: number[];
  errors: { id: number; message: string }[];
}

export interface RapidApiFixtureSync {
  imported: number;
  skipped: number;
  liveFeed: number;
  limit: number | null;
  cleaned: boolean;
}

export interface RapidApiPollSession {
  id: number;
  durationMinutes: number;
  startedAt: string;
  endsAt: string;
  stoppedAt: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'STOPPED';
  apiCalls: number;
  startedBy: number | null;
  remainingSeconds: number;
}

export interface RapidApiPollStatus {
  active: boolean;
  pollLiveMs: number;
  minGapMs?: number;
  scorecardEveryN?: number;
  syncFixtureLimit?: number;
  allowedPollLiveMs?: number[];
  allowedDurations: number[];
  session: RapidApiPollSession | null;
  recent: RapidApiPollSession[];
}

export interface RapidApiSettings {
  pollLiveMs: number;
  minGapMs: number;
  scorecardEveryN: number;
  syncFixtureLimit: number;
  allowedPollLiveMs: number[];
}

export interface RapidApiSettingsPatch {
  pollLiveMs: number;
  minGapMs: number;
  scorecardEveryN: number;
  syncFixtureLimit: number;
}

export interface RapidApiCallLog {
  id: number;
  path: string;
  endpointKind: string;
  httpStatus: number | null;
  ok: boolean;
  durationMs: number;
  sessionId: number | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface RapidApiAnalytics {
  summary: {
    totalCalls: number;
    okCalls: number;
    errorCalls: number;
    calls24h: number;
    callsToday: number;
    avgDurationMs: number;
    byKind: { kind: string; count: number }[];
  };
  total: number;
  limit: number;
  offset: number;
  calls: RapidApiCallLog[];
}

export interface PredictionWallet {
  balance: number;
  limits: { minStake: number; maxStake: number };
  multipliers: { BALL: Record<string, number>; OVER: Record<string, number> };
  buyPresets?: number[];
}

export interface WalletTransaction {
  id: number;
  type: 'PURCHASE' | 'STAKE' | 'PAYOUT' | 'REFUND' | 'STARTING_GRANT';
  amount: number;
  balanceAfter: number;
  predictionId: number | null;
  note: string | null;
  createdAt: string;
}

export interface WalletTxPage {
  balance: number;
  buyPresets: number[];
  total: number;
  limit: number;
  offset: number;
  transactions: WalletTransaction[];
}

export interface UserBet {
  id: number;
  matchId: number;
  fixture: string;
  matchStatus: string;
  scope: string;
  innings: number;
  overNumber: number;
  ballNumber: number;
  predicted: string;
  actual: string | null;
  stake: number;
  payout: number;
  status: string;
  net: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface MyBetsPage {
  total: number;
  limit: number;
  offset: number;
  bets: UserBet[];
}

export interface UserPredictionAnalytics {
  summary: {
    totalBets: number;
    wins: number;
    losses: number;
    voids: number;
    openBets: number;
    totalStaked: number;
    totalPayout: number;
    netPoints: number;
    winRate: number;
  };
  pieByStatus: { label: string; value: number }[];
  pieByPrediction: { label: string; value: number }[];
  pieByScope: { label: string; value: number }[];
  daily: { day: string; bets: number; net: number }[];
}

export interface MatchProgress {
  innings: number;
  ballsBowled: number;
  finished: boolean;
}

export interface PlacePredictionBody {
  scope: 'BALL' | 'OVER';
  innings: number;
  over_number: number;
  ball_number: number | null;
  predicted: string;
  stake: number;
}

export interface MyPrediction {
  id: number;
  scope: 'BALL' | 'OVER';
  innings: number;
  over_number: number;
  ball_number: number | null;
  predicted: string;
  actual: string | null;
  stake: number;
  payout: number;
  status: 'OPEN' | 'WON' | 'LOST' | 'VOID';
  created_at?: string;
  resolved_at?: string | null;
}

export interface AdminTeam {
  id: number;
  name: string;
  shortName: string;
  playerCount: number;
}

export interface MatchPayload {
  teamAId: number;
  teamBId: number;
  format: string;
  venue: string | null;
  startTimeUtc: string;   // UTC ISO
  timezone: string;       // IANA zone (display)
  autoStart: boolean;
}

export interface AdminStats {
  users: number;
  admins: number;
  teamsEntered: number;
  players: number;
  teams: number;
  matches: { upcoming: number; live: number; completed: number; total: number };
}

export interface AdminMatchState {
  innings: number;
  battingShort: string;
  runs: number;
  wickets: number;
  overs: string;
  target: number | null;
  finished: boolean;
  result: string | null;
}

export interface AdminMatch {
  id: number;
  format: string;
  venue: string;
  startTime: string;      // UTC ISO
  timezone: string;
  autoStart: boolean;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  isExternal: boolean;
  teamAId: number;
  teamBId: number;
  teamAShort: string;
  teamBShort: string;
  entries: number;
  state: AdminMatchState | null;
}

/** Create/edit payload. On edit, omit `password` to leave it unchanged. */
export interface UserPayload {
  username: string;
  password?: string;
  displayName: string;
  isAdmin: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  joinDate: string;
  teamCount: number;
}
