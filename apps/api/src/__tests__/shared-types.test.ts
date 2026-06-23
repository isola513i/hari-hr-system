import { USER_ROLES, LEAVE_REQUEST_STATUSES } from '../constants/roles';

// Verifies the @hari/shared-types workspace package resolves at runtime under
// ts-jest (compiled dist is consumed as a normal dependency via the symlink),
// not just at type-check time.
describe('@hari/shared-types workspace package', () => {
  it('resolves shared role constants', () => {
    expect(USER_ROLES).toContain('HR_ADMIN');
    expect(USER_ROLES).toContain('EMPLOYEE');
    expect(USER_ROLES).toHaveLength(4);
  });

  it('resolves shared leave-status constants', () => {
    expect(LEAVE_REQUEST_STATUSES).toContain('Manager Approved');
    expect(LEAVE_REQUEST_STATUSES).toContain('Cancel Requested');
  });
});
