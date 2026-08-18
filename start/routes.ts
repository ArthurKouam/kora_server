/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import CandidatesController from '#controllers/candidates_controller'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.Sessions, 'login'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.Sessions, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router
      .group(() => {
        router.get('stats', [controllers.Dashboard, 'stats'])
        router.get('upcoming-interviews', [controllers.Dashboard, 'upcomingInterviews'])
        router.get('application-status-stats', [controllers.Dashboard, 'applicationStatusStats'])
        router.get('job-status-stats', [controllers.Dashboard, 'jobStatusStats'])

        router.get('candidates', [CandidatesController, 'index'])

        router
          .group(() => {
            router.get('/', [controllers.Jobs, 'index'])
            router.post('/', [controllers.Jobs, 'store'])
            router.get('/:id', [controllers.Jobs, 'show'])
            router.put('/:id', [controllers.Jobs, 'update'])
            router.delete('/:id', [controllers.Jobs, 'destroy'])
          })
          .prefix('jobs')
      })
      .prefix('dashboard')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
