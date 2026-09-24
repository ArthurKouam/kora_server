import Form from '#models/form'
import { validateFormDefinition } from '#services/form_definition_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class FormsController {
  private async find(ctx: HttpContext) {
    const organizationId = ctx.auth.use('web').getUserOrFail().organizationId
    if (!organizationId) return null
    return Form.query().where('id', String(ctx.params.id)).where('organization_id', organizationId).first()
  }

  async index({ auth, response }: HttpContext) {
    const organizationId = auth.use('web').getUserOrFail().organizationId
    if (!organizationId) return response.forbidden({ error: 'User does not belong to any organization' })
    return response.ok(await Form.query().where('organization_id', organizationId).orderBy('name'))
  }

  async show(ctx: HttpContext) {
    const form = await this.find(ctx)
    return form ? ctx.response.ok(form) : ctx.response.notFound({ error: 'Form not found' })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.use('web').getUserOrFail()
    if (!user.organizationId) return response.forbidden({ error: 'User does not belong to any organization' })
    const payload = request.body() as { name?: unknown; fields?: unknown }
    const name = typeof payload.name === 'string' ? payload.name.trim() : ''
    if (!name || name.length > 120) return response.unprocessableEntity({ errors: { name: 'Le nom est requis (120 caractères max).' } })
    const validation = validateFormDefinition({ fields: payload.fields ?? [] })
    if (!validation.valid) return response.unprocessableEntity({ errors: validation.errors })
    return response.created(await Form.create({ name, definition: { fields: payload.fields as unknown[] }, organizationId: user.organizationId, createdBy: user.id }))
  }

  async update(ctx: HttpContext) {
    const form = await this.find(ctx)
    if (!form) return ctx.response.notFound({ error: 'Form not found' })
    const payload = ctx.request.body() as { name?: unknown; fields?: unknown }
    if (payload.name !== undefined) {
      if (typeof payload.name !== 'string' || !payload.name.trim() || payload.name.trim().length > 120) return ctx.response.unprocessableEntity({ errors: { name: 'Le nom est requis (120 caractères max).' } })
      form.name = payload.name.trim()
    }
    if (payload.fields !== undefined) {
      const validation = validateFormDefinition({ fields: payload.fields })
      if (!validation.valid) return ctx.response.unprocessableEntity({ errors: validation.errors })
      form.definition = { fields: payload.fields as unknown[] }
    }
    await form.save()
    return ctx.response.ok(form)
  }

  async destroy(ctx: HttpContext) {
    const form = await this.find(ctx)
    if (!form) return ctx.response.notFound({ error: 'Form not found' })
    await form.delete()
    return ctx.response.noContent()
  }
}
