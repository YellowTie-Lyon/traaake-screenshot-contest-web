interface MockMember {
  id: string
  username: string
  avatar: string
  points: number
  participations: number
  wins: number
  rank: number
}

export const mockMembers: MockMember[] = [
  { id: "1", username: "YellowTie",   avatar: "https://picsum.photos/seed/yellowtie/64/64",   points: 2840, participations: 24, wins: 8, rank: 1 },
  { id: "2", username: "Dimitriiii",  avatar: "https://picsum.photos/seed/dimitri/64/64",      points: 2210, participations: 21, wins: 5, rank: 2 },
  { id: "3", username: "AlexFlight",  avatar: "https://picsum.photos/seed/alexflight/64/64",   points: 1980, participations: 19, wins: 4, rank: 3 },
  { id: "4", username: "SkyCaptain",  avatar: "https://picsum.photos/seed/skycaptain/64/64",   points: 1540, participations: 18, wins: 2, rank: 4 },
  { id: "5", username: "AirLyon",     avatar: "https://picsum.photos/seed/airlyon/64/64",      points: 1320, participations: 16, wins: 2, rank: 5 },
  { id: "6", username: "NeoPilot",    avatar: "https://picsum.photos/seed/neopilot/64/64",     points: 980,  participations: 14, wins: 1, rank: 6 },
  { id: "7", username: "VFRDreamer",  avatar: "https://picsum.photos/seed/vfrdreamer/64/64",   points: 760,  participations: 12, wins: 0, rank: 7 },
  { id: "8", username: "CaptainFox",  avatar: "https://picsum.photos/seed/captainfox/64/64",   points: 540,  participations: 10, wins: 0, rank: 8 },
];
