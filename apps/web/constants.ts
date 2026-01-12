import { Employee, DocumentItem, LeaveRequest, ComplianceItem, AuditLogItem, Announcement, OnboardingTask, TrainingModule, OnboardingProgressSummary, UpcomingEvent, KeyContact, JobHistoryItem, EmployeeTrainingRecord, OrgNode, PerformanceReview } from './types';

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: '1',
    name: 'Liam Johnson',
    role: 'Product Manager',
    department: 'Product',
    email: 'liam.j@nexus.hr',
    avatar: 'https://picsum.photos/id/1005/200/200',
    status: 'Active',
    onboardingStatus: 'Completed',
    joinDate: '2021-08-15',
    location: 'New York, USA',
    skills: ['Product Strategy', 'Agile', 'Roadmapping', 'Jira', 'User Research'],
    bio: 'Experienced Product Manager with a demonstrated history of working in the tech industry. Skilled in Agile methodologies, User Experience, and strategic planning.',
    slack: '@liam_pm',
    emergencyContact: 'Sarah Johnson (Wife) - 555-0192',
  },
  {
    id: '2',
    name: 'Emma Williams',
    role: 'UX/UI Designer',
    department: 'Design',
    email: 'emma.w@nexus.hr',
    avatar: 'https://picsum.photos/id/1027/200/200',
    status: 'Active',
    onboardingStatus: 'Completed',
    joinDate: '2022-03-10',
    location: 'London, UK',
    skills: ['Figma', 'Prototyping', 'User Testing', 'HTML/CSS', 'Design Systems'],
    bio: 'Creative designer passionate about building intuitive and accessible user experiences.',
    slack: '@emma_designs',
    emergencyContact: 'John Williams (Father) - 555-0144',
  },
  {
    id: '3',
    name: 'Noah Brown',
    role: 'Frontend Developer',
    department: 'Engineering',
    email: 'noah.b@nexus.hr',
    avatar: 'https://picsum.photos/id/1012/200/200',
    status: 'Active',
    onboardingStatus: 'Completed',
    joinDate: '2020-11-01',
    location: 'Remote',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'GraphQL', 'Performance Optimization'],
    slack: '@noah_dev',
  },
  {
    id: '4',
    name: 'Sophia Garcia',
    role: 'Marketing Lead',
    department: 'Marketing',
    email: 'sophia.g@nexus.hr',
    avatar: 'https://picsum.photos/id/1011/200/200',
    status: 'On Leave',
    onboardingStatus: 'Completed',
    joinDate: '2019-05-20',
    location: 'Austin, USA',
    skills: ['SEO', 'Content Strategy', 'Google Analytics', 'Brand Management', 'Copywriting'],
    slack: '@sophia_mkt',
  },
  {
    id: '5',
    name: 'James Miller',
    role: 'Backend Developer',
    department: 'Engineering',
    email: 'james.m@nexus.hr',
    avatar: 'https://picsum.photos/id/1006/200/200',
    status: 'Active',
    onboardingStatus: 'In Progress',
    joinDate: '2023-01-05',
    location: 'San Francisco, USA',
    skills: ['Node.js', 'Python', 'AWS', 'Docker', 'PostgreSQL'],
    slack: '@james_backend',
  },
  {
    id: '6',
    name: 'Olivia Roe',
    role: 'CHRO',
    department: 'Human Resources',
    email: 'olivia.r@nexus.hr',
    avatar: 'https://picsum.photos/id/338/200/200',
    status: 'Active',
    onboardingStatus: 'Completed',
    joinDate: '2018-02-15',
    location: 'New York, USA',
    skills: ['Talent Acquisition', 'Employee Relations', 'HRIS', 'Leadership Development', 'Conflict Resolution'],
    bio: 'HR professional with over 10 years of experience in talent acquisition and employee relations.',
    slack: '@olivia_hr',
  },
];

export const MOCK_DOCUMENTS: DocumentItem[] = [
  {
    id: '1',
    name: 'Employment Contract - L. Johnson',
    type: 'PDF',
    category: 'Contracts',
    size: '2.4 MB',
    owner: 'Liam Johnson',
    lastAccessed: '2 hours ago',
    status: 'Viewed',
  },
  {
    id: '2',
    name: 'Q1 Performance Review',
    type: 'DOCX',
    category: 'HR',
    size: '1.1 MB',
    owner: 'Emma Williams',
    lastAccessed: '1 day ago',
    status: 'Downloaded',
  },
  {
    id: '3',
    name: 'Offer Letter Addendum',
    type: 'PDF',
    category: 'Contracts',
    size: '850 KB',
    owner: 'Noah Brown',
    lastAccessed: '3 days ago',
    status: 'Uploaded',
  },
  {
    id: '4',
    name: 'Tax Declaration Form 2023',
    type: 'PDF',
    category: 'Finance',
    size: '3.2 MB',
    owner: 'Sophia Garcia',
    lastAccessed: '1 week ago',
    status: 'Viewed',
  },
  {
    id: '5',
    name: 'Employee Handbook 2024',
    type: 'PDF',
    category: 'Policies',
    size: '12.5 MB',
    owner: 'Admin',
    lastAccessed: '2 weeks ago',
    status: 'Viewed',
  },
  {
    id: '6',
    name: 'Payroll Summary - June',
    type: 'XLSX',
    category: 'Finance',
    size: '4.8 MB',
    owner: 'Finance Team',
    lastAccessed: '1 day ago',
    status: 'Downloaded',
  },
  {
    id: '7',
    name: 'Office Layout Plan',
    type: 'JPG',
    category: 'HR',
    size: '5.6 MB',
    owner: 'Ops Team',
    lastAccessed: '1 month ago',
    status: 'Viewed',
  },
  {
    id: '8',
    name: 'IT Security Policy',
    type: 'PDF',
    category: 'Policies',
    size: '1.8 MB',
    owner: 'IT Dept',
    lastAccessed: '3 days ago',
    status: 'Viewed',
  },
  {
    id: '9',
    name: 'Payslip - July 2024',
    type: 'PDF',
    category: 'Finance',
    size: '150 KB',
    owner: 'Liam Johnson',
    lastAccessed: '5 hours ago',
    status: 'Downloaded',
  },
];

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: '1',
    employeeId: '4',
    employeeName: 'Sophia Garcia',
    type: 'Vacation',
    dates: 'Aug 1 - Aug 5',
    days: 5,
    status: 'Pending',
    avatar: 'https://picsum.photos/id/1011/200/200',
  },
  {
    id: '2',
    employeeId: 'mock-id-david', // David not in main list? Or logic gap. Keeping name consistent.
    employeeName: 'David Martinez',
    type: 'Sick Leave',
    dates: 'Jul 22',
    days: 1,
    status: 'Pending',
    avatar: 'https://picsum.photos/id/1005/200/200',
  }
];

export const HEADCOUNT_DATA = [
  { name: 'Jan', value: 110 },
  { name: 'Feb', value: 112 },
  { name: 'Mar', value: 115 },
  { name: 'Apr', value: 118 },
  { name: 'May', value: 122 },
  { name: 'Jun', value: 124 },
];

export const TURNOVER_DATA = [
  { name: 'Q1', value: 2.5, value2: 97.5 },
  { name: 'Q2', value: 2.1, value2: 97.9 },
  { name: 'Q3', value: 1.8, value2: 98.2 },
  { name: 'Q4', value: 1.5, value2: 98.5 },
];

export const DEPT_DISTRIBUTION = [
  { name: 'Engineering', value: 45 },
  { name: 'Sales', value: 30 },
  { name: 'Marketing', value: 22 },
  { name: 'Design', value: 18 },
  { name: 'HR', value: 4 },
];

export const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { id: '1', title: 'Form I-9 Verification', status: 'Complete' },
  { id: '2', title: 'Equal Opportunity Policies', status: 'Complete' },
  { id: '3', title: 'Anti-Harassment Training', status: 'In Progress' },
  { id: '4', title: 'Safety Regulation Compliance', status: 'Overdue' },
];

export const AUDIT_LOGS: AuditLogItem[] = [
  { id: '1', user: 'Olivia Roe', action: 'onboarded new employee', target: 'Leo Martinez', time: '2 hours ago', type: 'user' },
  { id: '2', user: 'System Admin', action: 'approved leave request for', target: 'Emma Williams', time: 'Yesterday, 4:30 PM', type: 'leave' },
  { id: '3', user: 'Sophia Garcia', action: 'updated the', target: '"Work From Home" policy', time: 'June 5, 2024, 11:15 AM', type: 'policy' },
];

export const ANNOUNCEMENTS: Announcement[] = [
  { id: '1', title: 'Q3 All-Hands Meeting Scheduled', description: 'Join us on July 25th for a company-wide update. An agenda will be shared next week.', type: 'announcement', date: 'July 25' },
  { id: '2', title: 'Updated Remote Work Policy', description: "We've updated our guidelines for remote and hybrid work. Please review the document on the portal.", type: 'policy' },
  { id: '3', title: 'Annual Summer Picnic Announcement', description: 'Save the date! Our annual company picnic will be on August 12th at City Park. More details to come!', type: 'event', date: 'Aug 12' },
];

export const SENTIMENT_DATA = [
  { name: 'Positive', value: 82 },
  { name: 'Neutral', value: 13 },
  { name: 'Negative', value: 5 },
];

export const MOCK_ONBOARDING_TASKS: OnboardingTask[] = [
  { id: '1', title: 'Prepare Workstation & Hardware', description: 'Configure laptop and peripheral devices.', stage: 'Pre-boarding', assignee: 'IT Dept', dueDate: '2024-08-01', completed: true, priority: 'High' },
  { id: '2', title: 'Create Email Account', description: 'Setup corporate email and Slack access.', stage: 'Pre-boarding', assignee: 'IT Dept', dueDate: '2024-08-01', completed: true, priority: 'High' },
  { id: '3', title: 'Welcome Email', description: 'Send welcome packet and first-day instructions.', stage: 'Pre-boarding', assignee: 'HR', dueDate: '2024-08-02', completed: false, priority: 'Medium' },
  { id: '4', title: 'Assign Mentor', description: 'Pair with a senior team member for guidance.', stage: 'Week 1', assignee: 'Manager', dueDate: '2024-08-05', completed: false, priority: 'Medium' },
  { id: '5', title: 'Team Lunch', description: 'Schedule team introduction lunch.', stage: 'Week 1', assignee: 'Manager', dueDate: '2024-08-06', completed: false, priority: 'Low' },
  { id: '6', title: 'HR Policy Review', description: 'Review handbook and sign acknowledgment.', stage: 'Week 1', assignee: 'Employee', dueDate: '2024-08-07', completed: false, priority: 'High', link: '#' },
  { id: '7', title: '30-Day Check-in', description: 'Schedule performance and feedback session.', stage: 'Month 1', assignee: 'HR', dueDate: '2024-09-05', completed: false, priority: 'High' },
  { id: '8', title: 'Complete Benefits Enrollment', description: 'Select health and dental insurance plans.', stage: 'Week 1', assignee: 'Employee', dueDate: '2024-08-08', completed: false, priority: 'High', link: '#' },
  { id: '9', title: 'Setup Direct Deposit', description: 'Add bank details in the Finance portal.', stage: 'Week 1', assignee: 'Employee', dueDate: '2024-08-08', completed: true, priority: 'High' },
];

export const MOCK_TRAINING_MODULES: TrainingModule[] = [
  { id: '1', title: 'Company Culture & Values', duration: '15 min', type: 'Video', status: 'Completed', progress: 100, thumbnail: 'https://picsum.photos/id/1/300/180' },
  { id: '2', title: 'Cybersecurity Awareness', duration: '30 min', type: 'Quiz', status: 'In Progress', progress: 45, thumbnail: 'https://picsum.photos/id/2/300/180' },
  { id: '3', title: 'Product Overview', duration: '45 min', type: 'Video', status: 'Locked', progress: 0, thumbnail: 'https://picsum.photos/id/3/300/180' },
  { id: '4', title: 'Internal Tools Training', duration: '60 min', type: 'Reading', status: 'Locked', progress: 0, thumbnail: 'https://picsum.photos/id/4/300/180' },
];

export const ONBOARDING_PROGRESS_SUMMARY: OnboardingProgressSummary[] = [
  { id: '1', name: 'James Miller', role: 'Backend Developer', progress: 75 },
  { id: '2', name: 'Chloe Davis', role: 'QA Engineer', progress: 40 },
  { id: '3', name: 'Ben Wilson', role: 'Product Analyst', progress: 90 },
];

export const UPCOMING_EVENTS: UpcomingEvent[] = [
  { id: '1', title: "Liam Johnson's Birthday", date: "July 18th (Tomorrow)", type: 'Birthday', avatar: 'https://picsum.photos/id/1005/200/200', color: 'accent-red' },
  { id: '2', title: "Q3 All-Hands Meeting", date: "July 25th, 10:00 AM", type: 'Meeting', color: 'accent-teal' },
  { id: '3', title: "Team Lunch: Engineering", date: "July 26th, 12:30 PM", type: 'Social', color: 'primary' },
];

export const KEY_CONTACTS: KeyContact[] = [
  { id: '1', name: 'Sarah Jones', role: 'VP of Engineering', relation: 'Manager', email: 'sarah.j@nexus.hr', avatar: 'https://picsum.photos/id/204/200/200' },
  { id: '2', name: 'Noah Brown', role: 'Frontend Lead', relation: 'Mentor', email: 'noah.b@nexus.hr', avatar: 'https://picsum.photos/id/1012/200/200' },
  { id: '3', name: 'IT Support', role: 'Help Desk', relation: 'Support', email: 'support@nexus.hr', avatar: 'https://picsum.photos/id/4/200/200' },
];

export const MOCK_JOB_HISTORY: JobHistoryItem[] = [
  { id: '1', role: 'Product Manager', department: 'Product', startDate: '2023-01-15', endDate: 'Present', description: 'Leading the core platform team, responsible for roadmap and strategy.' },
  { id: '2', role: 'Associate Product Manager', department: 'Product', startDate: '2021-08-15', endDate: '2023-01-14', description: 'Managed feature requests and coordinated with engineering for timely delivery.' },
  { id: '3', role: 'Product Analyst', department: 'Data Science', startDate: '2020-06-01', endDate: '2021-08-14', description: 'Analyzed user behavior data to inform product decisions.' }
];

export const MOCK_EMPLOYEES_TRAINING: EmployeeTrainingRecord[] = [
  { id: '1', employeeId: '1', title: 'Advanced Product Strategy', duration: '3h 30m', status: 'Completed', completionDate: '2023-11-15', score: 95 },
  { id: '2', employeeId: '1', title: 'Data-Driven Decision Making', duration: '2h', status: 'Completed', completionDate: '2024-01-20', score: 88 },
  { id: '3', employeeId: '1', title: 'Leadership Essentials', duration: '5h', status: 'In Progress' },
  { id: '4', employeeId: '2', title: 'Advanced Figma Techniques', duration: '4h', status: 'Completed', completionDate: '2023-10-05' },
  { id: '5', employeeId: '3', title: 'React Performance Optimization', duration: '2h 15m', status: 'In Progress' },
];

export const MOCK_EMPLOYEE_TRAINING: EmployeeTrainingRecord[] = MOCK_EMPLOYEES_TRAINING;

export const INITIAL_ORG_DATA: OrgNode[] = [
  { id: '1', parentId: null, name: 'Ava Chen', role: 'CEO', avatar: 'https://picsum.photos/id/1025/200/200' },
  { id: '2', parentId: '1', name: 'David Lee', role: 'CTO', avatar: 'https://picsum.photos/id/305/200/200' },
  { id: '3', parentId: '1', name: 'Olivia Roe', role: 'CHRO', avatar: 'https://picsum.photos/id/338/200/200' },
  { id: '4', parentId: '1', name: 'Sarah Jones', role: 'CFO', avatar: 'https://picsum.photos/id/204/200/200' },
  { id: '5', parentId: '2', name: 'Noah Brown', role: 'Frontend Lead', avatar: 'https://picsum.photos/id/1012/200/200' },
  { id: '6', parentId: '2', name: 'James Miller', role: 'Backend Lead', avatar: 'https://picsum.photos/id/1006/200/200' },
  { id: '7', parentId: '3', name: 'Recruiting', role: 'Team Lead', avatar: 'https://picsum.photos/id/1060/200/200' },
];

export const MOCK_PERFORMANCE_REVIEWS: PerformanceReview[] = [
  { id: '1', employeeId: '1', date: '2024-06-15', reviewer: 'Sarah Jones', rating: 5, notes: 'Exceptional performance this quarter. Successfully launched the mobile app redesign ahead of schedule.' },
  { id: '2', employeeId: '1', date: '2023-12-10', reviewer: 'Sarah Jones', rating: 4, notes: 'Strong leadership shown in cross-functional projects. Area for improvement: delegation of technical tasks.' },
  { id: '3', employeeId: '2', date: '2024-05-20', reviewer: 'David Lee', rating: 4, notes: 'Great design outputs. Consistently meets deadlines.' },
];