export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  category: string;
  size: string;
  owner: string;
  employeeId?: string;
  lastAccessed: string;
  status: 'Active' | 'Deleted';
  deletedAt?: string;
}
