import vine from '@vinejs/vine'

const currentPassword = () => vine.string()

export const updateProfileValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(100),
  lastName: vine.string().trim().minLength(1).maxLength(100),
  phone: vine.string().trim().maxLength(50).nullable().optional(),
})

export const updatePasswordValidator = vine.create({
  currentPassword: currentPassword(),
  password: vine.string().minLength(8).maxLength(32),
  passwordConfirmation: vine.string().minLength(8).maxLength(32).sameAs('password'),
})

export const updateOrganizationValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(200),
  website: vine.string().trim().maxLength(255).nullable().optional(),
  industry: vine.string().trim().maxLength(100).nullable().optional(),
  size: vine.string().trim().maxLength(50).nullable().optional(),
  email: vine.string().trim().email().maxLength(254).nullable().optional(),
  phone: vine.string().trim().maxLength(50).nullable().optional(),
  address: vine.string().trim().maxLength(255).nullable().optional(),
  city: vine.string().trim().maxLength(100).nullable().optional(),
  country: vine.string().trim().maxLength(100).nullable().optional(),
})
