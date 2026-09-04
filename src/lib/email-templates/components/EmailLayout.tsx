import { Body, Container, Head, Html, Img, Preview, Section, Text } from "@react-email/components"
import type { ReactNode } from "react"
import { getLogoUrl } from "../shared"
import { fd, portalColors, slate } from "@/lib/theme-tokens"

type EmailLayoutProps = {
  previewText: string
  skipLogo?: boolean
  maxWidth?: number
  children: ReactNode
}

export function EmailLayout({
  previewText,
  skipLogo = false,
  maxWidth = 480,
  children,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={{ ...containerStyle, maxWidth: `${maxWidth}px` }}>
          {!skipLogo && (
            <Section style={logoSectionStyle}>
              <Img src={getLogoUrl()} alt="Desarrolla360" width="160" style={logoStyle} />
            </Section>
          )}
          <Section>{children}</Section>
          <Section style={footerSectionStyle}>
            <Text style={footerTextStyle}>© {new Date().getFullYear()} Desarrolla360</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle = {
  backgroundColor: "#f4f4f5",
  fontFamily: "-apple-system, Segoe UI, Roboto, sans-serif",
  padding: "24px 0",
}

const containerStyle = {
  margin: "0 auto",
  backgroundColor: fd.background,
  borderRadius: "12px",
  padding: "32px",
  color: portalColors.ink,
}

const logoSectionStyle = {
  textAlign: "center" as const,
  marginBottom: "24px",
}

const logoStyle = {
  margin: "0 auto",
  width: "160px",
  height: "auto",
}

const footerSectionStyle = {
  marginTop: "32px",
  borderTop: `1px solid ${portalColors.border}`,
  paddingTop: "16px",
}

const footerTextStyle = {
  textAlign: "center" as const,
  fontSize: "12px",
  color: slate[400],
  margin: 0,
}
