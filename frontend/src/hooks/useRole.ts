import { useAuth } from './useAuth'

export function useRole() {
  const { role } = useAuth()
  const isAdmin = role === 'ADMIN'
  const isComplianceOfficer = role === 'COMPLIANCE_OFFICER'
  const isRiskControlManager = role === 'RISK_CONTROL_MANAGER'
  const isTechnologyLead = role === 'TECHNOLOGY_LEAD'
  const isAiGovernanceLead = role === 'AI_GOVERNANCE_LEAD'

  return {
    role,
    isAdmin,
    isComplianceOfficer,
    isRiskControlManager,
    isTechnologyLead,
    isAiGovernanceLead,
    canEdit: isAdmin || isComplianceOfficer || isRiskControlManager,
    canIngest: isAdmin || isComplianceOfficer,
    canManageAiRegistry: isAdmin || isAiGovernanceLead,
    canApproveMapping: isAdmin || isComplianceOfficer,
    canRejectMapping: isAdmin || isComplianceOfficer || isRiskControlManager,
    canEditRiskRating: isAdmin || isRiskControlManager,
    canEditControls: isAdmin || isRiskControlManager,
    canAcknowledgeTask: isAdmin || isTechnologyLead,
    canMarkImplemented: isAdmin || isComplianceOfficer,
  }
}
