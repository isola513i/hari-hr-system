export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string | null;
  status: string;
  department: string;
}

export interface MyTeamHierarchy {
  manager: TeamMember | null;
  peers: TeamMember[];
  directReports: TeamMember[];
  stats: {
    totalDirectReports: number;
    peersCount: number;
    departmentsInTeam: number;
  };
}
