import { seedTalentPoolDemo } from '#services/talent_pool_demo_seed'
import { test } from '@japa/runner'

/**
 * Peuplement de l'organisation de démonstration du vivier.
 *
 * Écrit dans la base de développement : ne s'exécute que sur demande explicite,
 * pour ne pas polluer une base de test ou d'intégration continue.
 *
 *   SEED_DEMO=1 node ace test functional --files=seed_talent_pool_demo.spec.ts
 */
if (process.env.SEED_DEMO === '1') {
  test('Démo — vivier de talents', async ({ assert }) => {
    const result = await seedTalentPoolDemo({ reset: true })

    assert.include(result.message, 'Organisation prête')
    assert.include(result.message, 'demo@korahire.test')
  })
}
