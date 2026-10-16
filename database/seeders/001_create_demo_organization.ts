import Organization from '#models/organization'
import Plan from '#models/plan'
import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

export default class CreateDemoOrganizationSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    const existing = await Organization.findBy('slug', 'acme-corp')
    if (existing) return

    // Le vivier de talents est une capacité déclarée au forfait Pro
    // (`plans.features.talentPool`) : la démo doit pouvoir la montrer.
    const plan = await Plan.findBy('slug', 'pro')

    const organization = await Organization.create({
      name: 'Acme Corp',
      slug: 'acme-corp',
      description: 'Entreprise de démonstration Korahire.',
      industry: 'Technologie',
      size: '10-50',
      email: 'contact@acme.test',
      city: 'Paris',
      country: 'France',
      planId: plan?.id ?? null,
      planExpiresAt: plan ? DateTime.now().plus({ days: 30 }) : null,
    })

    await User.createMany([
      {
        firstName: 'Arthur',
        lastName: 'Owner',
        email: 'arthur@acme.test',
        password: 'password123',
        role: 'owner',
        organizationId: organization.id,
        emailVerifiedAt: DateTime.now(),
      },
      {
        firstName: 'Sarah',
        lastName: 'Recruiter',
        email: 'sarah@acme.test',
        password: 'password123',
        role: 'recruiter',
        organizationId: organization.id,
      },
      {
        firstName: 'Marc',
        lastName: 'Interviewer',
        email: 'marc@acme.test',
        password: 'password123',
        role: 'interviewer',
        organizationId: organization.id,
      },
    ])
  }
}
