export type MdmQualitySeverity = "critical" | "warning" | "info";

export type MdmQualityIssue = {
  code: string;
  title: string;
  description: string;
  severity: MdmQualitySeverity;
  affectedCount: number;
  targetPage: string;
};

export type MdmQualityReport = {
  generatedAt: string;
  totalParts: number;
  qualityScore: number;
  summary: {
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
    affectedObjects: number;
  };
  issues: MdmQualityIssue[];
};

export interface MdmQualityReportRepository {
  getQualityReport(): Promise<MdmQualityReport>;
}
