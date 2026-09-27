import React from 'react';
import { Student } from '../../types';
import { ComprehensiveQuranPlanModal } from '../common/ComprehensiveQuranPlanModal';

export interface StudentQuranPlanModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  initialMode?: 'view' | 'setup';
}

/**
 * Unified Student Quran Plan Modal
 * Single authority rendering the official comprehensive document with setup, preview,
 * persistence, 3 calendar modes (hijri / gregorian / none), print, and PDF export.
 */
export const StudentQuranPlanModal: React.FC<StudentQuranPlanModalProps> = ({
  isOpen,
  student,
  onClose,
  initialMode,
}) => {
  if (!isOpen || !student) return null;

  return (
    <ComprehensiveQuranPlanModal
      student={student}
      variant="teacher"
      onClose={onClose}
      initialMode={initialMode}
      isOpen={isOpen}
    />
  );
};

export default StudentQuranPlanModal;
