"use client"

import ActionsMenu, { ActionsMenuItem } from "@/components/shared/ActionsMenu"
import { Download, Eye } from "lucide-react"

type CertificateActionsMenuProps = {
  courseName: string
  certificateUrl: string | null
  dc3Url: string | null
}

export default function CertificateActionsMenu({
  courseName,
  certificateUrl,
  dc3Url,
}: CertificateActionsMenuProps) {
  return (
    <ActionsMenu ariaLabel={`Acciones para la constancia de ${courseName}`}>
      {({ close }) => (
        <>
          {certificateUrl && (
            <ActionsMenuItem
              icon={<Eye size={15} strokeWidth={2} />}
              label="Ver diploma"
              href={certificateUrl}
              external
              onClick={close}
            />
          )}
          {dc3Url && (
            <ActionsMenuItem
              icon={<Download size={15} strokeWidth={2} />}
              label="Descargar DC-3"
              href={dc3Url}
              external
              onClick={close}
            />
          )}
        </>
      )}
    </ActionsMenu>
  )
}
