import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, KeyRound, Save, Settings2, ShieldCheck, UserRound } from 'lucide-react'
import type { AdminDestination, AdminSettings as SettingsData } from '../../lib/api'
import { apiErrorMessage } from '../../lib/api'
import { fieldErrors, useAdminApi, useFlash, usePageTitle } from '../../lib/adminHooks'
import { useApp } from '../../context/AppContext'
import { PasswordRequirements } from '../../components/PasswordRequirements'
import { generateStrongPassword, passwordPolicyErrors } from '../../lib/password'
import {
  AdminButton,
  AdminCard,
  Field,
  InlineAlert,
  LoadingBlock,
  PageHeader,
  SearchBox,
  TextInput,
} from '../../components/admin/AdminUI'

interface SiteForm {
  siteName: string
  contactEmail: string
  contactPhone: string
}

interface ProfileForm {
  fullName: string
  email: string
}

const EMPTY_SITE: SiteForm = {
  siteName: 'PathYatra',
  contactEmail: '',
  contactPhone: '',
}

export function AdminSettings() {
  usePageTitle('Admin Settings')
  const api = useAdminApi()
  const { user, updateUser } = useApp()
  const { flash, success, fail } = useFlash()

  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [site, setSite] = useState<SiteForm>(EMPTY_SITE)
  const [featured, setFeatured] = useState<string[]>([])
  const [featuredSearch, setFeaturedSearch] = useState('')
  const [destinations, setDestinations] = useState<AdminDestination[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [siteErrors, setSiteErrors] = useState<Record<string, string>>({})
  const [savingSite, setSavingSite] = useState(false)

  const [profile, setProfile] = useState<ProfileForm>({
    fullName: user?.name ?? '',
    email: user?.email ?? '',
  })
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [savingProfile, setSavingProfile] = useState(false)

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [savingPassword, setSavingPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([api.settings.get(), api.destinations.list({ pageSize: 100, sort: 'name', order: 'asc' })])
      .then(([settingsResult, destinationResult]) => {
        if (!active) return
        setSettings(settingsResult)
        setSite({
          siteName: settingsResult.siteName,
          contactEmail: settingsResult.contactEmail ?? '',
          contactPhone: settingsResult.contactPhone ?? '',
        })
        setFeatured(settingsResult.featuredDestinationIds)
        setDestinations(destinationResult.items)
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(apiErrorMessage(reason))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [api])

  useEffect(() => {
    if (!user) return
    setProfile({ fullName: user.name, email: user.email })
  }, [user])

  const filteredDestinations = useMemo(() => {
    const term = featuredSearch.trim().toLowerCase()
    if (!term) return destinations
    return destinations.filter((destination) =>
      `${destination.name} ${destination.province ?? ''} ${destination.district ?? ''}`
        .toLowerCase()
        .includes(term),
    )
  }, [destinations, featuredSearch])

  const saveSite = async () => {
    const errors: Record<string, string> = {}
    if (site.siteName.trim().length < 2) errors.siteName = 'Enter a site name.'
    if (site.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(site.contactEmail))
      errors.contactEmail = 'Enter a valid email address.'
    setSiteErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingSite(true)
    try {
      const updated = await api.settings.update({
        ...site,
        contactEmail: site.contactEmail || null,
        featuredDestinationIds: featured,
      })
      setSettings(updated)
      success('Site settings saved.')
    } catch (reason) {
      setSiteErrors(fieldErrors(reason))
      fail(reason)
    } finally {
      setSavingSite(false)
    }
  }

  const saveProfile = async () => {
    const errors: Record<string, string> = {}
    if (profile.fullName.trim().length < 2) errors.fullName = 'Enter your name.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.email.trim()))
      errors.email = 'Enter a valid email address.'
    setProfileErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingProfile(true)
    try {
      const result = await api.settings.updateProfile({
        fullName: profile.fullName.trim(),
        email: profile.email.trim().toLowerCase(),
      })
      updateUser({ name: result.user.fullName, email: result.user.email })
      success('Your admin profile was saved.')
    } catch (reason) {
      setProfileErrors(fieldErrors(reason))
      fail(reason)
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async () => {
    const errors: Record<string, string> = {}
    if (!passwords.currentPassword) errors.currentPassword = 'Enter your current password.'
    const policyErrors = passwordPolicyErrors(passwords.newPassword)
    if (policyErrors.length > 0) errors.newPassword = `Password needs: ${policyErrors.join(', ')}.`
    if (passwords.newPassword !== passwords.confirmPassword)
      errors.confirmPassword = 'The new passwords do not match.'
    setPasswordErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingPassword(true)
    try {
      await api.settings.changePassword(passwords)
      // The API bumps tokenVersion and re-issues the session cookie for this device.
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
      success('Password changed. Every other session has been signed out.')
    } catch (reason) {
      setPasswordErrors(fieldErrors(reason))
      fail(reason)
    } finally {
      setSavingPassword(false)
    }
  }

  const toggleFeatured = (id: string) => {
    setFeatured((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id].slice(0, 12),
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Admin Settings" />
        <LoadingBlock rows={8} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admin Settings"
        description="Public site details, featured destinations, and your own admin account."
      />

      {loadError ? <InlineAlert tone="error">{loadError}</InlineAlert> : null}
      {flash ? <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminCard
          title="Site details"
          description="Stored once for the whole site. Public contact details are shown in the footer when set."
          actions={<Settings2 size={16} className="text-pine-3" />}
        >
          <div className="space-y-4">
            <Field label="Site name" error={siteErrors.siteName} required>
              <TextInput
                value={site.siteName}
                onChange={(value) => setSite((previous) => ({ ...previous, siteName: value }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact email" error={siteErrors.contactEmail}>
                <TextInput
                  type="email"
                  value={site.contactEmail}
                  onChange={(value) => setSite((previous) => ({ ...previous, contactEmail: value }))}
                />
              </Field>
              <Field label="Contact phone" error={siteErrors.contactPhone}>
                <TextInput
                  value={site.contactPhone}
                  onChange={(value) => setSite((previous) => ({ ...previous, contactPhone: value }))}
                />
              </Field>
              <Field label="Last saved">
                <TextInput
                  value={settings ? new Date(settings.updatedAt).toLocaleString() : 'Not saved yet'}
                  onChange={() => undefined}
                  disabled
                />
              </Field>
            </div>
            <div className="border-t border-line pt-4">
              <AdminButton variant="primary" loading={savingSite} onClick={() => void saveSite()}>
                <Save size={13} /> Save site settings
              </AdminButton>
            </div>
          </div>
        </AdminCard>

        <AdminCard
          title="Featured destinations"
          description="Choose up to 12 destinations to highlight. These are real destination records, not invented popularity."
          actions={
            <span className="chip">{featured.length} / 12 selected</span>
          }
        >
          <SearchBox
            value={featuredSearch}
            onChange={setFeaturedSearch}
            placeholder="Search destinations…"
          />
          <ul className="no-scrollbar mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
            {filteredDestinations.length === 0 ? (
              <li className="py-6 text-center text-xs text-ink-mute">No destinations match.</li>
            ) : (
              filteredDestinations.map((destination) => {
                const checked = featured.includes(destination.id)
                return (
                  <li key={destination.id}>
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs hover:bg-paper-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeatured(destination.id)}
                        className="h-4 w-4 shrink-0 accent-pine"
                      />
                      <span className="min-w-0 flex-1 truncate">{destination.name}</span>
                      <span className="shrink-0 text-[11px] uppercase text-ink-mute">
                        {destination.status.toLowerCase()}
                      </span>
                    </label>
                  </li>
                )
              })
            )}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setFeatured([])}
              className="text-[11px] text-clay hover:underline"
            >
              Clear selection
            </button>
            <AdminButton variant="primary" loading={savingSite} onClick={() => void saveSite()}>
              <Save size={13} /> Save featured list
            </AdminButton>
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AdminCard
          title="Your admin profile"
          description="The name and email shown in the sidebar and audit log."
          actions={<UserRound size={16} className="text-pine-3" />}
        >
          <div className="space-y-4">
            <Field label="Full name" error={profileErrors.fullName} required>
              <TextInput
                value={profile.fullName}
                onChange={(value) => setProfile((previous) => ({ ...previous, fullName: value }))}
              />
            </Field>
            <Field label="Email" error={profileErrors.email} required>
              <TextInput
                type="email"
                value={profile.email}
                onChange={(value) => setProfile((previous) => ({ ...previous, email: value }))}
              />
            </Field>
            <p className="flex items-center gap-1.5 text-[11px] text-ink-mute">
              <ShieldCheck size={12} className="text-pine" />
              Role: {user?.role?.replace('_', ' ')} · changing roles is handled in Users.
            </p>
            <AdminButton variant="primary" loading={savingProfile} onClick={() => void saveProfile()}>
              <Save size={13} /> Save profile
            </AdminButton>
          </div>
        </AdminCard>

        <AdminCard
          title="Change password"
          description="Requires your current password. Existing sessions stay valid until they expire or you sign out."
          actions={<KeyRound size={16} className="text-pine-3" />}
        >
          <div className="space-y-4">
            <Field label="Current password" error={passwordErrors.currentPassword} required>
              <TextInput
                type="password"
                value={passwords.currentPassword}
                onChange={(value) =>
                  setPasswords((previous) => ({ ...previous, currentPassword: value }))
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-mute">
                  New password <span className="ml-1 text-saffron">*</span>
                </span>
                <div className="relative">
                <TextInput
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwords.newPassword}
                  onChange={(value) => {
                    setPasswords((previous) => ({ ...previous, newPassword: value }))
                    setPasswordErrors((previous) => ({ ...previous, newPassword: '' }))
                  }}
                  className="pr-10"
                />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink"
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {passwordErrors.newPassword ? (
                  <span className="mt-1 block text-[11px] text-clay">{passwordErrors.newPassword}</span>
                ) : null}
                <PasswordRequirements
                  password={passwords.newPassword}
                  onSuggest={() => {
                    const generated = generateStrongPassword()
                    setPasswords((previous) => ({
                      ...previous,
                      newPassword: generated,
                      confirmPassword: generated,
                    }))
                    setPasswordErrors((previous) => ({
                      ...previous,
                      newPassword: '',
                      confirmPassword: '',
                    }))
                    setShowNewPassword(true)
                  }}
                />
              </div>
              <Field label="Confirm new password" error={passwordErrors.confirmPassword} required>
                <TextInput
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(value) =>
                    setPasswords((previous) => ({ ...previous, confirmPassword: value }))
                  }
                />
              </Field>
            </div>
            <AdminButton variant="primary" loading={savingPassword} onClick={() => void savePassword()}>
              <KeyRound size={13} /> Change password
            </AdminButton>
          </div>
        </AdminCard>
      </div>
    </div>
  )
}
