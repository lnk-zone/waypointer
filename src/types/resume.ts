/**
 * Shared resume types used by document generation (PDF/DOCX),
 * download API route, and frontend resume workspace.
 */

export interface ResumeExperienceEntry {
  company: string;
  title: string;
  dates: string;
  bullets: string[];
}

export interface ResumeEducationEntry {
  institution: string;
  degree: string | null;
  field: string | null;
  year: string | null;
}

export interface ResumeDocumentProps {
  employeeName: string;
  contactInfo?: string;
  summaryStatement: string;
  skillsSection: string[];
  experienceSection: ResumeExperienceEntry[];
  educationSection?: ResumeEducationEntry[];
  certificationsSection?: string[];
}
