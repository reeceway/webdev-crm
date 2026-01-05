import api from './api';

export interface AuditCheck {
  name: string;
  category: string;
  passed: boolean;
  score: number;
  maxScore: number;
  impact: 'Critical' | 'High' | 'Medium' | 'Low';
  details: string;
  recommendation: string | null;
}

export interface AuditRecommendation {
  priority: string;
  category: string;
  issue: string;
  recommendation: string;
}

export interface AuditResult {
  url: string;
  domain: string;
  timestamp: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D';
  summary: string;
  passedChecks: number;
  totalChecks: number;
  checks: AuditCheck[];
  recommendations: AuditRecommendation[];
  responseTime?: number; // Top-level responseTime
  technicalDetails: {
    responseTime?: number;
    statusCode?: number;
    title?: string;
    metaDescription?: string;
    h1Count?: number;
    images?: { total: number; withAlt: number };
    links?: { total: number; internal: number };
  };
  error?: string;
}

export const auditService = {
  async runAudit(url: string): Promise<AuditResult> {
    const { data } = await api.post('/audit/audit', { url });
    return data;
  },
};
