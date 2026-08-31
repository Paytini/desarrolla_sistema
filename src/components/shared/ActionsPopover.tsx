"use client"

import { useState, type ReactNode } from "react"
import Box from "@mui/material/Box"
import Fade from "@mui/material/Fade"
import Paper from "@mui/material/Paper"
import Popper, { type PopperPlacementType } from "@mui/material/Popper"
import type { SxProps, Theme } from "@mui/material/styles"

type ActionsPopoverProps = {
  trigger: (props: {
    open: boolean
    toggle: () => void
    setAnchorEl: (el: HTMLButtonElement | null) => void
  }) => ReactNode
  children: (props: { close: () => void }) => ReactNode
  paperSx?: SxProps<Theme>
  placement?: PopperPlacementType
  transitionTimeout?: number
}

export default function ActionsPopover({
  trigger,
  children,
  paperSx,
  placement = "bottom-end",
  transitionTimeout = 150,
}: ActionsPopoverProps) {
  const [open, setOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)

  const toggle = () => setOpen((v) => !v)
  const close = () => setOpen(false)

  return (
    <>
      {trigger({ open, toggle, setAnchorEl })}

      <Popper
        open={open}
        anchorEl={anchorEl}
        placement={placement}
        transition
        style={{ zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={transitionTimeout}>
            <Paper
              elevation={0}
              sx={[
                {
                  mt: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px rgba(0,0,34,0.12), 0 2px 8px rgba(0,0,34,0.06)",
                  overflow: "hidden",
                },
                ...(paperSx ? (Array.isArray(paperSx) ? paperSx : [paperSx]) : []),
              ]}
            >
              {children({ close })}
            </Paper>
          </Fade>
        )}
      </Popper>

      {open && (
        <Box onClick={close} sx={{ position: "fixed", inset: 0, zIndex: 1299 }} />
      )}
    </>
  )
}
