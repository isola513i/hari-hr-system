import React from 'react';
import { createPortal } from 'react-dom';
import type { TFunction } from 'i18next';
import { X, Check } from 'lucide-react';
import { OrgNode, Department, JOB_TITLES } from '../../types';
import { Dropdown } from '../Dropdown';
import { ModalType } from './orgChartHelpers';

export interface OrgNodeModalProps {
  type: ModalType;
  t: TFunction;
  inputName: string;
  setInputName: (value: string) => void;
  inputRole: string;
  setInputRole: (value: string) => void;
  inputEmail: string;
  setInputEmail: (value: string) => void;
  inputDepartment: Department | '';
  setInputDepartment: (value: Department | '') => void;
  inputAvatar: string;
  setInputAvatar: (value: string) => void;
  inputParentId: string;
  setInputParentId: (value: string) => void;
  departments: readonly Department[];
  availableParents: OrgNode[];
  onClose: () => void;
  onSave: () => void;
}

// Edit/Add Modal
export const OrgNodeModal: React.FC<OrgNodeModalProps> = ({
  type,
  t,
  inputName,
  setInputName,
  inputRole,
  setInputRole,
  inputEmail,
  setInputEmail,
  inputDepartment,
  setInputDepartment,
  inputAvatar,
  setInputAvatar,
  inputParentId,
  setInputParentId,
  departments,
  availableParents,
  onClose,
  onSave,
}) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
            {type === 'add' ? t('orgChart.addNewPosition') : t('orgChart.editPosition')}
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted-light hover:text-text-light"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              {t('orgChart.name')}
            </label>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
              placeholder={t('orgChart.namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              {t('orgChart.roleJobTitle')}
            </label>
            <Dropdown
              value={inputRole}
              onChange={(val) => setInputRole(val)}
              options={JOB_TITLES.map((title) => ({ value: title, label: title }))}
              placeholder={t('orgChart.rolePlaceholder')}
            />
          </div>

          {/* Email - required for adding */}
          {type === 'add' && (
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                {t('orgChart.email')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                placeholder={t('orgChart.emailPlaceholder')}
              />
            </div>
          )}

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              {t('orgChart.department')}
            </label>
            <Dropdown
              value={inputDepartment}
              onChange={(value) => setInputDepartment(value as Department | '')}
              options={[
                { value: '', label: t('addModal.selectDepartment') },
                ...departments.map((dept) => ({ value: dept, label: dept }))
              ]}
              placeholder={t('addModal.selectDepartment')}
            />
          </div>

          {type === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                {t('orgChart.reportsTo')}
              </label>
              <Dropdown
                value={inputParentId || ''}
                onChange={(value) => setInputParentId(value)}
                options={[
                  { value: '', label: t('orgChart.noManager') },
                  ...availableParents.map((parent) => ({
                    value: parent.id,
                    label: `${parent.name} (${parent.role})`
                  }))
                ]}
                placeholder={t('orgChart.selectManager')}
              />
              <p className="text-xs text-text-muted-light mt-1">
                {t('orgChart.reportsToHint')}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              {t('orgChart.avatarUrl')}
            </label>
            <input
              type="text"
              value={inputAvatar}
              onChange={(e) => setInputAvatar(e.target.value)}
              className="w-full px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark text-xs font-mono"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
          >
            {t('common:buttons.cancel')}
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Check size={16} /> {t('common:buttons.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
