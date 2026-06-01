import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useUser } from '@clerk/clerk-react'
import { api } from '../../convex/_generated/api'
import { I } from '../icons'

const COUNTRIES = [
  { code: 'BF', label: 'Burkina Faso' },
  { code: 'CI', label: "Côte d'Ivoire" },
  { code: 'SN', label: 'Sénégal' },
  { code: 'ML', label: 'Mali' },
  { code: 'GN', label: 'Guinée' },
  { code: 'TG', label: 'Togo' },
  { code: 'BJ', label: 'Bénin' },
  { code: 'NE', label: 'Niger' },
]

const CURRENCIES = [
  { code: 'XOF', label: 'Franc CFA (XOF)' },
  { code: 'GNF', label: 'Franc guinéen (GNF)' },
  { code: 'XAF', label: 'Franc CFA CEMAC (XAF)' },
]

const STEPS = [
  { id: 'org', title: 'Organisation', sub: 'Informations sur votre institution' },
  { id: 'branch', title: 'Agence', sub: 'Votre première agence opérationnelle' },
  { id: 'user', title: 'Votre profil', sub: 'Comment vous identifier dans le système' },
]

function Field({ label, error, children }) {
  return (
    <div className="ob-field">
      <label className="ob-label">{label}</label>
      {children}
      {error && <span className="ob-field-error">{error}</span>}
    </div>
  )
}

function Input({ ...props }) {
  return <input className="ob-input" {...props} />
}

function Select({ children, ...props }) {
  return (
    <select className="ob-input ob-select" {...props}>
      {children}
    </select>
  )
}

function StepOrg({ data, onChange, errors }) {
  return (
    <div className="ob-fields">
      <Field label="Nom de l'organisation" error={errors.orgName}>
        <Input
          placeholder="ex. Kauri Finance S.A."
          value={data.orgName}
          onChange={(e) => onChange('orgName', e.target.value)}
        />
      </Field>
      <div className="ob-row">
        <Field label="Pays" error={errors.country}>
          <Select value={data.country} onChange={(e) => onChange('country', e.target.value)}>
            <option value="">Sélectionner…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Devise" error={errors.currency}>
          <Select value={data.currency} onChange={(e) => onChange('currency', e.target.value)}>
            <option value="">Sélectionner…</option>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Numéro de licence réglementaire" error={errors.licenseNumber}>
        <Input
          placeholder="ex. BCEAO/2024/0042"
          value={data.licenseNumber}
          onChange={(e) => onChange('licenseNumber', e.target.value)}
        />
      </Field>
    </div>
  )
}

function StepBranch({ data, onChange, errors }) {
  return (
    <div className="ob-fields">
      <Field label="Nom de l'agence" error={errors.branchName}>
        <Input
          placeholder="ex. Agence Centrale Ouagadougou"
          value={data.branchName}
          onChange={(e) => onChange('branchName', e.target.value)}
        />
      </Field>
      <Field label="Localisation" error={errors.branchLocation}>
        <Input
          placeholder="ex. Secteur 15, Ouagadougou"
          value={data.branchLocation}
          onChange={(e) => onChange('branchLocation', e.target.value)}
        />
      </Field>
      <Field label="Code agence" error={errors.branchCode}>
        <Input
          placeholder="ex. OUAGA-01"
          value={data.branchCode}
          style={{
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
          }}
          onChange={(e) => onChange('branchCode', e.target.value.toUpperCase())}
        />
      </Field>
    </div>
  )
}

function StepUser({ data, onChange, errors, clerkEmail }) {
  return (
    <div className="ob-fields">
      <Field label="Nom complet" error={errors.fullName}>
        <Input
          placeholder="ex. Djibril Ouédraogo"
          value={data.fullName}
          onChange={(e) => onChange('fullName', e.target.value)}
        />
      </Field>
      <Field label="Adresse e-mail">
        <Input value={clerkEmail} disabled style={{ opacity: 0.55, cursor: 'not-allowed' }} />
      </Field>
      <Field label="Numéro de téléphone" error={errors.phoneNumber}>
        <Input
          placeholder="ex. +226 70 00 00 00"
          value={data.phoneNumber}
          onChange={(e) => onChange('phoneNumber', e.target.value)}
        />
      </Field>
    </div>
  )
}

function validateStep(step, data) {
  const errors = {}
  if (step === 0) {
    if (!data.orgName.trim()) errors.orgName = 'Champ obligatoire'
    if (!data.country) errors.country = 'Champ obligatoire'
    if (!data.currency) errors.currency = 'Champ obligatoire'
    if (!data.licenseNumber.trim()) errors.licenseNumber = 'Champ obligatoire'
  } else if (step === 1) {
    if (!data.branchName.trim()) errors.branchName = 'Champ obligatoire'
    if (!data.branchLocation.trim()) errors.branchLocation = 'Champ obligatoire'
    if (!data.branchCode.trim()) errors.branchCode = 'Champ obligatoire'
  } else if (step === 2) {
    if (!data.fullName.trim()) errors.fullName = 'Champ obligatoire'
    if (!data.phoneNumber.trim()) errors.phoneNumber = 'Champ obligatoire'
  }
  return errors
}

export function OnboardingWizard() {
  const { user: clerkUser } = useUser()
  const onboard = useMutation(api.users.onboard)

  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [done, setDone] = useState(false)

  const [data, setData] = useState({
    orgName: '',
    country: '',
    currency: 'XOF',
    licenseNumber: '',
    branchName: '',
    branchLocation: '',
    branchCode: '',
    fullName: clerkUser?.fullName ?? '',
    phoneNumber: '',
  })

  const onChange = (key, val) => {
    setData((prev) => ({ ...prev, [key]: val }))
    if (errors[key])
      setErrors((prev) => {
        const n = { ...prev }
        delete n[key]
        return n
      })
  }

  const advance = async () => {
    const stepErrors = validateStep(step, data)
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors)
      return
    }
    setErrors({})

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
      return
    }

    // Final step — submit
    setSubmitting(true)
    setServerError(null)
    try {
      await onboard({
        orgName: data.orgName,
        country: data.country,
        currency: data.currency,
        licenseNumber: data.licenseNumber,
        branchName: data.branchName,
        branchLocation: data.branchLocation,
        branchCode: data.branchCode,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
      })
      setDone(true)
    } catch (err) {
      setServerError(err.message ?? 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  const back = () => {
    setErrors({})
    setStep((s) => s - 1)
  }

  const pct = ((step + (done ? 1 : 0)) / STEPS.length) * 100

  return (
    <div className="ob-overlay">
      <div className="ob-panel">
        {/* Header */}
        <div className="ob-header">
          <div className="ob-logo">
            <I.KauriDrop size={22} stroke="var(--brand)" strokeWidth={2} />
            <span className="ob-logo-name">Kauri</span>
          </div>
          <div className="ob-header-sub">Configuration initiale</div>
        </div>

        {/* Progress track */}
        <div className="ob-track">
          <div className="ob-track-fill" style={{ width: pct + '%' }} />
        </div>

        {/* Step indicators */}
        <div className="ob-steps">
          {STEPS.map((s, i) => {
            const state = done || i < step ? 'done' : i === step ? 'active' : 'pending'
            return (
              <div key={s.id} className={`ob-step-pill ob-step-pill--${state}`}>
                <div className="ob-step-num">
                  {state === 'done' ? <I.Check size={11} strokeWidth={2.5} /> : i + 1}
                </div>
                <span className="ob-step-label">{s.title}</span>
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div className="ob-body">
          {done ? (
            <div className="ob-done">
              <div className="ob-done-ring">
                <I.Check size={28} strokeWidth={2} stroke="var(--brand)" />
              </div>
              <h2 className="ob-done-title">Tout est prêt !</h2>
              <p className="ob-done-sub">
                Votre organisation, votre agence et votre profil ont été créés avec succès. La page
                va se recharger automatiquement.
              </p>
              <button
                className="btn brand"
                style={{ marginTop: 8 }}
                onClick={() => window.location.reload()}
              >
                Accéder au tableau de bord <I.Arrow size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="ob-step-head">
                <p className="ob-step-n">
                  Étape {step + 1} sur {STEPS.length}
                </p>
                <h2 className="ob-step-title">{STEPS[step].title}</h2>
                <p className="ob-step-sub">{STEPS[step].sub}</p>
              </div>

              {step === 0 && <StepOrg data={data} onChange={onChange} errors={errors} />}
              {step === 1 && <StepBranch data={data} onChange={onChange} errors={errors} />}
              {step === 2 && (
                <StepUser
                  data={data}
                  onChange={onChange}
                  errors={errors}
                  clerkEmail={clerkUser?.primaryEmailAddress?.emailAddress ?? ''}
                />
              )}

              {serverError && <div className="ob-server-error">{serverError}</div>}

              <div className="ob-actions">
                {step > 0 && (
                  <button className="btn ghost" onClick={back} disabled={submitting}>
                    ← Retour
                  </button>
                )}
                <button
                  className="btn brand"
                  style={{ marginLeft: 'auto' }}
                  onClick={advance}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Enregistrement…'
                    : step < STEPS.length - 1
                      ? 'Continuer'
                      : 'Terminer la configuration'}
                  {!submitting && <I.Arrow size={14} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
