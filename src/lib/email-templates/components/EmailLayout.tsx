import { Body, Container, Head, Html, Img, Preview, Section, Text } from "@react-email/components"
import type { ReactNode } from "react"
import { getLogoUrl } from "../shared"

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
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "32px",
  color: "#1a1a1a",
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
  borderTop: "1px solid #e5e7eb",
  paddingTop: "16px",
}

const footerTextStyle = {
  textAlign: "center" as const,
  fontSize: "12px",
  color: "#94a3b8",
  margin: 0,
}
