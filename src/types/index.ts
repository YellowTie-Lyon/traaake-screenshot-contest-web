export type ContestStatus = "draft" | "open" | "paused" | "closed" | "archived";

export interface Member {
  id: string;
  discordId: string;
  username: string;
  avatar: string;
  points: number;
  participations: number;
  wins: number;
  totalVotes: number;
  rank: number;
}

export interface Winner {
  id: string;
  week: string;
  period: string;
  member: Member;
  screenshotUrl: string;
  votes: number;
  date: string;
  discordMessageUrl: string;
}

export interface Contest {
  id: string;
  status: ContestStatus;
  startDate: string;
  endDate: string;
  participations: number;
  totalVotes: number;
  leader: Member | null;
  theme?: string;
}

export interface HistoryEntry {
  id: string;
  period: string;
  winner: string;
  avatar: string;
  participations: number;
  votes: number;
  status: "archived";
  date: string;
}

export interface AdminSettings {
  discordChannel: string;
  photographerRole: string;
  openDay: string;
  openTime: string;
  closeDay: string;
  closeTime: string;
  announcementMessage: string;
  participationPoints: number;
  winnerPoints: number;
  top3Points: number;
  autoMode: boolean;
}
