import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Organization from '#models/organization'
import User from '#models/user'

export default class extends BaseSeeder {
  static environment = ['development', 'testing', 'production']

  async run() {
    // Create Acme Corp organization
    const organization = await Organization.firstOrCreate(
      { name: 'Acme Corp' },
      {
        name: 'Acme Corp',
        slug: 'acme-corp',
        email: 'contact@acme.com',
        description: 'A leading technology company',
        website: 'https://acme.com',
      }
    )

    // Create Arthur Kouam as owner
    await User.firstOrCreate(
      { email: 'arthur@acme.com' },
      {
        email: 'arthur@acme.com',
        firstName: 'Arthur',
        lastName: 'Kouam',
        password: 'password', // Will be hashed by the model
        role: 'owner',
        organizationId: organization.id,
      }
    )

    console.log('Acme Corp organization and Arthur Kouam (owner) created successfully!')
  }
}
