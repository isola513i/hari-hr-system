import React, { useState } from 'react';
import {
  User,
  Mail,
  Calendar,
  Check,
  Briefcase,
  Users,
  AlertCircle
} from 'lucide-react';
import { Modal } from './Modal';

/**
 * Form data for adding a new employee
 */
interface NewEmployeeForm {
  name: string;
  role: string;
  department: string;
  email: string;
  joinDate: string;
}

/**
 * Validation errors for employee form fields
 */
interface ValidationErrors {
  name?: string;
  role?: string;
  department?: string;
  email?: string;
  joinDate?: string;
}

/**
 * Props for AddEmployeeModal component
 */
interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: NewEmployeeForm) => Promise<void>;
}

/**
 * Modal component for adding a new employee
 *
 * Features:
 * - Form validation with real-time error display
 * - All required fields with appropriate input types
 * - Icon-enhanced input fields
 * - Accessible form labels and error messages
 *
 * @param props - Component props
 */
export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>({
    name: '',
    role: '',
    department: '',
    email: '',
    joinDate: ''
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  /**
   * Validates the employee form data
   * @returns True if form is valid, false otherwise
   */
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!newEmployee.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!newEmployee.role.trim()) {
      errors.role = 'Role is required';
    }

    if (!newEmployee.department.trim()) {
      errors.department = 'Department is required';
    }

    if (!newEmployee.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmployee.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!newEmployee.joinDate) {
      errors.joinDate = 'Start date is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit(newEmployee);

    // Reset form
    setNewEmployee({
      name: '',
      role: '',
      department: '',
      email: '',
      joinDate: ''
    });
    setValidationErrors({});
  };

  /**
   * Handles modal close and resets form
   */
  const handleClose = () => {
    setNewEmployee({
      name: '',
      role: '',
      department: '',
      email: '',
      joinDate: ''
    });
    setValidationErrors({});
    onClose();
  };

  /**
   * Updates form field and clears its validation error
   */
  const updateField = (field: keyof NewEmployeeForm, value: string) => {
    setNewEmployee({ ...newEmployee, [field]: value });
    if (validationErrors[field]) {
      setValidationErrors({ ...validationErrors, [field]: '' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Employee"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Full Name Field */}
        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
            <input
              type="text"
              value={newEmployee.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Alex Morgan"
              className={`w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 text-text-light dark:text-text-dark ${
                validationErrors.name
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-border-light dark:border-border-dark focus:ring-primary'
              }`}
            />
            {validationErrors.name && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={16} />
            )}
          </div>
          {validationErrors.name && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              {validationErrors.name}
            </p>
          )}
        </div>

        {/* Role and Department Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              Role
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
              <input
                type="text"
                value={newEmployee.role}
                onChange={(e) => updateField('role', e.target.value)}
                placeholder="e.g. Designer"
                className={`w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 text-text-light dark:text-text-dark ${
                  validationErrors.role
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-border-light dark:border-border-dark focus:ring-primary'
                }`}
              />
              {validationErrors.role && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={16} />
              )}
            </div>
            {validationErrors.role && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.role}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
              Department
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
              <input
                type="text"
                value={newEmployee.department}
                onChange={(e) => updateField('department', e.target.value)}
                placeholder="e.g. Product"
                className={`w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 text-text-light dark:text-text-dark ${
                  validationErrors.department
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-border-light dark:border-border-dark focus:ring-primary'
                }`}
              />
              {validationErrors.department && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={16} />
              )}
            </div>
            {validationErrors.department && (
              <p className="mt-1 text-xs text-red-500">{validationErrors.department}</p>
            )}
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
            <input
              type="email"
              value={newEmployee.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="e.g. alex@nexus.hr"
              className={`w-full pl-10 pr-10 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 text-text-light dark:text-text-dark ${
                validationErrors.email
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-border-light dark:border-border-dark focus:ring-primary'
              }`}
            />
            {validationErrors.email && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={16} />
            )}
          </div>
          {validationErrors.email && (
            <p className="mt-1 text-xs text-red-500">{validationErrors.email}</p>
          )}
        </div>

        {/* Start Date Field */}
        <div>
          <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
            Start Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
            <input
              type="date"
              value={newEmployee.joinDate}
              onChange={(e) => updateField('joinDate', e.target.value)}
              className={`w-full pl-10 pr-10 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 text-text-light dark:text-text-dark ${
                validationErrors.joinDate
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-border-light dark:border-border-dark focus:ring-primary'
              }`}
            />
            {validationErrors.joinDate && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={16} />
            )}
          </div>
          {validationErrors.joinDate && (
            <p className="mt-1 text-xs text-red-500">{validationErrors.joinDate}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light dark:text-text-muted-dark dark:hover:text-text-dark"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
          >
            <Check size={16} /> Add Employee
          </button>
        </div>
      </form>
    </Modal>
  );
};
