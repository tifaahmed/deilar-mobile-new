import { apiGet, apiGetAuth } from './http';

export interface LeaderRow {
  rank: number;
  /** First name + the first letter of the last one, as the backend shortens it. */
  name: string;
  points: number;
  me: boolean;
}

export interface Leaderboard {
  top: LeaderRow[];
  /** The signed-in player's own place (rank null while their balance is 0); null when they never played. */
  me: { rank: number | null; points: number; players: number } | null;
}

/** The quiz ranking by the loyalty balance each player holds now (the backend ranks; spent points drop a player down). */
export const fetchLeaderboard = (token?: string | null): Promise<Leaderboard> =>
  (token ? apiGetAuth<{ data: Leaderboard }>('/mobile/loyalty/leaderboard', token) : apiGet<{ data: Leaderboard }>('/mobile/loyalty/leaderboard', undefined, { ttl: 30_000 })).then((r) => r.data);
