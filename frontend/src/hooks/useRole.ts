import { useAuth } from './useAuth'

export function useRole() {
  const { role } = useAuth()
  const isComplianceOfficer = role === 'COMPLIANCE_OFFICER'
  const isRiskControlManager = role === 'RISK_CONTROL_MANAGER'
  const isTechnologyLead = role === 'TECHNOLOGY_LEAD'
  const isAiGovernanceLead = role === 'AI_GOVERNANCE_LEAD'

  return {
    role,
    isComplianceOfficer,
    isRiskControlManager,
    isTechnologyLead,
    isAiGovernanceLead,
    canEdit: isComplianceOfficer || isRiskControlManager,
    canIngest: isComplianceOfficer,
    canManageAiRegistry: isAiGovernanceLead,
    canApproveMapping: isComplianceOfficer,
    canRejectMapping: isComplianceOfficer || isRiskControlManager,
    canEditRiskRating: isRiskControlManager,
    canEditControls: isRiskControlManager,
    canAcknowledgeTask: isTechnologyLead,
    canMarkImplemented: isComplianceOfficer,
  }
}


