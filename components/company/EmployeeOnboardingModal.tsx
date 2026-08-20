"use client"

import { useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { UserPlus, X } from "lucide-react"
import Box from "@mui/material/Box"
import Dialog from "@mui/material/Dialog"
import IconButton from "@mui/material/IconButton"
import Tab from "@mui/material/Tab"
import Tabs from "@mui/material/Tabs"
import Typography from "@mui/material/Typography"

type EmployeeOnboardingModalProps = {
  manualContent: ReactNode
  csvContent: ReactNode
}

const TABS = [
  { id: "manual", label: "Alta manual" },
  { id: "csv", label: "Carga CSV" },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function EmployeeOnboardingModal({
  manualContent,
  csvContent,
}: EmployeeOnboardingModalProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>("manual")

  const searchParams = useSearchParams()
  const feedbackKey = `${searchParams.get("success") ?? ""}|${searchParams.get("error") ?? ""}`
  const [prevFeedbackKey, setPrevFeedbackKey] = useState(feedbackKey)

  if (prevFeedbackKey !== feedbackKey) {
    setPrevFeedbackKey(feedbackKey)
    if (feedbackKey !== "|") setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[#3579F5] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2A61D6]"
      >
        <UserPlus size={16} />
        Agregar empleados
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: "24px",
              border: "1px solid",
              borderColor: "divider",
              height: "min(920px, 92vh)",
            },
          },
        }}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            bgcolor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
            px: 3,
            pt: 2.5,
            pb: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600, fontSize: 18 }}>
                Agregar empleados
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
                Manual para una persona o CSV para cargas masivas.
              </Typography>
            </Box>
            <IconButton
              onClick={() => setOpen(false)}
              aria-label="Cerrar panel de alta"
              size="small"
            >
              <X size={18} />
            </IconButton>
          </Box>

          <Tabs
            value={activeTab}
            onChange={(_, v: TabId) => setActiveTab(v)}
            aria-label="Método de alta de empleados"
            sx={{
              mt: 2,
              minHeight: "auto",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "16px",
              bgcolor: "background.default",
              p: 0.5,
              width: "fit-content",
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

        <Box sx={{ overflowY: "auto" }}>
          <Box
            role="tabpanel"
            id="employee-onboarding-manual"
            hidden={activeTab !== "manual"}
            sx={{ p: 3 }}
          >
            {manualContent}
          </Box>
          <Box
            role="tabpanel"
            id="employee-onboarding-csv"
            hidden={activeTab !== "csv"}
            sx={{ p: 3 }}
          >
            {csvContent}
          </Box>
        </Box>
      </Dialog>
    </>
  )
}
