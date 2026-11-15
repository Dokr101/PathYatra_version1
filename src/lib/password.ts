export const PASSWORD_REQUIREMENTS = [
  { label: '8+ characters', valid: (password: string) => password.length >= 8 },
  { label: '1 uppercase letter', valid: (password: string) => /[A-Z]/.test(password) },
  { label: '1 number', valid: (password: string) => /[0-9]/.test(password) },
  { label: '1 symbol', valid: (password: string) => /[^A-Za-z0-9]/.test(password) },
]

export function passwordPolicyErrors(password: string): string[] {
  const errors = PASSWORD_REQUIREMENTS.flatMap((requirement) =>
    requirement.valid(password) ? [] : [requirement.label],
  )
  if (password.length > 72) errors.push('72 characters or fewer')
  return errors
}

export function generateStrongPassword(): string {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%^&*_-', 'abcdefghijkmnopqrstuvwxyz']
  const randomValues = new Uint32Array(16)
  window.crypto.getRandomValues(randomValues)
  const pick = (group: string, value: number) => group[value % group.length]
  const characters = groups.map((group, index) => pick(group, randomValues[index]))
  const allCharacters = groups.join('')
  for (let index = groups.length; index < randomValues.length; index += 1) {
    characters.push(pick(allCharacters, randomValues[index]))
  }
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomValues[index] % (index + 1)
    const current = characters[index]
    characters[index] = characters[swapIndex]
    characters[swapIndex] = current
  }
  return characters.join('')
}
