import { useAuth } from './useAuth'

export function useRole() {
  const { role } = useAuth()
  return {
    role,
    isComplianceOfficer: role === 'COMPLIANCE_OFFICER',
    isRiskControlManager: role === 'RISK_CONTROL_MANAGER',
    isTechnologyLead: role === 'TECHNOLOGY_LEAD',
    isAiGovernanceLead: role === 'AI_GOVERNANCE_LEAD',
    canEdit: role === 'COMPLIANCE_OFFICER' || role === 'RISK_CONTROL_MANAGER',
    canIngest: role === 'COMPLIANCE_OFFICER',
    canManageAiRegistry: role === 'AI_GOVERNANCE_LEAD',
  }
}
