"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Alert from "@mui/material/Alert"
import Snackbar from "@mui/material/Snackbar"

const FEEDBACK_PARAMS = ["success", "error", "created", "synced", "warnings", "skipped"]

type StatusToastProps = {
  tone: "success" | "error"
  message: string
}

export default function StatusToast({ tone, message }: StatusToastProps) {
  const [open, setOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleClose = () => {
    setOpen(false)
    const params = new URLSearchParams(searchParams)
    FEEDBACK_PARAMS.forEach((key) => params.delete(key))
    const serialized = params.toString()
    router.replace(serialized ? `${pathname}?${serialized}` : pathname, { scroll: false })
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={(_, reason) => {
        if (reason === "clickaway") return
        handleClose()
      }}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert
        severity={tone}
        variant="standard"
        onClose={handleClose}
        sx={{
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
          bgcolor: tone === "success" ? "#ECFDF5" : "#FEF2F2",
          color: tone === "success" ? "#065F46" : "#991B1B",
          "& .MuiAlert-icon": { color: tone === "success" ? "#059669" : "#DC2626" },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}
