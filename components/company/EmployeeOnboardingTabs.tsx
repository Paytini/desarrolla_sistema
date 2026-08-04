"use client"

import { useState, type ReactNode } from "react"
import Box from "@mui/material/Box"
import Paper from "@mui/material/Paper"
import Tab from "@mui/material/Tab"
import Tabs from "@mui/material/Tabs"
import Typography from "@mui/material/Typography"

type EmployeeOnboardingTabsProps = {
  manualContent: ReactNode
  csvContent: ReactNode
}

const TABS = [
  { id: "manual", label: "Alta manual" },
  { id: "csv", label: "Carga CSV" },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function EmployeeOnboardingTabs({
  manualContent,
  csvContent,
}: EmployeeOnboardingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("manual")

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "24px",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        p: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          alignItems: { lg: "flex-start" },
          justifyContent: { lg: "space-between" },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", fontSize: 18 }}>
            Alta de empleados
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary", lineHeight: 1.6 }}>
            Elige el flujo que mejor se adapte al caso: manual para una persona o CSV para cargas
            masivas.
          </Typography>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(_, v: TabId) => setActiveTab(v)}
          aria-label="Método de alta de empleados"
          sx={{
            flexShrink: 0,
            minHeight: "auto",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "16px",
            bgcolor: "background.default",
            p: 0.5,
            "& .MuiTabs-indicator": {
              height: "100%",
              borderRadius: "12px",
              bgcolor: "background.paper",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              zIndex: 0,
            },
            "& .MuiTab-root": {
              minHeight: "auto",
              minWidth: 0,
              px: 2,
              py: 1,
              fontSize: 13,
              fontWeight: 600,
              textTransform: "none",
              borderRadius: "12px",
              zIndex: 1,
              color: "text.secondary",
              transition: "color 0.15s ease",
              "&.Mui-selected": { color: "text.primary" },
            },
          }}
        >
          {TABS.map((tab) => (
            <Tab key={tab.id} value={tab.id} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      <Box
        role="tabpanel"
        id="employee-onboarding-manual"
        aria-labelledby="employee-onboarding-tab-manual"
        hidden={activeTab !== "manual"}
        sx={{ mt: 3 }}
      >
        {manualContent}
      </Box>
      <Box
        role="tabpanel"
        id="employee-onboarding-csv"
        aria-labelledby="employee-onboarding-tab-csv"
        hidden={activeTab !== "csv"}
        sx={{ mt: 3 }}
      >
        {csvContent}
      </Box>
    </Paper>
  )
}
