import type { DictKey } from '../../i18n/id';
import type { HrAccessRequestType } from '../../services/hrAccess';

/** Type wording per proposal kind, shared by every proposal surface. */
export const TYPE_KEY: Record<HrAccessRequestType, DictKey> = {
  add_hr: 'karyawan.approval.type.add_hr',
  deactivate_hr: 'karyawan.approval.type.deactivate_hr',
  reactivate_hr: 'karyawan.approval.type.reactivate_hr',
  reset_password: 'karyawan.approval.type.reset_password',
  update_hr: 'karyawan.approval.type.update_hr',
};
