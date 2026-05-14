"use client"

import { useState, type ReactNode } from "react"

type EmployeeOnboardingTabsProps = {
  manualContent: ReactNode
  csvContent: ReactNode
}

const tabs = [
  {
    id: "manual",
    label: "Alta manual",
    description: "Registra una persona cuando RH necesita resolver un caso puntual.",
  },
  {
    id: "csv",
    label: "Carga CSV",
    description: "Importa varios empleados con una plantilla validada.",
  },
] as const

type TabId = (typeof tabs)[number]["id"]

export default function EmployeeOnboardingTabs({
  manualContent,
  csvContent,
}: EmployeeOnboardingTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("manual")

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">Alta de empleados</h2>
          <p className="text-sm leading-6 text-slate-600">
            Elige el flujo que mejor se adapte al caso: manual para una persona o CSV para cargas masivas.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Metodo de alta de empleados"
          className="grid rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-2"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`employee-onboarding-${tab.id}`}
                id={`employee-onboarding-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-left text-sm font-semibold transition ${
                  isActive
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
        {tabs.map((tab) => (
          <p
            key={tab.id}
            className={`rounded-2xl border px-4 py-3 ${
              activeTab === tab.id
                ? "border-violet-200 bg-violet-50 text-violet-950"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            {tab.description}
          </p>
        ))}
      </div>

      <div
        role="tabpanel"
        id="employee-onboarding-manual"
        aria-labelledby="employee-onboarding-tab-manual"
        hidden={activeTab !== "manual"}
        className="mt-6"
      >
        {manualContent}
      </div>

      <div
        role="tabpanel"
        id="employee-onboarding-csv"
        aria-labelledby="employee-onboarding-tab-csv"
        hidden={activeTab !== "csv"}
        className="mt-6"
      >
        {csvContent}
      </div>
    </article>
  )
}
